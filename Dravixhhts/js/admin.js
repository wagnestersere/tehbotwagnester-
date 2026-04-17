// ========== АДМИН ПАНЕЛЬ ==========
function openAdminPanel() {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'owner') { 
        showNotification('Доступ запрещен'); 
        return; 
    }
    
    document.getElementById('adminModalBody').innerHTML = `
        <div class="admin-tabs">
            <div class="admin-tab active" onclick="showAdminTab('users')">Пользователи</div>
            <div class="admin-tab" onclick="showAdminTab('products')">Товары Dravix</div>
            <div class="admin-tab" onclick="showAdminTab('sellerProducts')">Товары продавцов</div>
            <div class="admin-tab" onclick="showAdminTab('pending')">Ожидают</div>
            <div class="admin-tab" onclick="showAdminTab('transactions')">Транзакции</div>
        </div>
        <div id="adminTabContent"></div>
    `;
    document.getElementById('adminModal').classList.add('active');
    showAdminTab('users');
}

function showAdminTab(tab) {
    const content = document.getElementById('adminTabContent');
    if (!content) return;
    
    if (tab === 'users') {
        content.innerHTML = `
            <div class="users-table">
                <table>
                    <tr><th>Никнейм</th><th>Роль</th><th>Баланс</th><th>Действия</th></tr>
                    ${users.map(u => `
                        <tr>
                            <td>${u.username} ${getRoleBadge(u.role, u.betaTester)}</td>
                            <td>${u.role}</td>
                            <td>${u.balance} DC</td>
                            <td>${u.username !== 'Dravix' ? `<button onclick="deleteUser('${u.username}')" class="delete-btn">Удалить</button>` : 'Владелец'}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        `;
    } else if (tab === 'products') {
        content.innerHTML = `
            <div class="users-table">
                <table>
                    <tr><th>Товар</th><th>Цена</th><th>Продажи</th><th>Действия</th></tr>
                    ${products.map(p => `
                        <tr>
                            <td>${p.name}</td>
                            <td>${p.price} DC</td>
                            <td>${p.sales || 0}</td>
                            <td><button onclick="deleteAdminProduct(${p.id})" class="delete-btn">Удалить</button></td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        `;
    } else if (tab === 'sellerProducts') {
        content.innerHTML = `
            <div class="users-table">
                <table>
                    <tr><th>Товар</th><th>Цена</th><th>Продавец</th><th>Действия</th></tr>
                    ${sellerProducts.map(p => `
                        <tr>
                            <td>${p.name}</td>
                            <td>${p.price} DC</td>
                            <td>${p.seller}</td>
                            <td><button onclick="deleteAdminSellerProduct(${p.id})" class="delete-btn">Удалить</button></td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        `;
    } else if (tab === 'pending') {
        content.innerHTML = `
            <div class="users-table">
                <table>
                    <tr><th>ID</th><th>Покупатель</th><th>Продавец</th><th>Товар</th><th>Сумма</th><th>Действия</th></tr>
                    ${pendingOrders.map(o => `
                        <tr>
                            <td>${o.id}</td>
                            <td>${o.buyer}</td>
                            <td>${o.seller}</td>
                            <td>${o.product}</td>
                            <td>${o.price} DC</td>
                            <td><button onclick="forceConfirmOrder(${o.id})" class="confirm-btn-small">Принудительно</button></td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        `;
    } else if (tab === 'transactions') {
        content.innerHTML = `
            <div class="users-table">
                <table>
                    <tr><th>ID</th><th>Покупатель</th><th>Продавец</th><th>Товар</th><th>Сумма</th><th>Дата</th></tr>
                    ${transactions.map(t => `
                        <tr>
                            <td>${t.id}</td>
                            <td>${t.buyer}</td>
                            <td>${t.seller}</td>
                            <td>${t.product}</td>
                            <td>${t.amount} DC</td>
                            <td>${new Date(t.date).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        `;
    }
}

function deleteUser(username) { 
    if(username === 'Dravix') { showNotification('Нельзя удалить владельца'); return; } 
    users = users.filter(u => u.username !== username); 
    sellerProducts = sellerProducts.filter(p => p.seller !== username); 
    pendingOrders = pendingOrders.filter(o => o.buyer !== username && o.seller !== username); 
    saveData(); 
    showAdminTab('users'); 
    updateUI(); 
}

function deleteAdminProduct(id) { 
    products = products.filter(p => p.id !== id); 
    saveData(); 
    showAdminTab('products'); 
    renderProducts(); 
}

function deleteAdminSellerProduct(id) { 
    sellerProducts = sellerProducts.filter(p => p.id !== id); 
    saveData(); 
    showAdminTab('sellerProducts'); 
    renderSellerProducts(); 
}

function forceConfirmOrder(id) { 
    const order = pendingOrders.find(o => o.id === id); 
    if(order) { 
        const seller = users.find(u => u.username === order.seller); 
        if(seller) seller.balance += order.price; 
        pendingOrders = pendingOrders.filter(o => o.id !== id); 
        saveData(); 
        showAdminTab('pending'); 
        showNotification(`Заказ #${id} принудительно подтвержден`); 
    } 
}

function closeAdminModal() { 
    document.getElementById('adminModal').classList.remove('active'); 
}