# ♻️ ReciclaS — Sistema de Gestión de Reciclaje

> Aplicación Web Progresiva (PWA) para la gestión integral de operaciones en una empresa recicladora.  
> **Proyecto de Tesis** — Facultad de [Tu Facultad] · [Tu Universidad] · [Año]

---

## 📌 Descripción

**ReciclaS** es un sistema de gestión diseñado para digitalizar y optimizar las operaciones de una empresa recicladora. Permite registrar compras de materiales por peso con descuento de suciedad, gestionar ventas a clientes, controlar el inventario en tiempo real y administrar usuarios con roles y permisos diferenciados.

El sistema fue desarrollado como una **Progressive Web App (PWA)**, lo que permite su uso en navegadores de escritorio y dispositivos móviles, con posibilidad de instalarse como aplicación nativa.

---

## 🗂️ Módulos del sistema

| Módulo | Pantallas | Descripción |
|---|---|---|
| 🔐 **Autenticación** | Login | Acceso seguro con JWT y sesión persistente |
| 📊 **Dashboard** | Tablero principal | KPIs, gráficos comparativos y actividad reciente |
| 🛒 **Compras** | Gestión, Registro, Resumen, Resumen por Día | Registro de compras por material, peso y descuento |
| 💰 **Ventas** | Gestión, Nueva Venta, Listado, Detalle, Resumen | Ciclo completo de ventas con historial de estados |
| 📦 **Inventario** | Inventario de Materiales, Ficha de Producto | Stock en tiempo real, precios de compra y venta |
| 👥 **Usuarios** | Gestión, Creación | Alta, baja y edición con roles y permisos |
| ⚙️ **Configuración** | Configuración general, Configuración de usuario | Políticas de contraseña, idioma, notificaciones |

---

## 🧰 Stack tecnológico

### Frontend
| Tecnología | Uso |
|---|---|
| HTML5 | Estructura de las 18 vistas de la aplicación |
| [Tailwind CSS](https://tailwindcss.com/) | Estilos, diseño responsivo y modo oscuro |
| Material Symbols (Google) | Iconografía |
| JavaScript (Vanilla) | Lógica de interfaz y consumo de la API REST |
| Web App Manifest | Configuración PWA (instalación nativa) |

### Backend
| Tecnología | Uso |
|---|---|
| [Node.js](https://nodejs.org/) v18+ | Entorno de ejecución |
| [Express.js](https://expressjs.com/) | Framework HTTP y routing de la API |
| [PostgreSQL](https://www.postgresql.org/) v14+ | Base de datos relacional |
| [pg (node-postgres)](https://node-postgres.com/) | Driver de conexión con pool de conexiones |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | Autenticación stateless con JWT |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | Hash seguro de contraseñas |
| [dotenv](https://github.com/motdotla/dotenv) | Gestión de variables de entorno |

---

## 📁 Estructura del proyecto

```
recicla-sys/
│
├── README.md
├── .gitignore
│
├── frontend/                              # Vistas HTML (PWA)
│   ├── Login.html
│   ├── Reciclaje_tablero_principal.html
│   ├── Gestion_Compras.html
│   ├── Registro_nueva_compra.html
│   ├── Resumen_Compras.html
│   ├── Resumen_Compras_Dia.html
│   ├── Gestion_Ventas.html
│   ├── Nueva_Venta.html
│   ├── Listado_Ventas.html
│   ├── Detalle_venta.html
│   ├── Resumen_ventas.html
│   ├── Inventario_Materiales.html
│   ├── Ficha_Producto.html
│   ├── Gestion_usuarios.html
│   ├── Creacion_usuario.html
│   ├── Gestion_configuracion.html
│   ├── Configuracion_usuario.html
│   └── manifes.json                       # Web App Manifest (PWA)
│
└── backend/                               # API REST Node.js + Express
    ├── server.js                          # Punto de entrada del servidor
    ├── package.json
    ├── .env.example                       # Plantilla de variables de entorno
    ├── database/
    │   └── schema.sql                     # Script completo de creación de BD
    ├── public/                            # Frontend servido por Express
    │   └── (copia de los HTML)
    ├── src/
    │   ├── config/
    │   │   └── database.js                # Pool de conexión a PostgreSQL
    │   ├── middleware/
    │   │   └── auth.js                    # Verificación JWT y control de permisos
    │   └── routes/
    │       ├── auth.js                    # POST /login, GET /me
    │       ├── materiales.js              # CRUD de materiales e inventario
    │       ├── compras.js                 # Registro y confirmación de compras
    │       ├── ventas.js                  # Registro y gestión de ventas
    │       └── usuarios.js               # Gestión de usuarios del sistema
    └── ejemplos/
        └── login-integration.js           # Ejemplo de integración frontend↔API
```

---

## 🚀 Instalación y ejecución local

### Requisitos previos
- [Node.js](https://nodejs.org/) v18 o superior
- [PostgreSQL](https://www.postgresql.org/) v14 o superior
- Git

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/recicla-sys.git
cd recicla-sys
```

### 2. Crear la base de datos
En pgAdmin o psql:
```sql
CREATE DATABASE recicla_sys;
```
Luego ejecutar el schema completo:
```bash
psql -U postgres -d recicla_sys -f backend/database/schema.sql
```
Esto crea todas las tablas, datos de prueba y el usuario administrador por defecto.

### 3. Configurar variables de entorno
```bash
cd backend
cp .env.example .env
```
Editar `.env` con las credenciales de PostgreSQL:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=recicla_sys
DB_USER=postgres
DB_PASSWORD=tu_contraseña
JWT_SECRET=una_clave_secreta_larga_y_segura
JWT_EXPIRES_IN=8h
PORT=3000
```

### 4. Instalar dependencias e iniciar el servidor
```bash
npm install
npm run dev
```

### 5. Abrir en el navegador
```
http://localhost:3000
```

---

## 🔐 Credenciales de prueba

| Email | Contraseña | Rol | Permiso |
|---|---|---|---|
| admin@recicla.com | password | Administrador | Control total |

> ⚠️ Cambiar la contraseña del administrador después del primer acceso.

---

## 🌐 API REST — Referencia de endpoints

```
# Autenticación
POST   /api/auth/login                  Iniciar sesión → retorna JWT
GET    /api/auth/me                     Verificar sesión activa

# Inventario
GET    /api/materiales                  Listar materiales con stock actual
GET    /api/materiales/:id              Ver detalle de un material
POST   /api/materiales                  Crear nuevo material         [edit]
PUT    /api/materiales/:id              Actualizar precios/datos      [edit]
DELETE /api/materiales/:id              Desactivar material           [full]

# Compras
GET    /api/compras                     Listar compras (filtro: ?fecha=&estado=)
GET    /api/compras/resumen-dia         Resumen agrupado del día      ?fecha=YYYY-MM-DD
GET    /api/compras/:id                 Ver detalle e items de compra
POST   /api/compras                     Registrar nueva compra        [edit]
PATCH  /api/compras/:id/confirmar       Confirmar → actualiza stock   [edit]

# Ventas
GET    /api/ventas                      Listar ventas (filtro: ?estado=)
GET    /api/ventas/:id                  Ver detalle, items e historial
POST   /api/ventas                      Registrar nueva venta         [edit]
PATCH  /api/ventas/:id/estado           Cambiar estado de la venta    [edit]

# Usuarios
GET    /api/usuarios                    Listar usuarios activos       [full]
GET    /api/usuarios/roles              Listar roles disponibles
POST   /api/usuarios                    Crear nuevo usuario           [full]
DELETE /api/usuarios/:id                Desactivar usuario            [full]
```

> **Niveles de permiso**: `view` (solo lectura) → `edit` (lectura + escritura) → `full` (control total)

---

## 🗄️ Modelo de base de datos

```
roles ──────────────────── usuarios
                               │
               ┌───────────────┴───────────────┐
               │                               │
            compras                          ventas
               │                               │
          compra_items                    venta_items
                                               │
                                       historial_ventas

materiales ◄─── compra_items
materiales ◄─── venta_items
proveedores ◄── compras
clientes    ◄── ventas
```

**Tablas:** `roles` · `usuarios` · `materiales` · `proveedores` · `clientes` · `compras` · `compra_items` · `ventas` · `venta_items` · `historial_ventas`

**Vistas:** `vista_compras_dia` — resumen diario agrupado por material

**Triggers:** Actualización automática de stock al confirmar una compra

---

## ✨ Características técnicas destacadas

- ✅ **PWA** con Web App Manifest para instalación como app nativa
- ✅ **Autenticación JWT** stateless con expiración configurable (8h por defecto)
- ✅ **Sistema de permisos** de 3 niveles: `view`, `edit`, `full`
- ✅ **Transacciones SQL** para garantizar consistencia del inventario
- ✅ **Trigger PostgreSQL** que actualiza el stock automáticamente al confirmar compras
- ✅ **Borrado lógico** (soft delete) para usuarios y materiales
- ✅ **Pool de conexiones** a PostgreSQL para mejor rendimiento
- ✅ **Modo oscuro** completo en todas las pantallas (Tailwind dark mode)
- ✅ **Diseño responsivo** para uso en escritorio y móvil
- ✅ **Historial de estados** en ventas para trazabilidad completa

---

## 🔗 Navegación entre pantallas

```
Login
  └── Dashboard (Tablero Principal)
        ├── Gestión de Compras
        │     ├── Registro Nueva Compra → Resumen de Compra → Dashboard
        │     ├── Resumen de Compras (historial)
        │     └── Resumen de Compras por Día
        ├── Gestión de Ventas
        │     ├── Nueva Venta
        │     ├── Listado de Ventas → Detalle de Venta
        │     └── Resumen de Ventas
        ├── Inventario de Materiales → Ficha de Producto
        ├── Configuración General
        │     ├── Gestión de Usuarios → Creación de Usuario
        │     └── Configuración de Usuario
        └── Cerrar Sesión → Login
```

---

## 👨‍💻 Autor

**[Tu Nombre Completo]**  
Estudiante de [Carrera] — [Universidad]  
[tu.email@universidad.edu]

---

## 📄 Licencia

Proyecto desarrollado con fines académicos como trabajo final de tesis.  
© [Año] — [Tu Nombre]
