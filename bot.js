const axios = require('axios');
const fs = require('fs');
const puppeteer = require('puppeteer');
require('dotenv').config();

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
const CODES_FILE = 'stored_codes.json';

if (!WEBHOOK_URL) {
    console.error('DISCORD_WEBHOOK tidak ditemukan di file .env');
    process.exit(1);
}

async function checkNewCodes() {
    let browser;
    try {
        console.log(`🔍 [${new Date().toLocaleTimeString()}] Memeriksa codes.yar.gg...`);
        
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.goto('https://codes.yar.gg/', { waitUntil: 'networkidle2' });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const html = await page.content();
        
        const codeRegex = /([A-Z0-9]{10,})/g;
        const foundCodes = html.match(codeRegex) || [];
        const newCodes = [...new Set(foundCodes)].filter(code => code.length >= 10);
        
        let storedCodes = [];
        if (fs.existsSync(CODES_FILE)) {
            storedCodes = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
        }
        
        const addedCodes = newCodes.filter(code => !storedCodes.includes(code));
        
        if (addedCodes.length > 0) {
            console.log(`✅ Ditemukan ${addedCodes.length} kode baru!`);
            
            for (const code of addedCodes) {
                await sendToDiscord(code);
                console.log(`   → Terkirim: ${code}`);
            }
            
            fs.writeFileSync(CODES_FILE, JSON.stringify(newCodes, null, 2));
        } else {
            console.log('Tidak ada kode baru');
        }
        
        await browser.close();
        
    } catch (problem) {
        console.log('Terjadi masalah saat memeriksa website:', problem.message);
        if (browser) await browser.close();
    }
}

async function sendToDiscord(code) {
    const message = {
        content: '🎁 **Kode Redeem Baru Ditemukan!**',
        embeds: [{
            title: code,
            description: 'Kode redeem terbaru dari codes.yar.gg',
            color: 65280,
            fields: [
                { 
                    name: 'Kode', 
                    value: `\`\`\`\n${code}\n\`\`\``, 
                    inline: false 
                },
                { 
                    name: 'Website', 
                    value: '[codes.yar.gg](https://codes.yar.gg/)', 
                    inline: false 
                }
            ],
            timestamp: new Date().toISOString()
        }]
    };
    
    try {
        await axios.post(WEBHOOK_URL, message);
    } catch (issue) {
        console.log('Masalah mengirim ke Discord:', issue.message);
    }
}

const CHECK_INTERVAL = 30 * 60 * 1000;

console.log('═══════════════════════════════════════');
console.log('🚀 Monitor Kode Redeem Aktif!');
console.log(`⏱️  Memeriksa setiap ${CHECK_INTERVAL / 60000} menit`);
console.log('═══════════════════════════════════════\n');

checkNewCodes();

setInterval(checkNewCodes, CHECK_INTERVAL);