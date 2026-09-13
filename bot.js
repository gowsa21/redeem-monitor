const axios = require('axios');
require('dotenv').config();

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
const CHECK_INTERVAL = 30 * 60 * 1000; // 30 menit
const HISTORY_DAYS = 7; // Cek 7 hari terakhir

let lastCheckedTime = Date.now() - (HISTORY_DAYS * 24 * 60 * 60 * 1000);
const knownCodes = new Set();

async function getCodes() {
  try {
    const response = await axios.get('https://codes.yar.gg', {
      timeout: 10000
    });

    const html = response.data;
    const codeRegex = /code['":\s]+['"]?([A-Z0-9]+)['"]?/gi;
    
    let match;
    const codes = [];
    while ((match = codeRegex.exec(html)) !== null) {
      const code = match[1];
      if (code.length >= 3 && !knownCodes.has(code)) {
        codes.push(code);
        knownCodes.add(code);
      }
    }

    return codes;
  } catch (error) {
    console.error('Error fetching codes:', error.message);
    return [];
  }
}

async function sendToDiscord(codes) {
  if (!WEBHOOK_URL || codes.length === 0) return;

  try {
    const message = {
      content: `🎉 **Found ${codes.length} new redeem code(s)!**\n\n${codes.map(c => `\`${c}\``).join('\n')}`
    };

    await axios.post(WEBHOOK_URL, message);
    console.log(`✅ Sent ${codes.length} code(s) to Discord at ${new Date().toLocaleString()}`);
  } catch (error) {
    console.error('Error sending to Discord:', error.message);
  }
}

async function checkCodes() {
  console.log(`🔍 Checking for new codes... (${new Date().toLocaleString()})`);
  const newCodes = await getCodes();
  
  if (newCodes.length > 0) {
    console.log(`Found ${newCodes.length} new code(s):`, newCodes);
    await sendToDiscord(newCodes);
  } else {
    console.log('No new codes found.');
  }
}

async function start() {
  console.log('🚀 Redeem Code Monitor Bot Started!');
  console.log(`⏰ Will check every 30 minutes`);
  console.log(`📊 History check enabled (last ${HISTORY_DAYS} days)`);
  console.log(`📍 Discord Webhook: ${WEBHOOK_URL ? '✅ Connected' : '❌ Not set'}\n`);

  // Cek pertama kali saat startup (termasuk history)
  await checkCodes();

  // Cek setiap 30 menit
  setInterval(checkCodes, CHECK_INTERVAL);
}

start();