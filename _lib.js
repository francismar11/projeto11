const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

let getStore = null;
let connectLambda = null;
try {
  ({ getStore, connectLambda } = require('@netlify/blobs'));
} catch (error) {
  getStore = null;
  connectLambda = null;
}

const STORE_NAME = 'teamo-cadastros';
const CADASTROS_KEY = 'cadastros';
const LOCAL_DATA_FILE = path.join(os.tmpdir(), '.netlify-local-data.json');

function json(statusCode, payload, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
    body: JSON.stringify(payload),
  };
}

function text(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
    body,
  };
}

function csv(statusCode, body, filename = 'cadastros.csv') {
  return {
    statusCode,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
    body,
  };
}

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch (error) {
    throw new Error('Dados inválidos enviados para a API.');
  }
}

function sanitizeCadastro(input) {
  const data = {
    nome_crianca: String(input.nome_crianca || '').trim(),
    idade: String(input.idade || '').trim(),
    responsavel: String(input.responsavel || '').trim(),
    whatsapp: String(input.whatsapp || '').trim(),
    observacoes: String(input.observacoes || '').trim(),
  };

  const errors = {};
  if (data.nome_crianca.length < 3) errors.nome_crianca = 'Informe o nome da criança com pelo menos 3 letras.';
  if (!/^\d{1,2}$/.test(data.idade) || Number(data.idade) < 1 || Number(data.idade) > 17) errors.idade = 'Informe uma idade válida entre 1 e 17 anos.';
  if (data.responsavel.length < 3) errors.responsavel = 'Informe o nome do responsável.';
  const digits = data.whatsapp.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) errors.whatsapp = 'Informe um WhatsApp válido com DDD.';
  if (data.observacoes.length > 500) errors.observacoes = 'As observações devem ter no máximo 500 caracteres.';

  if (Object.keys(errors).length) {
    const error = new Error('Verifique os campos do cadastro.');
    error.validation = errors;
    throw error;
  }

  return data;
}

function isLocalDev() {
  return Boolean(process.env.NETLIFY_DEV || process.env.NETLIFY_LOCAL || process.env.NODE_ENV === 'development');
}

async function readLocal() {
  try {
    const raw = await fs.promises.readFile(LOCAL_DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (error) {
    return [];
  }
}

async function writeLocal(data) {
  await fs.promises.writeFile(LOCAL_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function initBlobs(event) {
  if (connectLambda && event) {
    try {
      connectLambda(event);
    } catch (error) {
      // runtime já inicializado ou sem contexto de blobs
    }
  }
}

function buildStoreOptions(event) {
  if (!getStore) return null;
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID || process.env.CONTEXT_SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_BLOBS_TOKEN || process.env.BLOBS_TOKEN;

  if (event) initBlobs(event);

  const options = { name: STORE_NAME, consistency: 'strong' };
  if (siteID && token) {
    options.siteID = siteID;
    options.token = token;
  }
  return options;
}

function getBlobStore(event) {
  const options = buildStoreOptions(event);
  if (!options) return null;
  try {
    return getStore(options);
  } catch (error) {
    return null;
  }
}

async function resolveStorage(event) {
  const store = getBlobStore(event);
  if (store) {
    try {
      await store.get(CADASTROS_KEY, { type: 'json', consistency: 'strong' });
      return { kind: 'blob', store };
    } catch (error) {
      const message = String((error && error.message) || '');
      if (/Blob Store|blobs|store|authorization|token|site/i.test(message)) {
        if (isLocalDev()) return { kind: 'local-dev-fallback', store: null };
        const storageError = new Error('Blob Store indisponível neste deploy. Conecte o Netlify Blobs ao site e publique novamente.');
        storageError.code = 'BLOB_UNAVAILABLE';
        storageError.cause = error;
        throw storageError;
      }
      return { kind: 'blob', store };
    }
  }

  if (isLocalDev()) return { kind: 'local-dev-fallback', store: null };
  const missingError = new Error('Blob Store indisponível neste deploy. Conecte o Netlify Blobs ao site e publique novamente.');
  missingError.code = 'BLOB_UNAVAILABLE';
  throw missingError;
}

async function getCadastros(event) {
  const storage = await resolveStorage(event);
  if (storage.kind === 'blob') {
    try {
      const raw = await storage.store.get(CADASTROS_KEY, { type: 'json', consistency: 'strong' });
      return Array.isArray(raw) ? raw : [];
    } catch (error) {
      throw new Error('Não foi possível ler os cadastros no Blob Store.');
    }
  }
  return await readLocal();
}

async function saveCadastros(data, event) {
  const storage = await resolveStorage(event);
  if (storage.kind === 'blob') {
    try {
      await storage.store.setJSON(CADASTROS_KEY, data);
      return;
    } catch (error) {
      throw new Error('Não foi possível salvar os cadastros no Blob Store.');
    }
  }
  await writeLocal(data);
}

async function getStorageStatus(event) {
  try {
    const storage = await resolveStorage(event);
    return storage.kind;
  } catch (error) {
    return 'missing';
  }
}

function sortCadastros(items) {
  return [...items].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function nowIso() {
  return new Date().toISOString();
}

function parseCookies(cookieHeader = '') {
  const cookies = {};
  cookieHeader.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value || '');
  });
  return cookies;
}

function getAdminCredentials() {
  return {
    username: process.env.ADMIN_USER || 'Leydyany',
    password: process.env.ADMIN_PASSWORD || '203040',
  };
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'troque-essa-chave-no-netlify';
const SESSION_COOKIE = 'teamo_admin_session';
const SESSION_AGE = 60 * 60 * 12;

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
}

function createSessionToken(username) {
  const payload = JSON.stringify({ u: username, exp: Math.floor(Date.now() / 1000) + SESSION_AGE });
  const encoded = Buffer.from(payload).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

function readSession(event) {
  const cookies = parseCookies(event.headers.cookie || event.headers.Cookie || '');
  const token = cookies[SESSION_COOKIE];
  if (!token || !token.includes('.')) return null;
  const [encoded, signature] = token.split('.');
  if (sign(encoded) !== signature) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

function sessionCookie(token) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${SESSION_AGE}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

function requireAuth(event) {
  const session = readSession(event);
  if (!session) {
    return { ok: false, response: json(401, { ok: false, message: 'Faça login para acessar o painel.' }) };
  }
  return { ok: true, session };
}

function toCsv(items) {
  const escape = (value) => {
    const s = String(value ?? '');
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const lines = [
    ['ID', 'Nome da criança', 'Idade', 'Responsável', 'WhatsApp', 'Observações', 'Criado em', 'Atualizado em'].map(escape).join(','),
    ...items.map((item) => [
      item.id,
      item.nome_crianca,
      item.idade,
      item.responsavel,
      item.whatsapp,
      item.observacoes || '',
      item.created_at,
      item.updated_at || '',
    ].map(escape).join(',')),
  ];
  return '\ufeff' + lines.join('\n');
}

module.exports = {
  json,
  text,
  csv,
  parseBody,
  sanitizeCadastro,
  initBlobs,
  getCadastros,
  saveCadastros,
  getStorageStatus,
  sortCadastros,
  nowIso,
  getAdminCredentials,
  createSessionToken,
  sessionCookie,
  clearSessionCookie,
  requireAuth,
  toCsv,
};
