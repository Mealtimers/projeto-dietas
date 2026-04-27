'use strict';

const express    = require('express');
const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const router     = express.Router();
const auth       = require('../middlewares/auth');
const store      = require('../lib/userStore');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// ── SMTP config ─────────────────────────────────────────────────────
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

// ── Recovery tokens (in memory, 15 min TTL) ─────────────────────────
const resetTokens = new Map();

// ── POST /api/auth/login ────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { usuario, senha } = req.body || {};
  if (!usuario || !senha) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
  }

  const user = store.findByLogin(usuario);
  if (!user || user.senhaHash !== store.hashPassword(senha)) {
    return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  }

  const token = jwt.sign(
    { userId: user.id, usuario: user.login, nome: user.nome, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, usuario: user.login, nome: user.nome, role: user.role, expiraEm: '12h' });
});

// ── POST /api/auth/recover — solicitar código ───────────────────────
router.post('/recover', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email obrigatório.' });

  const user = store.findByEmail(email);
  // Sempre retorna sucesso para não revelar se email existe
  if (!user) return res.json({ ok: true, message: 'Se o email existir, enviaremos o código.' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  resetTokens.set(hash, { userId: user.id, expiresAt: Date.now() + 15 * 60 * 1000 });

  if (SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
      await transporter.sendMail({
        from: `"Gerador de Pedidos — Meal Time" <${SMTP_USER}>`, to: email,
        subject: 'Recuperação de Senha — Gerador de Pedidos',
        html: `<div style="font-family:Inter,Arial,sans-serif;max-width:460px;margin:0 auto;padding:32px;background:#141518;color:#f0f0f0;border-radius:12px;">
          <div style="text-align:center;margin-bottom:24px;">
            <h2 style="margin:12px 0 4px;color:#f0f0f0;font-size:18px;">Gerador de Pedidos — Meal Time</h2>
            <p style="color:#888;font-size:13px;margin:0;">Recuperação de senha</p>
          </div>
          <div style="background:#1a1b1f;padding:20px;border-radius:10px;text-align:center;margin-bottom:20px;">
            <p style="color:#aaa;font-size:13px;margin:0 0 12px;">Seu código de recuperação:</p>
            <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#22C55E;font-family:monospace;">${code}</div>
          </div>
          <p style="color:#888;font-size:12px;text-align:center;">Expira em <strong style="color:#f0f0f0;">15 minutos</strong>.</p>
        </div>`,
      });
    } catch (e) { console.error('[Recovery] Erro email:', e.message); }
  }

  res.json({ ok: true, message: 'Se o email existir, enviaremos o código.' });
});

// ── POST /api/auth/reset — redefinir senha com código ───────────────
router.post('/reset', (req, res) => {
  const { email, code, novaSenha } = req.body || {};
  if (!email || !code || !novaSenha) return res.status(400).json({ error: 'Email, código e nova senha obrigatórios.' });
  if (novaSenha.length < 4) return res.status(400).json({ error: 'Senha deve ter pelo menos 4 caracteres.' });

  const hash = crypto.createHash('sha256').update(code).digest('hex');
  const entry = resetTokens.get(hash);
  if (!entry || entry.expiresAt < Date.now()) return res.status(400).json({ error: 'Código inválido ou expirado.' });

  const user = store.findById(entry.userId);
  if (!user || !user.email || user.email.toLowerCase() !== email.toLowerCase().trim()) {
    return res.status(400).json({ error: 'Código inválido.' });
  }

  store.updateUser(user.id, { senhaHash: store.hashPassword(novaSenha) });
  resetTokens.delete(hash);
  console.log(`[auth] Senha redefinida via recovery para: ${user.login}`);

  res.json({ ok: true, message: 'Senha alterada com sucesso.' });
});

// ── POST /api/auth/change-password — trocar senha (logado) ──────────
router.post('/change-password', auth, (req, res) => {
  const { senhaAtual, novaSenha } = req.body || {};
  if (!senhaAtual || !novaSenha) return res.status(400).json({ error: 'Senha atual e nova senha obrigatórias.' });
  if (novaSenha.length < 4) return res.status(400).json({ error: 'Nova senha deve ter pelo menos 4 caracteres.' });

  const user = store.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  if (user.senhaHash !== store.hashPassword(senhaAtual)) {
    return res.status(400).json({ error: 'Senha atual incorreta.' });
  }

  store.updateUser(user.id, { senhaHash: store.hashPassword(novaSenha) });
  console.log(`[auth] Senha alterada pelo usuário: ${user.login}`);

  res.json({ ok: true, message: 'Senha alterada com sucesso.' });
});

// ── GET /api/auth/me — dados do usuário logado ──────────────────────
router.get('/me', auth, (req, res) => {
  const user = store.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  res.json(store.sanitize(user));
});

// ── CRUD Usuários (admin only) ──────────────────────────────────────

router.get('/usuarios', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado.' });
  res.json({ ok: true, users: store.getUsers().map(store.sanitize) });
});

router.post('/usuarios', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado.' });
  const { nome, login, senha, role, email } = req.body || {};

  if (!nome || !login || !senha) return res.status(400).json({ error: 'Nome, login e senha são obrigatórios.' });
  const validRoles = ['admin', 'operador'];
  const finalRole = validRoles.includes(role) ? role : 'operador';

  if (store.findByLogin(login)) return res.status(409).json({ error: 'Login já existe.' });

  const user = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nome,
    login,
    email: email ? email.toLowerCase().trim() : null,
    senhaHash: store.hashPassword(senha),
    role: finalRole,
    ativo: true,
    criadoEm: new Date().toISOString(),
  };
  store.addUser(user);
  console.log(`[auth] Usuário criado: ${login} (${finalRole})`);
  res.json({ ok: true, user: store.sanitize(user) });
});

router.put('/usuarios/:id', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado.' });
  const { nome, role, senha, ativo, email } = req.body || {};
  const user = store.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const updates = {};
  if (nome !== undefined) updates.nome = nome;
  if (role !== undefined && ['admin', 'operador'].includes(role)) updates.role = role;
  if (senha) updates.senhaHash = store.hashPassword(senha);
  if (ativo !== undefined) updates.ativo = ativo;
  if (email !== undefined) updates.email = email ? email.toLowerCase().trim() : null;

  const updated = store.updateUser(req.params.id, updates);
  console.log(`[auth] Usuário editado: ${updated.login}`);
  res.json({ ok: true, user: store.sanitize(updated) });
});

router.delete('/usuarios/:id', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado.' });
  const user = store.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  if (user.id === 'admin-1') return res.status(400).json({ error: 'Não é possível excluir o admin padrão.' });
  store.removeUser(req.params.id);
  console.log(`[auth] Usuário excluído: ${user.login}`);
  res.json({ ok: true });
});

module.exports = router;
