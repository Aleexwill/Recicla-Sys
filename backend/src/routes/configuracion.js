// src/routes/configuracion.js
// Ajustes generales del sistema (política de contraseñas, idioma, notificaciones).

const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { verificarToken, verificarPermiso } = require('../middleware/auth');

router.use(verificarToken);

// GET /api/configuracion — cualquier usuario autenticado puede leerla
// (por ejemplo, para mostrar los requisitos de contraseña en un formulario).
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM configuracion WHERE id = 1');
    if (rows.length === 0) {
      const inserted = await db.query('INSERT INTO configuracion (id) VALUES (1) RETURNING *');
      return res.json(inserted.rows[0]);
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/configuracion — solo administradores (permiso full)
router.put('/', verificarPermiso('full'), async (req, res) => {
  const { password_min_length, password_requiere_especiales, idioma_default, notificaciones_email, moneda_principal } = req.body;

  const minLength = Number(password_min_length);
  if (!minLength || minLength < 4 || minLength > 64) {
    return res.status(400).json({ error: 'El largo mínimo de contraseña debe estar entre 4 y 64 caracteres.' });
  }
  const monedaPrincipal = moneda_principal === 'PYG' ? 'PYG' : 'USD';

  try {
    const { rows } = await db.query(
      `UPDATE configuracion SET
         password_min_length = $1,
         password_requiere_especiales = $2,
         idioma_default = $3,
         notificaciones_email = $4,
         moneda_principal = $5,
         actualizado_en = NOW(),
         actualizado_por = $6
       WHERE id = 1 RETURNING *`,
      [minLength, !!password_requiere_especiales, idioma_default || 'es', !!notificaciones_email, monedaPrincipal, req.usuario.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No se encontró la configuración.' });
    res.json({ mensaje: 'Configuración guardada.', configuracion: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
