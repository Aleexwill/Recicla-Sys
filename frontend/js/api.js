// js/api.js — cliente API compartido por todas las pantallas
(function (global) {
  const TOKEN_KEY = 'reciclasys_token';
  const USER_KEY = 'reciclasys_user';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function setSession(token, usuario) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(usuario));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // Llama a la API. path es relativo a /api (ej: '/materiales').
  // Ante un 401 (sin sesión válida) limpia la sesión y redirige a Login.
  async function apiFetch(path, options) {
    options = options || {};
    const headers = Object.assign({}, options.headers || {});
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch('/api' + path, Object.assign({}, options, { headers }));

    // Solo forzamos logout si el 401 llega para una request que SÍ llevaba
    // token (sesión que se volvió inválida). Si no había token (ej: intento
    // de login con credenciales incorrectas), es un error normal a mostrar.
    if (res.status === 401 && token) {
      clearSession();
      window.location.href = 'Login.html';
      return new Promise(function () {}); // nos vamos de la página, no resolvemos
    }

    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      // sin cuerpo JSON (ej: 204)
    }

    if (!res.ok) {
      const err = new Error((data && data.error) || ('Error ' + res.status));
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  function money(n) {
    const v = Number(n) || 0;
    return '$ ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Guaraníes: sin decimales, separador de miles con punto (convención local).
  function moneyGs(n) {
    const v = Math.round(Number(n) || 0);
    return 'Gs. ' + v.toLocaleString('es-PY', { maximumFractionDigits: 0 });
  }

  function usdToGs(usd, tipoCambio) {
    return (Number(usd) || 0) * (Number(tipoCambio) || 0);
  }

  // Monto en USD junto a su equivalente en Gs. (si hay tipo de cambio disponible).
  // Devuelve HTML — usar con innerHTML, no textContent.
  function moneyDual(usd, tipoCambio) {
    const usdTxt = escapeHtml(money(usd));
    const tc = Number(tipoCambio) || 0;
    if (!tc) return usdTxt;
    return usdTxt + ' <span class="text-sm font-normal opacity-70">(≈ ' + escapeHtml(moneyGs(usdToGs(usd, tc))) + ')</span>';
  }

  function gsToUsd(gs, tipoCambio) {
    const tc = Number(tipoCambio) || 0;
    if (!tc) return 0;
    return (Number(gs) || 0) / tc;
  }

  function kg(n) {
    const v = Number(n) || 0;
    return v.toLocaleString('es-AR', { maximumFractionDigits: 2 }) + ' kg';
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('es-AR');
  }

  function fmtDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  function todayISO() {
    const d = new Date();
    const pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  global.ReciclaAPI = {
    apiFetch: apiFetch,
    getToken: getToken,
    getUser: getUser,
    setSession: setSession,
    clearSession: clearSession,
    money: money,
    moneyGs: moneyGs,
    moneyDual: moneyDual,
    usdToGs: usdToGs,
    gsToUsd: gsToUsd,
    kg: kg,
    fmtDate: fmtDate,
    fmtDateTime: fmtDateTime,
    todayISO: todayISO,
    escapeHtml: escapeHtml,
  };
})(window);
