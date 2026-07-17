// src/routes/tiposCambio.js
// Historial de tasas de cambio (Guaraníes por 1 USD)

const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { verificarToken, verificarPermiso } = require('../middleware/auth');

router.use(verificarToken);

// GET /api/tipos-cambio — Historial completo, más reciente primero
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.id, t.valor, t.creado_en, u.nombre_usuario AS usuario
       FROM tipos_cambio t LEFT JOIN usuarios u ON u.id = t.usuario_id
       ORDER BY t.creado_en DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tipos-cambio/actual — Última tasa cargada
router.get('/actual', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.id, t.valor, t.creado_en, u.nombre_usuario AS usuario
       FROM tipos_cambio t LEFT JOIN usuarios u ON u.id = t.usuario_id
       ORDER BY t.creado_en DESC LIMIT 1`
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Todavía no se cargó ningún tipo de cambio.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tipos-cambio — Cargar una nueva tasa (solo permiso full)
router.post('/', verificarPermiso('full'), async (req, res) => {
  const { valor } = req.body;
  const num = Number(valor);
  if (!num || num <= 0) {
    return res.status(400).json({ error: 'Ingresá un valor de cambio mayor a cero.' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO tipos_cambio (valor, usuario_id) VALUES ($1, $2) RETURNING *`,
      [num, req.usuario.id]
    );
    res.status(201).json({ mensaje: 'Tipo de cambio registrado.', tipo_cambio: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
