// =============================================
// EJEMPLO: Cómo conectar Login.html al backend
// Agregá este script al final de tu Login.html
// antes del </body>
// =============================================

// Función principal de login
async function hacerLogin(event) {
  event.preventDefault(); // Evitar que el form recargue la página

  const email    = document.querySelector('input[type="email"]').value;
  const password = document.querySelector('input[type="password"]').value;
  const btnLogin = document.querySelector('button[type="submit"]');

  // Mostrar estado de carga
  btnLogin.textContent = 'Ingresando...';
  btnLogin.disabled = true;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Mostrar error al usuario
      mostrarError(data.error || 'Error al iniciar sesión');
      return;
    }

    // ✅ Login exitoso: guardar token y redirigir
    localStorage.setItem('token',   data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));

    window.location.href = '/Reciclaje_tablero_principal.html';

  } catch (err) {
    mostrarError('No se pudo conectar con el servidor. Verificá tu conexión.');
  } finally {
    btnLogin.textContent = 'Iniciar Sesión';
    btnLogin.disabled = false;
  }
}

function mostrarError(mensaje) {
  let alerta = document.getElementById('alerta-error');
  if (!alerta) {
    alerta = document.createElement('div');
    alerta.id = 'alerta-error';
    alerta.className = 'mt-4 p-3 rounded-lg bg-red-100 text-red-700 text-sm font-medium';
    document.querySelector('form').appendChild(alerta);
  }
  alerta.textContent = mensaje;
  alerta.style.display = 'block';
}

// Escuchar submit del formulario
document.querySelector('form').addEventListener('submit', hacerLogin);

// =============================================
// EJEMPLO: Función genérica para llamar a la API
// Usá esto en todas tus otras páginas
// =============================================

async function apiCall(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('token');

  const options = {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`/api/${endpoint}`, options);

  // Si el token expiró, redirigir al login
  if (response.status === 401 || response.status === 403) {
    localStorage.clear();
    window.location.href = '/Login.html';
    return;
  }

  return response.json();
}

// Ejemplo de uso en Registro_nueva_compra.html:
// const materiales = await apiCall('materiales');
// const resultado  = await apiCall('compras', 'POST', { proveedor_nombre: 'Juan', items: [...] });
