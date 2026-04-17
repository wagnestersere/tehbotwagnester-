// ========== ПОКУПКА ==========
let currentOrder = null;

function buyProduct(name, price, productId, sellerName, type) {
    if (!currentUser) { openAuthModal(); return; }
    if (currentUser.username === sellerName) { showNotification('Нельзя купить свой товар'); return; }
    
    const user = users.find(u => u.username === currentUser.username);
    if (user.balance >= price) {
        user.balance -= price;
        currentUser.balance = user.balance;
        const orderId = nextOrderId++;
        pendingOrders.push({ 
            id: orderId, 
            buyer: currentUser.username, 
            seller: sellerName, 
            product: name, 
            price: price, 
            productId: productId, 
            type: type, 
            status: 'pending', 
            date: Date.now() 
        });
        saveData();
        updateUI();
        showNotification(`💰 Средства заблокированы. Подтвердите получение товара у продавца!`);
        renderProducts();
        renderSellerProducts();
    } else { 
        showNotification(`❌ Недостаточно средств! Нужно ${price} DravixCoin`); 
    }
}

function confirmReceipt() {
    if (!currentOrder) return;
    const order = pendingOrders.find(o => o.id === currentOrder.id);
    if (order) {
        const seller = users.find(u => u.username === order.seller);
        if (seller) {
            seller.balance += order.price;
            seller.totalSold = (seller.totalSold || 0) + 1;
        }
        const buyer = users.find(u => u.username === order.buyer);
        if (buyer) buyer.totalBought = (buyer.totalBought || 0) + 1;
        
        if (order.type === 'dravix') {
            const product = products.find(p => p.id === order.productId);
            if (product) product.sales = (product.sales || 0) + 1;
        } else {
            const product = sellerProducts.find(p => p.id === order.productId);
            if (product) product.sales = (product.sales || 0) + 1;
        }
        
        transactions.push({ 
            id: nextTransId++, 
            buyer: order.buyer, 
            seller: order.seller, 
            product: order.product, 
            amount: order.price, 
            date: Date.now() 
        });
        pendingOrders = pendingOrders.filter(o => o.id !== currentOrder.id);
        saveData();
        showNotification(`✅ Покупка подтверждена! ${order.price} DravixCoin переведены продавцу`);
        closeConfirmModal();
        updateUI();
        renderProducts();
        renderSellerProducts();
    }
    currentOrder = null;
}

function openConfirmModal(order) {
    currentOrder = order;
    document.getElementById('confirmModalBody').innerHTML = `
        <p>Товар: <strong>${order.product}</strong></p>
        <p>Сумма: <strong>${order.price} DravixCoin</strong></p>
        <p>Продавец: ${order.seller}</p>
        <p style="margin-top: 15px; color: var(--warning-color);">⚠️ Убедитесь, что получили товар, прежде чем подтверждать!</p>
    `;
    document.getElementById('confirmModal').classList.add('active');
}

function closeConfirmModal() { 
    document.getElementById('confirmModal').classList.remove('active'); 
    currentOrder = null; 
}

// ========== ОТОБРАЖЕНИЕ ==========
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = products.map(p => `
        <div class="product-card">
            <i class="fas fa-tag" style="font-size: 2rem; color: var(--accent-red);"></i>
            <h3>${p.name}</h3>
            <div class="product-price">${p.price} DC</div>
            <div style="color: var(--text-muted);">Продавец: ${p.seller}</div>
            <button class="product-btn" onclick="buyProduct('${p.name}', ${p.price}, ${p.id}, '${p.seller}', 'dravix')">Купить</button>
        </div>
    `).join('');
}

function renderSellerProducts() {
    const grid = document.getElementById('sellerProductsGrid');
    if (!grid) return;
    if (sellerProducts.length === 0) { 
        grid.innerHTML = '<div style="text-align: center; padding: 50px; color: var(--text-muted);">Нет товаров от продавцов</div>'; 
        return; 
    }
    grid.innerHTML = sellerProducts.map(p => `
        <div class="product-card">
            <i class="fas fa-store" style="font-size: 2rem; color: var(--accent-red);"></i>
            <h3>${p.name}</h3>
            <div class="product-price">${p.price} DC</div>
            <div style="color: var(--text-muted);">Продавец: ${p.seller}</div>
            <div style="font-size: 0.8rem; margin: 10px 0;">${p.desc || ''}</div>
            <button class="product-btn" onclick="buyProduct('${p.name}', ${p.price}, ${p.id}, '${p.seller}', 'seller')">Купить</button>
        </div>
    `).join('');
}

function openCategory(cat) { 
    navigateTo('shop'); 
    const filtered = products.filter(p => p.category === cat); 
    document.getElementById('productsGrid').innerHTML = filtered.map(p => `
        <div class="product-card">
            <h3>${p.name}</h3>
            <div class="product-price">${p.price} DC</div>
            <button class="product-btn" onclick="buyProduct('${p.name}', ${p.price}, ${p.id}, '${p.seller}', 'dravix')">Купить</button>
        </div>
    `).join('');
}