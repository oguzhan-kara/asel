'use strict';

async function sendTelegram(config, message, opts = {}) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const env = opts.env || process.env;
  const tg = config && config.notifications && config.notifications.telegram;
  if (!tg || !tg.enabled) return { sent: false, reason: 'disabled' };
  const token = env[tg.tokenEnv || 'ASEL_TELEGRAM_BOT_TOKEN'];
  const ids = String(env[tg.chatIdsEnv || 'ASEL_TELEGRAM_CHAT_IDS'] || '').split(/[\s,]+/).filter(Boolean);
  if (!token || ids.length === 0 || typeof fetchImpl !== 'function') return { sent: false, reason: 'missing-env' };
  const timeoutMs = tg.timeoutMs || 5000;
  for (const chatId of ids) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message.replace(/\r/g, ''), parse_mode: 'Markdown' }),
        signal: ctrl.signal,
      });
    } catch { /* never block the workflow on a notification */ } finally { clearTimeout(timer); }
  }
  return { sent: true, count: ids.length };
}

module.exports = { sendTelegram };
