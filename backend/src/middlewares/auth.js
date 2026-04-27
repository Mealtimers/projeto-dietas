'use strict';

const jwt = require('jsonwebtoken');
const { findById } = require('../lib/userStore');

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado. Faça login para continuar.' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');

    // Verificar se o usuário ainda existe e está ativo
    const user = findById(decoded.id);
    if (!user || user.ativo === false) {
      return res.status(401).json({ error: 'Usuário desativado ou não encontrado. Faça login novamente.' });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  }
};
