require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const routes       = require('./routes/index');
const authRoutes   = require('./routes/auth.routes');
const portalRoutes = require('./routes/portal.routes');
const auth         = require('./middlewares/auth');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ── Segurança ────────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : null; // null = aceita qualquer origem (dev ou quando não configurado)

app.use(cors({
  origin(origin, cb) {
    // Sem lista configurada → aceita tudo (mesma origem ou dev)
    if (!allowedOrigins || !origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Origem não permitida pelo CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// Rate limiter global — 100 req / 15 min por IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
}));

// Rate limiter mais restritivo para auth (login) — 10 tentativas / 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

// Rotas públicas (auth com rate limiter restritivo)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/portal', portalRoutes);

// Rotas protegidas — exige token JWT
app.use('/api', auth, routes);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
