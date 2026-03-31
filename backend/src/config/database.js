const pool = require('./db');

const createTables = async () => {
  try {
    // 1. Tabla tenants
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(150) NOT NULL,
        rnc VARCHAR(20) UNIQUE,
        email VARCHAR(100) UNIQUE NOT NULL,
        telefono VARCHAR(20),
        direccion TEXT,
        logo_url TEXT,
        plan VARCHAR(20) DEFAULT 'gratis',
        estado VARCHAR(20) DEFAULT 'activo',
        creado_en TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla tenants creada');

    // 2. Tabla users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        rol VARCHAR(20) DEFAULT 'admin',
        verificado BOOLEAN DEFAULT FALSE,
        token_verificacion VARCHAR(255),
        reset_token VARCHAR(255),
        reset_token_expira TIMESTAMP,
        creado_en TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla users creada');

    // 3. Tabla subscriptions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        plan VARCHAR(20) NOT NULL,
        estado VARCHAR(20) DEFAULT 'activo',
        vence_en TIMESTAMP,
        stripe_subscription_id VARCHAR(255),
        creado_en TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla subscriptions creada');

    // 4. Índices
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
    `);
    console.log('✅ Índices creados');

    console.log('🎉 Base de datos lista');
  } catch (error) {
    console.error('❌ Error creando tablas:', error.message);
  }
};

module.exports = createTables;