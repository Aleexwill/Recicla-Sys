// src/routes/ventas.js

const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { verificarToken, verificarPermiso } = require('../middleware/auth');

router.use(verificarToken);

// GET /api/ventas
router.get('/', async (req, res) => {
  const { estado } = req.query;
  let query = `
    SELECT v.*, u.nombre_usuario AS vendedor
    FROM ventas v
    LEFT JOIN usuarios u ON u.id = v.usuario_id
    WHERE 1=1
  `;
  const params = [];
  if (estado) { params.push(estado); query += ` AND v.estado = $${params.length}`; }
  query += ' ORDER BY v.fecha DESC';
  try {
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ventas/:id
router.get('/:id', async (req, res) => {
  try {
    const venta = await db.query('SELECT * FROM ventas WHERE id = $1', [req.params.id]);
    if (venta.rows.length === 0) return res.status(404).json({ error: 'Venta no encontrada.' });
    const items = await db.query(
      `SELECT vi.*, m.nombre AS material_nombre
       FROM venta_items vi JOIN materiales m ON m.id = vi.material_id
       WHERE vi.venta_id = $1`, [req.params.id]
    );
    const historial = await db.query(
      `SELECT h.*, u.nombre_usuario
       FROM historial_ventas h LEFT JOIN usuarios u ON u.id = h.usuario_id
       WHERE h.venta_id = $1 ORDER BY h.fecha DESC`, [req.params.id]
    );
    res.json({ ...venta.rows[0], items: items.rows, historial: historial.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ventas
router.post('/', verificarPermiso('edit'), async (req, res) => {
  const { cliente_nombre, cliente_id, items, impuesto_pct = 18 } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'Items requeridos.' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    let subtotal = 0;
    const itemsConPrecio = [];
    for (const item of items) {
      const mat = await client.query('SELECT precio_venta, stock_actual FROM materiales WHERE id = $1', [item.material_id]);
      if (mat.rows.length === 0) throw new Error(`Material ${item.material_id} no existe`);
      if (mat.rows[0].stock_actual < item.cantidad_kg) throw new Error(`Stock insuficiente para material ${item.material_id}`);
      const precio   = mat.rows[0].precio_venta;
      const sub      = item.cantidad_kg * precio;
      subtotal += sub;
      itemsConPrecio.push({ ...item, precio_unitario: precio, subtotal: sub });
    }
    const total = subtotal * (1 + impuesto_pct / 100);

    const venta = await client.query(
      `INSERT INTO ventas (cliente_nombre, cliente_id, usuario_id, subtotal, impuesto_pct, total)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [cliente_nombre, cliente_id || null, req.usuario.id, subtotal, impuesto_pct, total]
    );
    const ventaId = venta.rows[0].id;

    for (const item of itemsConPrecio) {
      await client.query(
        `INSERT INTO venta_items (venta_id, material_id, cantidad_kg, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [ventaId, item.material_id, item.cantidad_kg, item.precio_unitario, item.subtotal]
      );
      // Descontar stock
      await client.query(
        'UPDATE materiales SET stock_actual = stock_actual - $1 WHERE id = $2',
        [item.cantidad_kg, item.material_id]
      );
    }

    await client.query(
      'INSERT INTO historial_ventas (venta_id, estado, usuario_id, nota) VALUES ($1, $2, $3, $4)',
      [ventaId, 'Venta Creada', req.usuario.id, 'Venta registrada en el sistema']
    );

    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Venta registrada', venta_id: ventaId, total });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/ventas/:id/estado
router.patch('/:id/estado', verificarPermiso('edit'), async (req, res) => {
  const { estado, nota } = req.body;
  const estadosValidos = ['en_transito', 'completada', 'cancelada'];
  if (!estadosValidos.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });
  try {
    const { rows } = await db.query(
      'UPDATE ventas SET estado = $1 WHERE id = $2 RETURNING *', [estado, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Venta no encontrada.' });
    await db.query(
      'INSERT INTO historial_ventas (venta_id, estado, usuario_id, nota) VALUES ($1, $2, $3, $4)',
      [req.params.id, estado, req.usuario.id, nota || '']
    );
    res.json({ mensaje: 'Estado actualizado', venta: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
