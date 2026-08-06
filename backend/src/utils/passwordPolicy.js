// src/utils/passwordPolicy.js
// Política de contraseñas configurable desde Configuración General.

const db = require('../config/database');

const DEFAULT_POLICY = { password_min_length: 8, password_requiere_especiales: false };

// empresaId puede venir null (ej: un Super Admin, que no pertenece a
// ninguna empresa) — en ese caso se usa la política por defecto.
async function getPolicy(empresaId) {
  if (!empresaId) return DEFAULT_POLICY;
  try {
    const { rows } = await db.query(
      'SELECT password_min_length, password_requiere_especiales FROM configuracion WHERE empresa_id = $1',
      [empresaId]
    );
    if (rows.length === 0) return DEFAULT_POLICY;
    return rows[0];
  } catch (err) {
    return DEFAULT_POLICY;
  }
}

// Devuelve un mensaje de error si la contraseña no cumple la política, o null si es válida.
function validatePassword(password, policy) {
  const minLength = policy.password_min_length || DEFAULT_POLICY.password_min_length;
  if (!password || password.length < minLength) {
    return `La contraseña debe tener al menos ${minLength} caracteres.`;
  }
  if (policy.password_requiere_especiales && !/[^A-Za-z0-9]/.test(password)) {
    return 'La contraseña debe incluir al menos un carácter especial (ej: @, #, $, %).';
  }
  return null;
}

module.exports = { getPolicy, validatePassword };
