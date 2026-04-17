// ========== ПРОФИЛЬ ==========
function openProfileModal() {
    if (!currentUser) { openAuthModal(); return; }
    const user = users.find(u => u.username === currentUser.username);
    const pendingForUser = pendingOrders.filter(o => o.buyer === currentUser.username && o.status === 'pending');
    
    document.getElementById('profileModalBody').innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar-section">
                ${user.avatar ? `<img src="${user.avatar}" class="profile-avatar" id="avatarPreview">` : `<div class="profile-avatar" style="background: var(--accent-red); display: flex; align-items: center; justify-content: center; font-size: 3rem;">${user.username[0].toUpperCase()}</div>`}
                <input type="file" id="avatarInput" style="margin-top: 10px;">
                <div class="form-group" style="margin-top: 10px;"><label>URL аватара</label><input type="text" id="avatarUrl" placeholder="https://..."></div>
            </div>
            <div class="profile-info">
                <div class="form-group"><label>Никнейм</label><input type="text" id="editUsername" value="${user.username}"></div>
                <div class="form-group"><label>О себе</label><textarea id="editBio" rows="3">${user.bio || ''}</textarea></div>
            </div>
        </div>
        <div class="profile-stats">
            <div class="stat-card"><div class="value">${user.totalBought || 0}</div><div>Покупок</div></div>
            <div class="stat-card"><div class="value">${user.totalSold || 0}</div><div>Продаж</div></div>
            <div class="stat-card"><div class="value">${user.balance || 0} DC</div><div>Баланс</div></div>
        </div>
        <div class="pending-orders">
            <h3>Ожидают подтверждения (${pendingForUser.length})</h3>
            ${pendingForUser.map(o => `<div class="pending-order"><span>${o.product} - ${o.price} DC</span><button class="modal-btn submit confirm-btn" onclick="openConfirmModalForOrder(${o.id})">✅ Подтвердить</button></div>`).join('')}
        </div>
        ${!user.isSeller ? `<button class="product-btn" onclick="becomeSeller()"><i class="fas fa-store"></i> Стать продавцом</button>` : ''}
    `;
    
    document.getElementById('avatarInput').onchange = (e) => { 
        const file = e.target.files[0]; 
        if(file) { 
            const reader = new FileReader(); 
            reader.onload = (ev) => { 
                document.getElementById('avatarPreview').src = ev.target.result; 
                document.getElementById('avatarUrl').value = ev.target.result; 
            }; 
            reader.readAsDataURL(file); 
        } 
    };
    document.getElementById('profileModal').classList.add('active');
}

function openConfirmModalForOrder(orderId) {
    const order = pendingOrders.find(o => o.id === orderId);
    if (order) openConfirmModal(order);
    closeProfileModal();
}

function saveProfile() {
    const user = users.find(u => u.username === currentUser.username);
    const newUsername = document.getElementById('editUsername').value.trim();
    if (newUsername && newUsername !== user.username && user.role !== 'owner') {
        if (users.find(u => u.username === newUsername)) { showNotification('Никнейм занят'); return; }
        user.username = newUsername;
        currentUser.username = newUsername;
    }
    user.bio = document.getElementById('editBio').value;
    const avatarUrl = document.getElementById('avatarUrl').value;
    if (avatarUrl) user.avatar = avatarUrl;
    saveData();
    closeProfileModal();
    updateUI();
    showNotification('Профиль обновлен');
}

function closeProfileModal() { 
    document.getElementById('profileModal').classList.remove('active'); 
}

// ========== ПАНЕЛЬ ПРОДАВЦА ==========
function openSellerPanel() {
    if (!currentUser?.isSeller) { showNotification('Вы не продавец'); return; }
    
    document.getElementById('profileModalBody').innerHTML = `
        <h3>Добавить товар</h3>
        <div class="form-group"><label>Название</label><input type="text" id="productName"></div>
        <div class="form-group"><label>Цена (DravixCoin)</label><input type="number" id="productPrice"></div>
        <div class="form-group"><label>Описание</label><textarea id="productDesc" rows="2"></textarea></div>
        <button class="modal-btn submit" onclick="addSellerProduct()">Добавить товар</button>
        <h3>Мои товары</h3>
        <div id="sellerProductsList"></div>
        <h3>Ожидают подтверждения</h3>
        <div id="sellerPendingOrders"></div>
    `;
    
    const myProducts = sellerProducts.filter(p => p.seller === currentUser.username);
    document.getElementById('sellerProductsList').innerHTML = myProducts.map(p => `
        <div class="seller-product-item">
            <span>${p.name} - ${p.price} DC (продаж: ${p.sales || 0})</span>
            <button class="modal-btn cancel" onclick="deleteSellerProduct(${p.id})">Удалить</button>
        </div>
    `).join('');
    
    const pendingForSeller = pendingOrders.filter(o => o.seller === currentUser.username);
    document.getElementById('sellerPendingOrders').innerHTML = pendingForSeller.map(o => `
        <div class="pending-order">${o.product} - ${o.price} DC | Покупатель: ${o.buyer}</div>
    `).join('');
    
    document.getElementById('profileModal').classList.add('active');
}

function becomeSeller() {
    const user = users.find(u => u.username === currentUser.username);
    user.isSeller = true;
    currentUser.isSeller = true;
    saveData();
    closeProfileModal();
    showNotification('Теперь вы продавец!');
}

function addSellerProduct() {
    const name = document.getElementById('productName').value.trim();
    const price = parseInt(document.getElementById('productPrice').value);
    const desc = document.getElementById('productDesc').value;
    if (!name || !price) { showNotification('Заполните поля'); return; }
    sellerProducts.push({ id: nextProductId++, name, price, desc, seller: currentUser.username, category: 'seller', sales: 0 });
    saveData();
    showNotification('Товар добавлен!');
    openSellerPanel();
    renderSellerProducts();
}

function deleteSellerProduct(id) { 
    sellerProducts = sellerProducts.filter(p => p.id !== id); 
    saveData(); 
    openSellerPanel(); 
    renderSellerProducts(); 
}

// ========== ПОПОЛНЕНИЕ ==========
function openDepositModal() { 
    if (!currentUser) { openAuthModal(); return; } 
    document.getElementById('depositModal').classList.add('active'); 
}

function closeDepositModal() { 
    document.getElementById('depositModal').classList.remove('active'); 
}

function processDeposit() {
    let amount = parseInt(document.getElementById('depositAmount').value);
    const method = document.getElementById('paymentMethod').value;
    if (!amount || amount <= 0) { showNotification('Введите сумму'); return; }
    const user = users.find(u => u.username === currentUser.username);
    user.balance += amount;
    currentUser.balance = user.balance;
    showNotification(`✅ Пополнено ${amount} DravixCoin через ${method === 'card' ? 'банковскую карту' : 'криптовалюту'}`);
    closeDepositModal();
    saveData();
    updateUI();
}