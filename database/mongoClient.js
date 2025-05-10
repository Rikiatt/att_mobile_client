const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

const client1 = new MongoClient(process.env.MONGO_URI);

async function getDatabase() {
  try {
    if (!client1.topology || !client1.topology.isConnected()) {
      await client1.connect();
    }
    return client1.db(process.env.DB_NAME);
  } catch (error) {
    console.error("Failed to connect to MongoDB (1):", error.message);
    throw error;
  }
}

module.exports = { getDatabase };