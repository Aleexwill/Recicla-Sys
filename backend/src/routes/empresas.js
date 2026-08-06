// src/routes/empresas.js
// Gestión de empresas (multi-tenant). Exclusivo del Super Admin: cada
// empresa es un tenant aislado con sus propios datos, y solo el Super
// Admin puede crear empresas nuevas o editarlas.

const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { verificarToken, verificarSuperAdmin } = require('../middleware/auth');

router.use(verificarToken, verificarSuperAdmin);

// GET /api/empresas — Listar todas
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM empresas ORDER BY nombre');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/empresas — Crear una empresa nueva (y su fila de configuración por defecto)
router.post('/', async (req, res) => {
  const { nombre, logo_url } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido.' });
  try {
    const { rows } = await db.query(
      'INSERT INTO empresas (nombre, logo_url) VALUES ($1, $2) RETURNING *',
      [nombre, logo_url || null]
    );
    const empresa = rows[0];
    await db.query('INSERT INTO configuracion (empresa_id) VALUES ($1)', [empresa.id]);
    res.status(201).json(empresa);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/empresas/:id — Editar nombre, logo o estado activa/inactiva
router.put('/:id', async (req, res) => {
  const { nombre, logo_url, activa } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido.' });
  try {
    const { rows } = await db.query(
      `UPDATE empresas SET nombre = $1, logo_url = $2, activa = $3
       WHERE id = $4 RETURNING *`,
      [nombre, logo_url || null, activa !== false, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Empresa no encontrada.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
