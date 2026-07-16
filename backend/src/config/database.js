// src/config/database.js
// Conexión a PostgreSQL usando el módulo 'pg'

const { Pool } = require('pg');
require('dotenv').config();

// La mayoría de los Postgres administrados en la nube (Neon, Supabase,
// Render, Vercel Postgres) exigen SSL. En local normalmente no hace
// falta, así que queda a opción con DB_SSL=true.
const useSSL = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';

// Si hay una connection string (la forma en que Neon/Supabase/Vercel
// Postgres la entregan, ej: POSTGRES_URL o DATABASE_URL), la usamos
// directamente en vez de armar la conexión a partir de variables
// sueltas. Evita errores de tipeo al copiar host/puerto/usuario a mano.
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: useSSL || /\bsslmode=require\b/.test(connectionString) ? { rejectUnauthorized: false } : false,
    })
  : new Pool({
      host:     process.env.DB_HOST     || 'localhost',
      port:     process.env.DB_PORT     || 5432,
      database: process.env.DB_NAME     || 'recicla_sys',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl:      useSSL ? { rejectUnauthorized: false } : false,
    });

// Probar la conexión al iniciar
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error al conectar con PostgreSQL:', err.message);
  } else {
    console.log('✅ Conectado a PostgreSQL correctamente');
    release();
  }
});

module.exports = pool;
