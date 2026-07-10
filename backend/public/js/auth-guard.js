// js/auth-guard.js — protege las páginas que lo incluyen: sin sesión, redirige a Login.
(function () {
  var user = window.ReciclaAPI.getUser();
  var token = window.ReciclaAPI.getToken();

  if (!token || !user) {
    window.location.href = 'Login.html';
    return;
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-user-name]').forEach(function (el) {
      el.textContent = user.nombre || user.email;
    });
    document.querySelectorAll('[data-user-email]').forEach(function (el) {
      el.textContent = user.email;
    });
    document.querySelectorAll('[data-user-role]').forEach(function (el) {
      el.textContent = user.rol || '—';
    });
    document.querySelectorAll('[data-logout]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        window.ReciclaAPI.clearSession();
        window.location.href = 'Login.html';
      });
    });
  });
})();
