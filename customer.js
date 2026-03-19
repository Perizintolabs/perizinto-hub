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
                renderCatalog(allDesigns);
            });
        }

        function renderCatalog(data) {
            const list = document.getElementById('catalog-list');
            list.innerHTML = "";
            data.forEach(d => {
                const card = document.createElement('div');
                card.className = "stock"; card.style.position = "relative";
                card.innerHTML = `
                    <button class="fav-btn" onclick="toggleFav('${d.id}')"><i class="${favorites.includes(d.id)?'fas':'far'} fa-heart"></i></button>
                    <img src="${d.img}" class="stock-img" onclick="viewImage('${d.img}')">
                    <div class="sub">
                        <b>${d.name}</b><p>₦${d.price}</p>
                        <button class="order-btn" onclick="placeOrder('${d.name}', '${d.price}')"><i class="fab fa-whatsapp"></i> Order Now</button>
                    </div>`;
                list.appendChild(card);
            });
            document.getElementById('fav-badge').innerText = favorites.length;
        }

        function sortPrice() {
            const val = document.getElementById('price-filter').value;
            let sorted = [...allDesigns];
            if(val === 'low') sorted.sort((a,b) => a.price - b.price);
            if(val === 'high') sorted.sort((a,b) => b.price - a.price);
            renderCatalog(sorted);
        }

        function toggleFav(id) {
            favorites = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
            localStorage.setItem('user_favs', JSON.stringify(favorites));
            renderCatalog(allDesigns);
        }

        function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); document.getElementById('overlay').style.display = document.getElementById('sidebar').classList.contains('active') ? 'block' : 'none'; }
        function viewImage(src) { document.getElementById('modal-img').src = src; document.getElementById('image-modal').style.display = 'flex'; }
        
        function toggleTheme() { 
            const isDark = document.body.classList.toggle('dark-mode'); 
            document.getElementById('mode-text-cust').innerText = isDark ? "Light Mode" : "Dark Mode";
            toggleSidebar(); 
        }

        function chatWithTailor() { window.open(`https://wa.me/${TAILOR_PHONE}`); }
        function placeOrder(name, price) { window.open(`https://wa.me/${TAILOR_PHONE}?text=I want to order: ${name} (₦${price})`); }
        
        document.getElementById('customer-search').oninput = (e) => {
            const t = e.target.value.toLowerCase();
            renderCatalog(allDesigns.filter(d => d.name.toLowerCase().includes(t)));
        };