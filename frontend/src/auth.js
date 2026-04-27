const TOKEN_KEY = 'mt_token';
const USER_KEY  = 'mt_user';

// ── SSO: aceitar token do Painel Geral ──
(function checkSSO() {
  const params = new URLSearchParams(window.location.search);
  const ssoToken = params.get('sso_token');
  if (ssoToken) {
    localStorage.setItem(TOKEN_KEY, ssoToken);
    window.history.replaceState({}, '', window.location.pathname);
  }
})();

export function getToken()      { return localStorage.getItem(TOKEN_KEY); }
export function getUser()       { return localStorage.getItem(USER_KEY); }
export function isAuthenticated() { return Boolean(getToken()); }

export function saveSession(token, usuario) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, usuario);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
