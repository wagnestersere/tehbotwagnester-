// discord-bot/index.js
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ActivityType } = require('discord.js');
const axios = require('axios');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Конфигурация
const CONFIG = {
    discordToken: 'MTQ4MTkzNDkxMzYyNzM2MTM3Mg.GsWQH5.8B2TcVkeYQEkvQhLKLdvQQO5EYE3wI1Ks1Z7Xg',
    guildId: '1443708909918355612',
    robloxGroupId: '35515738', 
    
    // Каналы
    logChannelId: '1481945518740603020',
    welcomeChannelId: '1481945814086586464',
    
    // Роли (ID ролей в Discord)
    roles: {
        // Основатель (самая высокая роль)
        founder: '268432063',
        
        // Со-основатель
        coFounder: '269078069',
        
        // Команда разработчиков
        developer: '268490089',
        
        // Команда администрации
        admin: '269878045',
        
        // ФСБ
        fsb: '662993012',
        
        // МВД
        mvd: '270488069',
        
        // Обычные игроки (выдается после верификации)
        Гражданин: '270032072'
    },
    
    // Маппинг ролей на ранги в Roblox
    rankMapping: {
        // Роль Discord -> { rank: ранг_в_группе, department: структура }
        'ID_РОЛИ_ОСНОВАТЕЛЯ': { rank: 255, department: 'founder', name: 'Основатель' },
        'ID_РОЛИ_СО_ОСНОВАТЕЛЯ': { rank: 254, department: 'cofounder', name: 'Со-основатель' },
        'ID_РОЛИ_РАЗРАБОТЧИКА': { rank: 253, department: 'developer', name: 'Разработчик' },
        'ID_РОЛИ_АДМИНИСТРАЦИИ': { rank: 252, department: 'admin', name: 'Администратор' },
        'ID_РОЛИ_ФСБ': { rank: 251, department: 'FSB', name: 'ФСБ' },
        'ID_РОЛИ_МВД': { rank: 251, department: 'MVD', name: 'МВД' }
    }
};

// Хранилище данных пользователей
const userDatabase = new Map();
const verificationCodes = new Map();

// Загрузка базы данных
function loadDatabase() {
    try {
        if (fs.existsSync('database.json')) {
            const data = fs.readFileSync('database.json', 'utf8');
            const parsed = JSON.parse(data);
            for (const [key, value] of Object.entries(parsed)) {
                userDatabase.set(key, value);
            }
            console.log('✅ База данных загружена');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки базы данных:', error);
    }
}

// Сохранение базы данных
function saveDatabase() {
    try {
        const data = Object.fromEntries(userDatabase);
        fs.writeFileSync('database.json', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Ошибка сохранения базы данных:', error);
    }
}

// Функция логирования
async function logToChannel(guild, message, type = 'info') {
    if (!CONFIG.logChannelId) return;
    
    const channel = guild.channels.cache.get(CONFIG.logChannelId);
    if (!channel) return;
    
    const colors = {
        info: 0x3498db,
        success: 0x2ecc71,
        warning: 0xf1c40f,
        error: 0xe74c3c
    };
    
    const embed = new EmbedBuilder()
        .setColor(colors[type] || colors.info)
        .setDescription(message)
        .setTimestamp();
    
    channel.send({ embeds: [embed] });
}

// Функция для установки ранга в Roblox
async function setRobloxRank(userId, rank) {
    try {
        // Здесь нужно использовать Roblox API
        // Это заглушка - замените на реальный API запрос
        console.log(`🔄 Установка ранга ${rank} для пользователя ${userId}`);
        
        // Пример запроса к Roblox API (нужен cookie)
        /*
        const response = await axios.patch(
            `https://groups.roblox.com/v1/groups/${CONFIG.robloxGroupId}/users/${userId}`,
            { roleId: rank },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `.ROBLOSECURITY=${process.env.ROBLOX_COOKIE}`
                }
            }
        );
        */
        
        return { success: true };
    } catch (error) {
        console.error('❌ Ошибка установки ранга:', error);
        return { success: false, error: error.message };
    }
}

// Определение роли пользователя
function getUserRank(member) {
    // Проверяем роли в порядке приоритета
    const rolePriority = [
        { id: CONFIG.roles.founder, key: 'founder' },
        { id: CONFIG.roles.coFounder, key: 'coFounder' },
        { id: CONFIG.roles.developer, key: 'developer' },
        { id: CONFIG.roles.admin, key: 'admin' },
        { id: CONFIG.roles.fsb, key: 'fsb' },
        { id: CONFIG.roles.mvd, key: 'mvd' }
    ];
    
    for (const role of rolePriority) {
        if (member.roles.cache.has(role.id)) {
            return CONFIG.rankMapping[role.id] || null;
        }
    }
    
    return null; // Нет специальной роли
}

// Команды бота
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    
    const prefix = '!';
    if (!message.content.startsWith(prefix)) return;
    
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    // !help - помощь
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('📚 Команды сервера')
            .setDescription('Список доступных команд:')
            .addFields(
                { name: '!help', value: 'Показать это сообщение', inline: false },
                { name: '!profile [@user]', value: 'Показать профиль пользователя', inline: false },
                { name: '!roles', value: 'Показать список ролей', inline: false },
                { name: '!serverinfo', value: 'Информация о сервере', inline: false }
            );
        
        // Добавляем админ-команды
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            embed.addFields(
                { name: '👑 Админ-команды', value: '──────────────', inline: false },
                { name: '!rank @user', value: 'Обновить ранг пользователя', inline: false },
                { name: '!sync', value: 'Синхронизировать роли', inline: false },
                { name: '!clear [количество]', value: 'Очистить сообщения', inline: false }
            );
        }
        
        message.reply({ embeds: [embed] });
    }
    
    // !roles - список ролей
    if (command === 'roles') {
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('🎭 Роли на сервере')
            .setDescription('Иерархия ролевой системы:')
            .addFields(
                { name: '👑 Основатель', value: 'Владелец проекта', inline: false },
                { name: '🤝 Со-основатель', value: 'Помощник основателя', inline: false },
                { name: '💻 Команда разработчиков', value: 'Разработчики проекта', inline: false },
                { name: '🛡️ Команда администрации', value: 'Администраторы сервера', inline: false },
                { name: '🔒 ФСБ', value: 'Федеральная служба безопасности', inline: false },
                { name: '🚓 МВД', value: 'Министерство внутренних дел', inline: false },
                { name: '✅ Verified', value: 'Верифицированные игроки', inline: false }
            )
            .setFooter({ text: 'Роли выдаются администрацией' });
        
        message.reply({ embeds: [embed] });
    }
    
    // !profile - профиль пользователя
    if (command === 'profile') {
        const target = message.mentions.members.first() || message.member;
        
        // Получаем данные из базы
        const userData = userDatabase.get(target.id);
        
        // Определяем роль
        const rankInfo = getUserRank(target);
        const roleName = rankInfo ? rankInfo.name : 'Игрок';
        const department = rankInfo ? rankInfo.department : 'civilian';
        
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`👤 Профиль ${target.user.tag}`)
            .setThumbnail(target.user.displayAvatarURL())
            .addFields(
                { name: 'Discord', value: target.user.tag, inline: true },
                { name: 'Роль', value: roleName, inline: true },
                { name: 'Структура', value: department, inline: true },
                { name: 'Присоединился', value: target.joinedAt?.toLocaleDateString() || 'Неизвестно', inline: true },
                { name: 'Аккаунт создан', value: target.user.createdAt.toLocaleDateString(), inline: true }
            );
        
        if (userData) {
            embed.addFields(
                { name: 'Roblox', value: userData.robloxUsername || 'Не указан', inline: true },
                { name: 'Верифицирован', value: new Date(userData.verifiedAt).toLocaleDateString(), inline: true }
            );
        } else {
            embed.addFields({ name: 'Roblox', value: 'Не верифицирован', inline: true });
        }
        
        message.reply({ embeds: [embed] });
    }
    
    // !serverinfo - информация о сервере
    if (command === 'serverinfo') {
        const guild = message.guild;
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`📊 Информация о сервере ${guild.name}`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: '👑 Владелец', value: `<@${guild.ownerId}>`, inline: true },
                { name: '👥 Участников', value: guild.memberCount.toString(), inline: true },
                { name: '📅 Создан', value: guild.createdAt.toLocaleDateString(), inline: true },
                { name: '💬 Каналов', value: guild.channels.cache.size.toString(), inline: true },
                { name: '🎭 Ролей', value: guild.roles.cache.size.toString(), inline: true }
            );
        
        // Подсчет по ролям
        const members = guild.members.cache;
        let mvdCount = 0, fsbCount = 0, adminCount = 0, devCount = 0;
        
        members.forEach(member => {
            if (member.roles.cache.has(CONFIG.roles.mvd)) mvdCount++;
            if (member.roles.cache.has(CONFIG.roles.fsb)) fsbCount++;
            if (member.roles.cache.has(CONFIG.roles.admin)) adminCount++;
            if (member.roles.cache.has(CONFIG.roles.developer)) devCount++;
        });
        
        embed.addFields(
            { name: '🚓 МВД', value: mvdCount.toString(), inline: true },
            { name: '🔒 ФСБ', value: fsbCount.toString(), inline: true },
            { name: '🛡️ Администрация', value: adminCount.toString(), inline: true },
            { name: '💻 Разработчики', value: devCount.toString(), inline: true }
        );
        
        message.reply({ embeds: [embed] });
    }
    
    // АДМИН-КОМАНДЫ
    if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        
        // !rank @user - обновить ранг
        if (command === 'rank') {
            const target = message.mentions.members.first();
            
            if (!target) {
                return message.reply('❌ Использование: !rank @пользователь');
            }
            
            const userData = userDatabase.get(target.id);
            if (!userData) {
                return message.reply('❌ Пользователь не найден в базе данных');
            }
            
            const rankInfo = getUserRank(target);
            
            if (!rankInfo) {
                return message.reply('❌ У пользователя нет специальной роли');
            }
            
            // Устанавливаем ранг в Roblox
            const result = await setRobloxRank(userData.robloxId, rankInfo.rank);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('✅ Ранг обновлен')
                    .setDescription(`Пользователю **${target.user.tag}** установлен ранг **${rankInfo.name}** (${rankInfo.rank})`);
                
                message.reply({ embeds: [embed] });
                
                await logToChannel(message.guild, 
                    `📊 ${message.author.tag} обновил ранг ${target.user.tag} → ${rankInfo.name}`,
                    'success'
                );
            } else {
                message.reply('❌ Ошибка при обновлении ранга');
            }
        }
        
        // !sync - синхронизировать все роли
        if (command === 'sync') {
            message.reply('🔄 Начинаю синхронизацию ролей...');
            
            const members = message.guild.members.cache;
            let updated = 0;
            let failed = 0;
            
            for (const [id, member] of members) {
                const userData = userDatabase.get(id);
                if (!userData) continue;
                
                const rankInfo = getUserRank(member);
                if (!rankInfo) continue;
                
                const result = await setRobloxRank(userData.robloxId, rankInfo.rank);
                
                if (result.success) {
                    updated++;
                } else {
                    failed++;
                }
                
                // Задержка между запросами
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            message.reply(`✅ Синхронизация завершена!\nОбновлено: ${updated}\nОшибок: ${failed}`);
            
            await logToChannel(message.guild, 
                `🔄 Синхронизация ролей: ${updated} обновлено, ${failed} ошибок`,
                'info'
            );
        }
        
        // !clear [количество] - очистка сообщений
        if (command === 'clear') {
            const amount = parseInt(args[0]) || 10;
            
            if (amount > 100) {
                return message.reply('❌ Максимум 100 сообщений за раз');
            }
            
            const messages = await message.channel.messages.fetch({ limit: amount });
            await message.channel.bulkDelete(messages);
            
            const reply = await message.channel.send(`✅ Очищено ${messages.size} сообщений`);
            setTimeout(() => reply.delete(), 3000);
        }
    }
});

// Приветствие новых участников
client.on('guildMemberAdd', async (member) => {
    if (CONFIG.welcomeChannelId) {
        const channel = member.guild.channels.cache.get(CONFIG.welcomeChannelId);
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('👋 Новый участник!')
                .setDescription(`Добро пожаловать на сервер, ${member}!`)
                .addFields(
                    { name: '📝 Правила', value: 'Ознакомься с правилами в <#ID_КАНАЛА_ПРАВИЛ>', inline: false },
                    { name: '✅ Верификация', value: 'Используй `!verify` для привязки Roblox', inline: false }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();
            
            channel.send({ embeds: [embed] });
        }
    }
    
    // Логируем
    await logToChannel(member.guild, 
        `👋 Новый участник: ${member.user.tag}`,
        'info'
    );
});

// Обработка выхода участников
client.on('guildMemberRemove', async (member) => {
    await logToChannel(member.guild, 
        `👋 Участник покинул сервер: ${member.user.tag}`,
        'warning'
    );
});

// Событие готовности бота
client.once('ready', () => {
    console.log(`✅ Бот ${client.user.tag} запущен!`);
    console.log(`📊 Серверов: ${client.guilds.cache.size}`);
    console.log(`👥 Пользователей в базе: ${userDatabase.size}`);
    
    // Загружаем базу данных
    loadDatabase();
    
    // Устанавливаем статус
    client.user.setActivity('!help | Ролевая система', { type: ActivityType.Watching });
    
    // Периодическое сохранение базы
    setInterval(saveDatabase, 60000);
});

// Обработка ошибок
process.on('unhandledRejection', error => {
    console.error('❌ Необработанная ошибка:', error);
});

// Запуск бота
client.login(CONFIG.discordToken);