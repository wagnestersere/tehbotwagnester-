// ========== НАВИГАЦИЯ С ПОДДЕРЖКОЙ URL ==========

function navigateTo(page) {
    // Обновляем активную секцию
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    const targetPage = document.getElementById(`${page}Page`);
    if (targetPage) targetPage.classList.add('active');
    
    // Обновляем активную ссылку в меню
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = Array.from(document.querySelectorAll('.nav-link')).find(l => l.getAttribute('data-page') === page);
    if (activeLink) activeLink.classList.add('active');
    
    // Обновляем URL при смене страницы
    let url = new URL(window.location.href);
    if (page !== 'home') {
        url.searchParams.set('page', page);
    } else {
        url.searchParams.delete('page');
    }
    // Если уходим со страницы магазина, убираем параметр категории
    if (page !== 'shop') {
        url.searchParams.delete('cat');
    }
    window.history.pushState({}, '', url);
    
    // Рендерим нужную страницу
    if (page === 'shop') renderProducts();
    if (page === 'seller') renderSellerProducts();
}

// Обработчик кнопки "назад/вперед" в браузере
window.addEventListener('popstate', function() {
    const page = getPageFromURL();
    if (page && page !== 'home') {
        navigateTo(page);
    } else {
        navigateTo('home');
    }
    const category = getCategoryFromURL();
    if (category && page === 'shop') {
        openCategory(category);
    }
});

// Функция получения страницы из URL
function getPageFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('page');
}

// Запуск при загрузке
function init() {
    initData();
    updateUI();
    renderProducts();
    renderSellerProducts();
    document.getElementById('tickerText').textContent = tickerText;
    
    // Проверяем URL при загрузке
    const page = getPageFromURL();
    if (page && page !== 'home') {
        navigateTo(page);
        if (page === 'shop') {
            const category = getCategoryFromURL();
            if (category) openCategory(category);
        }
    }
}

// Запускаем при загрузке страницы
document.addEventListener('DOMContentLoaded', init);

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
