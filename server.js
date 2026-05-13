import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';

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

function buildPrompt({ text, concern, tone }) {
  return `你是「葵的开口信」里的表达整理助手。你的任务不是替用户决定关系，而是帮用户检查一段想发送的话是否容易被误会，并整理成更安全、更清楚、更有边界感的表达。

用户原文：
${text}

用户最担心的问题：${concern}
用户希望的语气：${tone}

请严格只输出 JSON，不要输出 Markdown，不要解释，不要加代码块。
JSON 格式必须是：
{
  "quoted": "指出原文中可能需要小心的词句；如果没有明显问题，就温和说明重点可以更清楚。可包含少量 HTML strong 标签。",
  "risk": "可能的发送风险，80字以内",
  "advice": "建议调整方向，80字以内",
  "short": "短讯版，适合 WhatsApp 直接发",
  "letter": "温和版，适合降低冲突",
  "calm": "边界版，适合不想委屈自己"
}

要求：
1. 不要说教。
2. 不要过度卑微。
3. 不要把对方写成坏人。
4. 不要使用过度文艺化的句子。
5. 结果要像真实可以发送的讯息。
6. 如果原文有攻击性，请降冲突，但保留用户的核心意思。`;
}

function buildAdjustPrompt({ text, direction }) {
  const directionMap = {
    natural: '改得更自然一点，像真实聊天。',
    shorter: '改得更短一点，适合直接发送。',
    'less-humble': '减少卑微感，保留真诚和边界。',
    'less-formal': '不要太正式，像平常聊天。',
    whatsapp: '改得更像 WhatsApp 简讯。',
    boundary: '加强边界感，但不要冷漠。'
  };

  return `你是「葵的开口信」里的表达整理助手。

请把下面这段话根据方向重新调整。

原文：
${text}

调整方向：${directionMap[direction] || directionMap.natural}

请严格只输出 JSON，不要输出 Markdown，不要解释，不要加代码块。
JSON 格式必须是：
{
  "label": "一句简短标签，例如：已帮你改得更自然一点",
  "text": "调整后的可发送版本"
}

要求：
1. 保留原意。
2. 不要过度文艺化。
3. 不要攻击对方。
4. 不要过度卑微。
5. 像真实可以发送的讯息。`;
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

async function callGemini(prompt) {
  requireApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });
  return parseJsonFromText(response.text || '');
}

app.post('/api/generate', async (req, res) => {
  try {
    const { text, concern, tone } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Missing text.' });
    }
    const result = await callGemini(buildPrompt({
      text: String(text).trim(),
      concern: concern || '我怕对方误会',
      tone: tone || '温柔但不卑微'
    }));
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to generate content.'
    });
  }
});

app.post('/api/adjust', async (req, res) => {
  try {
    const { text, direction } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Missing text.' });
    }
    const result = await callGemini(buildAdjustPrompt({
      text: String(text).trim(),
      direction: direction || 'natural'
    }));
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to adjust content.'
    });
  }
});

app.listen(port, () => {
  console.log(`葵的开口信 API server running at http://localhost:${port}`);
});
