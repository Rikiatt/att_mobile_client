async function getChatId(telegramToken) {
    const fetch = await import('node-fetch'); 
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
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message }),
        });
    } catch (error) {
        console.error("Failed to send Telegram alert:", error.message);
    }
}

module.exports = { getChatId, sendTelegramAlert };