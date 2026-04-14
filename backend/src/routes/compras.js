// src/routes/compras.js

const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { verificarToken, verificarPermiso } = require('../middleware/auth');

router.use(verificarToken);

// GET /api/compras — Listar compras con filtro de fecha
router.get('/', async (req, res) => {
  const { fecha, estado } = req.query;
  let query = `
    SELECT c.*, u.nombre_usuario AS operador
    FROM compras c
    LEFT JOIN usuarios u ON u.id = c.usuario_id
    WHERE 1=1
  `;
  const params = [];

  if (fecha) {
    params.push(fecha);
    query += ` AND DATE(c.fecha) = $${params.length}`;
  }
  if (estado) {
    params.push(estado);
    query += ` AND c.estado = $${params.length}`;
  }
  query += ' ORDER BY c.fecha DESC';

  try {
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compras/resumen-dia?fecha=2024-05-24
router.get('/resumen-dia', async (req, res) => {
  const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
  try {
    const { rows } = await db.query(
      `SELECT
         m.nombre AS material,
         SUM(ci.peso_kg) AS peso_total,
         AVG(ci.descuento_pct) AS descuento_promedio,
         SUM(ci.subtotal) AS subtotal,
         COUNT(DISTINCT c.id) AS num_transacciones,
         TO_CHAR(c.fecha, 'HH24:MI') AS hora_ultima
       FROM compras c
       JOIN compra_items ci ON ci.compra_id = c.id
       JOIN materiales m ON m.id = ci.material_id
       WHERE DATE(c.fecha) = $1 AND c.estado != 'cancelada'
       GROUP BY m.nombre, TO_CHAR(c.fecha, 'HH24:MI')
       ORDER BY m.nombre`,
      [fecha]
    );
    const totales = await db.query(
      `SELECT
         SUM(ci.subtotal) AS total_monto,
         SUM(ci.peso_kg)  AS total_kg,
         COUNT(DISTINCT c.id) AS total_transacciones
       FROM compras c
       JOIN compra_items ci ON ci.compra_id = c.id
       WHERE DATE(c.fecha) = $1 AND c.estado != 'cancelada'`,
      [fecha]
    );
    res.json({ fecha, detalle: rows, totales: totales.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compras/:id — Ver detalle de una compra
router.get('/:id', async (req, res) => {
  try {
    const compra = await db.query('SELECT * FROM compras WHERE id = $1', [req.params.id]);
    if (compra.rows.length === 0) return res.status(404).json({ error: 'Compra no encontrada.' });
    const items = await db.query(
      `SELECT ci.*, m.nombre AS material_nombre
       FROM compra_items ci
       JOIN materiales m ON m.id = ci.material_id
       WHERE ci.compra_id = $1`,
      [req.params.id]
    );
    res.json({ ...compra.rows[0], items: items.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/compras — Registrar nueva compra
// Body: { proveedor_nombre, items: [{ material_id, peso_kg, descuento_pct }] }
router.post('/', verificarPermiso('edit'), async (req, res) => {
  const { proveedor_nombre, proveedor_id, items } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Debe incluir al menos un material.' });
  }

  const client = await db.connect(); // transacción
  try {
    await client.query('BEGIN');

    // Calcular subtotales con precio actual del material
    let total = 0;
    const itemsConPrecio = [];
    for (const item of items) {
      const mat = await client.query(
        'SELECT precio_compra FROM materiales WHERE id = $1', [item.material_id]
      );
      if (mat.rows.length === 0) throw new Error(`Material ${item.material_id} no encontrado`);
      const precio    = mat.rows[0].precio_compra;
      const pesoNeto  = item.peso_kg * (1 - (item.descuento_pct || 0) / 100);
      const subtotal  = pesoNeto * precio;
      total += subtotal;
      itemsConPrecio.push({ ...item, precio_unitario: precio, subtotal });
    }

    // Insertar cabecera
    const compra = await client.query(
      `INSERT INTO compras (proveedor_nombre, proveedor_id, usuario_id, total)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [proveedor_nombre, proveedor_id || null, req.usuario.id, total]
    );
    const compraId = compra.rows[0].id;

    // Insertar items
    for (const item of itemsConPrecio) {
      await client.query(
        `INSERT INTO compra_items (compra_id, material_id, peso_kg, descuento_pct, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [compraId, item.material_id, item.peso_kg, item.descuento_pct || 0, item.precio_unitario, item.subtotal]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Compra registrada', compra_id: compraId, total });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/compras/:id/confirmar — Confirmar (actualiza stock automáticamente via trigger)
router.patch('/:id/confirmar', verificarPermiso('edit'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE compras SET estado = 'confirmada' WHERE id = $1 AND estado = 'pendiente' RETURNING *`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(400).json({ error: 'Compra no encontrada o ya procesada.' });
    res.json({ mensaje: 'Compra confirmada. Stock actualizado.', compra: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
