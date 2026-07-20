// server.js — Punto de entrada del backend ReciclaS

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// =============================================
// MIDDLEWARES GLOBALES
// =============================================
app.use(cors({
  origin: '*', // En producción, restringir al dominio del frontend
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

// Ruta raíz → redirigir al login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Login.html'));
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
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
