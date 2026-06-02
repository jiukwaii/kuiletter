import dotenv from 'dotenv';
import express from 'express';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const apiKey = process.env.GEMINI_API_KEY;

app.use(express.json({ limit: '1mb' }));

function requireApiKey() {
  if (!apiKey) {
    const error = new Error('Missing GEMINI_API_KEY.');
    error.status = 500;
    throw error;
  }
}

function buildPrompt({ text, concern, tone }) {
  const concernInstructions = {
    "我怕太卑微": "把用户扶正，保留需求和自尊，不要弱化自己。不要替对方找退路。",
    "我怕太冲": "降低攻击性，但绝对不要变成讨好、卑微或自责。保留立场。",
    "我怕对方误会": "表达要更清楚自然，不要长篇解释。如果原句没大问题，不要硬找错。",
    "我怕关系变尴尬": "语气要轻一点、随性一点，像平常聊天，不要太正式或沉重。"
  };

  const instruction = concernInstructions[concern] || "";

  return `你是「葵的开口信」里的私讯整理助手。你的任务是帮用户把一段想发但不敢发的私讯，整理成不卑微、不太冲、可以直接复制发送的版本。

目标用户：年轻人/学生。
风格要求：自然、随性、像真实私讯。严禁客服腔、作文腔、心理咨询师腔、顾问腔、说教感。

用户原文：
${text}

用户最担心：${concern}
用户希望的语气：${tone}
${instruction}

请严格遵守以下原则：
1. 风险检查（quoteResult, riskResult, adviceResult）：
   - quoteResult: 指出原文重点，1-2句。
   - riskResult: 可能的风险，最多1句。
   - adviceResult: 调整建议，最多1句。
   - 如果原句本身已经清楚且没大问题，请直接说明“这句表达已经很清楚了，只是可以再自然一点”，不要硬批判。
   - 严禁使用“削弱需求”、“降低回应必要性”、“过度软化”、“核心意图”、“关系风险较高”等抽象顾问词。
2. 输入不足处理：
   - 如果原文太短、太空（如“只是问问”、“在吗”），请在 JSON 字段里提醒用户补充具体想说的事，不要编造信息。
3. 强化输出版本质量（shortResult, letterResult, calmResult）：
   - 必须是完整、可以直接复制发送的句子。禁止出现斜线选项（如“事/问题”）。
   - 禁止卑微：绝对不要说“回不回没关系”、“随便问问”、“好奇问问”、“回不回是你的自由”。
   - 禁止正式词：不要使用“回覆”、“请教”、“考量”、“诚挚”、“若你方便”、“冒昧打扰”、“感谢理解”。
   - 保留原意与立场：不要为了追求温和而让步或把错全揽在自己身上。
4. 版本定义：
   - shortResult（短版）：极简、自然、完整，适合直接发。
   - letterResult（温和版）：温和但不讨好，降低冲突但保留立场。
   - calmResult（有边界版）：保留需求和立场，不再委屈自己，不再替对方找退路。

请严格只输出 JSON，不要输出 Markdown，不要解释，不要加代码块。
JSON 格式必须是：
{
  "quoteResult": "...",
  "riskResult": "...",
  "adviceResult": "...",
  "shortResult": "...",
  "letterResult": "...",
  "calmResult": "..."
}`;
}

function buildAdjustPrompt({ text, direction }) {
  const directionMap = {
    natural: '改得更自然一点，像真实聊天。',
    shorter: '改得更短一点，适合直接发送。',
    'less-humble': '不要太客气，保留自尊和边界。'
  };

  return `你是「葵的开口信」里的私讯整理助手。
请把下面这段话根据方向进行微调，使其更适合直接发送。

原文：
${text}

微调方向：${directionMap[direction] || directionMap.natural}

要求：
1. 只返回一个可直接发送的私讯。
2. 不要解释，不要标题，不要引号。
3. 不要改变原本立场，不要让用户更卑微。
4. 像真实私讯：口语化，不要过度文艺或正式。禁止使用“回覆”、“请教”等词。
5. 必须是完整的句子，禁止输出斜线选项（如“想/打算”）。

请严格只输出 JSON，格式：
{
  "label": "已帮你改得更...一点",
  "text": "调整后的私讯内容"
}`;
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
        responseMimeType: 'application/json'
      }
    });
    const text = 
      typeof response.text === 'function' 
        ? response.text() 
        : response.text;
    
    if (!text) {
      throw new Error('Empty response from Gemini.');
    }
    return parseJsonFromText(text);
  } catch (error) {
    const errorMsg = error.message || '';
    const isUnavailable = errorMsg.includes('503') || errorMsg.toLowerCase().includes('unavailable');
    const isRateLimit = errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota');

    if (isUnavailable && retryCount < 1) {
      // Retry once for 503 after 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      return callGemini(prompt, retryCount + 1);
    }

    if (isUnavailable || isRateLimit) {
      const busyError = new Error('现在使用的人有点多，葵刚刚没整理成功。可以等一下再试一次。');
      busyError.status = isUnavailable ? 503 : 429;
      throw busyError;
    }
    throw error;
  }
}

app.post('/api/generate', async (req, res) => {
  try {
    const { text, concern, tone } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: '请先贴上你想整理的内容。' });
    }
    const result = await callGemini(buildPrompt({
      text: String(text).trim(),
      concern: concern || '我怕对方误会',
      tone: tone || '温柔但不卑微'
    }));
    res.json(result);
  } catch (error) {
    console.error('API Error:', error);
    const status = error.status || 500;
    const isBusy = status === 429 || status === 503;
    const message = isBusy ? error.message : '葵刚刚没有整理成功，可以稍后再试一次。';
    res.status(status).json({ error: message });
  }
});

app.post('/api/adjust', async (req, res) => {
  try {
    const { text, direction } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: '内容不能为空。' });
    }
    const result = await callGemini(buildAdjustPrompt({
      text: String(text).trim(),
      direction: direction || 'natural'
    }));
    res.json(result);
  } catch (error) {
    console.error('API Error:', error);
    const status = error.status || 500;
    const isBusy = status === 429 || status === 503;
    const message = isBusy ? error.message : '调整失败，请稍后再试。';
    res.status(status).json({ error: message });
  }
});

export default app;
