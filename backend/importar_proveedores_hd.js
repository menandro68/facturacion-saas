// ============================================================
// IMPORTADOR DE PROVEEDORES  ->  TENANT: COMERCIAL H D
// Uso:  railway run node importar_proveedores_hd.js
// Idempotente: no duplica si el proveedor ya existe (nombre)
// ============================================================
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const RNC_TENANT = '001256887';          // COMERCIAL H D
const ARCHIVO = path.join(__dirname, 'proveedores_comercial_hd.json');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  const client = await pool.connect();
  try {
    if (!fs.existsSync(ARCHIVO)) {
      throw new Error('No se encontro el archivo proveedores_comercial_hd.json');
    }
    const proveedores = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
    console.log(`Archivo leido: ${proveedores.length} proveedores`);

    const t = await client.query(
      `SELECT id, nombre FROM tenants WHERE rnc = $1`, [RNC_TENANT]
    );
    if (!t.rows[0]) throw new Error(`No existe tenant con RNC ${RNC_TENANT}`);
    const tenant_id = t.rows[0].id;
    console.log(`Tenant: ${t.rows[0].nombre}  (${tenant_id})`);

    const antes = await client.query(
      `SELECT COUNT(*)::int AS n FROM suppliers WHERE tenant_id = $1`, [tenant_id]
    );
    console.log(`Proveedores actuales en la empresa: ${antes.rows[0].n}`);

    await client.query('BEGIN');

    let insertados = 0, omitidos = 0;
    for (const p of proveedores) {
      const dup = await client.query(
        `SELECT id FROM suppliers
         WHERE tenant_id = $1 AND UPPER(TRIM(nombre)) = UPPER(TRIM($2))`,
        [tenant_id, p.nombre]
      );
      if (dup.rows[0]) { omitidos++; continue; }

      await client.query(
        `INSERT INTO suppliers
           (tenant_id, nombre, rnc, email, telefono, direccion, contacto, estado)
         VALUES ($1, $2, NULL, NULL, $3, $4, $5, 'activo')`,
        [tenant_id, p.nombre, p.telefono, p.direccion, p.contacto]
      );
      insertados++;
    }

    await client.query('COMMIT');

    const despues = await client.query(
      `SELECT COUNT(*)::int AS n FROM suppliers WHERE tenant_id = $1`, [tenant_id]
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