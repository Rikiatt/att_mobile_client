const { getDatabase } = require('../database/mongoClient');
const telegramToken = process.env.TELEGRAM_TOKEN;
const defaultChatId = process.env.CHATID;
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

async function getChatId(telegramToken) {    
    const url = `https://api.telegram.org/bot${telegramToken}/getUpdates`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.ok && data.result.length > 0) {
            return data.result[0].message.chat.id;
        } else {
            console.error("Cannot find chatId. Text the bot first.");
            return null;
        }
    } catch (error) {
        console.error("Error fetching chat ID:", error.message);
        return null;
    }
}

async function getChatId(telegramToken) {    
    const url = `https://api.telegram.org/bot${telegramToken}/getUpdates`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.ok && data.result.length > 0) {
            return data.result[0].message.chat.id;
        } else {
            console.error("Cannot find chatId. Text the bot first.");
            return null;
        }
    } catch (error) {
        console.error("Error fetching chat ID:", error.message);
        return null;
    }
}

async function sendTelegramAlert(telegramToken, chatId, message) {    
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message }),
        });

        const json = await res.json();
        if (!json.ok) {
            console.error("Telegram API error:", json.description);
        }
    } catch (error) {
        console.error("Failed to send Telegram alert:", error.message);
    }
}

async function saveAlertToDatabase(alert) {
    const db = await getDatabase();
    try {
        const collection = db.collection('alerts');
        await collection.insertOne(alert);        
    } catch (error) {
        console.error('Failed to save alert to database:', error.message);
    }
}

// Ping Telegram mỗi 5 phút để giữ kết nối
const pingBot = new TelegramBot(telegramToken, { polling: false });
setInterval(() => {
    pingBot.sendChatAction(defaultChatId, 'typing')
        .then(() => console.log('[watchdog] Ping sent to Telegram'))
        .catch(err => console.error('[watchdog] Ping failed:', err.message));
}, 1000 * 60 * 5);

module.exports = { getChatId, sendTelegramAlert, saveAlertToDatabase };