'use strict';

const express = require('express');
const jwt     = require('jsonwebtoken');
const router  = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { usuario, senha } = req.body;

  if (
    usuario !== process.env.ADMIN_USER ||
    senha   !== process.env.ADMIN_PASS
  ) {
    return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  }

  const token = jwt.sign(
    { usuario, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, usuario, expiraEm: '12h' });
});

module.exports = router;
