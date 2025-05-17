const express = require('express');
const axios = require('axios');

const router = express.Router();

const GOOGLE_SHEET_JSON_URL = 'https://script.google.com/macros/s/AKfycbwZ7YWAOMaFGk9XyRBVgfEvluschY4IUp5LeDzYpLPeKE-_AGGr2BV6msNwzAjE_8sJ/exec';

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