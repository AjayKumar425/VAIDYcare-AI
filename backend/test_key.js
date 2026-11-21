// backend/test_key.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

async function testAllKeys() {
  console.log('====================================================');
  console.log('     VAIDYcare-AI Multi-Provider Key Diagnostic     ');
  console.log('====================================================');

  const primaryGemini = (process.env.GEMINI_API_KEY || '').trim();
  const fallbackGemini = (process.env.FALLBACKE_GEMINI_API_KEY || process.env.FALLBACK_GEMINI_API_KEY || '').trim();
  const groqKey = (process.env.GROQ_API_KEY || '').trim();

  console.log('\n--- 1. CONFIGURATION CHECK ---');
  console.log(`Primary Gemini Key:  ${primaryGemini ? primaryGemini.slice(0, 10) + '...' : 'NOT SET'}`);
  console.log(`Fallback Gemini Key: ${fallbackGemini ? fallbackGemini.slice(0, 10) + '...' : 'NOT SET'}`);
  console.log(`Groq API Key:        ${groqKey ? groqKey.slice(0, 10) + '...' : 'NOT SET'}`);

  // Test Primary Gemini Key
  console.log('\n--- 2. TESTING PRIMARY GEMINI KEY ---');
  if (primaryGemini) {
    await testGeminiKey(primaryGemini, 'Primary Gemini');
  }

  // Test Fallback Gemini Key
  console.log('\n--- 3. TESTING FALLBACK GEMINI KEY ---');
  if (fallbackGemini) {
    await testGeminiKey(fallbackGemini, 'Fallback Gemini');
  }

  // Test Groq Key
  console.log('\n--- 4. TESTING GROQ API KEY ---');
  if (groqKey) {
    await testGroqKey(groqKey);
  }

  console.log('\n====================================================');
  console.log('              DIAGNOSTIC TEST COMPLETE              ');
  console.log('====================================================\n');
}

async function testGeminiKey(key, label) {
  const genAI = new GoogleGenerativeAI(key);
  const models = ['gemini-3.5-flash-lite', 'gemini-3-flash-preview'];
  for (const m of models) {
    try {
      process.stdout.write(`   [${label}] Testing ${m} ... `);
      const model = genAI.getGenerativeModel({ model: m });
      const res = await model.generateContent('Say "OK" in 1 word.');
      console.log(`✅ SUCCESS: "${res.response.text().trim()}"`);
      return true;
    } catch (e) {
      console.log(`❌ FAILED (${e.message.slice(0, 80)})`);
    }
  }
  return false;
}

async function testGroqKey(key) {
  const models = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
  for (const m of models) {
    try {
      process.stdout.write(`   [Groq] Testing ${m} ... `);
      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: m,
          messages: [{ role: 'user', content: 'Say "OK" in 1 word.' }],
          temperature: 0.1
        },
        {
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          timeout: 8000
        }
      );
      const text = res.data.choices[0]?.message?.content?.trim();
      console.log(`✅ SUCCESS: "${text}"`);
      return true;
    } catch (e) {
      console.log(`❌ FAILED (${e.response?.data?.error?.message?.slice(0, 80) || e.message})`);
    }
  }
  return false;
}

testAllKeys();
