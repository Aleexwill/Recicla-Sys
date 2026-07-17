-- =============================================
-- MIGRACIÓN: soporte de divisa (USD / Guaraníes)
-- Ejecutar en el SQL Editor de Supabase sobre la base ya existente.
-- Es seguro correrlo más de una vez (usa IF NOT EXISTS).
-- =============================================

-- Historial de tasas de cambio (Guaraníes por 1 USD)
CREATE TABLE IF NOT EXISTS tipos_cambio (
  id          SERIAL PRIMARY KEY,
  valor       NUMERIC(12, 2) NOT NULL,
  usuario_id  INTEGER REFERENCES usuarios(id),
  creado_en   TIMESTAMP DEFAULT NOW()
);

-- Divisa usada en cada material cargado a una compra
ALTER TABLE compra_items ADD COLUMN IF NOT EXISTS moneda VARCHAR(5) DEFAULT 'USD';
ALTER TABLE compra_items ADD COLUMN IF NOT EXISTS tipo_cambio NUMERIC(12, 2);
ALTER TABLE compra_items ADD COLUMN IF NOT EXISTS precio_original NUMERIC(14, 2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'compra_items_moneda_check'
  ) THEN
    ALTER TABLE compra_items ADD CONSTRAINT compra_items_moneda_check CHECK (moneda IN ('USD', 'PYG'));
  END IF;
END $$;

-- Divisa usada en cada material cargado a una venta
ALTER TABLE venta_items ADD COLUMN IF NOT EXISTS moneda VARCHAR(5) DEFAULT 'USD';
ALTER TABLE venta_items ADD COLUMN IF NOT EXISTS tipo_cambio NUMERIC(12, 2);
ALTER TABLE venta_items ADD COLUMN IF NOT EXISTS precio_original NUMERIC(14, 2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'venta_items_moneda_check'
  ) THEN
    ALTER TABLE venta_items ADD CONSTRAINT venta_items_moneda_check CHECK (moneda IN ('USD', 'PYG'));
  END IF;
END $$;

-- Completar precio_original en filas ya existentes (quedan en USD, como estaban)
UPDATE compra_items SET precio_original = precio_unitario WHERE precio_original IS NULL;
UPDATE venta_items SET precio_original = precio_unitario WHERE precio_original IS NULL;

-- Divisa del precio base de cada material (alta/edición de producto)
ALTER TABLE materiales ADD COLUMN IF NOT EXISTS moneda VARCHAR(5) DEFAULT 'USD';
ALTER TABLE materiales ADD COLUMN IF NOT EXISTS tipo_cambio NUMERIC(12, 2);
ALTER TABLE materiales ADD COLUMN IF NOT EXISTS precio_compra_original NUMERIC(14, 2);
ALTER TABLE materiales ADD COLUMN IF NOT EXISTS precio_venta_original NUMERIC(14, 2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'materiales_moneda_check'
  ) THEN
    ALTER TABLE materiales ADD CONSTRAINT materiales_moneda_check CHECK (moneda IN ('USD', 'PYG'));
  END IF;
END $$;

UPDATE materiales SET precio_compra_original = precio_compra WHERE precio_compra_original IS NULL;
UPDATE materiales SET precio_venta_original = precio_venta WHERE precio_venta_original IS NULL;
