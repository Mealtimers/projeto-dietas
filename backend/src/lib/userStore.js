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

// ── Seed admin padrão (só se users.json não existe) ─────────────────

function seedDefaultAdmin() {
  if (fs.existsSync(USERS_FILE)) return; // nunca sobrescreve

  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'changeme';

  const users = [{
    id: 'admin-1',
    nome: 'Administrador',
    login: adminUser,
    email: null,
    senhaHash: hashPassword(adminPass),
    role: 'admin',
    ativo: true,
    criadoEm: new Date().toISOString(),
  }];
  saveUsers(users);
  console.log('[auth] Admin padrão criado:', adminUser);
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
