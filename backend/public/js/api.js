// js/api.js — cliente API compartido por todas las pantallas
(function (global) {
  const TOKEN_KEY = 'reciclasys_token';
  const USER_KEY = 'reciclasys_user';
  // Guarda el nombre/logo de la última empresa que inició sesión en este
  // dispositivo, en una clave aparte de la sesión: así Login.html puede
  // mostrar la marca de esa empresa incluso después de un logout (que
  // borra USER_KEY pero no esta).
  const LAST_EMPRESA_KEY = 'reciclasys_last_empresa';

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
    if (usuario && usuario.empresa_nombre) {
      try {
        localStorage.setItem(LAST_EMPRESA_KEY, JSON.stringify({
          nombre: usuario.empresa_nombre,
          logo_url: usuario.empresa_logo_url || null,
        }));
      } catch (e) { /* no crítico */ }
    }
  }

  function getLastEmpresa() {
    try {
      return JSON.parse(localStorage.getItem(LAST_EMPRESA_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // Caché de las respuestas GET, para poder mostrar la última copia
  // conocida cuando no hay conexión (ver apiFetch más abajo).
  function cacheKey(path) { return 'reciclasys_cache::' + path; }
  function cacheGet(path) {
    try {
      const raw = localStorage.getItem(cacheKey(path));
      return raw ? JSON.parse(raw) : undefined;
    } catch (e) { return undefined; }
  }
  function cacheSet(path, data) {
    try { localStorage.setItem(cacheKey(path), JSON.stringify(data)); } catch (e) { /* localStorage lleno: no es crítico */ }
  }

  // Cola de operaciones (compras/ventas) creadas sin conexión, para
  // reenviar en orden apenas vuelve la señal. Ver flushQueue().
  const QUEUE_KEY = 'reciclasys_pending_queue';
  function getQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveQueue(queue) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch (e) { /* no crítico */ }
    global.dispatchEvent(new CustomEvent('reciclasys:queue-changed'));
  }
  function queueForSync(path, method, body) {
    const queue = getQueue();
    queue.push({ path: path, method: method, body: body, createdAt: new Date().toISOString(), attempts: 0 });
    saveQueue(queue);
  }

  // Reenvía en orden lo que quedó pendiente. Si una operación falla porque
  // el servidor la rechaza (ej: se quedó sin stock mientras estaba offline)
  // queda en la cola con el error, en vez de perderse en silencio — pero
  // esta versión no tiene una pantalla para revisar/editar esos casos a mano.
  async function flushQueue() {
    if (!navigator.onLine) return;
    const queue = getQueue();
    if (queue.length === 0) return;
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const remaining = [];
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      try {
        const res = await fetch('/api' + item.path, { method: item.method, headers: headers, body: item.body });
        if (!res.ok) {
          item.attempts += 1;
          item.lastError = 'Error ' + res.status;
          remaining.push(item);
        }
      } catch (networkErr) {
        // Se cortó la conexión de nuevo a mitad del envío: dejamos este y
        // el resto de la cola tal cual, para no reenviar fuera de orden.
        remaining.push.apply(remaining, queue.slice(i));
        break;
      }
    }
    saveQueue(remaining);
  }

  // Llama a la API. path es relativo a /api (ej: '/materiales').
  // Ante un 401 (sin sesión válida) limpia la sesión y redirige a Login.
  // Si no hay conexión: los GET devuelven la última copia cacheada (si
  // existe), y los POST marcados con queueIfOffline se guardan para
  // reenviarse solos cuando vuelva la señal (ver flushQueue).
  async function apiFetch(path, options) {
    options = options || {};
    const method = (options.method || 'GET').toUpperCase();
    const headers = Object.assign({}, options.headers || {});
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    let res;
    try {
      res = await fetch('/api' + path, Object.assign({}, options, { headers }));
    } catch (networkErr) {
      if (method === 'GET') {
        const cached = cacheGet(path);
        if (cached !== undefined) return cached;
      } else if (options.queueIfOffline) {
        queueForSync(path, method, options.body);
        return { queued: true };
      }
      throw new Error('No hay conexión a internet. Revisá tu conexión e intentá de nuevo.');
    }

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

    if (method === 'GET') cacheSet(path, data);

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
  // Si monedaPrincipal es 'PYG', se muestran los Guaraníes como cifra principal
  // y el USD como equivalente entre paréntesis (según Configuración General).
  // Devuelve HTML — usar con innerHTML, no textContent.
  function moneyDual(usd, tipoCambio, monedaPrincipal) {
    const usdTxt = escapeHtml(money(usd));
    const tc = Number(tipoCambio) || 0;
    if (!tc) return usdTxt;
    if (monedaPrincipal === 'PYG') {
      const gsTxt = escapeHtml(moneyGs(usdToGs(usd, tc)));
      return gsTxt + ' <span class="text-sm font-normal opacity-70">(≈ ' + usdTxt + ')</span>';
    }
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

  // Paleta fija de colores de avatar — el admin elige uno por usuario en
  // Gestión de Usuarios. Si un usuario no tiene uno asignado, se elige
  // un color determinístico según su id para que sea siempre el mismo.
  var AVATAR_COLORS = ['#1dc962', '#2563eb', '#db2777', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#dc2626'];

  function avatarInitials(nombre) {
    var partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  function avatarColorFor(usuario) {
    if (usuario && usuario.avatar_color) return usuario.avatar_color;
    var id = (usuario && usuario.id) || 0;
    return AVATAR_COLORS[id % AVATAR_COLORS.length];
  }

  // Devuelve HTML de un badge circular con las iniciales del usuario —
  // usar con innerHTML, no textContent.
  function avatarBadgeHtml(nombre, color) {
    var iniciales = escapeHtml(avatarInitials(nombre));
    var bg = escapeHtml(color || AVATAR_COLORS[0]);
    return '<div class="flex items-center justify-center rounded-full size-10 text-white font-bold text-sm" style="background-color: ' + bg + '">' + iniciales + '</div>';
  }

  // Pinta la marca (nombre + logo) en los elementos [data-empresa-nombre]
  // y [data-empresa-logo] de la página. `empresa` es { nombre, logo_url }
  // o null/undefined para volver al branding genérico de ReciclaS (el
  // ícono de reciclaje que ya trae cada página como contenido por
  // defecto, así que si no hay logo no tocamos el HTML del badge).
  function applyEmpresaBranding(empresa) {
    var nombre = (empresa && empresa.nombre) || 'ReciclaS';
    var logoUrl = empresa && empresa.logo_url;
    document.querySelectorAll('[data-empresa-nombre]').forEach(function (el) {
      el.textContent = nombre;
    });
    if (!logoUrl) return;
    document.querySelectorAll('[data-empresa-logo]').forEach(function (el) {
      var original = el.innerHTML;
      var img = document.createElement('img');
      img.src = logoUrl;
      img.alt = nombre;
      img.className = 'h-full w-full object-cover';
      img.onerror = function () { el.innerHTML = original; };
      el.innerHTML = '';
      el.appendChild(img);
    });
  }

  // Descarga un archivo CSV a partir de una lista de "secciones": cada
  // sección es { titulo, columnas: [...], filas: [[...], ...] }. Sin
  // dependencias externas — arma el CSV a mano y dispara la descarga con
  // un <a href="blob:..."> temporal.
  function csvEscape(value) {
    var s = value == null ? '' : String(value);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function downloadCsv(filename, secciones) {
    var lineas = [];
    secciones.forEach(function (sec, idx) {
      if (idx > 0) lineas.push('');
      if (sec.titulo) lineas.push(csvEscape(sec.titulo));
      if (sec.columnas) lineas.push(sec.columnas.map(csvEscape).join(','));
      (sec.filas || []).forEach(function (fila) {
        lineas.push(fila.map(csvEscape).join(','));
      });
    });
    var blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Comprobante imprimible de una compra o venta. Arma una vista de solo
  // impresión dentro de la misma página (oculta el resto con CSS de
  // @media print) y dispara window.print(), para que el usuario elija
  // imprimir en papel o "Guardar como PDF" desde el diálogo del
  // navegador — sin depender de ninguna librería externa.
  //
  // cfg = { tipo, numero, contraparteLabel, contraparteNombre, fecha,
  //   estado, items: [{ nombre, cantidad, precioTxt, subtotalTxt }],
  //   subtotalTxt, impuestoLabel, impuestoTxt, totalTxt }
  // precioTxt/subtotalTxt/impuestoTxt/totalTxt ya vienen formateados con
  // money()/moneyDual() (HTML seguro) — el resto de los campos es texto
  // plano y se escapa acá.
  function printComprobante(cfg) {
    var area = document.getElementById('reciclasys-print-area');
    if (!area) {
      area = document.createElement('div');
      area.id = 'reciclasys-print-area';
      area.style.display = 'none';
      document.body.appendChild(area);

      var style = document.createElement('style');
      style.textContent =
        '@media print {' +
        '  body > *:not(#reciclasys-print-area) { display: none !important; }' +
        '  #reciclasys-print-area { display: block !important; }' +
        '}' +
        '#reciclasys-print-area { font-family: Arial, Helvetica, sans-serif; color: #111; max-width: 480px; margin: 0 auto; }' +
        '#reciclasys-print-area h1 { font-size: 18px; margin: 0 0 2px; }' +
        '#reciclasys-print-area p { font-size: 13px; margin: 2px 0; }' +
        '#reciclasys-print-area .rc-sub { color: #555; margin: 0 0 16px; }' +
        '#reciclasys-print-area table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 12px 0; }' +
        '#reciclasys-print-area th, #reciclasys-print-area td { padding: 6px 4px; text-align: left; border-bottom: 1px solid #ddd; }' +
        '#reciclasys-print-area th:last-child, #reciclasys-print-area td:last-child { text-align: right; }' +
        '#reciclasys-print-area .rc-totales td { border: none; padding: 3px 4px; }' +
        '#reciclasys-print-area .rc-total-final td { font-weight: bold; font-size: 15px; border-top: 2px solid #111; }';
      document.head.appendChild(style);
    }

    var filasItems = cfg.items.map(function (it) {
      return '<tr><td>' + escapeHtml(it.nombre) + '</td><td>' + escapeHtml(it.cantidad) + '</td><td>' + it.precioTxt + '</td><td>' + it.subtotalTxt + '</td></tr>';
    }).join('');

    area.innerHTML =
      '<h1>ReciclaS</h1>' +
      '<p class="rc-sub">Comprobante de ' + escapeHtml(cfg.tipo) + ' #' + escapeHtml(String(cfg.numero).padStart(5, '0')) + '</p>' +
      '<p>' + escapeHtml(cfg.contraparteLabel) + ': <strong>' + escapeHtml(cfg.contraparteNombre || '—') + '</strong></p>' +
      '<p>Fecha: ' + escapeHtml(cfg.fecha) + (cfg.estado ? ' &middot; Estado: ' + escapeHtml(cfg.estado) : '') + '</p>' +
      '<table><thead><tr><th>Material</th><th>Cant.</th><th>P/u</th><th>Subtotal</th></tr></thead><tbody>' + filasItems + '</tbody></table>' +
      '<table class="rc-totales">' +
      (cfg.subtotalTxt ? '<tr><td>Subtotal</td><td style="text-align:right">' + cfg.subtotalTxt + '</td></tr>' : '') +
      (cfg.impuestoLabel ? '<tr><td>' + escapeHtml(cfg.impuestoLabel) + '</td><td style="text-align:right">' + cfg.impuestoTxt + '</td></tr>' : '') +
      '<tr class="rc-total-final"><td>TOTAL</td><td style="text-align:right">' + cfg.totalTxt + '</td></tr>' +
      '</table>';

    window.print();
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
    AVATAR_COLORS: AVATAR_COLORS,
    avatarInitials: avatarInitials,
    avatarColorFor: avatarColorFor,
    avatarBadgeHtml: avatarBadgeHtml,
    printComprobante: printComprobante,
    downloadCsv: downloadCsv,
    getLastEmpresa: getLastEmpresa,
    applyEmpresaBranding: applyEmpresaBranding,
  };

  // Banner de conectividad — estilos inline a propósito: si no hay
  // conexión, Tailwind (que se carga desde un CDN externo) puede no haber
  // cargado, y el aviso tiene que verse igual. Además de avisar que no
  // hay señal, muestra cuántas operaciones quedaron guardadas localmente
  // esperando para sincronizarse.
  function initConnectivity() {
    var banner = document.createElement('div');
    banner.id = 'reciclasys-offline-banner';
    banner.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;z-index:9999;' +
      'font:600 13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
      'text-align:center;padding:8px 12px;box-shadow:0 1px 4px rgba(0,0,0,0.2);';
    document.body.appendChild(banner);

    function update() {
      var pending = getQueue().length;
      if (!navigator.onLine) {
        banner.style.background = '#f59e0b';
        banner.style.color = '#1a1a1a';
        banner.textContent = pending === 1
          ? 'Sin conexión — 1 operación guardada en este dispositivo, se va a enviar cuando vuelva la conexión.'
          : pending > 1
          ? 'Sin conexión — ' + pending + ' operaciones guardadas en este dispositivo, se van a enviar cuando vuelva la conexión.'
          : 'Sin conexión — algunos datos pueden no estar actualizados.';
        banner.style.display = 'block';
      } else if (pending > 0) {
        banner.style.background = '#2563eb';
        banner.style.color = '#ffffff';
        banner.textContent = pending === 1
          ? 'Sincronizando 1 operación pendiente…'
          : 'Sincronizando ' + pending + ' operaciones pendientes…';
        banner.style.display = 'block';
      } else {
        banner.style.display = 'none';
      }
    }

    window.addEventListener('online', function () { flushQueue().then(update); });
    window.addEventListener('offline', update);
    window.addEventListener('reciclasys:queue-changed', update);
    update();
    flushQueue().then(update);
  }

  if (document.body) {
    initConnectivity();
  } else {
    document.addEventListener('DOMContentLoaded', initConnectivity);
  }
})(window);
