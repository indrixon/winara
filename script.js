// --- 1. CONFIGURATION FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyByJgbLgty4OD4_COvqUMzxlypjwXlBf2Q",
    authDomain: "winaria-785b1.firebaseapp.com",
    projectId: "winaria-785b1",
    storageBucket: "winaria-785b1.firebasestorage.app",
    messagingSenderId: "537500059636",
    appId: "1:537500059636:web:700d2ecf7985879845ba1",
    measurementId: "G-M3922XKNS2"
};

// Import des fonctions Firebase depuis le CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Initialisation
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const productsCol = collection(db, 'products');

let products = [];
const MY_PHONE_NUMBER = "22890722354"; 

// --- 2. FONCTIONS UTILITAIRES ---

// Formatte le prix (ex: 10000 -> 10 000)
const formatPrice = (price) => {
    return parseInt(price).toLocaleString('fr-FR').replace(/\s/g, ' '); 
};

// --- 3. CHARGEMENT DES DONNÉES ---
window.loadData = async function() {
    try {
        const querySnapshot = await getDocs(productsCol);
        products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // On vérifie sur quelle page on est pour lancer le bon affichage
        if(document.getElementById('product-grid')) renderClientProducts();
        if(document.getElementById('admin-product-list')) renderAdminProducts();
        
        // Mise à jour du compteur dans l'admin
        const totalSpan = document.getElementById('total-products');
        if(totalSpan) totalSpan.innerText = products.length;

    } catch (error) {
        console.error("Erreur chargement Firebase:", error);
    }
};

// --- 4. AFFICHAGE CLIENT (ACCUEIL) ---
function renderClientProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    if(products.length === 0) {
        grid.innerHTML = "<p style='grid-column: 1/-1; text-align:center; color:#888;'>Aucun article disponible pour le moment.</p>";
        return;
    }

    grid.innerHTML = products.map(p => `
        <div class="product-card">
            <div class="card-img-box">
                <img src="${p.imgData}" alt="${p.name}" loading="lazy">
            </div>
            <div class="card-info">
                <div>
                    <h3>${p.name}</h3>
                    <p class="p-desc">${p.description || ""}</p>
                </div>
                <div class="p-footer">
                    <span class="p-price">${formatPrice(p.price)} F</span>
                    <button class="btn-buy" onclick="openWhatsApp('${p.id}')">
                        <i class="fab fa-whatsapp"></i> Acheter
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// --- 5. FONCTION WHATSAPP ---
window.openWhatsApp = function(id) {
    const p = products.find(x => x.id === id);
    if(p) {
        // On ajoute la description au message si elle existe
        const details = p.description ? `\n📝 Détails: ${p.description}` : "";
        const msg = `Salut Winara ! 👋\nJe suis intéressé par cet article :\n📦 *${p.name}*${details}\n💰 Prix: ${formatPrice(p.price)} FCFA\n\nEst-il disponible ?`;
        
        // Ouverture de WhatsApp
        window.open(`https://wa.me/${MY_PHONE_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    }
};

// --- 6. GESTION CONNEXION ADMIN ---
window.checkLogin = function() {
    const u = document.getElementById('admin-user').value;
    const p = document.getElementById('admin-pass').value;
    
    if(u === "admin" && p === "1234") {
        sessionStorage.setItem('isAdmin', 'true');
        window.showDashboard();
    } else {
        document.getElementById('login-error').innerText = "Identifiants incorrects.";
    }
};

window.showDashboard = function() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
};

window.logout = function() {
    sessionStorage.removeItem('isAdmin');
    window.location.href = "index.html"; 
};

// --- 7. GESTION DES PRODUITS (CRUD) ---

// SAUVEGARDER (Ajout ou Modification)
window.saveProduct = async function() {
    const id = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value;
    const desc = document.getElementById('product-desc').value; // On récupère la description
    const price = document.getElementById('product-price').value;
    const fileInput = document.getElementById('product-image-upload');
    const currentImg = document.getElementById('current-image-data').value;

    if (!name || !price) {
        alert("Merci de remplir le nom et le prix.");
        return;
    }

    const btn = document.querySelector('.btn-save');
    const originalBtnText = btn.innerText;
    btn.innerText = "Enregistrement...";
    btn.disabled = true;

    try {
        let imgData = currentImg;

        // Si une nouvelle image est choisie
        if (fileInput.files.length > 0) {
            imgData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(fileInput.files[0]);
            });
        } else if (!currentImg) {
            alert("Une image est obligatoire.");
            btn.innerText = originalBtnText;
            btn.disabled = false;
            return;
        }

        const data = { 
            name: name, 
            price: price, 
            description: desc, // On sauvegarde la description
            imgData: imgData 
        };

        if (id) {
            // Mise à jour
            await updateDoc(doc(db, 'products', id), data);
        } else {
            // Création
            await addDoc(productsCol, data);
        }

        resetForm();
        loadData(); // Rechargement de la liste
        
    } catch (e) {
        console.error("Erreur save:", e);
        alert("Erreur lors de l'enregistrement. Vérifiez la console.");
    } finally {
        btn.innerText = originalBtnText;
        btn.disabled = false;
    }
};

// AFFICHER LA LISTE DANS L'ADMIN
function renderAdminProducts() {
    const list = document.getElementById('admin-product-list');
    if(!list) return;

    list.innerHTML = products.map(p => `
        <tr>
            <td><img src="${p.imgData}" class="thumb-img"></td>
            <td>
                <strong>${p.name}</strong><br>
                <small style="color:#666; font-style:italic;">
                    ${(p.description || "").substring(0, 25)}${(p.description && p.description.length > 25) ? "..." : ""}
                </small>
            </td>
            <td>${formatPrice(p.price)}</td>
            <td>
                <button class="action-btn btn-edit" onclick="editProduct('${p.id}')"><i class="fas fa-edit"></i></button>
                <button class="action-btn btn-delete" onclick="deleteProduct('${p.id}')"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `).join('');
}

// PRÉPARER LA MODIFICATION
window.editProduct = function(id) {
    const p = products.find(x => x.id === id);
    if(!p) return;

    document.getElementById('product-id').value = p.id;
    document.getElementById('product-name').value = p.name;
    document.getElementById('product-desc').value = p.description || ""; // On remet la description
    document.getElementById('product-price').value = p.price;
    document.getElementById('current-image-data').value = p.imgData;
    document.getElementById('image-preview').innerHTML = `<img src="${p.imgData}">`;
    document.getElementById('form-title').innerText = "Modifier l'article";
    
    // Remonter en haut de page pour voir le formulaire
    document.querySelector('.admin-layout').scrollIntoView({ behavior: 'smooth' });
};

// SUPPRIMER UN ARTICLE
window.deleteProduct = async function(id) {
    if(confirm("Voulez-vous vraiment supprimer cet article ?")) {
        try {
            await deleteDoc(doc(db, "products", id));
            loadData();
        } catch(e) {
            console.error(e);
            alert("Erreur de suppression");
        }
    }
};

// VIDER LE FORMULAIRE
window.resetForm = function() {
    document.getElementById('product-id').value = "";
    document.getElementById('product-name').value = "";
    document.getElementById('product-desc').value = "";
    document.getElementById('product-price').value = "";
    document.getElementById('product-image-upload').value = "";
    document.getElementById('current-image-data').value = "";
    document.getElementById('image-preview').innerHTML = '<span>Aucune image</span>';
    document.getElementById('form-title').innerHTML = '<i class="fas fa-plus-circle"></i> Ajouter un article';
};

// PRÉVISUALISATION IMAGE LORS DE L'UPLOAD
window.previewImage = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('image-preview').innerHTML = `<img src="${e.target.result}">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
};