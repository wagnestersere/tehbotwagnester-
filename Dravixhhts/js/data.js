// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let users = [];
let products = [];
let sellerProducts = [];
let transactions = [];
let pendingOrders = [];
let promoCodes = [];
let currentUser = null;
let tickerText = '🔥 Добро пожаловать в Dravix Shop! 🔥 1 DravixCoin = 1 ₽ 🔥';

let nextProductId = 1;
let nextTransId = 1;
let nextOrderId = 1;

// ========== ФУНКЦИИ РАБОТЫ С ДАННЫМИ ==========
function saveData() {
    localStorage.setItem('dravix_users', JSON.stringify(users));
    localStorage.setItem('dravix_products', JSON.stringify(products));
    localStorage.setItem('dravix_seller_products', JSON.stringify(sellerProducts));
    localStorage.setItem('dravix_transactions', JSON.stringify(transactions));
    localStorage.setItem('dravix_pending_orders', JSON.stringify(pendingOrders));
    localStorage.setItem('dravix_promocodes', JSON.stringify(promoCodes));
    localStorage.setItem('dravix_currentUser', JSON.stringify(currentUser));
    localStorage.setItem('dravix_ticker', tickerText);
    
    if (document.getElementById('tickerText')) {
        document.getElementById('tickerText').textContent = tickerText;
    }
    if (currentUser && document.getElementById('userBalance')) {
        document.getElementById('userBalance').textContent = currentUser.balance;
    }
}

function loadData() {
    users = JSON.parse(localStorage.getItem('dravix_users') || '[]');
    products = JSON.parse(localStorage.getItem('dravix_products') || '[]');
    sellerProducts = JSON.parse(localStorage.getItem('dravix_seller_products') || '[]');
    transactions = JSON.parse(localStorage.getItem('dravix_transactions') || '[]');
    pendingOrders = JSON.parse(localStorage.getItem('dravix_pending_orders') || '[]');
    promoCodes = JSON.parse(localStorage.getItem('dravix_promocodes') || '[]');
    currentUser = JSON.parse(localStorage.getItem('dravix_currentUser') || 'null');
    tickerText = localStorage.getItem('dravix_ticker') || '🔥 Добро пожаловать в Dravix Shop! 🔥 1 DravixCoin = 1 ₽ 🔥';
}

function initData() {
    loadData();
    
    // Создание владельца
    const ownerExists = users.some(u => u.username === 'Dravix');
    if (!ownerExists) {
        users.push({ 
            username: 'Dravix', 
            password: btoa('Dravixshop'), 
            role: 'owner', 
            isSeller: true, 
            balance: 0, 
            avatar: '', 
            bio: 'Основатель Dravix Shop', 
            totalBought: 0, 
            totalSold: 0, 
            betaTester: true 
        });
    }
    
    // Товары Dravix
    if (products.length === 0) {
        products = [
            { id: 1, name: "Telegram Premium", price: 199, seller: "Dravix", category: "telegram", sales: 45 },
            { id: 2, name: "100 Telegram Stars", price: 149, seller: "Dravix", category: "stars", sales: 78 },
            { id: 3, name: "500₽ Steam", price: 450, seller: "Dravix", category: "steam", sales: 23 }
        ];
        nextProductId = 4;
    } else {
        const maxId = Math.max(...products.map(p => p.id), ...sellerProducts.map(p => p.id), 0);
        nextProductId = maxId + 1;
    }
    
    nextTransId = transactions.length + 1;
    nextOrderId = pendingOrders.length + 1;
    
    saveData();
}

function getRoleIcon(role, betaTester) {
    if (role === 'owner') return `<span class="role-icon"><i class="fas fa-shield-alt owner-icon"></i><span class="tooltip">Владелец - Dravix</span></span>`;
    if (role === 'admin') return `<span class="role-icon"><i class="fas fa-user-shield admin-icon"></i><span class="tooltip">Администратор</span></span>`;
    if (betaTester) return `<span class="role-icon"><i class="fas fa-flask beta-icon"></i><span class="tooltip">Бета тестер</span></span>`;
    return '';
}

function getRoleBadge(role, betaTester) {
    if (role === 'owner') return '<span class="badge badge-owner">👑 Владелец</span>';
    if (role === 'admin') return '<span class="badge badge-admin">⚡ Админ</span>';
    if (betaTester) return '<span class="badge badge-beta">🧪 Бета</span>';
    return '';
}

function showNotification(msg) { 
    const n = document.createElement('div'); 
    n.className = 'purchase-notification'; 
    n.innerHTML = msg; 
    document.body.appendChild(n); 
    setTimeout(() => n.remove(), 3000); 
}