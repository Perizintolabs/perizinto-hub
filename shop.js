const firebaseConfig = { 
    apiKey: "AIzaSyBcSXio4XHKvWyeEPZncKgBt5ZR1fiKJ-4", 
    authDomain: "perizinto-tailor-hub.firebaseapp.com", 
    projectId: "perizinto-tailor-hub" 
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

// SAFE HELPERS
const safe = (v) => v || "";
const num = (v) => Number(v) || 0;

let scale = 1, pointX = 0, pointY = 0, start = { x: 0, y: 0 }, initialDist = 0;
const urlParams = new URLSearchParams(window.location.search);
const TAILOR_ID = urlParams.get('id');
let FOCUS_ID = urlParams.get('view');
let TAILOR_PHONE = "", isTailorPremium = false, currentBrand = "Fashion Hub";
let allCustomerDesigns = [], customerFavorites = JSON.parse(localStorage.getItem('cust_favs')) || [], showingOnlyFavs = false;

// 1. INITIALIZATION
function initUI() {
    if(localStorage.getItem('cust_theme') === 'dark') document.body.classList.add('dark-mode');
    const hour = new Date().getHours();
    let greeting = hour < 12 ? "GOOD MORNING · YOUR STYLE AWAITS" : (hour < 17 ? "GOOD AFTERNOON · ELEVATE YOUR LOOK" : "GOOD EVENING · PLAN YOUR WARDROBE");
    document.getElementById('time-greeting').innerText = greeting;
}
initUI();

// 2. STRICT PHONE ROUTING
function requireTailorPhone(cb) {
    if (!TAILOR_PHONE) return openModal("Unavailable ⚠️", "Designer Contact Unavailable.");
    let p = TAILOR_PHONE.replace(/\D/g, ''); 
    if (p.startsWith('0')) p = '234' + p.substring(1);
    else if (!p.startsWith('234')) p = '234' + p;
    cb(p);
}

async function incrementPendingInquiry(id) {
    if (!id) return;
    try { await db.collection("designs").doc(id).update({ pendingInquiries: firebase.firestore.FieldValue.increment(1) }); } catch (e) {}
}

// 3. LIGHTBOX
window.openLightbox = (src, isVideo = false) => {
    const modal = document.getElementById('lightbox-modal');
    const container = document.getElementById('lightbox-content');
    scale = 1; pointX = 0; pointY = 0;
    if (isVideo) {
        const isYouTube = src.includes('youtube.com') || src.includes('youtu.be');
        if (isYouTube) {
            let videoId = src.includes('v=') ? src.split('v=')[1].split('&')[0] : src.split('/').pop();
            container.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" style="width:95%;height:50vh;border-radius:10px;"></iframe>`;
        } else {
            container.innerHTML = `<video controls autoplay style="max-width:95%;max-height:85vh;"><source src="${src}"></video>`;
        }
    } else {
        container.innerHTML = `<img id="lightbox-img" src="${src}" style="transform:translate(0,0) scale(1);max-width:95%;max-height:85vh;cursor:grab;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect width=\'200\' height=\'200\' fill=\'%23ddd\'/%3E%3Ctext x=\'50%%\' y=\'50%%\' fill=\'%23999\'%3E🖼️%3C/text%3E%3C/svg%3E';">`;
        setupGestures();
    }
    modal.style.display = 'flex';
    document.addEventListener('keydown', handleLightboxEscape);
};

window.closeLightbox = () => {
    const modal = document.getElementById('lightbox-modal');
    if (modal) { modal.style.display = 'none'; document.getElementById('lightbox-content').innerHTML = ''; }
    document.removeEventListener('keydown', handleLightboxEscape);
};

function handleLightboxEscape(e) { if (e.key === 'Escape') closeLightbox(); }
document.addEventListener('click', (e) => { if (e.target.closest('#lightbox-modal .close-modal')) closeLightbox(); });

function setupGestures() {
    const c = document.getElementById('lightbox-content');
    c.addEventListener('touchstart', handleTouchStart, { passive: false });
    c.addEventListener('touchmove', handleTouchMove, { passive: false });
}
function handleTouchStart(e) {
    if (e.touches.length === 2) initialDist = Math.hypot(e.touches[0].pageX-e.touches[1].pageX, e.touches[0].pageY-e.touches[1].pageY);
    else if (e.touches.length === 1) start = { x: e.touches[0].pageX-pointX, y: e.touches[0].pageY-pointY };
}
function handleTouchMove(e) {
    e.preventDefault(); const img = document.getElementById('lightbox-img'); if(!img) return;
    if (e.touches.length === 2) {
        let d = Math.hypot(e.touches[0].pageX-e.touches[1].pageX, e.touches[0].pageY-e.touches[1].pageY);
        scale = Math.min(Math.max(1, scale*(d/initialDist)), 4); initialDist = d;
    } else if (e.touches.length === 1 && scale > 1) {
        pointX = e.touches[0].pageX-start.x; pointY = e.touches[0].pageY-start.y;
    }
    img.style.transform = `translate(${pointX}px,${pointY}px) scale(${scale})`;
}

window.openModal = (t,b) => { document.getElementById('modal-title').innerText=t; document.getElementById('modal-body').innerHTML=b; document.getElementById('ui-modal').style.display='flex'; };
window.closeModal = id => document.getElementById(id).style.display='none';

// 4. DATA FETCH
let tailorLoaded=false, designsLoaded=false;
function tryRender() { if(tailorLoaded&&designsLoaded) { renderCustomerCatalog(allCustomerDesigns); renderCategoryChips(); document.getElementById('global-loader').style.display='none'; } }
function renderCategoryChips() {
    const cats = [...new Set(allCustomerDesigns.map(d=>safe(d.category)).filter(c=>c.trim()))].sort();
    const bar = document.getElementById('category-bar');
    let html = `<div class="chip active" onclick="filterData('All',this)">All</div>`;
    cats.forEach(c=> html += `<div class="chip" onclick="filterData('${c}',this)">${c}</div>`);
    bar.innerHTML = html;
}

if (TAILOR_ID) {
    document.getElementById('global-loader').style.display='flex';
    db.collection("tailors").doc(TAILOR_ID).get().then(doc=>{
        if(doc.exists) { const d=doc.data(); TAILOR_PHONE=d.phoneNumber||""; currentBrand=d.brandName||"Fashion Hub"; document.getElementById('brand-title').innerText=currentBrand; document.getElementById('side-brand').innerText=currentBrand; isTailorPremium=d.isPremium||false; }
        tailorLoaded=true; tryRender();
    }).catch(()=>{ tailorLoaded=true; tryRender(); });
    db.collection("designs").where("ownerId","==",TAILOR_ID).get().then(snap=>{ allCustomerDesigns=snap.docs.map(d=>({id:d.id,...d.data()})); designsLoaded=true; tryRender(); }).catch(()=>{ designsLoaded=true; tryRender(); });
} else document.getElementById('global-loader').style.display='none';

// 5. RENDER CATALOG
function renderCustomerCatalog(data) {
    const list = document.getElementById('customer-list');
    document.getElementById('fav-count').innerText = customerFavorites.length;
    document.getElementById('header-heart').style.color = showingOnlyFavs ? "#e74c3c" : "#ccc";
    let processed = data.sort((a,b)=>b.createdAt-a.createdAt);
    if (FOCUS_ID && !showingOnlyFavs) { const t = processed.find(d=>d.id===FOCUS_ID); if(t) processed=[t]; }
    else if (!isTailorPremium) processed = processed.slice(0,10);
    if (showingOnlyFavs) processed = processed.filter(d=>customerFavorites.includes(d.id));
    list.innerHTML = "";
    if (!processed.length) { list.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:50px;">No styles found 😕<br><small>Try another category</small></div>`; return; }
    const noPhone = !TAILOR_PHONE;
    processed.forEach(d=>{
        const canShowVideo = isTailorPremium && safe(d.media) !== "";
        const videoBtn = canShowVideo ? `<div class="video-indicator" onclick="event.stopPropagation();openLightbox('${d.media}',true)"><i class="fas fa-play"></i></div>` : '';
        const isFav = customerFavorites.includes(d.id), isOut = num(d.qty)===0, isLimited = !isOut && num(d.qty)<3;
        const service = safe(d.serviceType)||'Full Package';
        const serviceBadge = `<span class="service-badge">${service==='Sewing Only'?'🧵 Sewing':'📦 Full'}</span>`;
        let specBtn = '';
        if (d.shoulder||d.chest||d.length||d.details) specBtn = `<button class="spec-btn" onclick="showDynamicSpecs('${d.id}')"><i class="fas fa-tape"></i> View Fit Specs</button>`;
        const priceFmt = num(d.price).toLocaleString();
        list.innerHTML += `
        <div class="design-card">
            <div class="image-wrapper" onclick="openLightbox('${d.img}',false)">
                ${videoBtn}
                <img src="${d.img}" class="card-img" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'110\' height=\'140\'%3E%3Crect width=\'110\' height=\'140\' fill=\'%23ddd\'/%3E%3Ctext x=\'55\' y=\'70\' fill=\'%23999\'%3E🖼️%3C/text%3E%3C/svg%3E';">
                ${isLimited?'<div class="badge-limited">LIMITED</div>':''}
                ${isOut?'<div class="badge-limited" style="background:#888;">OUT</div>':''}
                <button class="icon-btn btn-heart" onclick="event.stopPropagation();toggleFav('${d.id}')"><i class="${isFav?'fas':'far'} fa-heart" style="color:${isFav?'#e74c3c':'#ccc'}"></i></button>
                <button class="icon-btn btn-share" onclick="event.stopPropagation();universalShare('${d.id}','${safe(d.name).replace(/'/g,"\\'")}','${d.img}')"><i class="fas fa-share-alt"></i></button>
            </div>
            <div class="card-details">
                <div>
                    <div class="card-title">${safe(d.name) || 'Exclusive Design'}</div>
                    <div class="card-price"><span class="currency-symbol">₦</span>${priceFmt} ${serviceBadge}</div>
                    ${specBtn}
                </div>
                <button class="order-btn" onclick="placeOrder('${safe(d.name)}','${d.price}','${d.id}')" ${isOut||noPhone?'disabled':''}>
                    <i class="fab fa-whatsapp"></i> ${isOut?'Out of Stock':(noPhone?'Contact Unavailable':'Order on WhatsApp')}
                </button>
            </div>
        </div>`;
    });
    if (FOCUS_ID && !showingOnlyFavs && processed.length===1) list.innerHTML += `<button class="view-all-btn" onclick="clearFocus()">View Full Collection</button>`;
}
window.clearFocus = ()=>{ FOCUS_ID=null; history.pushState({},'',location.pathname+'?id='+TAILOR_ID); renderCustomerCatalog(allCustomerDesigns); };

window.showDynamicSpecs = (id)=>{
    const d = allCustomerDesigns.find(i=>i.id===id); if(!d) return;
    let html = `<div style="padding-bottom:12px;">Lead Designer dimensions:(in inches)</div><div class="measurement-box-container">`;
    const row = (l,v)=>v?`<div class="measurement-box-row"><span>${l}</span><span class="measurement-value">${!isNaN(v)?v+' in':v}</span></div>`:'';
    html += row("Shoulder",d.shoulder)+row("Chest",d.chest)+row("Length",d.length);
    const exclude = ['id','name','img','price','qty','category','ownerId','createdAt','media','shoulder','chest','length','serviceType','pendingInquiries'];
    Object.keys(d).forEach(k=>{ if(!exclude.includes(k)&&d[k]!="") html += row(k,d[k]); });
    openModal("Fit Specifications 📏", html+'</div>');
};

window.filterData = (type,el)=>{
    document.querySelectorAll('#category-bar .chip, #price-bar .chip').forEach(c=>c.classList.remove('active'));
    el.classList.add('active'); showingOnlyFavs=false; clearFocus();
    if (type==='All') renderCustomerCatalog(allCustomerDesigns);
    else if (type==='< 15k') renderCustomerCatalog(allCustomerDesigns.filter(d=>num(d.price)<15000));
    else if (type==='15k - 50k') renderCustomerCatalog(allCustomerDesigns.filter(d=>num(d.price)>=15000&&num(d.price)<=50000));
    else if (type==='> 50k') renderCustomerCatalog(allCustomerDesigns.filter(d=>num(d.price)>50000));
    else { const t=type.toLowerCase(); renderCustomerCatalog(allCustomerDesigns.filter(d=>(safe(d.category).toLowerCase()===t||safe(d.name).toLowerCase().includes(t)))); }
};
document.getElementById('cust-search').addEventListener('input',e=>{ clearFocus(); const t=e.target.value.toLowerCase(); renderCustomerCatalog(allCustomerDesigns.filter(d=>safe(d.name).toLowerCase().includes(t))); });

// FULL USER GUIDE
window.openUserGuide = () => {
    const guide = `
        <div style="font-size:14px; line-height:1.6;">
            <strong style="font-size:16px;">🧵 Welcome to Your Fashion Hub!</strong><br><br>
            This is your personal catalogue where you can browse exclusive tailor‑made designs and order directly via WhatsApp.<br><br>
            
            <strong>🔍 Browsing Styles</strong><br>
            • Scroll to see all available designs.<br>
            • Use the category chips (Agbada, Ankara, etc.) to filter by style.<br>
            • Use the price chips to see designs within your budget.<br>
            • Tap the search bar to find specific styles by name.<br><br>
            
            <strong>❤️ Saving Favorites</strong><br>
            • Tap the heart icon on any design to save it to your wishlist.<br>
            • Tap the heart in the top‑right corner to view only your favorites.<br><br>
            
            <strong>🔎 Viewing Details</strong><br>
            • Tap any image to zoom in and inspect the fabric.<br>
            • Pinch to zoom further and pan around.<br>
            • If you see a <i class="fas fa-play"></i> Play button, tap it to watch a video of the fabric.<br>
            • Click <strong>View Fit Specs</strong> to see exact measurements.<br><br>
            
            <strong>📦 Placing an Order</strong><br>
            • Tap the green <strong>Order on WhatsApp</strong> button.<br>
            • A pre‑filled message will open in WhatsApp.<br>
            • Fill in your name, location, and whether you want Sewing Only or Full Package.<br>
            • Send the message – the designer will reply with payment details.<br><br>
            
            <strong>📤 Sharing</strong><br>
            • Use the share icon <i class="fas fa-share-alt"></i> on any design to send it to friends or family.<br>
            • Share the entire hub using <strong>Invite to Hub</strong> in the side menu.<br><br>
            
            <strong>🌙 Other Features</strong><br>
            • Switch between light and dark mode in the side menu.<br>
            • Use <strong>Order Custom Design</strong> if you have a unique idea.<br>
            • Report any issues directly to the designer via the side menu.<br><br>
            
            <strong>❓ Need Help?</strong><br>
            Contact the designer via the WhatsApp button or use "Report Issue".
        </div>
    `;
    openModal("Customer Guide 📘", guide);
};

// UNIVERSAL SHARING
window.universalShare = async (id, name, imageUrl) => {
  
    const currentUrl = new URL(window.location.href);
    
    const link = new URL(currentUrl.origin + currentUrl.pathname);
    
    link.searchParams.set('id', TAILOR_ID);
    link.searchParams.set('view', id);
    
    const shareTitle = safe(name);
    const finalLink = link.toString();
   
    if (navigator.share) {
        try {
            await navigator.share({
                title: shareTitle,
                text: `Check out this design: ${shareTitle}`,
                url: finalLink
            });
            return;
        } catch (e) {
            if (e.name !== 'AbortError') console.log('Native share failed, falling back');
        }
    }
    
    const fallbackOptions = `
        <div style="display:flex; flex-direction:column; gap:12px;">
            <button onclick="copyShareLink('${finalLink}')" style="padding:14px; background:#007bff; color:white; border:none; border-radius:8px; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:8px;">
                <i class="fas fa-copy"></i> Copy Link
            </button>
            <button onclick="shareViaEmail('${shareTitle}', '${finalLink}')" style="padding:14px; background:#ea4335; color:white; border:none; border-radius:8px; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:8px;">
                <i class="fas fa-envelope"></i> Share via Email
            </button>
            <button onclick="shareViaWhatsApp('${shareTitle}', '${finalLink}')" style="padding:14px; background:#25D366; color:white; border:none; border-radius:8px; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:8px;">
                <i class="fab fa-whatsapp"></i> Share on WhatsApp
            </button>
            <button onclick="shareViaInstagram('${shareTitle}', '${finalLink}')" style="padding:14px; background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888); color:white; border:none; border-radius:8px; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:8px;">
                <i class="fab fa-instagram"></i> Share on Instagram
            </button>
        </div>
    `;
    openModal('Share This Design', fallbackOptions);
};

window.copyShareLink = (link) => {
    navigator.clipboard.writeText(link).then(() => {
        alert('Link copied to clipboard!');
        closeModal('ui-modal');
    }).catch(() => alert('Could not copy link.'));
};

window.shareViaEmail = (title, link) => {
    window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check out this design: ${link}`)}`);
    closeModal('ui-modal');
};

window.shareViaWhatsApp = (title, link) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Check out this style: ${title} - ${link}`)}`);
    closeModal('ui-modal');
};

window.shareViaInstagram = (title, link) => {
    navigator.clipboard.writeText(link).then(() => {
        alert('Link copied! You can paste it in your Instagram bio or story.');
        window.open('https://instagram.com', '_blank');
        closeModal('ui-modal');
    }).catch(() => alert('Could not copy link.'));
};

// Actions
window.orderCustom = ()=> requireTailorPhone(p=> window.open(`https://wa.me/${p}?text=${encodeURIComponent("Hello! I have a custom design request.")}`));
window.placeOrder = (n,pr,id)=>{ requireTailorPhone(p=>{ const msg = `Hello 👋\n\nI want to order:\n*${n}* - ₦${num(pr).toLocaleString()}\n\nMy details:\n- Name: \n- Location: \n- Order Type: [Sewing Only / Full Package]\n\nPlease send payment details.`; window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`); incrementPendingInquiry(id); }); };
window.chatWithDesigner = ()=> requireTailorPhone(p=> window.open(`https://wa.me/${p}?text=Hello, question about ${currentBrand}`));
window.reportIssue = ()=> requireTailorPhone(p=> window.open(`https://wa.me/${p}?text=Issue: ${location.href}`));
window.toggleSidebar = ()=>{ document.getElementById('sidebar').classList.toggle('active'); document.getElementById('overlay').style.display = document.getElementById('sidebar').classList.contains('active')?'block':'none'; };
window.toggleCustomerTheme = ()=>{ const d=document.body.classList.toggle('dark-mode'); localStorage.setItem('cust_theme',d?'dark':'light'); toggleSidebar(); };
window.toggleFav = id=>{ customerFavorites = customerFavorites.includes(id) ? customerFavorites.filter(f=>f!==id) : [...customerFavorites,id]; localStorage.setItem('cust_favs', JSON.stringify(customerFavorites)); renderCustomerCatalog(allCustomerDesigns); };
window.toggleWishlist = ()=>{ showingOnlyFavs=!showingOnlyFavs; clearFocus(); };
window.shareHub = ()=>{ const link=location.href.split('&view=')[0]; if(navigator.share) navigator.share({title:currentBrand,url:link}); else { navigator.clipboard.writeText(link); alert('Hub link copied!'); } };
