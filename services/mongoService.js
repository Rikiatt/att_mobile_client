const mongoose = require('mongoose');

const AlertLogSchema = new mongoose.Schema({
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

const AlertLog = mongoose.model('AlertLog', AlertLogSchema);

const saveAlertLog = async (text) => {
    try {
        const log = new AlertLog({ text });
        await log.save();
        console.log('Alert log saved to MongoDB:', text);
    } catch (error) {
        console.error('Error saving alert log:', error.message);
    }
};

module.exports = { saveAlertLog };