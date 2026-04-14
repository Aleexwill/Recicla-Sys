// src/routes/usuarios.js

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const db      = require('../config/database');
const { verificarToken, verificarPermiso } = require('../middleware/auth');

router.use(verificarToken);

// GET /api/usuarios
router.get('/', verificarPermiso('full'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.nombre_usuario, u.email, u.permiso, u.activo, u.creado_en,
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
  const { nombre_usuario, email, password, rol_id, permiso } = req.body;
  if (!nombre_usuario || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos.' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO usuarios (nombre_usuario, email, password_hash, rol_id, permiso)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre_usuario, email, permiso`,
      [nombre_usuario, email, hash, rol_id || null, permiso || 'view']
    );
    res.status(201).json({ mensaje: 'Usuario creado', usuario: rows[0] });
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

// GET /api/usuarios/roles
router.get('/roles', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM roles ORDER BY nombre');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
