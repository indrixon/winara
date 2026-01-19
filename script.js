// --- CONFIGURATION FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyByJgbLgty4OD4_COvqUMzxlypjwXlBf2Q",
    authDomain: "winaria-785b1.firebaseapp.com",
    projectId: "winaria-785b1",
    storageBucket: "winaria-785b1.firebasestorage.app",
    messagingSenderId: "537500059636",
    appId: "1:537500059636:web:700d2ecf7985879845ba1",
    measurementId: "G-M3922XKNS2"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const productsCol = collection(db, 'products');

let products = [];
const MY_PHONE_NUMBER = "22890722354"; 

// --- UTILITAIRE : FORMATTER PRIX (FCFA) ---
// Transforme 10000 en "10 000"
function formatPrice(price) {
    return parseInt(price).toLocaleString('fr-FR'); 
}

// --- UTILITAIRE : NOTIFICATION TOAST ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = type === 'success' ? `<i class="fas fa-check-circle"></i> ${message}` : `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    container.appendChild(toast);
    
    // Disparition auto après 3 secondes
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const div = document.createElement('div');
    div.id = 'toast-container';
    document.body.appendChild(div);
    return div;
}

// --- CHARGER LES DONNÉES ---
async function loadData() {
    // 1. Afficher le Skeleton (chargement)
    showSkeleton();

    try {
        const querySnapshot = await getDocs(productsCol);
        products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // 2. Remplacer le Skeleton par les vrais produits
        renderClientProducts();
        if(sessionStorage.getItem('isAdmin') === 'true') renderAdminProducts();
        
        const totalSpan = document.getElementById('total-products');
        if(totalSpan) totalSpan.innerText = products.length;

    } catch (error) {
        console.error("Erreur Firebase:", error);
        showToast("Erreur de connexion", "error");
    }
}

// Affiche des fausses cartes pendant le chargement
function showSkeleton() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    // On génère 4 fausses cartes
    grid.innerHTML = Array(4).fill(`
        <div class="skeleton-card">
            <div class="skeleton skeleton-img"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-price"></div>
        </div>
    `).join('');
}

// --- RENDU CLIENT (Avec FCFA) ---
function renderClientProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    if(products.length === 0) {
        grid.innerHTML = "<p>Aucun article disponible pour le moment.</p>";
        return;
    }

    grid.innerHTML = products.map(p => `
        <div class="product-card">
            <div class="card-image-container">
                <img src="${p.imgData}" alt="${p.name}" loading="lazy">
            </div>
            <div class="p-info">
                <span class="p-category">Nouveauté</span>
                <h3>${p.name}</h3>
                <div class="p-footer">
                    <span class="p-price">${formatPrice(p.price)} FCFA</span>
                    <button class="btn-buy" onclick="openWhatsApp('${p.id}')">
                        <i class="fab fa-whatsapp"></i> Acheter
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// --- RENDU ADMIN (Avec FCFA) ---
function renderAdminProducts() {
    const tbody = document.getElementById('admin-product-list');
    if (!tbody) return;
    tbody.innerHTML = products.map(p => `
        <tr>
            <td><img src="${p.imgData}" style="width:50px; border-radius:5px;"></td>
            <td><strong>${p.name}</strong></td>
            <td>${formatPrice(p.price)} FCFA</td>
            <td>
                <button class="action-btn edit-btn" onclick="editProduct('${p.id}')">Modifier</button>
                <button class="action-btn delete-btn" onclick="deleteProduct('${p.id}')">Suppr.</button>
            </td>
        </tr>
    `).join('');
}

// --- FONCTION WHATSAPP ---
window.openWhatsApp = function(id) {
    const product = products.find(p => p.id === id);
    if (product) {
        // Message en français avec prix en FCFA
        const message = `Bonjour Winara ! 👋%0A%0ACet article est-il disponible ?%0A%0A📦 *Article :* ${product.name}%0A💰 *Prix :* ${formatPrice(product.price)} FCFA`;
        window.open(`https://wa.me/${MY_PHONE_NUMBER}?text=${message}`, '_blank');
    }
};

// --- LOGIQUE ADMIN (inchangée mais sécurisée) ---
window.checkLogin = function() {
    const user = document.getElementById('admin-user').value;
    const pass = document.getElementById('admin-pass').value;
    if (user === "admin" && pass === "1234") {
        sessionStorage.setItem('isAdmin', 'true');
        showDashboard();
        showToast("Connexion réussie !", "success");
    } else {
        document.getElementById('login-error').innerText = "Identifiants incorrects.";
        showToast("Erreur d'identifiants", "error");
    }
};

function showDashboard() {
    const loginSec = document.getElementById('login-section');
    const dashSec = document.getElementById('dashboard-section');
    if(loginSec) loginSec.style.display = 'none';
    if(dashSec) dashSec.style.display = 'block';
    renderAdminProducts();
}

window.saveProduct = async function() {
    const id = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value;
    const price = document.getElementById('product-price').value;
    const fileInput = document.getElementById('product-image-upload');
    const currentImageData = document.getElementById('current-image-data').value;

    if (!name || !price) return showToast("Remplis le nom et le prix", "error");

    showToast("Enregistrement en cours...", "success");

    let imgDataToSave = currentImageData;
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
            processSave(id, name, price, e.target.result);
        };
        reader.readAsDataURL(file);
    } else if (currentImageData) {
        processSave(id, name, price, currentImageData);
    } else {
        showToast("Image manquante", "error");
    }
};

async function processSave(id, name, price, imgData) {
    const productData = { name, price, imgData };
    try {
        if (id) {
            const productRef = doc(db, 'products', id);
            await updateDoc(productRef, productData);
        } else {
            await addDoc(productsCol, productData);
        }
        await loadData();
        resetForm();
        showToast("Article enregistré !", "success");
    } catch (error) {
        console.error(error);
        showToast("Erreur lors de l'enregistrement", "error");
    }
}

window.deleteProduct = async function(id) {
    if(confirm("Confirmer la suppression ?")) {
        try {
            await deleteDoc(doc(db, 'products', id));
            await loadData();
            showToast("Article supprimé", "success");
        } catch (error) {
            console.error(error);
            showToast("Erreur de suppression", "error");
        }
    }
};

window.editProduct = function(id) {
    const product = products.find(p => p.id === id);
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-price').value = product.price;
    document.getElementById('current-image-data').value = product.imgData;
    document.getElementById('image-preview').innerHTML = `<img src="${product.imgData}">`;
    document.getElementById('form-title').innerText = "Modifier l'article";
    
    // Scroll vers le formulaire
    document.querySelector('.admin-layout').scrollIntoView({ behavior: 'smooth' });
};

window.resetForm = function() {
    document.getElementById('product-id').value = "";
    document.getElementById('product-name').value = "";
    document.getElementById('product-price').value = "";
    document.getElementById('product-image-upload').value = "";
    document.getElementById('current-image-data').value = "";
    document.getElementById('image-preview').innerHTML = '<span>Aucune image</span>';
};

window.logout = function() {
    sessionStorage.removeItem('isAdmin');
    location.reload();
};

window.previewImage = function(input) {
    const previewContainer = document.getElementById('image-preview');
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewContainer.innerHTML = `<img src="${e.target.result}" alt="Aperçu">`;
        };
        reader.readAsDataURL(file);
    }
};

// Init
loadData();
if(sessionStorage.getItem('isAdmin') === 'true') showDashboard();