// src/routes/clientes.js

const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { verificarToken, verificarPermiso, verificarEmpresaAsignada } = require('../middleware/auth');
const { wantsPagination, parsePagination, buildEnvelope } = require('../utils/pagination');

router.use(verificarToken, verificarEmpresaAsignada);

// GET /api/clientes — Listar todos.
// Sin ?page/?limit devuelve el array completo (como siempre, para los
// selects de Nueva Venta, etc). Con ?page y/o ?limit (y opcionalmente ?q
// para buscar por nombre/email/teléfono) devuelve { data, total, page,
// pageSize, totalPages }.
router.get('/', async (req, res) => {
  const { q } = req.query;
  const params = [req.usuario.empresa_id];
  let where = 'activo = TRUE AND empresa_id = $1';
  if (q) {
    params.push('%' + q + '%');
    where += ` AND (nombre ILIKE $${params.length} OR email ILIKE $${params.length} OR telefono ILIKE $${params.length})`;
  }

  try {
    if (!wantsPagination(req.query)) {
      const { rows } = await db.query(`SELECT * FROM clientes WHERE ${where} ORDER BY nombre`, params);
      return res.json(rows);
    }

    const { page, pageSize, offset } = parsePagination(req.query);
    const countResult = await db.query(`SELECT COUNT(*) FROM clientes WHERE ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);
    const { rows } = await db.query(
      `SELECT * FROM clientes WHERE ${where} ORDER BY nombre LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );
    res.json(buildEnvelope(rows, total, page, pageSize));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clientes/:id — Ver uno
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM clientes WHERE id = $1 AND activo = TRUE AND empresa_id = $2',
      [req.params.id, req.usuario.empresa_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clientes — Crear (requiere permiso edit o full)
router.post('/', verificarPermiso('edit'), async (req, res) => {
  const { nombre, email, telefono, direccion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido.' });
  try {
    const { rows } = await db.query(
      `INSERT INTO clientes (empresa_id, nombre, email, telefono, direccion)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.usuario.empresa_id, nombre, email || null, telefono || null, direccion || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clientes/:id — Actualizar
router.put('/:id', verificarPermiso('edit'), async (req, res) => {
  const { nombre, email, telefono, direccion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido.' });
  try {
    const { rows } = await db.query(
      `UPDATE clientes SET nombre = $1, email = $2, telefono = $3, direccion = $4
       WHERE id = $5 AND activo = TRUE AND empresa_id = $6 RETURNING *`,
      [nombre, email || null, telefono || null, direccion || null, req.params.id, req.usuario.empresa_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clientes/:id — Borrado lógico (solo admin)
router.delete('/:id', verificarPermiso('full'), async (req, res) => {
  try {
    await db.query('UPDATE clientes SET activo = FALSE WHERE id = $1 AND empresa_id = $2', [req.params.id, req.usuario.empresa_id]);
    res.json({ mensaje: 'Cliente desactivado correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
