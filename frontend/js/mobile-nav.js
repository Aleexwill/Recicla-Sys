// js/mobile-nav.js — abre/cierra el menú lateral como panel deslizable en mobile.
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('mobile-menu-btn');
    var sidebar = document.getElementById('sidebar');
    var backdrop = document.getElementById('sidebar-backdrop');
    if (!btn || !sidebar) return;

    function open() {
      sidebar.classList.remove('-translate-x-full');
      sidebar.classList.add('translate-x-0');
      if (backdrop) backdrop.classList.remove('hidden');
    }
    function close() {
      sidebar.classList.add('-translate-x-full');
      sidebar.classList.remove('translate-x-0');
      if (backdrop) backdrop.classList.add('hidden');
    }
    btn.addEventListener('click', function () {
      if (sidebar.classList.contains('translate-x-0')) close(); else open();
    });
    if (backdrop) backdrop.addEventListener('click', close);
    sidebar.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', close);
    });
  });
})();
