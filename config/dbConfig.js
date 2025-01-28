require('dotenv').config();

const mongoConfig = {
    uri: process.env.MONGO_URI,
    dbName: process.env.DB_NAME,
};

module.exports = mongoConfig;