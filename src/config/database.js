const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const initDB = async () => {
  try {
    // Tabla de tenants (empresas)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        rnc VARCHAR(20),
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        plan VARCHAR(30) DEFAULT 'basico',
        status VARCHAR(20) DEFAULT 'activo',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Tabla de usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(30) DEFAULT 'admin',
        status VARCHAR(20) DEFAULT 'activo',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Tabla de suscripciones
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        plan VARCHAR(30) DEFAULT 'basico',
        status VARCHAR(20) DEFAULT 'activo',
        started_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      )
    `);

    // Tabla de clientes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        rnc_cedula VARCHAR(20),
        email VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        type VARCHAR(20) DEFAULT 'consumidor_final',
        status VARCHAR(20) DEFAULT 'activo',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Tabla de productos/servicios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        price DECIMAL(12,2) NOT NULL DEFAULT 0,
        itbis_rate DECIMAL(5,2) DEFAULT 18.00,
        unit VARCHAR(30) DEFAULT 'unidad',
        status VARCHAR(20) DEFAULT 'activo',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ Tablas creadas correctamente');
  } catch (error) {
    console.error('❌ Error creando tablas:', error);
    throw error;
  }
};

module.exports = { pool, initDB };