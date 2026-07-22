// src/routes/auth.js
// Rutas de autenticación: login y verificación de sesión

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db      = require('../config/database');
const { verificarToken, verificarPermiso } = require('../middleware/auth');
const { getPolicy, validatePassword } = require('../utils/passwordPolicy');

// Límite de intentos de login por IP, para frenar fuerza bruta contra contraseñas.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Probá de nuevo en unos minutos.' },
});

// Límite de solicitudes de "olvidé mi contraseña" por IP, para evitar spam.
const resetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Probá de nuevo en unos minutos.' },
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
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
        avatar_color: usuario.avatar_color,
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
        avatar_color: usuario.avatar_color,
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
  const policy = await getPolicy();
  const policyError = validatePassword(password_nueva, policy);
  if (policyError) {
    return res.status(400).json({ error: policyError });
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

// POST /api/auth/solicitar-reset — El usuario que olvidó su contraseña deja
// una solicitud para que un administrador se la restablezca manualmente.
// Responde siempre el mismo mensaje, exista o no el email, para no filtrar
// qué correos están registrados en el sistema.
router.post('/solicitar-reset', resetRequestLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'El correo es requerido.' });
  }

  try {
    const usuario = await db.query('SELECT id FROM usuarios WHERE email = $1 AND activo = TRUE', [email]);
    if (usuario.rows.length > 0) {
      await db.query('INSERT INTO solicitudes_reset_password (email) VALUES ($1)', [email]);
    }
    res.json({ mensaje: 'Si el correo está registrado, un administrador va a ver tu solicitud y te va a restablecer la contraseña.' });
  } catch (err) {
    console.error('Error al registrar solicitud de reset:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// GET /api/auth/solicitudes-reset — Listar solicitudes pendientes (solo admins)
router.get('/solicitudes-reset', verificarToken, verificarPermiso('full'), async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM solicitudes_reset_password WHERE atendida = FALSE ORDER BY creado_en DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/auth/solicitudes-reset/:id/atender — Marcar una solicitud como atendida (solo admins)
router.patch('/solicitudes-reset/:id/atender', verificarToken, verificarPermiso('full'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE solicitudes_reset_password
       SET atendida = TRUE, atendida_en = NOW(), atendida_por = $1
       WHERE id = $2 RETURNING *`,
      [req.usuario.id, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada.' });
    res.json({ mensaje: 'Solicitud marcada como atendida.', solicitud: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
