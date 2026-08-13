'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// ── Helpers ─────────────────────────────────────────────────────────

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function hashPassword(pass) {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return crypto.createHash('sha256').update(pass + secret).digest('hex');
}

function loadUsers() {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

// ── Seed / sincronia do admin padrão ─────────────────────────────────
// Sempre garante que o admin definido por ADMIN_USER/ADMIN_PASS existe
// com o hash correto (JWT_SECRET pode ter rotacionado, e o filesystem
// pode ser persistente entre deploys). Se admin-1 já existir, atualiza
// APENAS ele — não mexe em outros usuários criados via UI.

function seedDefaultAdmin() {
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'changeme';
  const desejadoHash = hashPassword(adminPass);

  const users = loadUsers();
  const existente = users.find((u) => u.id === 'admin-1');

  if (!existente) {
    users.push({
      id: 'admin-1',
      nome: 'Administrador',
      login: adminUser,
      email: null,
      senhaHash: desejadoHash,
      role: 'admin',
      ativo: true,
      criadoEm: new Date().toISOString(),
    });
    saveUsers(users);
    console.log('[auth] Admin padrão criado:', adminUser);
    return;
  }

  // Já existe — se hash ou login estiverem out-of-sync com env, corrige
  let mudou = false;
  if (existente.login !== adminUser)     { existente.login = adminUser; mudou = true; }
  if (existente.senhaHash !== desejadoHash) { existente.senhaHash = desejadoHash; mudou = true; }
  if (existente.ativo === false)         { existente.ativo = true; mudou = true; }

  if (mudou) {
    saveUsers(users);
    console.log('[auth] Admin padrão sincronizado com ADMIN_USER/ADMIN_PASS:', adminUser);
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────

function getUsers() { return loadUsers(); }

function findByLogin(login) {
  if (!login) return null;
  return loadUsers().find(u => u.login === login && u.ativo !== false) || null;
}

function findById(id) {
  return loadUsers().find(u => u.id === id) || null;
}

function findByEmail(email) {
  if (!email) return null;
  const e = email.toLowerCase().trim();
  return loadUsers().find(u => u.email && u.email.toLowerCase() === e && u.ativo !== false) || null;
}

function addUser(user) {
  const users = loadUsers();
  users.push(user);
  saveUsers(users);
}

function updateUser(id, updates) {
  const users = loadUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  Object.assign(users[idx], updates);
  saveUsers(users);
  return users[idx];
}

function removeUser(id) {
  const users = loadUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  const [removed] = users.splice(idx, 1);
  saveUsers(users);
  return removed;
}

function sanitize(u) {
  return { id: u.id, nome: u.nome, login: u.login, email: u.email || null, role: u.role, ativo: u.ativo, criadoEm: u.criadoEm };
}

module.exports = {
  hashPassword,
  seedDefaultAdmin,
  getUsers,
  findByLogin,
  findById,
  findByEmail,
  addUser,
  updateUser,
  removeUser,
  sanitize,
};
