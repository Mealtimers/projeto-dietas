require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const routes      = require('./routes/index');
const authRoutes  = require('./routes/auth.routes');
const auth        = require('./middlewares/auth');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// Rota pública — login
app.use('/api/auth', authRoutes);

// Rotas protegidas — exige token JWT
app.use('/api', auth, routes);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
