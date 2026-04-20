const firebaseConfig = {
    apiKey: "AIzaSyBcSXio4XHKvWyeEPZncKgBt5ZR1fiKJ-4",
    authDomain: "perizinto-tailor-hub.firebaseapp.com",
    projectId: "perizinto-tailor-hub",
    storageBucket: "perizinto-tailor-hub.firebasestorage.app",
    messagingSenderId: "67430302677",
    appId: "1:67430302677:web:9f578f27119459633bf35c"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(), auth = firebase.auth();
emailjs.init("zDScctBN1_ZHZBifz");
const GITHUB_USERNAME = "Perizintolabs", REPO_NAME = "perizinto-hub";
let isUserPremium = false;
const CLOUDINARY_CLOUD_NAME = 'dsqn7mwko', CLOUDINARY_UPLOAD_PRESET = 'Perizinto_fashion_hub';

let scale = 1, pointX = 0, pointY = 0, start = { x: 0, y: 0 }, initialDist = 0;

function showLoader(t = "PROCESSING...") { document.getElementById("loader-text").innerText = t; document.getElementById("global-loader").style.display = "flex"; }
function hideLoader() { document.getElementById("global-loader").style.display = "none"; }
function initTheme() { if (localStorage.getItem('theme') === 'dark') { document.body.classList.add('dark-mode'); document.getElementById('theme-text').innerText = "Light Mode"; } }
initTheme();
window.toggleTheme = () => { let d = document.body.classList.toggle('dark-mode'); localStorage.setItem('theme', d ? 'dark' : 'light'); document.getElementById('theme-text').innerText = d ? "Light Mode" : "Dark Mode"; closeModals(); };
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); let isSignUp = false;
window.toggleAuthMode = () => {
    isSignUp = !isSignUp; document.getElementById('auth-title').innerText = isSignUp ? "Create Account" : "Tailor Login"; document.getElementById('auth-btn').innerText = isSignUp ? "Sign Up" : "Login"; document.getElementById('auth-switch').innerText = isSignUp ? "Back to Login" : "Create Account"; document.getElementById('brand-group').style.display = isSignUp ? "block" : "none"; document.getElementById('phone-group').style.display = isSignUp ? "block" : "none"; document.querySelector('.auth-links span[onclick="resetPassword()"]').style.display = isSignUp ? 'none' : 'inline'; document.getElementById('email-input').value = ''; document.getElementById('pass-input').value = ''; if (isSignUp) { document.getElementById('brand-input').value = ''; document.getElementById('phone-input').value = ''; }
};
window.togglePassword = () => { let p = document.getElementById('pass-input'), e = document.getElementById('toggle-pass'); if (p.type === "password") { p.type = "text"; e.classList.replace("fa-eye", "fa-eye-slash"); } else { p.type = "password"; e.classList.replace("fa-eye-slash", "fa-eye"); } };
// Send welcome email to new tailor
async function sendWelcomeEmail(userEmail, brandName, phoneNumber, tailorUID) {
    const shopLink = `https://perizintolabs.github.io/perizinto-hub/shop.html?id=${tailorUID}`;
    
    const templateParams = {
        to_email: userEmail,
        brand_name: brandName,
        phone: phoneNumber || "Not provided",
        shop_link: shopLink
    };

    try {
        await emailjs.send(
            "service_e38wffh",
            "template_7mp328a",
            templateParams
        );
        console.log("Welcome email sent to", userEmail);
    } catch (error) {
        console.error("Email failed:", error);
    }
}

async function notifyAdmin(newBrand, newEmail, newPhone) {
    const templateParams = {
        to_email: "perizinto384@gmail.com",
        brand_name: newBrand,
        user_email: newEmail,
        user_phone: newPhone || "Not provided",
        signup_time: new Date().toLocaleString()
    };

    try {
        await emailjs.send(
            "service_e38wffh",
            "template_7mp328a", // Create a separate template
            templateParams
        );
    } catch (e) {
        console.warn("Admin notification failed");
    }
}
window.handleAuth = async () => {
    let email = document.getElementById('email-input').value, pass = document.getElementById('pass-input').value; if (!email || !pass) return alert("Email and Password required."); showLoader("AUTHENTICATING...");
    try {
        if (isSignUp) {
          let phone = document.getElementById('phone-input').value;
        if (!phone) return alert("Phone number required.");
    
        let snap = await db.collection("tailors").where("phoneNumber", "==", phone).get();
        if (!snap.empty) {
        hideLoader();
        return alert("This phone number is already registered.");
    }
    
        let res = await auth.createUserWithEmailAndPassword(email, pass);
        let uid = res.user.uid;
        let brandName = document.getElementById('brand-input').value || "My Shop";
    
        await db.collection("tailors").doc(uid).set({
        brandName: brandName,
        phoneNumber: phone,
        isPremium: false
    });
    
    // Send welcome email
    sendWelcomeEmail(email, brandName, phone, uid);
    notifyAdmin(brandName, email, phone);
}
         else { await auth.signInWithEmailAndPassword(email, pass); }
        document.getElementById('email-input').value = ""; document.getElementById('pass-input').value = ""; if (isSignUp) { document.getElementById('brand-input').value = ""; document.getElementById('phone-input').value = ""; }
    } catch (e) { alert(e.message); } finally { hideLoader(); }
};
window.resetPassword = () => { let e = document.getElementById('email-input').value; if (!e) e = prompt("Enter your registered email:"); if (e) { showLoader("SENDING LINK..."); auth.sendPasswordResetEmail(e).then(() => alert("Success! Check your inbox.")).catch(e => alert("Error: " + e.message)).finally(() => hideLoader()); } };
window.confirmLogout = () => { if (confirm("Are you sure?")) { showLoader("LOGGING OUT..."); auth.signOut().then(() => { hideLoader(); closeModals(); }); } };
auth.onAuthStateChanged(async user => { document.getElementById('auth-screen').style.display = user ? 'none' : 'flex'; if (user) { try { let doc = await db.collection("tailors").doc(user.uid).get(); if (doc.exists) { let d = doc.data(); if (d.isPremium && d.subscriptionExpiry && new Date() > d.subscriptionExpiry.toDate()) await db.collection("tailors").doc(user.uid).update({ isPremium: false }); } } catch (e) { } loadDashboard(user.uid); } });
let allDesigns = [];
function loadDashboard(uid) {
    showLoader("FETCHING CATALOGUE..."); let init = false;
    db.collection("tailors").doc(uid).onSnapshot(doc => {
        if (doc.exists) {
            let d = doc.data(); isUserPremium = d.isPremium || false; document.getElementById('brand-name').innerText = d.brandName;
            let tier = document.getElementById('user-tier'), badge = document.getElementById('top-tier-badge'), up = document.getElementById('upgrade-btn'), qr = document.getElementById('qr-menu-btn'), media = document.getElementById('media'), status = document.getElementById('sidebar-premium-status'), days = document.getElementById('sidebar-days-count');
            if (isUserPremium) {
                if (tier) { tier.innerText = "Premium"; tier.className = "tier-premium premium-badge-animated"; } if (badge) badge.innerHTML = "👑"; if (qr) qr.classList.remove('premium-lock'); if (media) media.disabled = false; if (up) up.style.display = "none"; if (status) status.style.display = "block";
                if (d.subscriptionExpiry && days) { let diff = d.subscriptionExpiry.toDate().getTime() - Date.now(); days.innerText = Math.ceil(diff / (1000 * 60 * 60 * 24)) + " days remaining"; days.style.color = diff <= 5 * 86400000 ? "#ff4d4d" : "#888"; }
            } else {
                if (tier) { tier.innerText = "Free"; tier.className = "tier-free"; } if (badge) badge.innerHTML = "⚫"; if (qr) qr.classList.add('premium-lock'); if (media) { media.disabled = true; media.value = ""; } if (up) up.style.display = "block"; if (status) status.style.display = "none";
            }
            renderDesigns(allDesigns);
        }
    });
    db.collection("designs").where("ownerId", "==", uid).onSnapshot(snap => { allDesigns = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderDesigns(allDesigns); if (!init) { hideLoader(); init = true; } });
}
function renderInventoryNudges() {
    let c = document.getElementById('inventory-nudges'); if (!c) return; let pending = allDesigns.filter(d => d.pendingInquiries > 0); if (!pending.length) { c.innerHTML = ''; c.style.display = 'none'; return; }
    c.style.display = 'block'; let h = `<div style="margin:15px 20px;"><h4><i class="fas fa-bell" style="color:#e67e22;"></i> Pending Inquiries (${pending.length})</h4>`;
pending.forEach(d => {
    let q = Number(d.qty) || 0;
    h += `<div style="background:var(--card-bg); border-radius:10px; padding:12px; margin-bottom:10px; border-left:4px solid #e67e22;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
                <strong>${d.name}</strong> 
                <span style="color:#e67e22; font-weight:bold;">${d.pendingInquiries} inquiry(s)</span>
                <div style="font-size:12px; margin-top:4px;">Stock: ${q}</div>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
                <input id="bulk-qty-${d.id}" type="number" min="1" max="${q}" value="1" style="width:60px; padding:6px; border-radius:5px; border:1px solid #ccc;">
                <button onclick="bulkSale('${d.id}', ${q})" style="background:#25D366; color:white; border:none; border-radius:5px; padding:6px 12px; font-weight:bold; cursor:pointer;">
                    ✓ Sold
                </button>
                <button onclick="dismissNudge('${d.id}')" style="background:#aaa; color:white; border:none; border-radius:5px; padding:6px 12px; font-weight:bold; cursor:pointer;">
                    ✕ Not Sold
                </button>
            </div>
        </div>
    </div>`;
});
c.innerHTML = h += '</div>';
}
window.dismissNudge = async (designId) => {
    showLoader("CLEARING...");
    try {
        await db.collection("designs").doc(designId).update({ pendingInquiries: 0 });
        hideLoader();
    } catch (e) {
        hideLoader();
        alert('Failed to dismiss: ' + e.message);
    }
};
window.bulkSale = async (id, qty) => { let inp = document.getElementById(`bulk-qty-${id}`); if (!inp) return; let sold = parseInt(inp.value); if (!sold || sold <= 0 || sold > qty) return alert('Invalid quantity'); showLoader("UPDATING..."); try { await db.collection("designs").doc(id).update({ qty: qty - sold, pendingInquiries: 0 }); hideLoader(); } catch (e) { hideLoader(); alert('Failed: ' + e.message); } };
function renderDesigns(data) {
    let list = document.getElementById('stocks-list'), low = 0; list.innerHTML = "";
    data.sort((a, b) => b.createdAt - a.createdAt).forEach(d => {
        if (d.qty <= 2) low++;
        let editBtn = isUserPremium ? `<button onclick="openEditModal('${d.id}')" style="background:none;border:none;"><i class="fas fa-edit"></i></button>` : '',
            delBtn = `<button onclick="deleteDesign('${d.id}')" style="background:none;border:none;color:#ff4d4d;"><i class="fas fa-trash"></i></button>`,
            play = d.media ? `<div class="play-overlay"><i class="fas fa-play-circle"></i></div>` : '',
            service = d.serviceType || 'Full Package',
            badge = service === 'Sewing Only'
                ? '<span style="background:#f0f0f0; color:#555; padding:2px 6px; border-radius:10px; font-size:10px; margin-left:6px;">🧵 Sewing</span>'
                : '<span style="background:var(--premium); color:white; padding:2px 6px; border-radius:10px; font-size:10px; margin-left:6px;">📦 Full</span>',
            meas = d.details ? d.details.split(',').map(i => {
                let [l, v] = i.split(':'); return v ? `<div style="display:flex;justify-content:space-between;"><span>${l.trim()}</span><span>${v.trim()} <span style="font-size:9px; color:#888; margin-left:2px;">in</span></span></div>` : `<div>${i.trim()}</div>`;
            }).join('') : '<div style="color:#999;">No measurements</div>';
        list.innerHTML += `<div class="design-card" style="padding-right:45px;"><div class="image-wrapper" onclick="openLightbox('${d.img}','${d.media || ""}')"><img src="${d.img}" class="design-img" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'110\' height=\'140\'%3E%3Crect width=\'110\' height=\'140\' fill=\'%23ddd\'/%3E%3Ctext x=\'55\' y=\'70\' text-anchor=\'middle\' fill=\'%23999\'%3E🖼️%3C/text%3E%3C/svg%3E';">${play}</div><div class="card-details"><div><div class="card-title">${d.name} ${badge}</div><div class="card-price">₦${Number(d.price).toLocaleString()}</div><div class="measurements-container">${meas}</div>${d.pendingInquiries > 0 ? `<div style="background:#fff3cd;padding:4px;border-radius:5px;"><i class="fas fa-eye"></i> ${d.pendingInquiries} pending</div>` : ''}</div><div class="qty-controls"><button class="qty-btn" onclick="updateQty('${d.id}',-1)">-</button><span id="qty-disp-${d.id}">${d.qty}</span><button class="qty-btn" onclick="updateQty('${d.id}',1)">+</button></div></div><div style="position:absolute;right:10px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:space-around;">${editBtn}${delBtn}</div></div>`;
    });
    document.getElementById('total-designs').innerText = data.length; document.getElementById('low-stock').innerText = low; renderInventoryNudges();
}
async function uploadToCloudinary(file) { let f = new FormData(); f.append('file', file); f.append('upload_preset', CLOUDINARY_UPLOAD_PRESET); f.append('folder', 'fashion-hub'); let r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: f }); let d = await r.json(); if (d.error) throw new Error(d.error.message); return d.secure_url; }
document.getElementById('upload-btn').onclick = async () => {
    let file = document.getElementById('file').files[0], name = document.getElementById('name').value, price = document.getElementById('price').value, cat = document.getElementById('category').value, meas = document.getElementById('measurements-input').value, media = document.getElementById('media').value, service = document.getElementById('service-type').value;
    if (!file || !name || !price) return alert("Photo, Name, Price required."); if (!isUserPremium && allDesigns.length >= 10) return alert("Free limit: 10 designs."); showLoader("UPLOADING...");
    try {
        let url = await uploadToCloudinary(file); await db.collection("designs").add({ ownerId: auth.currentUser.uid, img: url, name, price: Number(price), category: cat || "", media: media || "", details: meas, serviceType: service || "Full Package", pendingInquiries: 0, qty: 1, createdAt: Date.now() });
        closeModals(); ['file', 'name', 'price', 'category', 'media', 'measurements-input', 'service-type'].forEach(id => { let el = document.getElementById(id); if (el) el.value = ""; });
    } catch (e) { alert("Upload failed: " + e.message); } finally { hideLoader(); }
};
window.deleteDesign = async id => { if (confirm("Delete permanently?")) { showLoader(); try { await db.collection("designs").doc(id).delete(); } catch (e) { alert("Failed"); } finally { hideLoader(); } } };
window.updateQty = (id, ch) => {
    const span = document.getElementById(`qty-disp-${id}`);
    let currentQty = 0;
    if (span) {
        currentQty = parseInt(span.innerText) || 0;
        const newQty = Math.max(0, currentQty + Number(ch));
        span.innerText = newQty;
    }
    const ref = db.collection("designs").doc(id);
    db.runTransaction(async t => {
        const doc = await t.get(ref);
        if (!doc.exists) throw new Error("Design not found");
        const actualQty = Math.max(0, (doc.data().qty || 0) + Number(ch));
        t.update(ref, { qty: actualQty });
        return actualQty;
    }).catch(err => {
        console.error("Quantity update failed:", err);
        if (span) span.innerText = currentQty;
        alert("Failed to update quantity. Please check your connection and try again.");
    });
};
document.getElementById('admin-search').addEventListener('input', e => { let t = e.target.value.toLowerCase(); renderDesigns(allDesigns.filter(d => d.name.toLowerCase().includes(t))); });
window.openEditModal = id => { let d = allDesigns.find(d => d.id === id); if (d) { document.getElementById('edit-id').value = id; document.getElementById('edit-name').value = d.name; document.getElementById('edit-category').value = d.category || ""; document.getElementById('edit-price').value = d.price; document.getElementById('edit-measurements').value = d.details || ""; document.getElementById('edit-media').value = d.media || ""; document.getElementById('edit-service-type').value = d.serviceType || "Full Package"; document.getElementById('edit-modal').classList.add('show'); document.getElementById('overlay').style.display = "block"; } };
window.saveEdit = async () => {
    let id = document.getElementById('edit-id').value, name = document.getElementById('edit-name').value, cat = document.getElementById('edit-category').value, price = document.getElementById('edit-price').value, file = document.getElementById('edit-file').files[0], media = document.getElementById('edit-media').value, service = document.getElementById('edit-service-type').value;
    if (!name || !price) return alert("Name and Price required."); showLoader("SAVING...");
    try {
        let upd = { name, price: Number(price), category: cat || "", details: document.getElementById('edit-measurements').value || "", media: media || "", serviceType: service || "Full Package" }; if (file) upd.img = await uploadToCloudinary(file);
        await db.collection("designs").doc(id).update(upd); closeModals(); ['edit-file', 'edit-name', 'edit-category', 'edit-price', 'edit-measurements', 'edit-media', 'edit-service-type'].forEach(id => { let el = document.getElementById(id); if (el) el.value = ""; });
    } catch (e) { alert("Update failed: " + e.message); } finally { hideLoader(); }
};
window.toggleSidebar = () => { document.getElementById('sidebar').classList.add('active'); document.getElementById('overlay').style.display = "block"; };
window.showAddModal = () => { document.getElementById('add-modal').classList.add('show'); document.getElementById('overlay').style.display = "block"; };
window.closeModals = () => { document.getElementById('sidebar').classList.remove('active'); document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('show')); document.getElementById('overlay').style.display = "none"; };

// UNIFIED LIGHTBOX (TAILOR)
window.openLightbox = (src, mediaLink) => {
    const modal = document.getElementById('lightbox');
    const container = document.getElementById('lightbox-content');
    scale = 1; pointX = 0; pointY = 0;

    if (mediaLink && isUserPremium) {
        const isYouTube = mediaLink.includes('youtube.com') || mediaLink.includes('youtu.be');
        if (isYouTube) {
            let videoId = mediaLink.includes('v=') ? mediaLink.split('v=')[1].split('&')[0] : mediaLink.split('/').pop();
            container.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="width:95%; height:50vh; border-radius:10px; border:2px solid white;"></iframe>`;
        } else {
            container.innerHTML = `<video controls autoplay style="max-width:95%; max-height:85vh; border-radius:10px;"><source src="${mediaLink}" type="video/mp4"></video>`;
        }
    } else {
        container.innerHTML = `<img id="lightbox-img" src="${src}" style="transform: translate(0px,0px) scale(1); transition: transform 0.1s ease-out; max-width:95%; max-height:85vh; border-radius:10px; cursor:grab;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect width=\'200\' height=\'200\' fill=\'%23ddd\'/%3E%3Ctext x=\'50%%\' y=\'50%%\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\'%3E🖼️%3C/text%3E%3C/svg%3E';">`;
        setupGestures();
    }
    modal.style.display = 'flex';
    document.addEventListener('keydown', handleLightboxEscape);
};

window.closeLightbox = () => {
    const modal = document.getElementById('lightbox');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('lightbox-content').innerHTML = '';
    }
    document.removeEventListener('keydown', handleLightboxEscape);
};

function handleLightboxEscape(e) {
    if (e.key === 'Escape') closeLightbox();
}

document.addEventListener('click', (e) => {
    if (e.target.closest('#lightbox .lightbox-close')) closeLightbox();
});

function setupGestures() {
    const c = document.getElementById('lightbox-content');
    c.addEventListener('touchstart', handleTouchStart, { passive: false });
    c.addEventListener('touchmove', handleTouchMove, { passive: false });
}

function handleTouchStart(e) {
    if (e.touches.length === 2) {
        initialDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
    } else if (e.touches.length === 1) {
        start = { x: e.touches[0].pageX - pointX, y: e.touches[0].pageY - pointY };
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    const img = document.getElementById('lightbox-img');
    if (!img) return;
    if (e.touches.length === 2) {
        let d = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        scale = Math.min(Math.max(1, scale * (d / initialDist)), 4);
        initialDist = d;
    } else if (e.touches.length === 1 && scale > 1) {
        pointX = e.touches[0].pageX - start.x;
        pointY = e.touches[0].pageY - start.y;
    }
    img.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
}
//  END LIGHTBOX

window.copyCustomerLink = () => { navigator.clipboard.writeText(`https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/shop.html?id=${auth.currentUser.uid}`); alert("Link Copied!"); closeModals(); };
window.viewAsCustomer = () => { let u = auth.currentUser; if (u) window.open(`shop.html?id=${u.uid}`, '_blank'); else alert("Login first."); };
window.changeBrandPrompt = () => { let cur = document.getElementById('brand-name').innerText, n = prompt("New Brand Name:", cur); if (n && n !== cur) { showLoader(); db.collection("tailors").doc(auth.currentUser.uid).update({ brandName: n }).then(() => { alert("Updated!"); closeModals(); }).finally(() => hideLoader()); } else closeModals(); };
window.openQRModal = () => { if (!isUserPremium) return alert("Premium required."); let link = `https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/shop.html?id=${auth.currentUser.uid}`; document.getElementById('qr-img').src = `https://quickchart.io/qr?text=${encodeURIComponent(link)}&size=300`; document.getElementById('sidebar').classList.remove('active'); document.getElementById('qr-modal').classList.add('show'); };
window.downloadQR = async () => { try { let r = await fetch(document.getElementById('qr-img').src); let b = await r.blob(); let a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'MyShopQR.png'; a.click(); } catch (e) { alert('Screenshot instead.'); } };
window.showAboutModal = () => { document.getElementById('sidebar').classList.remove('active'); document.getElementById('about-modal').classList.add('show'); };
window.showSupportModal = () => { document.getElementById('sidebar').classList.remove('active'); document.getElementById('support-modal').classList.add('show'); };
window.contactWhatsApp = () => window.open("https://wa.me/2347068521773?text=Hello%20Perizinto%20I%20would%20like%20to%20report%20an%20error%20in%20the%20hub.");
window.contactEmail = () => window.open("mailto:perizinto384@gmail.com?subject=Report%20Hub%20Error");
window.openUserGuide = () => {
    let guide = `<div style="font-size:14px;line-height:1.6;max-height:70vh;overflow-y:auto;"><strong>🧵 Welcome to Perizinto Hub – Your Online Fashion Shop</strong><br><br>This is <strong>your personal online catalogue</strong>. You share one simple link, and customers can see all your designs, prices, measurements, and order via WhatsApp – no need to send endless photos!<br><br><strong>📸 Adding a New Style</strong><br>1. Tap <strong>+ Add</strong>.<br>2. Choose a clear photo.<br>3. Give it a name (e.g. "Senator Wear").<br>4. (Optional) Pick a category – you can type anything, even "Owambe Special".<br>5. Set the price in Naira.<br>6. Choose <strong>Service Type</strong>: "Full Package" means you provide fabric + sewing; "Sewing Only" means customer brings fabric.<br>7. If you are Premium, you can add a YouTube or video link showing the fabric.<br>8. Enter measurements like <code>Waist: 34, Length: 40</code>. Use commas to separate multiple. measurements should be in inches<br>9. Tap <strong>Upload</strong> – it appears instantly!<br><br><strong>✏️ Managing Stock</strong><br>• Use the <strong>+/- buttons</strong> to reduce stock when you sell.<br>• If stock reaches 0, it shows "Out of Stock" to customers.<br>• Tap the pencil icon (Premium only) to edit anything.<br>• Tap the trash to delete permanently.<br><br><strong>🔔 Smart Inventory Nudge</strong><br>When customers click "Order on WhatsApp", we count it. If a style gets many inquiries but you haven't updated stock, a yellow alert appears. You can quickly mark it as sold in bulk – no more forgetting to update inventory!<br><br><strong>📤 Sharing Your Hub</strong><br>• <strong>Copy Customer's Link</strong> – Send this URL to anyone.<br>• <strong>My Shop QR</strong> – Print it for your physical shop; customers scan and browse.<br>• <strong>View as Customer</strong> – See exactly what your customers see.<br><br><strong>👑 Premium Benefits (Highly Recommended!)</strong><br>✨ <strong>Unlimited Designs</strong> – Free tier stops at 10. Premium lets you upload your entire portfolio.<br>🎥 <strong>Video Showcase</strong> – Add YouTube links so customers can watch the fabric move.<br>✏️ <strong>Edit Anytime</strong> – Change prices, photos, or measurements whenever you want.<br>📱 <strong>QR Code</strong> – Generate a professional QR code for your shop.<br><br>Upgrading is easy: tap "Upgrade to Premium" and you'll be guided to make a secure payment via WhatsApp. It's just 2,500 naira for a month<br><br><strong>❓ Need Help?</strong><br>Use "Report Error" in the side menu – we're here for you!</div>`;
    document.getElementById('sidebar').classList.remove('active'); document.getElementById('support-modal').classList.add('show'); document.getElementById('overlay').style.display = 'block';
    let h = document.querySelector('#support-modal .sheet-header span'), b = document.querySelector('#support-modal .sheet-body');
    if (!window.originalSupport) { window.originalSupport = { header: h.innerText, body: b.innerHTML }; }
    h.innerText = 'Admin User Guide 📘'; b.innerHTML = guide;
    let orig = window.closeModals;
    window.closeModals = function () { document.getElementById('sidebar').classList.remove('active'); document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('show')); document.getElementById('overlay').style.display = 'none'; if (window.originalSupport) { document.querySelector('#support-modal .sheet-header span').innerText = window.originalSupport.header; document.querySelector('#support-modal .sheet-body').innerHTML = window.originalSupport.body; } window.closeModals = orig; };
};
window.payWithPaystack = () => { let u = auth.currentUser; if (!u) return alert("Login first."); let msg = encodeURIComponent(`Hello Perizinto! I want to upgrade my Hub to Premium. My email: ${u.email}. Please send payment details.`); window.open(`https://wa.me/2347068521773?text=${msg}`); };
function upgradeToPremium(uid, ref) { let exp = new Date(); exp.setDate(exp.getDate() + 30); db.collection("tailors").doc(uid).update({ isPremium: true, subscriptionExpiry: firebase.firestore.Timestamp.fromDate(exp), lastPaymentRef: ref || "N/A", lastPaymentDate: firebase.firestore.FieldValue.serverTimestamp() }).then(() => { alert("Success! Premium Active 🚀"); location.reload(); }).catch(e => { hideLoader(); alert("Error. Contact support."); }); }
