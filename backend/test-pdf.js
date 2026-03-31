const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

async function test() {
    try {
        const filePath = path.resolve(__dirname, '../assets/1-Panduan Umum-PKM-2025-published-update.pdf');
        console.log('Testing PDF load:', filePath);
        const dataBuffer = fs.readFileSync(filePath);
        console.log('Buffer size:', dataBuffer.length);
        const data = await pdf(dataBuffer);
        console.log('Text length:', data.text.length);
        console.log('Excerpt:', data.text.substring(0, 100));
    } catch (err) {
        console.error('Test failed:', err);
    }
}

test();
