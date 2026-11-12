// js/theme.js — modo oscuro, con el switch a mano del usuario.
//
// Se carga como el PRIMER <script> del <head>, antes de Tailwind, para que
// la clase "dark" quede puesta en <html> antes de que la página pinte nada
// y así no haya parpadeo de tema equivocado al cargar.
//
// El botón flotante se pinta con estilos inline a propósito (no clases de
// Tailwind): cada página de la app define sus propios nombres de color
// personalizados en tailwind.config (algunas "text-light", otras
// "text-light-primary", otras ninguna) — un elemento que se inyecta igual
// en las 24 páginas no puede depender de que un nombre en particular
// exista en el tema de esa página puntual.
(function () {
  var KEY = 'reciclasys_theme'; // 'light' | 'dark' — si no está, sigue al sistema

  function getStored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function systemPrefersDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function isDark() {
    var stored = getStored();
    return stored ? stored === 'dark' : systemPrefersDark();
  }
  function applyClass(dark) {
    document.documentElement.classList.toggle('dark', dark);
  }

  // Lo primero: aplicar el tema ya, antes de que se pinte la página.
  applyClass(isDark());

  var btn = null;
  var icon = null;

  function paintButton() {
    if (!btn) return;
    var dark = isDark();
    btn.style.background = dark ? '#1a2a20' : '#ffffff';
    btn.style.borderColor = dark ? '#2e4a37' : '#d1e6d9';
    btn.style.color = '#1dc962';
    icon.textContent = dark ? 'light_mode' : 'dark_mode';
    btn.setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  }

  function setTheme(dark) {
    try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { /* no crítico */ }
    applyClass(dark);
    paintButton();
  }

  function injectButton() {
    btn = document.createElement('button');
    btn.id = 'theme-toggle-btn';
    btn.type = 'button';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9997;width:48px;height:48px;' +
      'border-radius:9999px;display:flex;align-items:center;justify-content:center;border:1px solid;' +
      'box-shadow:0 2px 10px rgba(0,0,0,0.18);cursor:pointer;';
    icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    btn.appendChild(icon);
    paintButton();
    btn.addEventListener('click', function () {
      setTheme(!isDark());
    });
    document.body.appendChild(btn);
  }

  document.addEventListener('DOMContentLoaded', injectButton);

  // Si nunca eligió manualmente, seguir los cambios de tema del sistema en vivo.
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!getStored()) {
        applyClass(e.matches);
        paintButton();
      }
    });
  }

  window.ReciclaTheme = { isDark: isDark, setTheme: setTheme };
})();
