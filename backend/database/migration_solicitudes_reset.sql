-- =============================================
-- MIGRACIÓN: Solicitudes de "olvidé mi contraseña"
-- Ejecutar en el SQL Editor de Supabase sobre la base ya existente.
-- Es seguro correrlo más de una vez (usa IF NOT EXISTS).
-- =============================================

CREATE TABLE IF NOT EXISTS solicitudes_reset_password (
  id           SERIAL PRIMARY KEY,
  email        VARCHAR(150) NOT NULL,
  atendida     BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en    TIMESTAMP DEFAULT NOW(),
  atendida_en  TIMESTAMP,
  atendida_por INTEGER REFERENCES usuarios(id)
);
