// backend/test_gemini.js
require('dotenv').config();
const { analyzeMedicalDocument } = require('./services/geminiService');
const fs = require('fs');
const path = require('path');

async function test() {
  const uploads = path.join(__dirname, 'uploads');
  const files = fs.existsSync(uploads) ? fs.readdirSync(uploads) : [];
  if (files.length === 0) {
    console.log('No uploaded files found in backend/uploads to test. Upload one via Kiosk first.');
    return;
  }
  const testFile = path.join(uploads, files[files.length - 1]);
  console.log(`Testing Gemini extraction on: ${testFile}`);
  const result = await analyzeMedicalDocument(testFile, 'image/jpeg');
  console.log('\n--- RESULT OUTPUT ---');
  console.log(JSON.stringify(result, null, 2));
}

test();