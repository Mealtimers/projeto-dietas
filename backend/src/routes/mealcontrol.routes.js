'use strict';

const express = require('express');
const router = express.Router();

const MC_URL      = process.env.MEALCONTROL_URL      || 'https://mealcontrol-production.up.railway.app';
const MC_LOGIN    = process.env.MEALCONTROL_LOGIN    || '';
const MC_PASSWORD = process.env.MEALCONTROL_PASSWORD || '';

// Cache: token + payload de receitas
let cachedToken     = null;
let cachedTokenAt   = 0;
let cachedRecipes   = null;
let cachedRecipesAt = 0;

const TOKEN_TTL_MS   = 6 * 60 * 60 * 1000; // 6h
const RECIPES_TTL_MS = 60 * 1000;          // 60s

async function login() {
  if (cachedToken && Date.now() - cachedTokenAt < TOKEN_TTL_MS) return cachedToken;
  if (!MC_LOGIN || !MC_PASSWORD)
    throw new Error('MEALCONTROL_LOGIN e MEALCONTROL_PASSWORD não configurados.');
  const r = await fetch(`${MC_URL}/api/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ login: MC_LOGIN, password: MC_PASSWORD }),
  });
  if (!r.ok) throw new Error(`Falha ao autenticar no Meal Control (${r.status}).`);
  const data = await r.json();
  if (!data.token) throw new Error('Meal Control não retornou token.');
  cachedToken   = data.token;
  cachedTokenAt = Date.now();
  return cachedToken;
}

async function mcGet(path) {
  const token = await login();
  const r = await fetch(`${MC_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401) {
    cachedToken = null;
    const token2 = await login();
    const r2 = await fetch(`${MC_URL}${path}`, { headers: { Authorization: `Bearer ${token2}` } });
    if (!r2.ok) throw new Error(`Meal Control ${path} respondeu ${r2.status}.`);
    return r2.json();
  }
  if (!r.ok) throw new Error(`Meal Control ${path} respondeu ${r.status}.`);
  return r.json();
}

// GET /api/mealcontrol/recipes — lista simplificada (só o necessário pra vincular)
router.get('/recipes', async (req, res, next) => {
  try {
    if (cachedRecipes && Date.now() - cachedRecipesAt < RECIPES_TTL_MS) {
      return res.json({ recipes: cachedRecipes, cached: true });
    }
    const recipes = await mcGet('/api/recipes');
    const slim = (Array.isArray(recipes) ? recipes : []).map((r) => ({
      id:         r.id,
      name:       r.name,
      portion_g:  r.portion_g,
      yield_qty:  r.yield_qty,
      yield_unit: r.yield_unit,
    }));
    cachedRecipes   = slim;
    cachedRecipesAt = Date.now();
    res.json({ recipes: slim, cached: false });
  } catch (err) {
    next(err);
  }
});

// GET /api/mealcontrol/health — diagnóstico rápido
router.get('/health', async (req, res) => {
  try {
    const r = await fetch(`${MC_URL}/api/health`);
    const data = await r.json();
    res.json({ ok: true, mealcontrol: data, configured: Boolean(MC_LOGIN && MC_PASSWORD) });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

module.exports = router;
