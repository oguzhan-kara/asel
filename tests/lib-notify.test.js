'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { DEFAULTS, deepMerge } = require('../.claude/hooks/lib/config');
const { sendTelegram } = require('../.claude/hooks/lib/notify');

const enabled = deepMerge(DEFAULTS, { notifications: { telegram: { enabled: true } } });

test('disabled config never calls fetch', async () => {
  let calls = 0;
  const r = await sendTelegram(DEFAULTS, 'hi', { fetchImpl: async () => { calls++; }, env: {} });
  assert.deepStrictEqual(r, { sent: false, reason: 'disabled' });
  assert.strictEqual(calls, 0);
});

test('enabled but missing env is a no-op', async () => {
  const r = await sendTelegram(enabled, 'hi', { fetchImpl: async () => {}, env: {} });
  assert.deepStrictEqual(r, { sent: false, reason: 'missing-env' });
});

test('sends one request per chat id with token from env', async () => {
  const seen = [];
  const env = { ASEL_TELEGRAM_BOT_TOKEN: 'T', ASEL_TELEGRAM_CHAT_IDS: '1, 2' };
  const r = await sendTelegram(enabled, 'hello *w*', { env, fetchImpl: async (url, opts) => { seen.push({ url, body: JSON.parse(opts.body) }); return { ok: true }; } });
  assert.deepStrictEqual(r, { sent: true, count: 2, delivered: 2 });
  assert.ok(seen[0].url.includes('/botT/sendMessage'));
  assert.deepStrictEqual(seen.map((s) => s.body.chat_id), ['1', '2']);
  assert.strictEqual(seen[0].body.text, 'hello *w*');
});

test('fetch errors are swallowed', async () => {
  let calls = 0;
  const env = { ASEL_TELEGRAM_BOT_TOKEN: 'T', ASEL_TELEGRAM_CHAT_IDS: '1' };
  const r = await sendTelegram(enabled, 'x', { env, fetchImpl: async () => { calls++; throw new Error('net'); } });
  assert.deepStrictEqual(r, { sent: true, count: 1, delivered: 0 });
  assert.strictEqual(calls, 2);
});

test('falls back to plain text when Markdown is rejected', async () => {
  let calls = 0;
  const seen = [];
  const env = { ASEL_TELEGRAM_BOT_TOKEN: 'T', ASEL_TELEGRAM_CHAT_IDS: '1' };
  const fetchImpl = async (url, opts) => {
    const body = JSON.parse(opts.body);
    seen.push(body);
    calls++;
    if (calls === 1) return { ok: false };
    return { ok: true };
  };
  const r = await sendTelegram(enabled, 'bad *md', { env, fetchImpl });
  assert.deepStrictEqual(r, { sent: true, count: 1, delivered: 1 });
  assert.strictEqual(calls, 2);
  assert.strictEqual(seen[0].parse_mode, 'Markdown');
  assert.strictEqual(seen[1].parse_mode, undefined);
  assert.strictEqual(seen[0].text, 'bad *md');
  assert.strictEqual(seen[1].text, 'bad *md');
});
