// src/routes/tiposCambio.js
// Historial de tasas de cambio (Guaraníes por 1 USD)

const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { verificarToken, verificarPermiso, verificarEmpresaAsignada } = require('../middleware/auth');

router.use(verificarToken, verificarEmpresaAsignada);

// GET /api/tipos-cambio — Historial completo, más reciente primero
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.id, t.valor, t.creado_en, u.nombre_usuario AS usuario
       FROM tipos_cambio t LEFT JOIN usuarios u ON u.id = t.usuario_id
       WHERE t.empresa_id = $1
       ORDER BY t.creado_en DESC`,
      [req.usuario.empresa_id]
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
       WHERE t.empresa_id = $1
       ORDER BY t.creado_en DESC LIMIT 1`,
      [req.usuario.empresa_id]
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
      `INSERT INTO tipos_cambio (empresa_id, valor, usuario_id) VALUES ($1, $2, $3) RETURNING *`,
      [req.usuario.empresa_id, num, req.usuario.id]
    );
    res.status(201).json({ mensaje: 'Tipo de cambio registrado.', tipo_cambio: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
