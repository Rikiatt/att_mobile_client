const getDatabase = require('../database/mongoClient');

async function saveAlertToDatabase(alert) {
    const db = await getDatabase();
    try {
        const collection = db.collection('alerts');
        await collection.insertOne(alert);
        console.log('Alert saved to database');
    } catch (error) {
        console.error('Failed to save alert to database:', error.message);
    }
}

module.exports = { saveAlertToDatabase };