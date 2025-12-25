const SUPABASE_URL = 'https://ducmehygksmijtynfuzt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Y21laHlna3NtaWp0eW5mdXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NTgyNTQsImV4cCI6MjA4MTIzNDI1NH0.Zo0RTm5fPn-sA6AkqSIPCCiehn8iW2Ou4I26HnC2CfU';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {

    if(sessionStorage.getItem('role') !== 'admin') window.location.href = 'login.html';
    
    const menuItems = document.querySelectorAll('.menu-item:not(.logout)');
    const sections = document.querySelectorAll('.content-section');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            sections.forEach(sec => sec.classList.remove('active-section'));
            document.getElementById(targetId).classList.add('active-section');
            if(window.innerWidth < 768) toggleSidebar();
            
            if(targetId === 'dashboard') initDashboard();
            if(targetId === 'customers') loadAllCustomers();
            if(targetId === 'sales') quickReport(30);
            if(targetId === 'users') loadStaffList();
            if(targetId === 'templates') loadCurrentTheme(); // New
            if(targetId === 'reviews') loadReviews();
            if(targetId === 'messages') loadMessages();
        });
    });

    window.toggleSidebar = function() {
        document.querySelector('.sidebar').classList.toggle('active');
        document.querySelector('.sidebar-overlay').classList.toggle('active');
    }

    // --- TEMPLATES LOGIC ---
    async function loadCurrentTheme() {
        const { data } = await supabaseClient.from('settings').select('value').eq('key', 'active_theme').single();
        const current = data ? data.value : 'default';
        updateThemeUI(current);
    }

    window.setTheme = async function(themeName, el) {
        // Optimistic UI update
        updateThemeUI(themeName);
        // Save to DB
        await supabaseClient.from('settings').upsert({key: 'active_theme', value: themeName});
        alert(`Theme updated to ${themeName}! Refresh menu page to see changes.`);
    }

    function updateThemeUI(themeName) {
        document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active-theme'));
        // Find card by click or manual logic (simple matching here for demo)
        // In real app, we might add data-theme attribute to cards
        const cards = document.querySelectorAll('.template-card');
        if(themeName === 'default') cards[0].classList.add('active-theme');
        if(themeName === 'dark') cards[1].classList.add('active-theme');
        if(themeName === 'ocean') cards[2].classList.add('active-theme');
    }

    // --- DASHBOARD ---
    async function initDashboard() {
        const now = new Date();
        const f = new Date(now.getFullYear(), now.getMonth(), 1);
        document.getElementById('dashboard-date-title').innerText = `${f.getDate()} ${f.toLocaleString('en',{month:'short'})} - ${now.getDate()} ${now.toLocaleString('en',{month:'short'})} ${now.getFullYear()}`;
        loadMonthStats();
        const { data } = await supabaseClient.from('settings').select('*');
        if(data) data.forEach(s => { const el=document.querySelector(`#chip-${s.key} .val`); if(el) el.innerText=s.value; });
    }
    document.getElementById('save-wh-btn').onclick = async () => {
        const updates = [
            {key:'start-time',value:document.querySelector('#chip-start-time .val').innerText},
            {key:'end-time',value:document.querySelector('#chip-end-time .val').innerText},
            {key:'start-day',value:document.querySelector('#chip-start-day .val').innerText},
            {key:'end-day',value:document.querySelector('#chip-end-day .val').innerText}
        ];
        for(let u of updates) await supabaseClient.from('settings').upsert(u);
        alert("Working hours saved!");
    };
    async function loadMonthStats() {
        const d = new Date(); d.setDate(1);
        const { data } = await supabaseClient.from('orders').select('total_amount').eq('status','completed').gte('created_at', d.toISOString());
        if(data) {
            const r = data.reduce((a,b)=>a+(parseFloat(b.total_amount)||0),0);
            document.getElementById('month-orders').innerText = data.length;
            document.getElementById('month-revenue').innerText = '$'+r.toLocaleString();
        }
    }

    // --- CUSTOMERS ---
    window.switchCustomerTab = function(type, el) {
        document.querySelectorAll('#customers .pill-tab').forEach(t => t.classList.remove('active-tab'));
        el.classList.add('active-tab');
        if(type==='all') loadAllCustomers(); if(type==='loyal') loadLoyalCustomers(); if(type==='valuable') loadMostValuable(); if(type==='interests') loadInterests();
    }
    async function loadAllCustomers() {
        renderHeader(['Name','Phone','Joined']);
        const {data}=await supabaseClient.from('customers').select('*');
        renderList(data, c=>`<span style="flex:1;font-weight:500;">${c.name}</span><span style="flex:1">${c.phone}</span><span style="flex:1;text-align:right;">${new Date(c.created_at).toLocaleDateString()}</span>`);
    }
    async function loadLoyalCustomers() {
        renderHeader(['Name','Phone','Orders']);
        const {data}=await supabaseClient.from('loyal_customers_view').select('*');
        renderList(data, c=>`<span style="flex:1;font-weight:500;">${c.name}</span><span style="flex:1">${c.phone}</span><span style="flex:1;text-align:right;font-weight:bold;">${c.order_count}</span>`);
    }
    async function loadMostValuable() {
        renderHeader(['Name','Spent (1 Yr)','Value']);
        const d=new Date(); d.setFullYear(d.getFullYear()-1);
        const {data}=await supabaseClient.from('orders').select('customer_id,total_amount,customers(name)').eq('status','completed').gte('created_at',d.toISOString());
        const m={}; if(data) data.forEach(o=>{ const i=o.customer_id; if(!m[i]) m[i]={name:o.customers.name,t:0}; m[i].t+=parseFloat(o.total_amount); });
        const s=Object.values(m).sort((a,b)=>b.t-a.t);
        renderList(s, c=>`<span style="flex:1;font-weight:500;">${c.name}</span><span style="flex:1;color:#2ECC71;">$${c.t.toFixed(2)}</span><span style="flex:1;text-align:right;color:#FF724C;">${(c.t*0.1).toFixed(1)}</span>`);
    }
    async function loadInterests() {
        renderHeader(['Customer','Top 3','Fav Food']);
        const {data}=await supabaseClient.from('order_items').select('product_name,ingredients,orders(customer_id,customers(name))');
        const m={}; if(data) data.forEach(i=>{ if(!i.orders)return; const cid=i.orders.customer_id; if(!m[cid])m[cid]={name:i.orders.customers.name,f:{},i:{}}; m[cid].f[i.product_name]=(m[cid].f[i.product_name]||0)+1; if(i.ingredients) i.ingredients.split(',').forEach(x=>{ const k=x.trim(); m[cid].i[k]=(m[cid].i[k]||0)+1; }); });
        const l=Object.values(m).map(c=>{ const tf=Object.entries(c.f).sort((a,b)=>b[1]-a[1])[0]?.[0]||'-'; const ti=Object.entries(c.i).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]).join(', '); return{name:c.name,tf,ti}; });
        renderList(l, c=>`<span style="flex:1;font-weight:500;">${c.name}</span><span style="flex:1;font-size:12px;">${c.ti}</span><span style="flex:1;text-align:right;color:#FF724C;">${c.tf}</span>`);
    }
    function renderHeader(t){ document.getElementById('customer-header').innerHTML=t.map((x,i)=>`<span class="header-item" style="flex:1;${i==t.length-1?'text-align:right':''}">${x}</span>`).join(''); }
    function renderList(d,fn){ const c=document.getElementById('customer-list'); c.innerHTML=''; if(!d||!d.length)c.innerHTML='<p style="padding:15px;color:#aaa">No data.</p>'; else d.forEach(x=>{ const r=document.createElement('div'); r.className='table-row'; r.innerHTML=fn(x); c.appendChild(r); }); }

    // --- SALES ---
    window.switchSalesMode = function(m, el) { document.querySelectorAll('#sales .pill-tab').forEach(t=>t.classList.remove('active-tab')); el.classList.add('active-tab'); document.getElementById('sales-cash-view').style.display=m==='cash'?'block':'none'; document.getElementById('sales-product-view').style.display=m==='product'?'block':'none'; if(m==='product') setProductFilter(7,'Last 7 Days'); }
    window.quickReport = async function(d) { const s=new Date(); s.setDate(s.getDate()-d); const {data}=await supabaseClient.from('orders').select('total_amount').eq('status','completed').gte('created_at',s.toISOString()); const t=data?data.reduce((a,b)=>a+(parseFloat(b.total_amount)||0),0):0; document.getElementById('report-revenue').innerText='$'+t.toLocaleString(); }
    window.setProductFilter = async function(v, l) {
        document.querySelector('#chip-prod-range .val').innerText=l; document.querySelector('.chip-menu').classList.remove('show');
        let s=new Date(),e=new Date(); if(typeof v==='number') s.setDate(s.getDate()-v); else { const y=e.getFullYear(); if(v==='Spring'){s=new Date(y,2,21);e=new Date(y,5,21);} if(v==='Summer'){s=new Date(y,5,22);e=new Date(y,8,22);} if(v==='Autumn'){s=new Date(y,8,23);e=new Date(y,11,21);} if(v==='Winter'){s=new Date(y,11,22);e=new Date(y+1,2,20);} }
        const {data}=await supabaseClient.from('order_items').select('product_name,final_price,quantity').gte('created_at',s.toISOString()).lte('created_at',e.toISOString());
        const ls=document.getElementById('product-list'); ls.innerHTML='';
        if(data){ const a={}; data.forEach(i=>{ if(!a[i.product_name])a[i.product_name]={q:0,t:0}; a[i.product_name].q+=i.quantity; a[i.product_name].t+=i.quantity*i.final_price; });
        Object.entries(a).forEach(([n,st])=>{ ls.innerHTML+=`<div class="table-row"><span style="flex:2;font-weight:500;">${n}</span><span style="flex:1;">${st.q}</span><span style="flex:1;text-align:right;">$${st.t.toFixed(2)}</span></div>`; }); }
    }

    // --- USERS ---
    window.switchUserTab = function(t, el) { document.querySelectorAll('#users .pill-tab').forEach(x=>x.classList.remove('active-tab')); el.classList.add('active-tab'); document.getElementById('user-tab-staff').style.display=t==='staff'?'block':'none'; document.getElementById('user-tab-admin').style.display=t==='admin'?'block':'none'; if(t==='staff') loadStaffList(); else loadAdminList(); }
    document.getElementById('create-btn').onclick=async()=>{ const u=document.getElementById('new-user').value; const p=document.getElementById('new-pass').value; await supabaseClient.from('staff').insert([{username:u,password:p}]); loadStaffList(); };
    document.getElementById('create-admin-btn').onclick=async()=>{ const u=document.getElementById('admin-user').value; const p=document.getElementById('admin-pass').value; await supabaseClient.from('admins').insert([{username:u,password:p}]); loadAdminList(); };
    async function loadStaffList(){ const c=document.getElementById('staff-list-container'); const {data}=await supabaseClient.from('staff').select('*'); renderU(c,data,'staff'); }
    async function loadAdminList(){ const c=document.getElementById('admin-list-container'); const {data}=await supabaseClient.from('admins').select('*'); renderU(c,data,'admins'); }
    function renderU(c,d,t){ c.innerHTML=''; if(d)d.forEach(u=>{ const div=document.createElement('div'); div.className='table-row'; div.innerHTML=`<span style="flex:1;font-weight:500;">${u.username}</span><span style="flex:1;text-align:right;"><button onclick="changePass('${t}',${u.id})" style="background:none;border:none;color:#F39C12;cursor:pointer;margin-right:10px;">Pass</button><button onclick="deleteUser('${t}',${u.id})" style="background:none;border:none;color:#E74C3C;cursor:pointer;">Delete</button></span>`; c.appendChild(div); }); }
    window.changePass=async(t,id)=>{ const p=prompt('New Pass:'); if(p)await supabaseClient.from(t).update({password:p}).eq('id',id); }
    window.deleteUser=async(t,id)=>{ if(confirm('Delete?')){ await supabaseClient.from(t).delete().eq('id',id); if(t==='staff')loadStaffList(); else loadAdminList(); } }

    // --- REVIEWS ---
    let notif=false,sound=true;
    window.toggleNotifSetting=()=>{ notif=!notif; document.getElementById('notif-state').innerText=notif?'ON':'OFF'; document.getElementById('sound-btn').style.display=notif?'flex':'none'; }
    window.toggleSoundSetting=()=>{ sound=!sound; document.getElementById('sound-state').innerText=sound?'ON':'OFF'; if(sound)document.getElementById('notif-sound').play(); }
    async function loadReviews(){ const {data}=await supabaseClient.from('reviews').select('*'); const c=document.getElementById('reviews-container'); c.innerHTML=''; if(data)data.forEach(r=>{ c.innerHTML+=`<div class="clean-table" style="margin-bottom:10px;padding:15px;"><strong>${r.customer_name}</strong> (${r.rating} stars)<p style="margin:5px 0 0 0;color:#666;">${r.comment}</p></div>`; }); }
    async function loadMessages(){ const {data}=await supabaseClient.from('messages').select('*'); const c=document.getElementById('messages-container'); c.innerHTML=''; if(data)data.forEach(m=>{ c.innerHTML+=`<div style="padding:10px;border-bottom:1px solid #eee;"><b>${m.title}</b>: ${m.body}</div>`; }); }

    // --- MODAL & CHIPS ---
    document.getElementById('profile-trigger').onclick=()=>document.getElementById('profile-modal').style.display='flex';
    document.getElementById('save-profile-btn').onclick=async()=>{ const u=document.getElementById('edit-self-user').value; const p=document.getElementById('edit-self-pass').value; const c=document.getElementById('header-username').innerText; await supabaseClient.from('admins').update({username:u,password:p}).eq('username',c); window.location.href='login.html'; };
    window.toggleChip=(id)=>{ document.querySelectorAll('.chip-menu').forEach(m=>m.classList.remove('show')); document.getElementById('menu-'+id).classList.add('show'); };
    const ts=Array.from({length:24},(_,i)=>`${i.toString().padStart(2,'0')}:00`); const ds=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']; ['start-time','end-time'].forEach(t=>fillM(t,ts)); ['start-day','end-day'].forEach(t=>fillM(t,ds));
    function fillM(id,arr){ const m=document.getElementById('menu-'+id); arr.forEach(v=>{ const d=document.createElement('div'); d.className='chip-option'; d.innerText=v; d.onclick=()=>{ document.querySelector(`#chip-${id} .val`).innerText=v; m.classList.remove('show'); }; m.appendChild(d); }); }
    window.onclick=(e)=>{ if(!e.target.closest('.chip-dropdown')) document.querySelectorAll('.chip-menu').forEach(m=>m.classList.remove('show')); }
});
