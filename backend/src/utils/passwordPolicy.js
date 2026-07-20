// src/utils/passwordPolicy.js
// Política de contraseñas configurable desde Configuración General.

const db = require('../config/database');

const DEFAULT_POLICY = { password_min_length: 8, password_requiere_especiales: false };

async function getPolicy() {
  try {
    const { rows } = await db.query(
      'SELECT password_min_length, password_requiere_especiales FROM configuracion WHERE id = 1'
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
