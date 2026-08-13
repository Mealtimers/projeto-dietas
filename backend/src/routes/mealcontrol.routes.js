'use strict';

const express = require('express');
const router  = express.Router();
const mc      = require('../lib/mealcontrolClient');

// GET /api/mealcontrol/recipes
router.get('/recipes', async (req, res, next) => {
  try { res.json(await mc.listRecipes()); }
  catch (err) { next(err); }
});

// POST /api/mealcontrol/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const data = await mc.listRecipes({ force: true });
    res.json({ ok: true, ...data, refreshedAt: new Date().toISOString() });
  } catch (err) { next(err); }
});

// GET /api/mealcontrol/health
router.get('/health', async (req, res) => {
  try {
    const r = await fetch(`${mc.baseUrl()}/api/health`);
    res.json({ ok: true, mealcontrol: await r.json(), configured: mc.isConfigured() });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message, configured: mc.isConfigured() });
  }
});

module.exports = router;
