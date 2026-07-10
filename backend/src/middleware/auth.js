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
    req.usuario = usuario; // { id, email, rol, permiso }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
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

module.exports = { verificarToken, verificarPermiso };
