const express = require('express');
const axios = require('axios');

const router = express.Router();

const GOOGLE_SHEET_JSON_URL = 'https://script.google.com/macros/s/AKfycbxrD0ogvIdZOUzpa50Qlra4Tg7BIVWUFf57Ct9VF7sTeOlVkhY0qZwkkBwqAvVmm37B/exec';

router.get('/sync-banks', async (req, res) => {
  try {
    const result = await axios.get(GOOGLE_SHEET_JSON_URL);
    res.json(result.data);
  } catch (err) {
    console.error('Google Sheet Sync Error:', err.message);
    res.status(500).json({ status: false, error: err.message });
  }
});

module.exports = router;