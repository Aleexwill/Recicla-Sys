// src/middleware/auth.js
// Middleware para verificar el token JWT en cada request protegido

const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  // El token puede venir en el header Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });
  }

  try {
    const usuario = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = usuario; // { id, email, rol, permiso, empresa_id, super_admin }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

// Middleware para rutas exclusivas del Super Admin (gestión de empresas).
// El Super Admin no pertenece a ninguna empresa (empresa_id NULL) y por
// eso queda afuera de todas las rutas de datos operativos (materiales,
// compras, ventas, etc.), que siempre filtran por empresa_id.
const verificarSuperAdmin = (req, res, next) => {
  if (!req.usuario?.super_admin) {
    return res.status(403).json({ error: 'Esta acción es exclusiva del Super Admin.' });
  }
  next();
};

// Middleware para verificar permisos (uso: verificarPermiso('full') o ('edit'))
const verificarPermiso = (permisoRequerido) => {
  const niveles = { 'view': 1, 'edit': 2, 'full': 3 };
  return (req, res, next) => {
    const nivelUsuario  = niveles[req.usuario?.permiso] || 0;
    const nivelRequerido = niveles[permisoRequerido]     || 999;
    if (nivelUsuario < nivelRequerido) {
      return res.status(403).json({ error: 'No tenés permiso para esta acción.' });
    }
    next();
  };
};

// Middleware para las rutas de datos operativos de una empresa
// (materiales, compras, ventas, clientes, proveedores, tipo de cambio,
// configuración). El Super Admin no tiene empresa asignada, así que sin
// este chequeo terminaría con listas vacías o errores confusos de la
// base de datos en vez de un mensaje claro.
const verificarEmpresaAsignada = (req, res, next) => {
  if (!req.usuario?.empresa_id) {
    return res.status(403).json({ error: 'El Super Admin no opera datos de una empresa en particular.' });
  }
  next();
};

module.exports = { verificarToken, verificarPermiso, verificarSuperAdmin, verificarEmpresaAsignada };
