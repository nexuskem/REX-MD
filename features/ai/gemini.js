'use strict';

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const config = require('../../config/config');
const logger = require('../../lib/logger');
const { askGroq } = require('./groq');
const ChatContext = require('../../database/models/ChatContext');

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

// Safety settings — balanced: block only clearly harmful content, don't over-filter
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const SYSTEM_INSTRUCTION = `You are REX-MD, a helpful WhatsApp assistant bot. 
You help users with questions, homework, coding problems, math, science, general knowledge, and more.
Keep responses concise and WhatsApp-friendly (plain text, no markdown formatting like ** or ## — use simple line breaks instead).
If asked who made you or what you are, say you are REX-MD, a WhatsApp assistant.`;

/**
 * Calls a Gemini model by name and returns the text response.
 * Throws on rate-limit (429) so the caller can try the next model.
 */
async function callGemini(modelName, prompt, imageBase64, history = []) {
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_INSTRUCTION,
    safetySettings: SAFETY_SETTINGS,
  });

  const parts = [];

  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64,
      },
    });
  }

  parts.push({ text: prompt });

  let result;

  if (history.length > 0 && !imageBase64) {
    // Use chat session for multi-turn text conversations
    const chat = model.startChat({ history });
    result = await chat.sendMessage(parts);
  } else {
    // Single-turn or multimodal
    result = await model.generateContent({ contents: [{ role: 'user', parts }] });
  }

  return result.response.text();
}

/**
 * Central AI resolver — implements the full fallback chain:
 *   1. GEMINI_MODEL_PRIMARY
 *   2. GEMINI_MODEL_FALLBACK (on 429)
 *   3. Groq (on Gemini total failure)
 *
 * @param {string} prompt - The user's question or instruction
 * @param {string|null} [imageBase64] - Base64-encoded image data (for .solve)
 * @param {string|null} [jid] - Chat JID for loading/saving history
 * @returns {Promise<string>} The AI's response text
 */
async function resolveAIResponse(prompt, imageBase64 = null, jid = null) {
  let history = [];
  let ctx = null;

  // Load conversation history for text-only messages
  if (jid && !imageBase64) {
    try {
      ctx = await ChatContext.findOrCreate(jid);
      history = ctx.toGeminiHistory();
    } catch (err) {
      logger.warn({ err }, '[ai] Failed to load chat context, proceeding without history');
    }
  }

  let responseText = null;
  let usedProvider = null;

  // --- Attempt 1: Primary Gemini model ---
  try {
    responseText = await callGemini(config.geminiModelPrimary, prompt, imageBase64, history);
    usedProvider = 'gemini-primary';
  } catch (err) {
    const status = err?.status || err?.httpError;
    if (status === 429 || (err.message && err.message.includes('429'))) {
      logger.warn('[ai] Gemini primary rate-limited, trying fallback model');
    } else {
      logger.error({ err }, '[ai] Gemini primary error');
    }
  }

  // --- Attempt 2: Fallback Gemini model ---
  if (!responseText) {
    try {
      responseText = await callGemini(config.geminiModelFallback, prompt, imageBase64, history);
      usedProvider = 'gemini-fallback';
    } catch (err) {
      logger.warn({ err }, '[ai] Gemini fallback also failed, trying Groq');
    }
  }

  // --- Attempt 3: Groq ---
  if (!responseText && config.groqApiKey) {
    try {
      const groqHistory = history.map((h) => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.parts[0].text,
      }));
      responseText = await askGroq(prompt, groqHistory);
      usedProvider = 'groq';
    } catch (err) {
      logger.error({ err }, '[ai] Groq also failed');
    }
  }

  if (!responseText) {
    return "🤖 The AI is a bit overloaded right now — please try again in a minute!";
  }

  logger.debug(`[ai] Response via ${usedProvider}`);

  // Persist conversation to MongoDB for future context
  if (ctx && !imageBase64) {
    try {
      await ctx.addMessage('user', prompt);
      await ctx.addMessage('model', responseText);
    } catch (err) {
      logger.warn({ err }, '[ai] Failed to save chat context');
    }
  }

  return responseText;
}

module.exports = { resolveAIResponse };
