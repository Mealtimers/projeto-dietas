'use strict';

/**
 * Cliente HTTP autenticado pro Meal Control.
 * Cache de token (6h) e receitas (30s) compartilhado entre proxy e integrações.
 */

const MC_URL      = process.env.MEALCONTROL_URL      || 'https://mealcontrol-production.up.railway.app';
const MC_LOGIN    = process.env.MEALCONTROL_LOGIN    || '';
const MC_PASSWORD = process.env.MEALCONTROL_PASSWORD || '';

const TOKEN_TTL_MS   = 6 * 60 * 60 * 1000;
const RECIPES_TTL_MS = 30 * 1000;

const state = {
  token: null, tokenAt: 0,
  recipes: null, recipesAt: 0,
};

async function login() {
  if (state.token && Date.now() - state.tokenAt < TOKEN_TTL_MS) return state.token;
  if (!MC_LOGIN || !MC_PASSWORD)
    throw Object.assign(new Error('MEALCONTROL_LOGIN e MEALCONTROL_PASSWORD não configurados.'), { code: 'MC_NOT_CONFIGURED' });
  const r = await fetch(`${MC_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: MC_LOGIN, password: MC_PASSWORD }),
  });
  if (!r.ok) throw new Error(`Falha ao autenticar no Meal Control (${r.status}).`);
  const data = await r.json();
  if (!data.token) throw new Error('Meal Control não retornou token.');
  state.token = data.token; state.tokenAt = Date.now();
  return state.token;
}

async function request(method, path, body) {
  const token = await login();
  const doFetch = async (tk) => fetch(`${MC_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${tk}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let r = await doFetch(token);
  if (r.status === 401) { state.token = null; r = await doFetch(await login()); }
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`MC ${method} ${path} → ${r.status}: ${txt.slice(0, 200)}`);
  }
  return r.status === 204 ? null : r.json();
}

const get  = (p)       => request('GET',    p);
const post = (p, body) => request('POST',   p, body);
const put  = (p, body) => request('PUT',    p, body);

async function listRecipes({ force = false } = {}) {
  if (!force && state.recipes && Date.now() - state.recipesAt < RECIPES_TTL_MS) {
    return { recipes: state.recipes, cached: true };
  }
  const recipes = await get('/api/recipes');
  const slim = (Array.isArray(recipes) ? recipes : []).map((r) => ({
    id: r.id, name: r.name,
    portion_g: r.portion_g, yield_qty: r.yield_qty, yield_unit: r.yield_unit,
  }));
  state.recipes = slim; state.recipesAt = Date.now();
  return { recipes: slim, cached: false };
}

function isConfigured() { return Boolean(MC_LOGIN && MC_PASSWORD); }
function baseUrl()      { return MC_URL; }

module.exports = { get, post, put, listRecipes, isConfigured, baseUrl };
