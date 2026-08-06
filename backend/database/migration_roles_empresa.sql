-- =============================================
-- MIGRACIÓN: Roles por empresa
-- Ejecutar en el SQL Editor de Supabase sobre la base ya existente.
-- Seguro de correr más de una vez (usa IF NOT EXISTS).
--
-- Los roles existentes (Administrador, Operador de Báscula, Vendedor,
-- Contador) quedan como roles GLOBALES (empresa_id NULL) — siguen
-- funcionando exactamente igual para los usuarios que ya los tienen
-- asignados, y siguen visibles para todas las empresas. A partir de
-- ahora, además, cada administrador puede crear roles propios para su
-- empresa, que solo esa empresa ve y puede asignar.
-- =============================================

ALTER TABLE roles ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);

-- La restricción vieja (nombre único en TODO el sistema) impediría que
-- dos empresas usen un mismo nombre de rol propio — la reemplazamos por
-- una que solo exige nombres únicos entre los roles globales.
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_nombre_key;
CREATE UNIQUE INDEX IF NOT EXISTS roles_nombre_global_unique ON roles (nombre) WHERE empresa_id IS NULL;
