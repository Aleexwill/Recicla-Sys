-- =============================================
-- MIGRACIÓN: Configuración General del sistema
-- Ejecutar en el SQL Editor de Supabase sobre la base ya existente.
-- Es seguro correrlo más de una vez (usa IF NOT EXISTS).
-- =============================================

CREATE TABLE IF NOT EXISTS configuracion (
  id                            SERIAL PRIMARY KEY,
  password_min_length           INTEGER NOT NULL DEFAULT 8,
  password_requiere_especiales  BOOLEAN NOT NULL DEFAULT FALSE,
  idioma_default                VARCHAR(10) NOT NULL DEFAULT 'es',
  notificaciones_email          BOOLEAN NOT NULL DEFAULT TRUE,
  actualizado_en                TIMESTAMP DEFAULT NOW(),
  actualizado_por               INTEGER REFERENCES usuarios(id)
);

INSERT INTO configuracion (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
