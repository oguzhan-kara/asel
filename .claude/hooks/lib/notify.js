'use strict';

async function post(fetchImpl, url, body, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
    return !!(res && res.ok);
  } catch { return false; } finally { clearTimeout(timer); }
}

/** Attempts delivery; `sent` means attempted, `delivered` counts 2xx responses. Never throws. */
async function sendTelegram(config, message, opts = {}) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const env = opts.env || process.env;
  const tg = config && config.notifications && config.notifications.telegram;
  if (!tg || !tg.enabled) return { sent: false, reason: 'disabled' };
  const token = env[tg.tokenEnv || 'ASEL_TELEGRAM_BOT_TOKEN'];
  const ids = String(env[tg.chatIdsEnv || 'ASEL_TELEGRAM_CHAT_IDS'] || '').split(/[\s,]+/).filter(Boolean);
  if (!token || ids.length === 0 || typeof fetchImpl !== 'function') return { sent: false, reason: 'missing-env' };
  const timeoutMs = tg.timeoutMs ?? 5000;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const text = message.replace(/\r/g, '');
  let delivered = 0;
  for (const chatId of ids) {
    const ok = await post(fetchImpl, url, { chat_id: chatId, text, parse_mode: 'Markdown' }, timeoutMs)
      || await post(fetchImpl, url, { chat_id: chatId, text }, timeoutMs);
    if (ok) delivered++;
  }
  return { sent: true, count: ids.length, delivered };
}

module.exports = { sendTelegram };
