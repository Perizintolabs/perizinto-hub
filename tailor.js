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
const auth = firebase.auth();

const GITHUB_USERNAME = "Perizinto"; 
const REPO_NAME = "perizinto-hub";        
const MY_DEV_NUMBER = "2347068521773";

let isSignUp = false;

function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('auth-title').innerText = isSignUp ? "Create Account" : "Tailor Login";
    document.getElementById('brand-input').style.display = isSignUp ? "block" : "none";
    document.getElementById('phone-input').style.display = isSignUp ? "block" : "none";
    document.getElementById('toggle-link').innerText = isSignUp ? "Switch to Login" : "Switch to Sign Up";
}

async function handleAuth() {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('pass-input').value;
    const brand = document.getElementById('brand-input').value;
    const phone = document.getElementById('phone-input').value;
    try {
        if (isSignUp) {
            const res = await auth.createUserWithEmailAndPassword(email, pass);
            await db.collection("tailors").doc(res.user.uid).set({ 
                brandName: brand || "New Tailor",
                phoneNumber: phone.replace(/\D/g,'') || "2340000000000"
            });
        } else {
            await auth.signInWithEmailAndPassword(email, pass);
        }
    } catch (err) { alert(err.message); }
}

auth.onAuthStateChanged(user => {
    document.getElementById('auth-screen').style.display = user ? 'none' : 'flex';
    if (user) loadDashboard(user.uid);
});

function loadDashboard(uid) {
    db.collection("tailors").doc(uid).onSnapshot(doc => {
        if (doc.exists) document.getElementById('brand-name').innerText = doc.data().brandName;
    });
    db.collection("designs").where("ownerId", "==", uid).onSnapshot(snapshot => {
        renderList(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
    });
}

function renderList(data) {
    let html = ""; let lowCount = 0;
    data.forEach(d => {
        if (d.qty <= 2) lowCount++;
        html += `<div class="stock">
            <button class="delete-btn" onclick="deleteDesign('${d.id}')"><i class="fas fa-trash"></i></button>
            <img src="${d.img}" class="stock-img" onclick="viewImage('${d.img}')">
            <div class="sub">
                <b class="dress-name">${d.name}</b><p>₦${d.price}</p>
                <small>C: ${d.chest}" | N: ${d.neck}" | H: ${d.head}"</small>
                <div class="counter-ui">
                    <button class="qty-btn" onclick="updateQty('${d.id}', -1)">-</button>
                    <span class="avail">${d.qty}</span>
                    <button class="qty-btn" onclick="updateQty('${d.id}', 1)">+</button>
                </div>
            </div>
        </div>`;
    });
    document.getElementById('stocks-list').innerHTML = html;
    document.getElementById('total-stocks').innerText = data.length;
    document.getElementById('low-stocks').innerText = lowCount;
}

function copyCatalogLink() {
    const uid = auth.currentUser.uid;
    const link = `https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/customer.html?id=${uid}`;
    navigator.clipboard.writeText(link).then(() => alert("Catalog link copied!"));
}

function showQRModal() {
    const uid = auth.currentUser.uid;
    const link = `https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/customer.html?id=${uid}`;
    const qrUrl = `https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=${encodeURIComponent(link)}&choe=UTF-8`;
    document.getElementById('qr-container').innerHTML = `<img id="qr-img" src="${qrUrl}" crossOrigin="anonymous">`;
    document.getElementById('qr-modal').style.display = 'flex';
}

function downloadQR() {
    const img = document.getElementById('qr-img');
    const link = document.createElement('a');
    link.href = img.src;
    link.download = "Shop_QR.png";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function closeQRModal() { document.getElementById('qr-modal').style.display = 'none'; }

document.getElementById('btn1').onclick = function() {
    const file = document.getElementById('file').files[0];
    const name = document.getElementById('letter').value;
    if (!file || !name) return alert("Photo/Name required!");
    const reader = new FileReader();
    reader.onload = async (e) => {
        await db.collection("designs").add({
            name: name, price: document.getElementById('price').value || 0,
            chest: document.getElementById('chest').value || 0,
            neck: document.getElementById('neck').value || 0,
            head: document.getElementById('head').value || 0,
            img: e.target.result, qty: 1, ownerId: auth.currentUser.uid
        });
        closeModals();
    };
    reader.readAsDataURL(file);
};

window.updateQty = (id, amt) => {
    const ref = db.collection("designs").doc(id);
    db.runTransaction(async t => {
        const doc = await t.get(ref);
        const newQty = (doc.data().qty || 0) + amt;
        t.update(ref, { qty: newQty < 0 ? 0 : newQty });
    });
};

window.deleteDesign = (id) => { if(confirm("Delete?")) db.collection("designs").doc(id).delete(); };

window.toggleDarkMode = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    document.getElementById('mode-text').innerText = isDark ? "Light Mode" : "Dark Mode";
};

window.changeBrandName = () => {
    const n = prompt("New Name?");
    if(n) db.collection("tailors").doc(auth.currentUser.uid).update({brandName: n});
};

window.reportError = () => { window.open(`https://wa.me/${MY_DEV_NUMBER}?text=Error found in Hub: `); };

window.viewImage = (src) => { document.getElementById('full-glory-img').src = src; document.getElementById('image-modal').style.display = 'flex'; };

window.searchDesigns = () => {
    const term = document.getElementById('main-search').value.toLowerCase();
    document.querySelectorAll('.stock').forEach(s => {
        const name = s.querySelector('.dress-name').innerText.toLowerCase();
        s.style.display = name.includes(term) ? "flex" : "none";
    });
};

document.getElementById('open-sidebar').onclick = () => {
    document.getElementById('sidebar').classList.add('active');
    document.getElementById('overlay').classList.add('active');
};

function closeModals() {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('dropdown').classList.remove('show');
    document.getElementById('overlay').classList.remove('active');
    document.getElementById('image-modal').style.display = 'none';
}

document.getElementById('add-button').onclick = () => {
    document.getElementById('dropdown').classList.add('show');
    document.getElementById('overlay').classList.add('active');
};
document.getElementById('overlay').onclick = closeModals;