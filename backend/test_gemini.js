require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const res = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: 'Respond with JSON: {"status": "ready"}'
    });
    console.log('Gemini API is working! Response:', res.text);
  } catch (err) {
    console.error('Gemini Test Failed:', err);
  }
}

test();