const express = require('express');
const cors = require('cors');
const { YooKassa } = require('@exode-team/yokassa.api');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// ========== НАСТРОЙКИ ЮKASSA ==========
// ПОЛУЧИТЕ ЭТИ ДАННЫЕ В ЛИЧНОМ КАБИНЕТЕ ЮKASSA:
// 1. Зарегистрируйтесь на https://yookassa.ru
// 2. Создайте магазин → получите shopId
// 3. В разделе "Интеграция" → "Ключи API" получите секретный ключ
const SHOP_ID = 'YOUR_SHOP_ID';      // Замените на ваш shopId
const SECRET_KEY = 'YOUR_SECRET_KEY'; // Замените на ваш секретный ключ

// Инициализация SDK
const yooKassa = new YooKassa({
    shopId: SHOP_ID,
    secretKey: SECRET_KEY
});

// ========== СОЗДАНИЕ ПЛАТЕЖА ==========
app.post('/api/create-payment', async (req, res) => {
    try {
        const { amount, userId, username } = req.body;
        
        // Генерация уникального ID заказа
        const orderId = crypto.randomUUID();
        
        // Создание платежа в ЮKassa
        const payment = await yooKassa.payments.create({
            amount: {
                value: amount.toString(),
                currency: 'RUB'
            },
            capture: true, // Автоматическое подтверждение
            confirmation: {
                type: 'redirect',
                return_url: 'https://your-site.com/success.html' // URL после оплаты
            },
            description: `Пополнение баланса Dravix Shop: ${username} на ${amount} DravixCoin`,
            metadata: {
                user_id: userId,
                username: username,
                amount: amount,
                order_id: orderId
            }
        });
        
        // Сохраняем информацию о платеже (можно в БД)
        // Здесь можно сохранить в localStorage через API или в файл
        
        res.json({
            success: true,
            paymentId: payment.id,
            confirmationUrl: payment.confirmation.confirmation_url,
            orderId: orderId
        });
        
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========== ПРОВЕРКА СТАТУСА ПЛАТЕЖА ==========
app.get('/api/check-payment/:paymentId', async (req, res) => {
    try {
        const { paymentId } = req.params;
        
        const payment = await yooKassa.payments.load(paymentId);
        
        res.json({
            success: true,
            status: payment.status,
            paid: payment.paid,
            amount: payment.amount.value,
            metadata: payment.metadata
        });
        
    } catch (error) {
        console.error('Error checking payment:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========== WEBHOOK ДЛЯ УВЕДОМЛЕНИЙ ОТ ЮKASSA ==========
// НАСТРОЙКА: В личном кабинете ЮKassa → Интеграция → HTTP-уведомления
// URL: https://your-site.com/api/webhook
app.post('/api/webhook', async (req, res) => {
    try {
        const event = req.body;
        
        if (event.object && event.object.status === 'succeeded') {
            const { metadata } = event.object;
            
            // Здесь обновите баланс пользователя
            console.log(`✅ Платеж успешен! Пользователь: ${metadata.username}, Сумма: ${metadata.amount}`);
            
            // Вы можете отправить запрос на ваш фронтенд через WebSocket
            // или сохранить в БД, а фронтенд будет периодически проверять статус
        }
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ success: false });
    }
});

// Запуск сервера
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📍 API доступен: http://localhost:${PORT}/api`);
});