const firebaseConfig = {
    apiKey: "AIzaSyBcSXio4XHKvWyeEPZncKgBt5ZR1fiKJ-4",
    authDomain: "perizinto-tailor-hub.firebaseapp.com",
    projectId: "perizinto-tailor-hub",
    storageBucket: "perizinto-tailor-hub.appspot.com",
    messagingSenderId: "67430302677",
    appId: "1:67430302677:web:9f578f27119459633bf35c"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const urlParams = new URLSearchParams(window.location.search);
const ADMIN_UID = urlParams.get('id');
let TAILOR_PHONE = "2340000000000";
let favorites = JSON.parse(localStorage.getItem('user_favs')) || [];
let allDesigns = [];
let showOnlyFavs = false;

if (!ADMIN_UID) {
    document.getElementById('catalog-list').innerHTML = "<h3 style='text-align:center;'>Tailor Link Invalid.</h3>";
} else {
    db.collection("tailors").doc(ADMIN_UID).onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('side-brand').innerText = data.brandName;
            document.getElementById('main-title').innerText = data.brandName;
            TAILOR_PHONE = data.phoneNumber;
        }
    });

    db.collection("designs").where("ownerId", "==", ADMIN_UID).onSnapshot(snapshot => {
        allDesigns = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
        applyFilters();
    });
}

function applyFilters() {
    let filtered = showOnlyFavs ? allDesigns.filter(d => favorites.includes(d.id)) : allDesigns;
    renderCatalog(filtered);
}

function renderCatalog(data) {
    const list = document.getElementById('catalog-list');
    list.innerHTML = "";
    data.forEach(d => {
        const card = document.createElement('div');
        card.className = "stock"; card.style.position = "relative";
        const playHint = d.type === 'video' ? '<div class="video-play-hint"><i class="fas fa-play-circle"></i></div>' : '';
        
        card.innerHTML = `
            <button class="fav-btn" onclick="event.stopPropagation(); toggleFav('${d.id}')">
                <i class="${favorites.includes(d.id)?'fas':'far'} fa-heart"></i>
            </button>
            <div style="position:relative;" onclick="viewMedia('${d.img}', '${d.type}')">
                <img src="${d.thumb || d.img}" class="stock-img" style="width:100%; border-radius:10px;">
                ${playHint}
            </div>
            <div class="sub">
                <b>${d.name}</b><p>₦${d.price}</p>
                <button class="order-btn" onclick="placeOrder('${d.name}', '${d.price}')">
                    <i class="fab fa-whatsapp"></i> Order Now
                </button>
            </div>`;
        list.appendChild(card);
    });
    document.getElementById('fav-badge').innerText = favorites.length;
}

function filterFavs(status) {
    showOnlyFavs = status;
    applyFilters();
    toggleSidebar();
}

function sortPrice() {
    const val = document.getElementById('price-filter').value;
    if(val === 'low') allDesigns.sort((a,b) => a.price - b.price);
    if(val === 'high') allDesigns.sort((a,b) => b.price - a.price);
    applyFilters();
}

function toggleFav(id) {
    favorites = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    localStorage.setItem('user_favs', JSON.stringify(favorites));
    applyFilters();
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); document.getElementById('overlay').style.display = document.getElementById('sidebar').classList.contains('active') ? 'block' : 'none'; }

function viewMedia(src, type) {
    const modal = document.getElementById('image-modal');
    modal.innerHTML = type === 'video' 
        ? `<video src="${src}" controls autoplay style="max-width:95%; max-height:85%; border-radius:12px;"></video>`
        : `<img src="${src}" style="max-width:95%; max-height:85%; border-radius:12px;">`;
    modal.style.display = 'flex';
}

function toggleTheme() { 
    const isDark = document.body.classList.toggle('dark-mode'); 
    document.getElementById('mode-text-cust').innerText = isDark ? "Light Mode" : "Dark Mode";
}

function chatWithTailor() { window.open(`https://wa.me/${TAILOR_PHONE}`); }
function placeOrder(name, price) { 
    const text = encodeURIComponent(`I want to order: ${name} (₦${price})`);
    window.open(`https://wa.me/${TAILOR_PHONE}?text=${text}`); 
}

document.getElementById('customer-search').oninput = (e) => {
    const t = e.target.value.toLowerCase();
    renderCatalog(allDesigns.filter(d => d.name.toLowerCase().includes(t)));
};
