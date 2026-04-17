// ========== ПАНЕЛЬ ВЛАДЕЛЬЦА ==========
function openOwnerPanel() {
    if (currentUser?.role !== 'owner') { 
        showNotification('Доступ только у владельца'); 
        return; 
    }
    
    document.getElementById('ownerModalBody').innerHTML = `
        <div class="admin-tabs">
            <div class="admin-tab active" onclick="showOwnerTab('promo')">Промокоды</div>
            <div class="admin-tab" onclick="showOwnerTab('ticker')">Новостная строка</div>
            <div class="admin-tab" onclick="showOwnerTab('admins')">Администраторы</div>
            <div class="admin-tab" onclick="showOwnerTab('transactions')">Транзакции</div>
        </div>
        <div id="ownerTabContent"></div>
    `;
    document.getElementById('ownerModal').classList.add('active');
    showOwnerTab('promo');
}

function showOwnerTab(tab) {
    const content = document.getElementById('ownerTabContent');
    if (!content) return;
    
    if (tab === 'promo') {
        content.innerHTML = `
            <h3>Создать промокод</h3>
            <div class="form-group"><label>Скидка (DravixCoin)</label><input type="number" id="promoDiscount" value="100"></div>
            <div class="form-group"><label>Промокод (4-8 символов)</label><input type="text" id="promoCodeInput" maxlength="8" placeholder="Например: SUMMER2024"></div>
            <button class="modal-btn submit" onclick="createPromoCode()">Создать</button>
            <h3>Активные промокоды</h3>
            <div id="promoCodesList"></div>
        `;
        document.getElementById('promoCodesList').innerHTML = promoCodes.map(p => `
            <div class="promo-item">Код: <strong>${p.code}</strong> | Скидка: ${p.discount} DC</div>
        `).join('');
    } else if (tab === 'ticker') {
        content.innerHTML = `
            <h3>Редактировать новостную строку</h3>
            <div class="form-group"><label>Текст</label><textarea id="tickerTextArea" rows="3">${tickerText}</textarea></div>
            <button class="modal-btn submit" onclick="updateTicker()">Сохранить</button>
        `;
    } else if (tab === 'admins') {
        content.innerHTML = `
            <h3>Создать администратора</h3>
            <div class="form-group"><label>Логин</label><input type="text" id="newAdminUsername" placeholder="Никнейм"></div>
            <div class="form-group"><label>Пароль</label><input type="text" id="newAdminPassword" placeholder="Пароль"></div>
            <button class="modal-btn submit" onclick="createAdmin()">Создать</button>
            <h3>Текущие админы</h3>
            <div id="adminsList"></div>
        `;
        document.getElementById('adminsList').innerHTML = users.filter(u => u.role === 'admin').map(u => `
            <div class="admin-item">${u.username} | Пароль: ${atob(u.password)} 
                <button onclick="removeAdmin('${u.username}')" class="delete-btn">Удалить</button>
            </div>
        `).join('');
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

function createPromoCode() {
    let code = document.getElementById('promoCodeInput').value.trim().toUpperCase();
    const discount = parseInt(document.getElementById('promoDiscount').value);
    if (!code || code.length < 4 || code.length > 8) { 
        showNotification('Промокод должен быть 4-8 символов'); 
        return; 
    }
    if (promoCodes.find(p => p.code === code)) { 
        showNotification('Такой промокод уже есть'); 
        return; 
    }
    promoCodes.push({ code, discount, usesLeft: 1, createdBy: 'Dravix' });
    saveData();
    showNotification(`Промокод создан: ${code} на ${discount} DC`);
    showOwnerTab('promo');
}

function createAdmin() {
    const username = document.getElementById('newAdminUsername').value.trim();
    const password = document.getElementById('newAdminPassword').value.trim();
    if (!username || !password) { 
        showNotification('Заполните все поля'); 
        return; 
    }
    if (users.find(u => u.username === username)) { 
        showNotification('Пользователь существует'); 
        return; 
    }
    users.push({ 
        username, 
        password: btoa(password), 
        role: 'admin', 
        isSeller: false, 
        balance: 0, 
        avatar: '', 
        bio: 'Администратор', 
        totalBought: 0, 
        totalSold: 0, 
        betaTester: true 
    });
    saveData();
    showNotification(`Админ создан: ${username} | Пароль: ${password}`);
    showOwnerTab('admins');
}

function removeAdmin(username) { 
    if(username === 'Dravix') { 
        showNotification('Нельзя удалить владельца'); 
        return; 
    } 
    const user = users.find(u => u.username === username); 
    if(user && user.role === 'admin') { 
        user.role = 'user'; 
        user.betaTester = false; 
        saveData(); 
        showOwnerTab('admins'); 
        showNotification(`${username} больше не админ`); 
    } 
}

function updateTicker() { 
    tickerText = document.getElementById('tickerTextArea').value; 
    saveData(); 
    showNotification('Новостная строка обновлена'); 
}

function closeOwnerModal() { 
    document.getElementById('ownerModal').classList.remove('active'); 
}