-- =============================================
-- MIGRACIÓN: Multi-empresa (multi-tenant)
-- Ejecutar en el SQL Editor de Supabase sobre la base ya existente.
-- Seguro de correr más de una vez (usa IF NOT EXISTS / ON CONFLICT).
--
-- Qué hace:
--  1. Crea la tabla `empresas`.
--  2. Crea una empresa por defecto ("Empresa Principal") y le asigna
--     TODO lo que ya existe en el sistema (materiales, proveedores,
--     clientes, compras, ventas, tipo de cambio, configuración).
--  3. Agrega `empresa_id` y `super_admin` a `usuarios`. El usuario
--     admin@recicla.com pasa a ser Super Admin (empresa_id = NULL,
--     super_admin = TRUE); cualquier otro usuario existente queda
--     asignado a la empresa por defecto.
--  4. Deja `empresa_id` como NOT NULL en las tablas operativas (una vez
--     que ya está todo asignado a la empresa por defecto).
-- =============================================

-- 1. Tabla empresas
CREATE TABLE IF NOT EXISTS empresas (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(150) NOT NULL,
  logo_url   TEXT,
  activa     BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en  TIMESTAMP DEFAULT NOW()
);

-- 2. Empresa por defecto (podés renombrarla después desde el panel de
-- Super Admin — este nombre es solo un placeholder inicial).
INSERT INTO empresas (nombre)
SELECT 'Empresa Principal'
WHERE NOT EXISTS (SELECT 1 FROM empresas);

-- 3. usuarios: nuevas columnas
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Asignar todo usuario sin empresa a la empresa por defecto...
UPDATE usuarios
SET empresa_id = (SELECT id FROM empresas ORDER BY id LIMIT 1)
WHERE empresa_id IS NULL;

-- ...y promover a admin@recicla.com a Super Admin (sin empresa).
UPDATE usuarios
SET super_admin = TRUE, empresa_id = NULL
WHERE email = 'admin@recicla.com';

-- 4. Tablas operativas: agregar empresa_id, rellenar con la empresa por
-- defecto, y dejarlo obligatorio de acá en adelante.
DO $$
DECLARE
  default_empresa_id INTEGER := (SELECT id FROM empresas ORDER BY id LIMIT 1);
BEGIN
  ALTER TABLE materiales ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
  UPDATE materiales SET empresa_id = default_empresa_id WHERE empresa_id IS NULL;
  ALTER TABLE materiales ALTER COLUMN empresa_id SET NOT NULL;

  ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
  UPDATE proveedores SET empresa_id = default_empresa_id WHERE empresa_id IS NULL;
  ALTER TABLE proveedores ALTER COLUMN empresa_id SET NOT NULL;

  ALTER TABLE clientes ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
  UPDATE clientes SET empresa_id = default_empresa_id WHERE empresa_id IS NULL;
  ALTER TABLE clientes ALTER COLUMN empresa_id SET NOT NULL;

  ALTER TABLE compras ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
  UPDATE compras SET empresa_id = default_empresa_id WHERE empresa_id IS NULL;
  ALTER TABLE compras ALTER COLUMN empresa_id SET NOT NULL;

  ALTER TABLE ventas ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
  UPDATE ventas SET empresa_id = default_empresa_id WHERE empresa_id IS NULL;
  ALTER TABLE ventas ALTER COLUMN empresa_id SET NOT NULL;

  ALTER TABLE tipos_cambio ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
  UPDATE tipos_cambio SET empresa_id = default_empresa_id WHERE empresa_id IS NULL;
  ALTER TABLE tipos_cambio ALTER COLUMN empresa_id SET NOT NULL;

  -- Reset password: empresa_id opcional (se completa según el email al
  -- crear la solicitud; si no se pudo determinar queda NULL).
  ALTER TABLE solicitudes_reset_password ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);

  -- configuracion: una fila por empresa en vez de una fila global fija (id=1).
  ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
  UPDATE configuracion SET empresa_id = default_empresa_id WHERE empresa_id IS NULL;
  ALTER TABLE configuracion ALTER COLUMN empresa_id SET NOT NULL;
END $$;

-- Una sola fila de configuración por empresa.
ALTER TABLE configuracion DROP CONSTRAINT IF EXISTS configuracion_empresa_id_key;
ALTER TABLE configuracion ADD CONSTRAINT configuracion_empresa_id_key UNIQUE (empresa_id);
