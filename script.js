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

// Initialisation Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const productsCol = collection(db, 'products');

let products = []; // Stockage local des produits récupérés
const MY_PHONE_NUMBER = "22890722354"; 

// --- CHARGER LES DONNÉES (Depuis Firebase) ---
async function loadData() {
    try {
        const querySnapshot = await getDocs(productsCol);
        products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Mettre à jour les interfaces
        renderClientProducts();
        renderAdminProducts();
        
        const totalSpan = document.getElementById('total-products');
        if(totalSpan) totalSpan.innerText = products.length;
    } catch (error) {
        console.error("Erreur lors du chargement Firebase:", error);
    }
}

// --- AJOUTER / MODIFIER SUR FIREBASE ---
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
    } catch (error) {
        alert("Erreur lors de l'enregistrement. Vérifie tes règles Firestore.");
        console.error(error);
    }
}

// --- SUPPRIMER SUR FIREBASE ---
window.deleteProduct = async function(id) {
    if(confirm("Confirmer la suppression ?")) {
        try {
            await deleteDoc(doc(db, 'products', id));
            await loadData();
        } catch (error) {
            console.error(error);
        }
    }
};

// --- GESTION DES IMAGES ---
window.previewImage = function(input) {
    const previewContainer = document.getElementById('image-preview');
    const file = input.files[0];
    if (file) {
        if (file.size > 1.5 * 1024 * 1024) {
            alert("Image trop lourde. Choisis une image de moins de 1.5 Mo.");
            input.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            previewContainer.innerHTML = `<img src="${e.target.result}" alt="Aperçu">`;
        };
        reader.readAsDataURL(file);
    }
};

// --- AFFICHAGE CLIENT ---
function renderClientProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    if(products.length === 0) {
        grid.innerHTML = "<p>Aucun article disponible.</p>";
        return;
    }

    grid.innerHTML = products.map(p => `
        <div class="product-card">
            <div class="card-image-container">
                <img src="${p.imgData}" alt="${p.name}">
            </div>
            <div class="p-info">
                <span class="p-category">Nouveauté</span>
                <h3>${p.name}</h3>
                <div class="p-footer">
                    <span class="p-price">${parseFloat(p.price).toFixed(2)} €</span>
                    <button class="btn-buy" onclick="openWhatsApp('${p.id}')">
                        <i class="fab fa-whatsapp"></i> Acheter
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// --- FONCTION WHATSAPP ---
window.openWhatsApp = function(id) {
    const product = products.find(p => p.id === id);
    if (product) {
        const message = `Bonjour Winara ! 👋%0A%0ACet article est-il disponible ?%0A%0A📦 *Article :* ${product.name}%0A💰 *Prix :* ${product.price} €`;
        window.open(`https://wa.me/${MY_PHONE_NUMBER}?text=${message}`, '_blank');
    }
};

// --- ADMINISTRATION ---
window.checkLogin = function() {
    const user = document.getElementById('admin-user').value;
    const pass = document.getElementById('admin-pass').value;
    if (user === "admin" && pass === "12345") {
        sessionStorage.setItem('isAdmin', 'true');
        showDashboard();
    } else {
        document.getElementById('login-error').innerText = "Identifiants incorrects.";
    }
};

function showDashboard() {
    const loginSec = document.getElementById('login-section');
    const dashSec = document.getElementById('dashboard-section');
    if(loginSec) loginSec.style.display = 'none';
    if(dashSec) dashSec.style.display = 'block';
    renderAdminProducts();
}

window.logout = function() {
    sessionStorage.removeItem('isAdmin');
    location.reload();
};

function renderAdminProducts() {
    const tbody = document.getElementById('admin-product-list');
    if (!tbody) return;
    tbody.innerHTML = products.map(p => `
        <tr>
            <td><img src="${p.imgData}" style="width:50px; border-radius:5px;"></td>
            <td><strong>${p.name}</strong></td>
            <td>${parseFloat(p.price).toFixed(2)} €</td>
            <td>
                <button class="action-btn edit-btn" onclick="editProduct('${p.id}')">Modifier</button>
                <button class="action-btn delete-btn" onclick="deleteProduct('${p.id}')">Suppr.</button>
            </td>
        </tr>
    `).join('');
}

window.saveProduct = function() {
    const id = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value;
    const price = document.getElementById('product-price').value;
    const fileInput = document.getElementById('product-image-upload');
    const currentImageData = document.getElementById('current-image-data').value;

    if (!name || !price) return alert("Remplis le nom et le prix.");

    if (fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => processSave(id, name, price, e.target.result);
        reader.readAsDataURL(fileInput.files[0]);
    } else if (currentImageData) {
        processSave(id, name, price, currentImageData);
    } else {
        alert("Image manquante.");
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
};

window.resetForm = function() {
    document.getElementById('product-id').value = "";
    document.getElementById('product-name').value = "";
    document.getElementById('product-price').value = "";
    document.getElementById('product-image-upload').value = "";
    document.getElementById('current-image-data').value = "";
    document.getElementById('image-preview').innerHTML = '<span>Aucune image</span>';
};

// Démarrage
loadData();
if(sessionStorage.getItem('isAdmin') === 'true') showDashboard();