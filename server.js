import dotenv from 'dotenv';
import express from 'express';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.GEMINI_API_KEY;

app.use(express.json({ limit: '1mb' }));
app.use(express.static('.'));

function requireApiKey() {
  if (!apiKey) {
    const error = new Error('Missing GEMINI_API_KEY. Please create a .env file from .env.example.');
    error.status = 500;
    throw error;
  }
}

function buildPrompt({ text }) {
  return `把用户输入的草稿，整理成一段可以直接发出的私讯。
草稿：${text}

要求：
- 保留原意，不卑微、不冲、不过度道歉或讨好。
- 像真人私讯，严禁客服或作文腔。
- 只输出一个最推荐版本。
- 只返回 JSON：{"recommendedResult": "推荐内容", "explanation": "为什么这样比较好的一句话解释"}`;
}

function parseJsonFromText(rawText) {
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Gemini did not return valid JSON.');
  }
}

async function callGemini(prompt, retryCount = 0) {
  requireApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 300,
        temperature: 0.4,
        responseMimeType: 'application/json'
      }
    });
    const text = response.text;
    return parseJsonFromText(text);
  } catch (error) {
    console.error('Gemini Error:', error.message);
    const isUnavailable = error.message?.includes('503') || error.message?.toLowerCase().includes('unavailable');
    const isRateLimit = error.message?.includes('429') || error.message?.toLowerCase().includes('quota');

    if (isUnavailable && retryCount < 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return callGemini(prompt, retryCount + 1);
    }

    const busyError = new Error('现在生成有点频繁，可以等一下再试，或先缩短输入内容。');
    busyError.status = isUnavailable ? 503 : (isRateLimit ? 429 : 500);
    throw busyError;
  }
}

app.post('/api/generate', async (req, res) => {
  const { text, concern, tone } = req.body || {};
  try {
    const inputText = String(text || '').trim();
    if (!inputText) {
      return res.status(400).json({ error: '请先贴上你想整理的内容。' });
    }
    if (inputText.length > 500) {
      return res.status(400).json({ error: '这段有点长，可以先贴最想发的那一小段。' });
    }
    const result = await callGemini(buildPrompt({
      text: inputText
    }));
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message });
  }
});

app.post('/api/adjust', async (req, res) => {
  res.status(403).json({ error: '目前为了节省免费额度，二次调整先暂停。' });
});

app.listen(port, () => {
  console.log(`葵的开口信 API server running at http://localhost:${port}`);
});
