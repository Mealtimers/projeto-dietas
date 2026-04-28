// Cliente HTTP minimalista para Supabase (PostgREST).
// CommonJS para casar com o resto do backend (require).
const https = require('node:https');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function request(method, p, body, extraHeaders) {
  return new Promise((resolve, reject) => {
    if (!isConfigured()) {
      return reject(new Error('Supabase não configurado (SUPABASE_URL/SUPABASE_SERVICE_KEY)'));
    }
    const u = new URL(SUPABASE_URL.replace(/\/$/, '') + p);
    const data = body !== undefined && body !== null ? JSON.stringify(body) : null;
    const headers = Object.assign({
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }, extraHeaders || {});
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method,
      headers,
    }, (res) => {
      let buf = '';
      res.on('data', (c) => { buf += c; });
      res.on('end', () => {
        const ok = res.statusCode >= 200 && res.statusCode < 300;
        let parsed;
        try { parsed = buf ? JSON.parse(buf) : null; } catch { parsed = buf; }
        if (!ok) {
          const msg = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
          return reject(new Error('Supabase ' + res.statusCode + ': ' + msg));
        }
        resolve(parsed);
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function splitSchema(table) {
  if (table.includes('.')) {
    const [schema, name] = table.split('.');
    return { schema, name };
  }
  return { schema: 'public', name: table };
}

async function upsert(table, rows, onConflict) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const { schema, name } = splitSchema(table);
  const headers = { Prefer: 'resolution=merge-duplicates,return=minimal' };
  if (schema !== 'public') headers['Content-Profile'] = schema;
  const qs = onConflict ? '?on_conflict=' + encodeURIComponent(onConflict) : '';
  return request('POST', '/rest/v1/' + name + qs, rows, headers);
}

async function select(table, query) {
  const { schema, name } = splitSchema(table);
  const headers = schema !== 'public' ? { 'Accept-Profile': schema } : {};
  return request('GET', '/rest/v1/' + name + '?' + (query || 'select=*'), null, headers);
}

module.exports = { isConfigured, request, upsert, select };
