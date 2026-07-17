// src/routes/auth.js
// Rutas de autenticación: login y verificación de sesión

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/database');
const { verificarToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
  }

  try {
    // Buscar usuario con su rol
    const result = await db.query(
      `SELECT u.*, r.nombre AS rol_nombre
       FROM usuarios u
       LEFT JOIN roles r ON r.id = u.rol_id
       WHERE u.email = $1 AND u.activo = TRUE`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    const usuario = result.rows[0];

    // Verificar contraseña
    const passwordOk = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        id:      usuario.id,
        email:   usuario.email,
        nombre:  usuario.nombre_usuario,
        rol:     usuario.rol_nombre,
        permiso: usuario.permiso,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: {
        id:      usuario.id,
        nombre:  usuario.nombre_usuario,
        email:   usuario.email,
        rol:     usuario.rol_nombre,
        permiso: usuario.permiso,
      }
    });

  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// GET /api/auth/me  — Verificar sesión activa
router.get('/me', verificarToken, (req, res) => {
  res.json({ usuario: req.usuario });
});

// PUT /api/auth/password — El usuario logueado cambia su propia contraseña
router.put('/password', verificarToken, async (req, res) => {
  const { password_actual, password_nueva } = req.body;

  if (!password_actual || !password_nueva) {
    return res.status(400).json({ error: 'La contraseña actual y la nueva son requeridas.' });
  }
  if (password_nueva.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
  }

  try {
    const result = await db.query('SELECT password_hash FROM usuarios WHERE id = $1 AND activo = TRUE', [req.usuario.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const passwordOk = await bcrypt.compare(password_actual, result.rows[0].password_hash);
    if (!passwordOk) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
    }

    const nuevoHash = await bcrypt.hash(password_nueva, 10);
    await db.query(
      'UPDATE usuarios SET password_hash = $1, actualizado_en = NOW() WHERE id = $2',
      [nuevoHash, req.usuario.id]
    );

    res.json({ mensaje: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    console.error('Error al cambiar contraseña:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
