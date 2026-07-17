// src/routes/materiales.js

const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { verificarToken, verificarPermiso } = require('../middleware/auth');

// Todas las rutas requieren estar autenticado
router.use(verificarToken);

// GET /api/materiales — Listar todos
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM materiales WHERE activo = TRUE ORDER BY nombre'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/materiales/:id — Ver uno
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM materiales WHERE id = $1 AND activo = TRUE',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Material no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/materiales — Crear (requiere permiso edit o full)
// precio_compra/precio_venta, si vienen, ya están expresados en USD (el frontend
// convierte cuando el material se da de alta en Guaraníes). moneda/tipo_cambio/
// precio_*_original son solo trazabilidad de en qué divisa se cargó el precio.
router.post('/', verificarPermiso('edit'), async (req, res) => {
  const {
    nombre, descripcion, unidad_medida, precio_compra, precio_venta, stock_minimo,
    moneda, tipo_cambio, precio_compra_original, precio_venta_original,
  } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido.' });
  const monedaFinal = moneda === 'PYG' ? 'PYG' : 'USD';
  try {
    const { rows } = await db.query(
      `INSERT INTO materiales
         (nombre, descripcion, unidad_medida, precio_compra, precio_venta, stock_minimo,
          moneda, tipo_cambio, precio_compra_original, precio_venta_original)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        nombre, descripcion, unidad_medida || 'kg', precio_compra || 0, precio_venta || 0, stock_minimo || 0,
        monedaFinal, monedaFinal === 'PYG' ? Number(tipo_cambio) || null : null,
        precio_compra_original != null ? Number(precio_compra_original) : (precio_compra || 0),
        precio_venta_original != null ? Number(precio_venta_original) : (precio_venta || 0),
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/materiales/:id — Actualizar precios/datos
router.put('/:id', verificarPermiso('edit'), async (req, res) => {
  const {
    nombre, descripcion, precio_compra, precio_venta, stock_minimo,
    moneda, tipo_cambio, precio_compra_original, precio_venta_original,
  } = req.body;
  const monedaFinal = moneda === 'PYG' ? 'PYG' : 'USD';
  try {
    const { rows } = await db.query(
      `UPDATE materiales SET
         nombre        = COALESCE($1, nombre),
         descripcion   = COALESCE($2, descripcion),
         precio_compra = COALESCE($3, precio_compra),
         precio_venta  = COALESCE($4, precio_venta),
         stock_minimo  = COALESCE($5, stock_minimo),
         moneda        = $6,
         tipo_cambio   = $7,
         precio_compra_original = COALESCE($8, precio_compra, precio_compra_original),
         precio_venta_original  = COALESCE($9, precio_venta, precio_venta_original)
       WHERE id = $10 RETURNING *`,
      [
        nombre, descripcion, precio_compra, precio_venta, stock_minimo,
        monedaFinal, monedaFinal === 'PYG' ? Number(tipo_cambio) || null : null,
        precio_compra_original != null ? Number(precio_compra_original) : null,
        precio_venta_original != null ? Number(precio_venta_original) : null,
        req.params.id,
      ]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Material no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/materiales/:id — Borrado lógico (solo admin)
router.delete('/:id', verificarPermiso('full'), async (req, res) => {
  try {
    await db.query('UPDATE materiales SET activo = FALSE WHERE id = $1', [req.params.id]);
    res.json({ mensaje: 'Material desactivado correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
