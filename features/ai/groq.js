'use strict';

const Groq = require('groq-sdk');
const config = require('../../config/config');
const logger = require('../../lib/logger');

let groqClient = null;

function getGroqClient() {
  if (!groqClient && config.groqApiKey) {
    groqClient = new Groq({ apiKey: config.groqApiKey });
  }
  return groqClient;
}

const SYSTEM_MESSAGE = {
  role: 'system',
  content: `You are REX-MD, a helpful WhatsApp assistant bot.
You help users with questions, homework, coding problems, math, science, general knowledge, and more.
Keep responses concise and WhatsApp-friendly (plain text, no markdown formatting like ** or ## — use simple line breaks instead).
If asked who made you or what you are, say you are REX-MD, a WhatsApp assistant.`,
};

/**
 * Sends a prompt to Groq and returns the text response.
 * Used as the third-tier fallback after both Gemini models are exhausted.
 *
 * @param {string} prompt - The user's question
 * @param {Array<{role:string, content:string}>} [history] - Prior conversation turns
 * @returns {Promise<string>} The model's response text
 */
async function askGroq(prompt, history = []) {
  const client = getGroqClient();
  if (!client) {
    throw new Error('Groq API key not configured');
  }

  const messages = [SYSTEM_MESSAGE, ...history, { role: 'user', content: prompt }];

  const completion = await client.chat.completions.create({
    model: config.groqModel,
    messages,
    max_tokens: 1024,
    temperature: 0.7,
  });

  const text = completion.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq returned empty response');

  logger.debug('[groq] Response received');
  return text;
}

module.exports = { askGroq };
