const axios = require('axios');
require('dotenv').config();
const fs = require('fs');

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
const CHECK_INTERVAL = 30 * 60 * 1000; // 30 menit
const HISTORY_DAYS = 20; // Cek 20 hari terakhir
const KNOWN_CODES_FILE = 'known_codes.json';

let lastCheckedTime = Date.now() - (HISTORY_DAYS * 24 * 60 * 60 * 1000);
let knownCodes = new Set();

// Load known codes dari file saat startup
function loadKnownCodes() {
  try {
    if (fs.existsSync(KNOWN_CODES_FILE)) {
      const data = JSON.parse(fs.readFileSync(KNOWN_CODES_FILE, 'utf8'));
      knownCodes = new Set(data);
      console.log(`📂 Loaded ${knownCodes.size} known codes from file`);
    }
  } catch (error) {
    console.error('Error loading known codes:', error.message);
  }
}

// Save known codes ke file setiap kali ada kode baru
function saveKnownCodes() {
  try {
    fs.writeFileSync(KNOWN_CODES_FILE, JSON.stringify(Array.from(knownCodes)), 'utf8');
  } catch (error) {
    console.error('Error saving known codes:', error.message);
  }
}

async function getCodes() {
  try {
    // Fetch dari API endpoint
    const response = await axios.get('https://codes.yar.gg/api/codes', {
      timeout: 10000
    });

    const data = response.data;
    console.log('✅ API Response received. Active codes:', data.active?.length || 0);

    if (!data.active || data.active.length === 0) {
      console.log('⚠️ No active codes found');
      return [];
    }

    const codes = [];
    
    // Loop semua kode yang active
    for (const item of data.active) {
      const code = item.code;
      const addedAt = new Date(item.addedAt).getTime();

      // Hanya ambil kode yang ditambahkan dalam HISTORY_DAYS terakhir
      if (addedAt > lastCheckedTime && !knownCodes.has(code)) {
        codes.push(code);
        knownCodes.add(code);
        console.log(`🆕 New code found: ${code} (added: ${item.addedAt})`*
