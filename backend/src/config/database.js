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

    // 5. Tabla customers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        nombre VARCHAR(150) NOT NULL,
        rnc_cedula VARCHAR(20),
        email VARCHAR(100),
        telefono VARCHAR(20),
        direccion TEXT,
        tipo VARCHAR(30) DEFAULT 'consumidor_final',
        estado VARCHAR(20) DEFAULT 'activo',
        creado_en TIMESTAMP DEFAULT NOW(),
        actualizado_en TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla customers creada');

    // 6. Tabla products
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        nombre VARCHAR(150) NOT NULL,
        descripcion TEXT,
        precio DECIMAL(12,2) NOT NULL DEFAULT 0,
        itbis_rate DECIMAL(5,2) DEFAULT 18.00,
        unidad VARCHAR(30) DEFAULT 'unidad',
        estado VARCHAR(20) DEFAULT 'activo',
        creado_en TIMESTAMP DEFAULT NOW(),
        actualizado_en TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla products creada');

    // 7. Tabla ncf_sequences
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ncf_sequences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        tipo VARCHAR(10) NOT NULL,
        prefijo VARCHAR(10) NOT NULL,
        secuencia_actual INTEGER DEFAULT 0,
        secuencia_max INTEGER DEFAULT 1000,
        estado VARCHAR(20) DEFAULT 'activo',
        creado_en TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla ncf_sequences creada');

    // 8. Tabla invoices
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        customer_id UUID REFERENCES customers(id),
        ncf VARCHAR(20),
        ncf_tipo VARCHAR(10) DEFAULT 'B01',
        estado VARCHAR(20) DEFAULT 'borrador',
        subtotal DECIMAL(12,2) DEFAULT 0,
        itbis DECIMAL(12,2) DEFAULT 0,
        total DECIMAL(12,2) DEFAULT 0,
        notas TEXT,
        fecha_emision TIMESTAMP,
        fecha_vencimiento TIMESTAMP,
        creado_en TIMESTAMP DEFAULT NOW(),
        actualizado_en TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla invoices creada');

    // 9. Tabla invoice_items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id),
        descripcion VARCHAR(255) NOT NULL,
        cantidad DECIMAL(12,2) NOT NULL DEFAULT 1,
        precio_unitario DECIMAL(12,2) NOT NULL,
        itbis_rate DECIMAL(5,2) DEFAULT 18.00,
        itbis_monto DECIMAL(12,2) DEFAULT 0,
        subtotal DECIMAL(12,2) DEFAULT 0,
        total DECIMAL(12,2) DEFAULT 0
      )
    `);
    console.log('✅ Tabla invoice_items creada');

    console.log('🎉 Base de datos lista');
  } catch (error) {
    console.error('❌ Error creando tablas:', error.message);
  }
};

module.exports = createTables;