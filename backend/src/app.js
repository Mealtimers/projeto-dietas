require('dotenv').config();
const path        = require('path');
const fs          = require('fs');
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const routes       = require('./routes/index');
const authRoutes   = require('./routes/auth.routes');
const portalRoutes = require('./routes/portal.routes');
const auth         = require('./middlewares/auth');
const errorHandler = require('./middlewares/errorHandler');
const { seedDefaultAdmin } = require('./lib/userStore');

const app = express();

// ── Seed admin padrão na primeira execução ──────────────────────
seedDefaultAdmin();

// ── Trust proxy (Railway/Heroku usa reverse proxy) ──────────────
app.set('trust proxy', 1);

// ── Segurança ────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,   // desabilita CSP — o frontend usa inline scripts do Vite
  crossOriginEmbedderPolicy: false,
}));

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

// ── Frontend estático (produção) ────────────────────────────────
// Detecta o caminho do frontend/dist dinamicamente (varia entre dev local e Railway)
const possibleDistPaths = [
  path.join(__dirname, '..', '..', 'frontend', 'dist'),      // dev local
  path.resolve(process.cwd(), '..', 'frontend', 'dist'),     // Railway (cwd = /app/backend)
  path.resolve(process.cwd(), 'frontend', 'dist'),           // Railway (cwd = /app)
  '/app/frontend/dist',                                       // Railway absoluto
];
const frontendDist = possibleDistPaths.find(p => fs.existsSync(path.join(p, 'index.html'))) || possibleDistPaths[0];
console.log('Frontend dist path:', frontendDist, '| exists:', fs.existsSync(path.join(frontendDist, 'index.html')));

app.use(express.static(frontendDist));

app.use(express.json({ limit: '1mb' }));

// Rate limiter global — 100 req / 15 min por IP (apenas rotas /api)
app.use('/api', rateLimit({
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

// Catch-all: qualquer rota que NÃO seja /api retorna index.html (SPA routing)
app.get('*', (req, res) => {
  const indexPath = path.join(frontendDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Frontend não encontrado. Execute npm run build no frontend.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
