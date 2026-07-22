-- =============================================
-- MIGRACIÓN: Color de avatar por usuario
-- Ejecutar en el SQL Editor de Supabase sobre la base ya existente.
-- Es seguro correrlo más de una vez (usa IF NOT EXISTS).
-- =============================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(7);
