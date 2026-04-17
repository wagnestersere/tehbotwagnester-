// ========== НАВИГАЦИЯ ==========
function navigateTo(page) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    const targetPage = document.getElementById(`${page}Page`);
    if (targetPage) targetPage.classList.add('active');
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = Array.from(document.querySelectorAll('.nav-link')).find(l => l.getAttribute('data-page') === page);
    if (activeLink) activeLink.classList.add('active');
    
    if (page === 'shop') renderProducts();
    if (page === 'seller') renderSellerProducts();
}

// ========== ЗАПУСК ==========
function init() {
    initData();
    updateUI();
    renderProducts();
    renderSellerProducts();
    document.getElementById('tickerText').textContent = tickerText;
}

// Запускаем при загрузке страницы
document.addEventListener('DOMContentLoaded', init);