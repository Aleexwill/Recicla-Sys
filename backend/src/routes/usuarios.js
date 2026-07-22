// src/routes/usuarios.js

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const db      = require('../config/database');
const { verificarToken, verificarPermiso } = require('../middleware/auth');
const { getPolicy, validatePassword } = require('../utils/passwordPolicy');

router.use(verificarToken);

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
function avatarColorOrNull(value) {
  return value && HEX_COLOR_RE.test(value) ? value : null;
}

// GET /api/usuarios
router.get('/', verificarPermiso('full'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.nombre_usuario, u.email, u.permiso, u.avatar_color, u.activo, u.creado_en,
              r.nombre AS rol
       FROM usuarios u LEFT JOIN roles r ON r.id = u.rol_id
       WHERE u.activo = TRUE ORDER BY u.nombre_usuario`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/usuarios — Crear usuario
router.post('/', verificarPermiso('full'), async (req, res) => {
  const { nombre_usuario, email, password, rol_id, permiso, avatar_color } = req.body;
  if (!nombre_usuario || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos.' });
  }
  const policy = await getPolicy();
  const policyError = validatePassword(password, policy);
  if (policyError) {
    return res.status(400).json({ error: policyError });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO usuarios (nombre_usuario, email, password_hash, rol_id, permiso, avatar_color)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nombre_usuario, email, permiso, avatar_color`,
      [nombre_usuario, email, hash, rol_id || null, permiso || 'view', avatarColorOrNull(avatar_color)]
    );
    res.status(201).json({ mensaje: 'Usuario creado', usuario: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El email ya está registrado.' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/usuarios/roles
// Declarada antes de /:id para que "roles" no se interprete como un id.
router.get('/roles', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM roles ORDER BY nombre');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/usuarios/:id — Ver un usuario (para el formulario de edición)
router.get('/:id', verificarPermiso('full'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.nombre_usuario, u.email, u.permiso, u.rol_id, u.avatar_color, u.activo,
              r.nombre AS rol
       FROM usuarios u LEFT JOIN roles r ON r.id = u.rol_id
       WHERE u.id = $1 AND u.activo = TRUE`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/usuarios/:id — Editar usuario (nombre, email, rol, permiso y,
// opcionalmente, resetear la contraseña sin pedir la actual)
router.put('/:id', verificarPermiso('full'), async (req, res) => {
  const { nombre_usuario, email, rol_id, permiso, password, avatar_color } = req.body;
  if (!nombre_usuario || !email) {
    return res.status(400).json({ error: 'Nombre y correo son requeridos.' });
  }
  if (password) {
    const policy = await getPolicy();
    const policyError = validatePassword(password, policy);
    if (policyError) {
      return res.status(400).json({ error: policyError });
    }
  }
  try {
    let query, params;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      query = `UPDATE usuarios SET nombre_usuario = $1, email = $2, rol_id = $3, permiso = $4,
                 password_hash = $5, avatar_color = $6, actualizado_en = NOW()
               WHERE id = $7 AND activo = TRUE
               RETURNING id, nombre_usuario, email, permiso, rol_id, avatar_color`;
      params = [nombre_usuario, email, rol_id || null, permiso || 'view', hash, avatarColorOrNull(avatar_color), req.params.id];
    } else {
      query = `UPDATE usuarios SET nombre_usuario = $1, email = $2, rol_id = $3, permiso = $4,
                 avatar_color = $5, actualizado_en = NOW()
               WHERE id = $6 AND activo = TRUE
               RETURNING id, nombre_usuario, email, permiso, rol_id, avatar_color`;
      params = [nombre_usuario, email, rol_id || null, permiso || 'view', avatarColorOrNull(avatar_color), req.params.id];
    }
    const { rows } = await db.query(query, params);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json({ mensaje: 'Usuario actualizado', usuario: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El email ya está registrado.' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/usuarios/:id — Desactivar usuario
router.delete('/:id', verificarPermiso('full'), async (req, res) => {
  try {
    await db.query('UPDATE usuarios SET activo = FALSE WHERE id = $1', [req.params.id]);
    res.json({ mensaje: 'Usuario desactivado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
