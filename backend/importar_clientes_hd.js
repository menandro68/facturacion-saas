// ============================================================
// IMPORTADOR DE CLIENTES  ->  TENANT: COMERCIAL H D
// Uso:  railway run node importar_clientes_hd.js
// Idempotente: no duplica si el cliente ya existe (nombre + direccion)
// ============================================================
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const RNC_TENANT = '001256887';          // COMERCIAL H D
const ARCHIVO = path.join(__dirname, 'clientes_comercial_hd.json');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  const client = await pool.connect();
  try {
    if (!fs.existsSync(ARCHIVO)) {
      throw new Error('No se encontro el archivo clientes_comercial_hd.json');
    }
    const clientes = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
    console.log(`Archivo leido: ${clientes.length} clientes`);

    const t = await client.query(
      `SELECT id, nombre FROM tenants WHERE rnc = $1`, [RNC_TENANT]
    );
    if (!t.rows[0]) throw new Error(`No existe tenant con RNC ${RNC_TENANT}`);
    const tenant_id = t.rows[0].id;
    console.log(`Tenant: ${t.rows[0].nombre}  (${tenant_id})`);

    const antes = await client.query(
      `SELECT COUNT(*)::int AS n FROM customers WHERE tenant_id = $1`, [tenant_id]
    );
    console.log(`Clientes actuales en la empresa: ${antes.rows[0].n}`);

    await client.query('BEGIN');

    let insertados = 0, omitidos = 0;
    for (const c of clientes) {
      const dup = await client.query(
        `SELECT id FROM customers
         WHERE tenant_id = $1
           AND UPPER(TRIM(nombre)) = UPPER(TRIM($2))
           AND COALESCE(UPPER(TRIM(direccion)),'') = COALESCE(UPPER(TRIM($3)),'')`,
        [tenant_id, c.nombre, c.direccion]
      );
      if (dup.rows[0]) { omitidos++; continue; }

      await client.query(
        `INSERT INTO customers
           (tenant_id, nombre, rnc_cedula, email, telefono, direccion, tipo, estado)
         VALUES ($1, $2, NULL, NULL, $3, $4, 'consumidor_final', 'activo')`,
        [tenant_id, c.nombre, c.telefono, c.direccion]
      );
      insertados++;
    }

    await client.query('COMMIT');

    const despues = await client.query(
      `SELECT COUNT(*)::int AS n FROM customers WHERE tenant_id = $1`, [tenant_id]
    );

    console.log('------------------------------------------');
    console.log(`Insertados : ${insertados}`);
    console.log(`Omitidos   : ${omitidos} (ya existian)`);
    console.log(`Total ahora: ${despues.rows[0].n}`);
    console.log('IMPORTACION COMPLETADA');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();