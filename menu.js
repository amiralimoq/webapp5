// SUPABASE CONFIG
const SUPABASE_URL = 'https://ducmehygksmijtynfuzt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Y21laHlna3NtaWp0eW5mdXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NTgyNTQsImV4cCI6MjA4MTIzNDI1NH0.Zo0RTm5fPn-sA6AkqSIPCCiehn8iW2Ou4I26HnC2CfU';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 0. LOAD THEME FROM DB ---
    try {
        const { data } = await supabaseClient.from('settings').select('value').eq('key', 'active_theme').single();
        if (data && data.value) {
            applyTheme(data.value);
        }
    } catch (err) {
        console.log("Using default theme");
    }

    function applyTheme(themeName) {
        const root = document.documentElement;
        if(themeName === 'dark') {
            root.style.setProperty('--primary-color', '#FF724C');
            root.style.setProperty('--bg-color', '#121212');
            root.style.setProperty('--sidebar-bg', '#1E1E1E');
            root.style.setProperty('--text-dark', '#FFFFFF');
            root.style.setProperty('--text-grey', '#AAAAAA');
            document.body.style.backgroundColor = '#000';
            // Update cards
            document.querySelectorAll('.menu-card, .tab, .search-bar').forEach(el => {
                el.style.backgroundColor = '#1E1E1E';
                el.style.color = '#fff';
            });
        }
        else if(themeName === 'ocean') {
            root.style.setProperty('--primary-color', '#0288D1');
            root.style.setProperty('--bg-color', '#E3F2FD');
            document.body.style.backgroundColor = '#B3E5FC';
            document.querySelector('.logo span').style.color = '#0288D1';
            // Re-apply for dynamic elements
            document.querySelectorAll('.btn-add, .badge, .active-cat').forEach(el => {
                el.style.backgroundColor = '#0288D1';
            });
        }
        // Default is already set in CSS
    }


    // --- 1. SIDEBAR ---
    const menuItems = document.querySelectorAll('.sidebar .menu-item:not(.logout)');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            if(window.innerWidth < 768) toggleSidebar();
        });
    });

    const logoutBtn = document.querySelector('.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to logout?")) alert("Logged out successfully!");
        });
    }

    // --- 2. CART ---
    const cartBtns = document.querySelectorAll('.btn-add');
    const cartBadge = document.querySelector('.cart-btn .badge');
    let cartCount = 2; 
    cartBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if(this.classList.contains('added')) return;
            cartCount++;
            cartBadge.textContent = cartCount;
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="ri-check-line"></i> Added';
            this.style.backgroundColor = '#2ECC71';
            this.style.color = '#fff';
            this.classList.add('added');
            setTimeout(() => {
                this.innerHTML = originalText;
                this.style.backgroundColor = ''; 
                this.style.color = '';
                this.classList.remove('added');
            }, 2000);
        });
    });

    // --- 3. FILTER ---
    const categoryTabs = document.querySelectorAll('.menu-categories .tab');
    const menuCards = document.querySelectorAll('.menu-card');
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            categoryTabs.forEach(t => t.classList.remove('active-cat'));
            tab.classList.add('active-cat');
            const category = tab.innerText.trim().toLowerCase();
            menuCards.forEach(card => {
                const title = card.querySelector('h4').innerText.toLowerCase();
                const desc = card.querySelector('.menu-desc').innerText.toLowerCase();
                if (category === 'all' || title.includes(category) || desc.includes(category)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // --- 4. SEARCH ---
    const searchInput = document.querySelector('.search-bar input');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchText = e.target.value.toLowerCase();
            menuCards.forEach(card => {
                const title = card.querySelector('h4').innerText.toLowerCase();
                const desc = card.querySelector('.menu-desc').innerText.toLowerCase();
                if (title.includes(searchText) || desc.includes(searchText)) card.style.display = 'flex';
                else card.style.display = 'none';
            });
        });
    }

    // --- 5. MOBILE MENU ---
    window.toggleSidebar = function() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        sidebar.classList.toggle('active');
        if(overlay) overlay.classList.toggle('active');
    }
});
