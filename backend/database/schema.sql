-- =============================================
-- SCRIPT DE CREACIÓN DE BASE DE DATOS
-- Sistema de Gestión de Reciclaje - ReciclaS
-- =============================================

-- Crear la base de datos (ejecutar separado si no existe)
-- CREATE DATABASE recicla_sys;

-- =============================================
-- TABLA: roles
-- =============================================
CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  creado_en   TIMESTAMP DEFAULT NOW()
);

-- Roles por defecto
INSERT INTO roles (nombre, descripcion) VALUES
  ('Administrador',      'Control total del sistema'),
  ('Operador de Báscula','Registra compras de materiales'),
  ('Vendedor',           'Gestiona ventas'),
  ('Contador',           'Solo lectura, acceso a reportes')
ON CONFLICT (nombre) DO NOTHING;

-- =============================================
-- TABLA: usuarios
-- =============================================
CREATE TABLE IF NOT EXISTS usuarios (
  id             SERIAL PRIMARY KEY,
  nombre_usuario VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  rol_id         INTEGER REFERENCES roles(id) ON DELETE SET NULL,
  permiso        VARCHAR(20) CHECK (permiso IN ('full', 'edit', 'view')) DEFAULT 'view',
  activo         BOOLEAN DEFAULT TRUE,
  creado_en      TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: materiales
-- =============================================
CREATE TABLE IF NOT EXISTS materiales (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  descripcion     TEXT,
  unidad_medida   VARCHAR(20) DEFAULT 'kg',
  precio_compra   NUMERIC(10, 2) DEFAULT 0,
  precio_venta    NUMERIC(10, 2) DEFAULT 0,
  stock_actual    NUMERIC(10, 2) DEFAULT 0,
  stock_minimo    NUMERIC(10, 2) DEFAULT 0,
  activo          BOOLEAN DEFAULT TRUE,
  creado_en       TIMESTAMP DEFAULT NOW(),
  moneda                  VARCHAR(5) CHECK (moneda IN ('USD', 'PYG')) DEFAULT 'USD',
  tipo_cambio             NUMERIC(12, 2),
  precio_compra_original  NUMERIC(14, 2),
  precio_venta_original   NUMERIC(14, 2)
);

-- Materiales de ejemplo
INSERT INTO materiales (nombre, descripcion, precio_compra, precio_venta, stock_actual) VALUES
  ('PET Cristal',       'Plástico PET transparente post-consumo', 8.25,  15.50, 1500),
  ('Cartón Corrugado',  'Cartón limpio y seco',                   2.50,   5.00, 800),
  ('Aluminio Latas',    'Latas de aluminio compactadas',          25.00,  48.00, 250),
  ('Vidrio Blanco',     'Vidrio transparente sin contaminantes',   1.20,   3.00, 600),
  ('Cobre',             'Cobre limpio sin pintura',               80.00, 140.00, 80),
  ('Papel Mixto',       'Papel mezclado sin cartón',               1.00,   2.50, 1200)
ON CONFLICT DO NOTHING;

-- =============================================
-- TABLA: proveedores
-- =============================================
CREATE TABLE IF NOT EXISTS proveedores (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(150) NOT NULL,
  telefono   VARCHAR(30),
  email      VARCHAR(150),
  direccion  TEXT,
  activo     BOOLEAN DEFAULT TRUE,
  creado_en  TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: compras (cabecera)
-- =============================================
CREATE TABLE IF NOT EXISTS compras (
  id            SERIAL PRIMARY KEY,
  proveedor_id  INTEGER REFERENCES proveedores(id),
  proveedor_nombre VARCHAR(150),   -- para cuando no está en la BD
  usuario_id    INTEGER REFERENCES usuarios(id),
  total         NUMERIC(12, 2) DEFAULT 0,
  estado        VARCHAR(20) CHECK (estado IN ('pendiente', 'confirmada', 'cancelada')) DEFAULT 'pendiente',
  observaciones TEXT,
  fecha         TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: compra_items (detalle de compra)
-- =============================================
CREATE TABLE IF NOT EXISTS compra_items (
  id            SERIAL PRIMARY KEY,
  compra_id     INTEGER REFERENCES compras(id) ON DELETE CASCADE,
  material_id   INTEGER REFERENCES materiales(id),
  peso_kg       NUMERIC(10, 2) NOT NULL,
  descuento_pct NUMERIC(5, 2) DEFAULT 0,
  precio_unitario NUMERIC(10, 2) NOT NULL,
  subtotal      NUMERIC(12, 2) NOT NULL,
  moneda          VARCHAR(5) CHECK (moneda IN ('USD', 'PYG')) DEFAULT 'USD',
  tipo_cambio     NUMERIC(12, 2),
  precio_original NUMERIC(14, 2)
);

-- =============================================
-- TABLA: clientes
-- =============================================
CREATE TABLE IF NOT EXISTS clientes (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(150) NOT NULL,
  email      VARCHAR(150),
  telefono   VARCHAR(30),
  direccion  TEXT,
  activo     BOOLEAN DEFAULT TRUE,
  creado_en  TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: ventas (cabecera)
-- =============================================
CREATE TABLE IF NOT EXISTS ventas (
  id           SERIAL PRIMARY KEY,
  cliente_id   INTEGER REFERENCES clientes(id),
  cliente_nombre VARCHAR(150),
  usuario_id   INTEGER REFERENCES usuarios(id),
  subtotal     NUMERIC(12, 2) DEFAULT 0,
  impuesto_pct NUMERIC(5, 2) DEFAULT 18,
  total        NUMERIC(12, 2) DEFAULT 0,
  estado       VARCHAR(20) CHECK (estado IN ('pendiente', 'en_transito', 'completada', 'cancelada')) DEFAULT 'pendiente',
  observaciones TEXT,
  fecha        TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: venta_items (detalle de venta)
-- =============================================
CREATE TABLE IF NOT EXISTS venta_items (
  id              SERIAL PRIMARY KEY,
  venta_id        INTEGER REFERENCES ventas(id) ON DELETE CASCADE,
  material_id     INTEGER REFERENCES materiales(id),
  cantidad_kg     NUMERIC(10, 2) NOT NULL,
  precio_unitario NUMERIC(10, 2) NOT NULL,
  subtotal        NUMERIC(12, 2) NOT NULL,
  moneda          VARCHAR(5) CHECK (moneda IN ('USD', 'PYG')) DEFAULT 'USD',
  tipo_cambio     NUMERIC(12, 2),
  precio_original NUMERIC(14, 2)
);

-- =============================================
-- TABLA: tipos_cambio (historial de tasas Gs. por USD)
-- =============================================
CREATE TABLE IF NOT EXISTS tipos_cambio (
  id          SERIAL PRIMARY KEY,
  valor       NUMERIC(12, 2) NOT NULL,   -- Guaraníes por 1 USD
  usuario_id  INTEGER REFERENCES usuarios(id),
  creado_en   TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: historial_ventas (trazabilidad)
-- =============================================
CREATE TABLE IF NOT EXISTS historial_ventas (
  id          SERIAL PRIMARY KEY,
  venta_id    INTEGER REFERENCES ventas(id) ON DELETE CASCADE,
  estado      VARCHAR(30),
  usuario_id  INTEGER REFERENCES usuarios(id),
  nota        TEXT,
  fecha       TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- FUNCIÓN: actualizar stock automáticamente
-- =============================================
CREATE OR REPLACE FUNCTION actualizar_stock_compra()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'confirmada' AND OLD.estado = 'pendiente' THEN
    UPDATE materiales m
    SET stock_actual = stock_actual + (
      SELECT COALESCE(SUM(peso_kg * (1 - descuento_pct/100)), 0)
      FROM compra_items
      WHERE compra_id = NEW.id AND material_id = m.id
    )
    WHERE id IN (SELECT material_id FROM compra_items WHERE compra_id = NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_stock_compra
AFTER UPDATE ON compras
FOR EACH ROW EXECUTE FUNCTION actualizar_stock_compra();

-- =============================================
-- TABLA: configuracion (fila única con ajustes generales del sistema)
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

-- =============================================
-- USUARIO ADMINISTRADOR POR DEFECTO
-- password: Admin1234! (cambiar en producción)
-- hash generado con bcrypt rounds=10
-- =============================================
INSERT INTO usuarios (nombre_usuario, email, password_hash, rol_id, permiso)
VALUES (
  'Admin',
  'admin@recicla.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
  1,
  'full'
) ON CONFLICT (email) DO NOTHING;

-- =============================================
-- VISTA: resumen de compras por día
-- =============================================
CREATE OR REPLACE VIEW vista_compras_dia AS
SELECT
  DATE(c.fecha)                     AS dia,
  COUNT(DISTINCT c.id)              AS total_transacciones,
  SUM(ci.peso_kg)                   AS peso_total_kg,
  SUM(ci.subtotal)                  AS monto_total,
  STRING_AGG(DISTINCT m.nombre, ', ') AS materiales
FROM compras c
JOIN compra_items ci ON ci.compra_id = c.id
JOIN materiales m    ON m.id = ci.material_id
WHERE c.estado = 'confirmada'
GROUP BY DATE(c.fecha)
ORDER BY dia DESC;
