# ReciclaS - Backend

## Estructura del proyecto

```
backend/
├── server.js                  ← Punto de entrada
├── package.json
├── .env.example               ← Copiá como .env y completá tus datos
├── database/
│   └── schema.sql             ← Ejecutar en PostgreSQL para crear las tablas
├── src/
│   ├── config/
│   │   └── database.js        ← Conexión a PostgreSQL
│   ├── middleware/
│   │   └── auth.js            ← Verificación de JWT
│   └── routes/
│       ├── auth.js            ← Login / sesión
│       ├── materiales.js      ← Inventario
│       ├── compras.js         ← Compras
│       ├── ventas.js          ← Ventas
│       └── usuarios.js        ← Gestión de usuarios
├── public/                    ← Copiá acá todos tus archivos HTML
└── ejemplos/
    └── login-integration.js   ← Cómo conectar el Login.html
```

---

## Pasos para empezar

### 1. Instalar dependencias
```bash
cd backend
npm install
```

### 2. Configurar PostgreSQL
Abrí pgAdmin o tu cliente SQL favorito y ejecutá:
```sql
CREATE DATABASE recicla_sys;
```
Luego conectate a esa base y ejecutá el archivo:
```
database/schema.sql
```
Esto crea todas las tablas, inserta datos de prueba y crea el usuario admin.

### 3. Configurar variables de entorno
```bash
# En Windows:
copy .env.example .env

# En Mac/Linux:
cp .env.example .env
```
Editá el `.env` con tus datos de PostgreSQL:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=recicla_sys
DB_USER=postgres
DB_PASSWORD=TU_CONTRASEÑA
JWT_SECRET=una_clave_larga_y_secreta
```

### 4. Copiar tus HTML al backend
```bash
# Copiá todos tus .html a la carpeta public/
# Ejemplo:
cp ../tus-html/*.html public/
```

### 5. Iniciar el servidor
```bash
# Modo desarrollo (se reinicia automáticamente al guardar)
npm run dev

# Modo producción
npm start
```

Abrí en el navegador: **http://localhost:3000**

---

## Endpoints disponibles

| Método | Ruta                          | Descripción                  | Auth |
|--------|-------------------------------|------------------------------|------|
| POST   | /api/auth/login               | Iniciar sesión               | No   |
| GET    | /api/auth/me                  | Verificar sesión             | Sí   |
| GET    | /api/materiales               | Listar materiales            | Sí   |
| POST   | /api/materiales               | Crear material               | edit |
| PUT    | /api/materiales/:id           | Actualizar material          | edit |
| GET    | /api/compras                  | Listar compras               | Sí   |
| GET    | /api/compras/resumen-dia      | Resumen del día              | Sí   |
| POST   | /api/compras                  | Registrar compra             | edit |
| PATCH  | /api/compras/:id/confirmar    | Confirmar compra             | edit |
| GET    | /api/ventas                   | Listar ventas                | Sí   |
| POST   | /api/ventas                   | Registrar venta              | edit |
| PATCH  | /api/ventas/:id/estado        | Cambiar estado venta         | edit |
| GET    | /api/usuarios                 | Listar usuarios              | full |
| POST   | /api/usuarios                 | Crear usuario                | full |

---

## Usuario admin por defecto
- **Email:** admin@recicla.com
- **Contraseña:** password
- ⚠️ Cambiar la contraseña inmediatamente después de la primera entrada.

---

## Prueba rápida con curl
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@recicla.com","password":"password"}'

# Con el token recibido:
curl http://localhost:3000/api/materiales \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```
