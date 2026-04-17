// ========== АВТОРИЗАЦИЯ ==========
function register() {
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;
    const errorDiv = document.getElementById('authError');
    
    errorDiv.style.display = 'none';
    
    if (!username || !password) { errorDiv.textContent = 'Заполните все поля'; errorDiv.style.display = 'block'; return; }
    if (password.length < 4) { errorDiv.textContent = 'Пароль минимум 4 символа'; errorDiv.style.display = 'block'; return; }
    if (password !== confirm) { errorDiv.textContent = 'Пароли не совпадают'; errorDiv.style.display = 'block'; return; }
    if (users.find(u => u.username === username)) { errorDiv.textContent = 'Пользователь существует'; errorDiv.style.display = 'block'; return; }
    
    users.push({ username, password: btoa(password), role: 'user', isSeller: false, balance: 0, avatar: '', bio: '', totalBought: 0, totalSold: 0, betaTester: false });
    saveData();
    errorDiv.style.color = '#28a745';
    errorDiv.textContent = 'Регистрация успешна! Войдите.';
    errorDiv.style.display = 'block';
    setTimeout(() => {
        switchToLogin();
        errorDiv.style.display = 'none';
    }, 1500);
}

function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('authError');
    
    errorDiv.style.display = 'none';
    
    if (!username || !password) { 
        errorDiv.textContent = 'Заполните все поля'; 
        errorDiv.style.display = 'block'; 
        return; 
    }
    
    const user = users.find(u => u.username === username && u.password === btoa(password));
    if (!user) { 
        errorDiv.textContent = 'Неверный никнейм или пароль'; 
        errorDiv.style.display = 'block'; 
        return; 
    }
    
    currentUser = { ...user };
    delete currentUser.password;
    saveData();
    closeAuthModal();
    updateUI();
    showNotification(`Добро пожаловать, ${username}!`);
}

function logout() { 
    currentUser = null; 
    localStorage.removeItem('dravix_currentUser'); 
    updateUI(); 
    navigateTo('home'); 
    showNotification('Вы вышли из аккаунта'); 
}

function switchToRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('authModalTitle').textContent = 'Регистрация';
    document.getElementById('authError').style.display = 'none';
}

function switchToLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('authModalTitle').textContent = 'Вход';
    document.getElementById('authError').style.display = 'none';
}

function openAuthModal() { 
    switchToLogin();
    document.getElementById('authModal').classList.add('active'); 
}

function closeAuthModal() { 
    document.getElementById('authModal').classList.remove('active'); 
}

function updateUI() {
    const loginBtn = document.getElementById('loginRegisterBtn');
    const profileMenu = document.getElementById('profileMenu');
    const balanceDisplay = document.getElementById('balanceDisplay');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const adminBtn = document.getElementById('adminPanelBtn');
    const ownerBtn = document.getElementById('ownerPanelBtn');
    const userRoleIcon = document.getElementById('userRoleIcon');
    
    if (currentUser) {
        loginBtn.style.display = 'none';
        profileMenu.style.display = 'inline-block';
        balanceDisplay.style.display = 'flex';
        usernameDisplay.textContent = currentUser.username;
        document.getElementById('userBalance').textContent = currentUser.balance;
        userRoleIcon.innerHTML = getRoleIcon(currentUser.role, currentUser.betaTester);
        adminBtn.style.display = (currentUser.role === 'admin' || currentUser.role === 'owner') ? 'flex' : 'none';
        ownerBtn.style.display = (currentUser.role === 'owner') ? 'flex' : 'none';
    } else {
        loginBtn.style.display = 'flex';
        profileMenu.style.display = 'none';
        balanceDisplay.style.display = 'none';
    }
    
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('totalSales').textContent = products.reduce((sum, p) => sum + (p.sales || 0), 0) + sellerProducts.reduce((sum, p) => sum + (p.sales || 0), 0);
    document.getElementById('totalSellers').textContent = users.filter(u => u.isSeller).length;
}