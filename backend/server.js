// server.js — Punto de entrada del backend ReciclaS

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const path    = require('path');

const app = express();

// =============================================
// MIDDLEWARES GLOBALES
// =============================================

// Cabeceras de seguridad HTTP estándar (X-Content-Type-Options,
// X-Frame-Options, HSTS, etc). Se desactiva CSP porque el frontend carga
// Tailwind/Chart.js/fuentes desde varios CDNs sin un nonce configurado —
// aplicar una CSP por defecto rompería esos <script>/<link> externos.
app.use(helmet({ contentSecurityPolicy: false }));

// El frontend se sirve desde este mismo servidor (ver express.static más
// abajo), así que en el uso normal de la app las requests son same-origin
// y ni siquiera pasan por esta verificación. ALLOWED_ORIGINS solo hace
// falta si además se llama a la API desde otro origen (otro dominio, una
// app aparte, Postman con un Origin seteado a mano, etc). Sin configurar,
// se sigue permitiendo cualquier origen (mismo comportamiento que antes)
// para no romper nada; para restringirlo en producción, configurar
// ALLOWED_ORIGINS="https://tu-dominio.com,https://otro-dominio.com".
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(function (s) { return s.trim(); })
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // same-origin, curl, apps nativas, etc: sin header Origin
    if (allowedOrigins.length === 0) return callback(null, true); // sin configurar: no se restringe
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origen no permitido por CORS.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Servir archivos estáticos del frontend (tus HTML)
// Coloca todos tus .html en la carpeta /public
app.use(express.static(path.join(__dirname, 'public')));

// =============================================
// RUTAS DE LA API
// =============================================
app.use('/api/auth',       require('./src/routes/auth'));
app.use('/api/materiales', require('./src/routes/materiales'));
app.use('/api/compras',    require('./src/routes/compras'));
app.use('/api/ventas',     require('./src/routes/ventas'));
app.use('/api/usuarios',   require('./src/routes/usuarios'));
app.use('/api/tipos-cambio', require('./src/routes/tiposCambio'));
app.use('/api/configuracion', require('./src/routes/configuracion'));
app.use('/api/clientes',    require('./src/routes/clientes'));
app.use('/api/proveedores', require('./src/routes/proveedores'));
app.use('/api/empresas',    require('./src/routes/empresas'));

// Ruta raíz → redirigir al login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Login.html'));
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// Manejo de errores (ej: origen rechazado por CORS) — sin esto, Express
// devuelve una página HTML con el stack trace en vez de JSON.
app.use((err, req, res, next) => {
  if (err && err.message === 'Origen no permitido por CORS.') {
    return res.status(403).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

// =============================================
// INICIAR SERVIDOR
// =============================================
// Solo escuchamos un puerto cuando el archivo se ejecuta directamente
// (node server.js / npm start). En Vercel, este módulo se importa desde
// api/index.js y es la plataforma la que maneja las requests.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🌿 ReciclaS Backend corriendo en http://localhost:${PORT}`);
    console.log(`📋 API disponible en http://localhost:${PORT}/api`);
    console.log(`🔑 Login en http://localhost:${PORT}/Login.html\n`);
  });
}

module.exports = app;
