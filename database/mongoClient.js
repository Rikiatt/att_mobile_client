const { MongoClient } = require('mongodb');
const { uri } = require('../config/dbConfig');

const client = new MongoClient(uri);

async function getDatabase() {
    try {
        if (!client.topology || !client.topology.isConnected()) {
            await client.connect();
        }
        return client.db(process.env.DB_NAME);
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error.message);
        throw error;
    }
}

module.exports = getDatabase;