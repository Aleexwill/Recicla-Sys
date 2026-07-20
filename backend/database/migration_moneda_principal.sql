-- =============================================
-- MIGRACIÓN: Divisa principal en Configuración General
-- Ejecutar en el SQL Editor de Supabase sobre la base ya existente.
-- Es seguro correrlo más de una vez (usa IF NOT EXISTS).
-- =============================================

ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS moneda_principal VARCHAR(5) NOT NULL DEFAULT 'USD';

ALTER TABLE configuracion
  DROP CONSTRAINT IF EXISTS configuracion_moneda_principal_check;

ALTER TABLE configuracion
  ADD CONSTRAINT configuracion_moneda_principal_check CHECK (moneda_principal IN ('USD', 'PYG'));
