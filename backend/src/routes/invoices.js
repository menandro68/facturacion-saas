const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const verifyToken = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');
const { obtenerProximoNCFElectronico } = require('../helpers/ncfElectronico');
const QRCode = require('qrcode');
const bwipjs = require('bwip-js');
const { obtenerProximoNumeroFactura } = require('../helpers/numeroFactura');

// GET - Listar items de todas las facturas con comision del producto
router.get('/items/todos', verifyToken, tenantGuard, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const result = await pool.query(
      `SELECT ii.invoice_id, ii.product_id, ii.descripcion, ii.cantidad, 
              ii.precio_unitario, ii.subtotal, ii.total,
              COALESCE(p.comision_vendedor, 0) as comision_vendedor
       FROM invoice_items ii
       LEFT JOIN products p ON ii.product_id = p.id
       INNER JOIN invoices i ON ii.invoice_id = i.id
       WHERE i.tenant_id = $1`,
      [tenant_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

// GET - Listar facturas
router.get('/', verifyToken, tenantGuard, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const result = await pool.query(
      `SELECT i.*, c.nombre as cliente_nombre
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       WHERE i.tenant_id = $1
       ORDER BY i.creado_en DESC`,
      [tenant_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

// GET - Reporte de ventas por producto
router.get('/reporte/productos', verifyToken, tenantGuard, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { fecha_inicio, fecha_fin, vendedor_id, customer_id, producto } = req.query;

    const result = await pool.query(`
      SELECT 
        ii.descripcion,
        SUM(ii.cantidad) as total_cantidad,
        ii.precio_unitario,
        SUM(ii.subtotal) as total_subtotal,
        SUM(ii.itbis_monto) as total_itbis,
        SUM(ii.total) as total_venta,
        COALESCE(SUM(ii.cantidad * COALESCE(p.costo, 0)), 0) as total_costo,
        SUM(ii.subtotal) - COALESCE(SUM(ii.cantidad * COALESCE(p.costo, 0)), 0) as beneficio
      FROM invoices i
      LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
      LEFT JOIN products p ON p.id = ii.product_id
      LEFT JOIN customers c ON c.id = i.customer_id
      WHERE i.tenant_id = $1
        AND i.estado != 'anulada'
        AND ($2::date IS NULL OR i.creado_en::date >= $2::date)
        AND ($3::date IS NULL OR i.creado_en::date <= $3::date)
        AND ($4::uuid IS NULL OR c.vendedor_id = $4::uuid)
        AND ($5::uuid IS NULL OR i.customer_id = $5::uuid)
        AND ($6::text IS NULL OR ii.descripcion ILIKE $6::text)
      GROUP BY ii.descripcion, ii.precio_unitario
      ORDER BY total_venta DESC
    `, [tenant_id, fecha_inicio || null, fecha_fin || null, vendedor_id || null, customer_id || null, producto ? `%${producto}%` : null]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

// GET - Reporte de ventas por rango de fechas
router.get('/reporte/resumen', verifyToken, tenantGuard, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { fecha_inicio, fecha_fin } = req.query;

    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(i.subtotal), 0) as total_subtotal,
        COALESCE(SUM(i.itbis), 0) as total_itbis,
        COALESCE(SUM(i.total), 0) as total_ventas,
        COALESCE(SUM(ii.cantidad * COALESCE(p.costo, 0)), 0) as total_costo
      FROM invoices i
      LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
      LEFT JOIN products p ON p.id = ii.product_id
      WHERE i.tenant_id = $1
        AND i.estado != 'anulada'
        AND ($2::date IS NULL OR i.creado_en::date >= $2::date)
        AND ($3::date IS NULL OR i.creado_en::date <= $3::date)
    `, [tenant_id, fecha_inicio || null, fecha_fin || null]);

    const row = result.rows[0];
    const beneficio = parseFloat(row.total_subtotal) - parseFloat(row.total_costo);

    res.json({ success: true, data: {
      total_subtotal: parseFloat(row.total_subtotal),
      total_itbis: parseFloat(row.total_itbis),
      total_ventas: parseFloat(row.total_ventas),
      total_costo: parseFloat(row.total_costo),
      beneficio_neto: beneficio
    }});
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

// GET - Listar pedidos
router.get('/pedidos/lista', verifyToken, tenantGuard, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { vendedor_id, fecha_inicio, fecha_fin } = req.query;
    let query, params;
    if (vendedor_id) {
      query = `SELECT i.*, c.nombre as cliente_nombre
               FROM invoices i
               INNER JOIN customers c ON i.customer_id = c.id
               WHERE i.tenant_id = $1 AND i.estado = 'pedido'
                 AND c.vendedor_id = $2::uuid
                 AND ($3::date IS NULL OR i.creado_en::date >= $3::date)
                 AND ($4::date IS NULL OR i.creado_en::date <= $4::date)
               ORDER BY i.creado_en DESC`;
      params = [tenant_id, vendedor_id, fecha_inicio || null, fecha_fin || null];
    } else {
      query = `SELECT i.*, c.nombre as cliente_nombre
               FROM invoices i
               LEFT JOIN customers c ON i.customer_id = c.id
               WHERE i.tenant_id = $1 AND i.estado = 'pedido'
                 AND ($2::date IS NULL OR i.creado_en::date >= $2::date)
                 AND ($3::date IS NULL OR i.creado_en::date <= $3::date)
               ORDER BY i.creado_en DESC`;
      params = [tenant_id, fecha_inicio || null, fecha_fin || null];
    }
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

// POST - Crear pedido
router.post('/pedido', verifyToken, tenantGuard, async (req, res) => {
  const client = await pool.connect();
  try {
    const { tenant_id } = req.user;
    const { customer_id, items, notas } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, mensaje: 'El pedido debe tener al menos un item' });
    }
    await client.query('BEGIN');
    let subtotal = 0, itbis = 0;
    for (const item of items) {
      const s = parseFloat(item.cantidad) * parseFloat(item.precio_unitario);
      subtotal += s;
      itbis += s * (parseFloat(item.itbis_rate || 0) / 100);
    }
    const total = subtotal + itbis;
    const pedido = await client.query(
      `INSERT INTO invoices (tenant_id, customer_id, ncf_tipo, estado, subtotal, itbis, total, notas, fecha_emision)
       VALUES ($1, $2, 'B01', 'pedido', $3, $4, $5, $6, NOW()) RETURNING *`,
      [tenant_id, customer_id || null, subtotal, itbis, total, notas || null]
    );
    const pedido_id = pedido.rows[0].id;
    for (const item of items) {
      const s = parseFloat(item.cantidad) * parseFloat(item.precio_unitario);
      const item_itbis = s * (parseFloat(item.itbis_rate || 0) / 100);
      await client.query(
        `INSERT INTO invoice_items (invoice_id, product_id, descripcion, cantidad, precio_unitario, itbis_rate, itbis_monto, subtotal, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [pedido_id, item.product_id || null, item.descripcion, item.cantidad, item.precio_unitario,
         item.itbis_rate || 0, item_itbis, s, s + item_itbis]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true, data: pedido.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, mensaje: error.message });
  } finally {
    client.release();
  }
});

// PUT - Editar pedido
router.put('/pedido/:id/editar', verifyToken, tenantGuard, async (req, res) => {
  const client = await pool.connect()
  try {
    const { tenant_id } = req.user
    const { id } = req.params
    const { customer_id, items } = req.body

    await client.query('BEGIN')

    // Verificar que el pedido existe
    const pedido = await client.query(
      `SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2 AND estado = 'pedido'`,
      [id, tenant_id]
    )
    if (!pedido.rows[0]) return res.status(404).json({ success: false, mensaje: 'Pedido no encontrado' })

    // Recalcular totales
    let subtotal = 0, itbis_total = 0
    items.forEach(item => {
      const s = parseFloat(item.cantidad) * parseFloat(item.precio_unitario)
      subtotal += s
      itbis_total += s * (parseFloat(item.itbis_rate || 0) / 100)
    })
    const total = subtotal + itbis_total

    // Actualizar factura
    await client.query(
      `UPDATE invoices SET customer_id=$1, subtotal=$2, itbis=$3, total=$4, actualizado_en=NOW() WHERE id=$5`,
      [customer_id || null, subtotal, itbis_total, total, id]
    )

    // Eliminar items anteriores
    await client.query(`DELETE FROM invoice_items WHERE invoice_id = $1`, [id])

    // Insertar nuevos items
    for (const item of items) {
      await client.query(
        `INSERT INTO invoice_items (invoice_id, product_id, descripcion, cantidad, precio_unitario, itbis_rate, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, item.product_id || null, item.descripcion, item.cantidad, item.precio_unitario,
         item.itbis_rate || 0, parseFloat(item.cantidad) * parseFloat(item.precio_unitario)]
      )
    }

    await client.query('COMMIT')
    res.json({ success: true, mensaje: 'Pedido actualizado' })
  } catch (error) {
    await client.query('ROLLBACK')
    res.status(500).json({ success: false, mensaje: error.message })
  } finally {
    client.release()
  }
})

// PUT - Convertir pedido a factura
router.put('/pedido/:id/convertir', verifyToken, tenantGuard, async (req, res) => {
  const client = await pool.connect();
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;
    await client.query('BEGIN');
    const pedido = await client.query(
      `SELECT * FROM invoices WHERE id=$1 AND tenant_id=$2 AND estado='pedido'`,
      [id, tenant_id]
    );
    if (!pedido.rows[0]) {
      return res.status(404).json({ success: false, mensaje: 'Pedido no encontrado' });
    }
    // Asignar NCF
    let seq = await client.query(
      `SELECT * FROM ncf_sequences WHERE tenant_id=$1 AND tipo='B01' AND estado='activo'`, [tenant_id]
    );
    if (seq.rows.length === 0) {
      await client.query(
        `INSERT INTO ncf_sequences (tenant_id, tipo, prefijo, secuencia_actual, secuencia_max) VALUES ($1,'B01','B01',0,9999999)`,
        [tenant_id]
      );
      seq = await client.query(`SELECT * FROM ncf_sequences WHERE tenant_id=$1 AND tipo='B01'`, [tenant_id]);
    }
    const nueva_sec = seq.rows[0].secuencia_actual + 1;
    await client.query(`UPDATE ncf_sequences SET secuencia_actual=$1 WHERE id=$2`, [nueva_sec, seq.rows[0].id]);
    const ncf = `B01${String(nueva_sec).padStart(8,'0')}`;
    // Descontar inventario
    const items = await client.query(`SELECT * FROM invoice_items WHERE invoice_id=$1`, [id]);
    for (const item of items.rows) {
      if (!item.product_id) continue;
      const inv = await client.query(
        'SELECT * FROM inventory WHERE product_id=$1 AND tenant_id=$2',
        [item.product_id, tenant_id]
      );
      if (inv.rows.length > 0) {
        const stockNuevo = parseFloat(inv.rows[0].stock_actual) - parseFloat(item.cantidad);
        await client.query('UPDATE inventory SET stock_actual=$1, actualizado_en=NOW() WHERE id=$2',
          [stockNuevo, inv.rows[0].id]);
        await client.query(
          `INSERT INTO inventory_movements (tenant_id,inventory_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo)
           VALUES ($1,$2,'salida',$3,$4,$5,$6)`,
          [tenant_id, inv.rows[0].id, item.cantidad, inv.rows[0].stock_actual, stockNuevo, `Factura ${ncf} (Pedido)`]
        );
      }
    }
    // Obtener proximo numero de factura consecutivo por tenant
    const numero_factura = await obtenerProximoNumeroFactura(client, tenant_id);

    const updated = await client.query(
      `UPDATE invoices SET estado='emitida', ncf=$1, ncf_tipo='B01', fecha_emision=NOW(), actualizado_en=NOW(), numero_factura=$3
       WHERE id=$2 RETURNING *`,
      [ncf, id, numero_factura]
    );
    await client.query('COMMIT');
    res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, mensaje: error.message });
  } finally {
    client.release();
  }
});

// GET - Listar notas de crédito
router.get('/nota-credito/lista', verifyToken, tenantGuard, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const result = await pool.query(
      `SELECT i.*, c.nombre as cliente_nombre
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       WHERE i.tenant_id = $1 AND i.estado = 'nota_credito'
       ORDER BY i.creado_en DESC`,
      [tenant_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

// POST - Crear nota de crédito
router.post('/nota-credito', verifyToken, tenantGuard, async (req, res) => {
  const client = await pool.connect();
  try {
    const { tenant_id } = req.user;
    const { factura_id, items, motivo } = req.body;
    if (!factura_id || !items || items.length === 0) {
      return res.status(400).json({ success: false, mensaje: 'Datos incompletos' });
    }
    await client.query('BEGIN');

    // Verificar factura original
    const facturaOrig = await client.query(
      `SELECT * FROM invoices WHERE id=$1 AND tenant_id=$2 AND estado='emitida'`,
      [factura_id, tenant_id]
    );
    if (!facturaOrig.rows[0]) {
      return res.status(404).json({ success: false, mensaje: 'Factura no encontrada o no emitida' });
    }

    // Generar número NC
    let seq = await client.query(
      `SELECT * FROM ncf_sequences WHERE tenant_id=$1 AND tipo='NC' AND estado='activo'`, [tenant_id]
    );
    if (seq.rows.length === 0) {
      await client.query(
        `INSERT INTO ncf_sequences (tenant_id, tipo, prefijo, secuencia_actual, secuencia_max) VALUES ($1,'NC','NC',0,9999999)`,
        [tenant_id]
      );
      seq = await client.query(`SELECT * FROM ncf_sequences WHERE tenant_id=$1 AND tipo='NC'`, [tenant_id]);
    }
    const nueva_sec = seq.rows[0].secuencia_actual + 1;
    await client.query(`UPDATE ncf_sequences SET secuencia_actual=$1 WHERE id=$2`, [nueva_sec, seq.rows[0].id]);
    const nc_numero = `NC${String(nueva_sec).padStart(8,'0')}`;

    // Calcular totales de la nota
    let subtotal = 0, itbis = 0;
    for (const item of items) {
      const s = parseFloat(item.cantidad) * parseFloat(item.precio_unitario);
      subtotal += s;
      itbis += s * (parseFloat(item.itbis_rate || 0) / 100);
    }
    const total = subtotal + itbis;

    // Obtener proximo numero de factura consecutivo por tenant
    const numero_factura = await obtenerProximoNumeroFactura(client, tenant_id);

    // Crear nota de crédito
    const nota = await client.query(
      `INSERT INTO invoices (tenant_id, customer_id, ncf_tipo, ncf, estado, subtotal, itbis, total, notas, fecha_emision, referencia_id, numero_factura)
       VALUES ($1, $2, 'NC', $3, 'nota_credito', $4, $5, $6, $7, NOW(), $8, $9) RETURNING *`,
      [tenant_id, facturaOrig.rows[0].customer_id, nc_numero, subtotal, itbis, total,
       motivo || `Nota de crédito por factura ${facturaOrig.rows[0].ncf}`, factura_id, numero_factura]
    );
    const nota_id = nota.rows[0].id;

    // Insertar items y revertir inventario
    for (const item of items) {
      const s = parseFloat(item.cantidad) * parseFloat(item.precio_unitario);
      const item_itbis = s * (parseFloat(item.itbis_rate || 0) / 100);
      await client.query(
        `INSERT INTO invoice_items (invoice_id, product_id, descripcion, cantidad, precio_unitario, itbis_rate, itbis_monto, subtotal, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [nota_id, item.product_id || null, item.descripcion, item.cantidad, item.precio_unitario,
         item.itbis_rate || 0, item_itbis, s, s + item_itbis]
      );
      // Revertir inventario (devolver stock)
      if (item.product_id) {
        const inv = await client.query(
          'SELECT * FROM inventory WHERE product_id=$1 AND tenant_id=$2',
          [item.product_id, tenant_id]
        );
        if (inv.rows.length > 0) {
          const stockNuevo = parseFloat(inv.rows[0].stock_actual) + parseFloat(item.cantidad);
          await client.query(
            'UPDATE inventory SET stock_actual=$1, actualizado_en=NOW() WHERE id=$2',
            [stockNuevo, inv.rows[0].id]
          );
          await client.query(
            `INSERT INTO inventory_movements (tenant_id,inventory_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo)
             VALUES ($1,$2,'entrada',$3,$4,$5,$6)`,
            [tenant_id, inv.rows[0].id, item.cantidad, inv.rows[0].stock_actual, stockNuevo,
             `Nota de crédito ${nc_numero}`]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: nota.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, mensaje: error.message });
  } finally {
    client.release();
  }
});

// GET - Obtener una factura con sus items
router.get('/:id', verifyToken, tenantGuard, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;
    const invoice = await pool.query(
      `SELECT i.*, c.nombre as cliente_nombre, c.rnc_cedula
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       WHERE i.id = $1 AND i.tenant_id = $2`,
      [id, tenant_id]
    );
    if (!invoice.rows[0]) return res.status(404).json({ success: false, mensaje: 'Factura no encontrada' });
    const items = await pool.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1`,
      [id]
    );
    res.json({ success: true, data: { ...invoice.rows[0], items: items.rows } });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

// POST - Crear factura borrador
router.post('/', verifyToken, tenantGuard, async (req, res) => {
  const client = await pool.connect();
  try {
    const { tenant_id } = req.user;
    const { customer_id, ncf_tipo, notas, fecha_vencimiento, items } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, mensaje: 'La factura debe tener al menos un item' });
    }

    await client.query('BEGIN');

    let subtotal = 0;
    let itbis = 0;
    for (const item of items) {
      const item_subtotal = item.cantidad * item.precio_unitario;
      const item_itbis = item_subtotal * (item.itbis_rate / 100);
      subtotal += item_subtotal;
      itbis += item_itbis;
    }
    const total = subtotal + itbis;

    // Detectar si es NCF Electronico (e-CF) o tradicional (B01/B02)
    let ncf;
    let codigo_seguridad = null;
    let fecha_vencimiento_encf = null;

    if (['E31', 'E32', 'E34'].includes(ncf_tipo)) {
      // NCF ELECTRONICO (e-CF) - Facturacion Electronica DGII
      const encfResult = await obtenerProximoNCFElectronico(tenant_id, ncf_tipo);
      ncf = encfResult.ncf;
      codigo_seguridad = encfResult.codigo_seguridad;
      fecha_vencimiento_encf = encfResult.fecha_vencimiento;
    } else {
      // NCF TRADICIONAL (B01, B02, B15) - Logica inteligente de 2 niveles
      const tipoTradicional = ncf_tipo || 'B01';

      // NIVEL 1: Buscar si existe secuencia configurada en tabla NUEVA (Mantenimiento)
      const secuenciaNueva = await client.query(
        `SELECT id FROM ncf_secuencias_electronicas
         WHERE tenant_id = $1 AND tipo_ncf = $2 AND activo = true
           AND secuencia_actual <= secuencia_hasta
         LIMIT 1`,
        [tenant_id, tipoTradicional]
      );

      if (secuenciaNueva.rows.length > 0) {
        // Existe secuencia en tabla nueva - usar helper unificado
        const resultado = await obtenerProximoNCFElectronico(tenant_id, tipoTradicional);
        ncf = resultado.ncf;
        // codigo_seguridad y fecha_vencimiento_encf se quedan null (son solo para e-CF)
      } else {
        // NIVEL 2: No existe en tabla nueva - usar logica VIEJA (sin cambios)
        let seq = await client.query(
          `SELECT * FROM ncf_sequences WHERE tenant_id = $1 AND tipo = $2 AND estado = 'activo'`,
          [tenant_id, tipoTradicional]
        );
        if (seq.rows.length === 0) {
          await client.query(
            `INSERT INTO ncf_sequences (tenant_id, tipo, prefijo, secuencia_actual, secuencia_max)
             VALUES ($1, $2, $3, 0, 9999999)`,
            [tenant_id, tipoTradicional, tipoTradicional]
          );
          seq = await client.query(
            `SELECT * FROM ncf_sequences WHERE tenant_id = $1 AND tipo = $2`,
            [tenant_id, tipoTradicional]
          );
        }
        const nueva_secuencia = seq.rows[0].secuencia_actual + 1;
        await client.query(
          `UPDATE ncf_sequences SET secuencia_actual = $1 WHERE id = $2`,
          [nueva_secuencia, seq.rows[0].id]
        );
        ncf = `${tipoTradicional}${String(nueva_secuencia).padStart(8, '0')}`;
      }
    }

    // Obtener proximo numero de factura consecutivo por tenant
    const numero_factura = await obtenerProximoNumeroFactura(client, tenant_id);

    const invoice = await client.query(
      `INSERT INTO invoices (tenant_id, customer_id, ncf_tipo, ncf, estado, subtotal, itbis, total, notas, fecha_vencimiento, fecha_emision, codigo_seguridad, fecha_vencimiento_encf, fecha_firma_digital, numero_factura)
       VALUES ($1, $2, $3, $4, 'emitida', $5, $6, $7, $8, $9, NOW(), $10, $11, $12, $13) RETURNING *`,
      [tenant_id, customer_id || null, ncf_tipo || 'B01', ncf, subtotal, itbis, total, notas || null, fecha_vencimiento || null, codigo_seguridad, fecha_vencimiento_encf, codigo_seguridad ? new Date() : null, numero_factura]
    );
    const invoice_id = invoice.rows[0].id;

    for (const item of items) {
      const item_subtotal = item.cantidad * item.precio_unitario;
      const item_itbis = item_subtotal * (item.itbis_rate / 100);
      const item_total = item_subtotal + item_itbis;
      await client.query(
        `INSERT INTO invoice_items (invoice_id, product_id, descripcion, cantidad, precio_unitario, itbis_rate, itbis_monto, subtotal, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [invoice_id, item.product_id || null, item.descripcion, item.cantidad, item.precio_unitario, item.itbis_rate || 18, item_itbis, item_subtotal, item_total]
      );
    }

    // Actualizar inventario automáticamente al emitir factura
    for (const item of items) {
      if (!item.product_id) continue
      const inv = await client.query(
        'SELECT * FROM inventory WHERE product_id = $1 AND tenant_id = $2',
        [item.product_id, tenant_id]
      )
      if (inv.rows.length > 0) {
        const stockAnterior = parseFloat(inv.rows[0].stock_actual)
        const stockNuevo = stockAnterior - parseFloat(item.cantidad)
        await client.query(
          'UPDATE inventory SET stock_actual = $1, actualizado_en = NOW() WHERE id = $2',
          [stockNuevo, inv.rows[0].id]
        )
        await client.query(
          `INSERT INTO inventory_movements 
          (tenant_id, inventory_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
          VALUES ($1, $2, 'salida', $3, $4, $5, $6)`,
          [tenant_id, inv.rows[0].id, item.cantidad, stockAnterior, stockNuevo,
           `Factura ${ncf}`]
        )
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: invoice.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, mensaje: error.message });
  } finally {
    client.release();
  }
});

// PUT - Emitir factura (asigna NCF)
router.put('/:id/emitir', verifyToken, tenantGuard, async (req, res) => {
  const client = await pool.connect();
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;

    await client.query('BEGIN');

    const invoice = await client.query(
      `SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2`,
      [id, tenant_id]
    );
    if (!invoice.rows[0]) return res.status(404).json({ success: false, mensaje: 'Factura no encontrada' });
    if (invoice.rows[0].estado !== 'borrador') {
      return res.status(400).json({ success: false, mensaje: 'Solo se pueden emitir facturas en borrador' });
    }

    const ncf_tipo = invoice.rows[0].ncf_tipo;

    let seq = await client.query(
      `SELECT * FROM ncf_sequences WHERE tenant_id = $1 AND tipo = $2 AND estado = 'activo'`,
      [tenant_id, ncf_tipo]
    );
    if (seq.rows.length === 0) {
      await client.query(
        `INSERT INTO ncf_sequences (tenant_id, tipo, prefijo, secuencia_actual, secuencia_max)
         VALUES ($1, $2, $3, 0, 1000)`,
        [tenant_id, ncf_tipo, ncf_tipo]
      );
      seq = await client.query(
        `SELECT * FROM ncf_sequences WHERE tenant_id = $1 AND tipo = $2`,
        [tenant_id, ncf_tipo]
      );
    }

    const nueva_secuencia = seq.rows[0].secuencia_actual + 1;
    await client.query(
      `UPDATE ncf_sequences SET secuencia_actual = $1 WHERE id = $2`,
      [nueva_secuencia, seq.rows[0].id]
    );

    const ncf = `${ncf_tipo}${String(nueva_secuencia).padStart(8, '0')}`;

    const updated = await client.query(
      `UPDATE invoices SET estado='emitida', ncf=$1, fecha_emision=NOW(), actualizado_en=NOW()
       WHERE id=$2 RETURNING *`,
      [ncf, id]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, mensaje: error.message });
  } finally {
    client.release();
  }
});

// PUT - Anular factura
router.put('/:id/anular', verifyToken, tenantGuard, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;
    const invoice = await pool.query(
      `SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2`,
      [id, tenant_id]
    );
    if (!invoice.rows[0]) return res.status(404).json({ success: false, mensaje: 'Factura no encontrada' });
    if (invoice.rows[0].estado === 'anulada') {
      return res.status(400).json({ success: false, mensaje: 'La factura ya está anulada' });
    }
    const updated = await pool.query(
      `UPDATE invoices SET estado='anulada', actualizado_en=NOW() WHERE id=$1 RETURNING *`,
      [id]
    );
    res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

// GET - Generar PDF formato Punto de Venta 80mm (termica) - DISEÑO PROFESIONAL
router.get('/:id/pdf-pos', verifyToken, tenantGuard, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;

    const invoice = await pool.query(
      `SELECT i.*, c.nombre as cliente_nombre, c.rnc_cedula, c.telefono as cliente_telefono,
              c.direccion as cliente_direccion,
              t.nombre as empresa_nombre, t.rnc as empresa_rnc, t.telefono as empresa_telefono,
              t.direccion as empresa_direccion,
              v.nombre as vendedor_nombre
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       LEFT JOIN tenants t ON i.tenant_id = t.id
       LEFT JOIN vendedores v ON c.vendedor_id = v.id
       WHERE i.id=$1 AND i.tenant_id=$2`,
      [id, tenant_id]
    );

    if (invoice.rows.length === 0) {
      return res.status(404).json({ success: false, mensaje: 'Factura no encontrada' });
    }

    const items = await pool.query(
      `SELECT * FROM invoice_items WHERE invoice_id=$1`,
      [id]
    );

    const data = invoice.rows[0];
    const PDFDocument = require('pdfkit');

    // Detectar si es e-CF (Factura Electronica DGII)
    const esElectronica = ['E31', 'E32', 'E34'].includes(data.ncf_tipo);
    const tituloDocumento = {
      'E31': 'FACTURA CREDITO FISCAL ELECTRONICA',
      'E32': 'FACTURA DE CONSUMO ELECTRONICA',
      'E34': 'NOTA DE CREDITO ELECTRONICA'
    }[data.ncf_tipo] || 'FACTURA';

    // Punto de Venta 80mm: ancho seguro 200 puntos
    const W = 200;
    const M = 8;
    const doc = new PDFDocument({ margin: M, size: [W, 1100] });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=ticket-${data.ncf || data.id}.pdf`);
    doc.pipe(res);

    let y = 10;
    const cw = W - (M * 2);

    // Helper texto centrado
    const centrado = (texto, fontSize, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
      doc.text(texto, M, y, { width: cw, align: 'center' });
      y += fontSize + 3;
    };

    // Helper texto a la izquierda
    const izquierda = (texto, fontSize, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
      doc.text(texto, M, y, { width: cw });
      y += fontSize + 3;
    };

    // Helper línea de guiones (estilo profesional)
    const lineaGuiones = () => {
      doc.font('Helvetica').fontSize(7);
      doc.text('-'.repeat(35), M, y, { width: cw, align: 'center' });
      y += 8;
    };

    // Helper fila izquierda-derecha con espacio cómodo
    const filaLR = (izq, der, fontSize, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
      const halfW = cw / 2;
      doc.text(izq, M, y, { width: halfW, align: 'left' });
      doc.text(der, M + halfW, y, { width: halfW, align: 'right' });
      y += fontSize + 4;
    };

    // ============ ENCABEZADO EMPRESA ============
    centrado(data.empresa_nombre || 'EMPRESA', 16, true);
    y += 2;

    if (data.empresa_rnc) izquierda(`RNC: ${data.empresa_rnc}`, 8);
    if (data.empresa_telefono) izquierda(`Tel: ${data.empresa_telefono}`, 8);
    if (data.empresa_direccion) izquierda(data.empresa_direccion, 8);

    y += 4;
    lineaGuiones();

    // ============ TIPO DE DOCUMENTO ============
    centrado(tituloDocumento, esElectronica ? 8 : 10, true);
    y += 2;

    // ============ INFO DE FACTURA ============
    if (data.ncf) {
      const labelNCF = esElectronica ? 'NCF' : 'NCF';
      izquierda(`${labelNCF}: ${data.ncf}`, 8, true);
    }

    const fecha = new Date(data.creado_en).toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo' });
    izquierda(`Fecha: ${fecha}`, 8);

    if (data.vendedor_nombre) {
      izquierda(`Vendedor: ${data.vendedor_nombre}`, 8);
    }

    y += 4;
    lineaGuiones();

    // ============ INFO CLIENTE ============
    izquierda(`Cliente: ${data.cliente_nombre || 'Consumidor Final'}`, 8, true);

    if (data.rnc_cedula) {
      izquierda(`RNC/Ced: ${data.rnc_cedula}`, 8);
    }
    if (data.cliente_telefono) {
      izquierda(`Tel: ${data.cliente_telefono}`, 8);
    }

    y += 4;
    lineaGuiones();

    // ============ ENCABEZADO TABLA ============
    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('DESCRIPCION', M, y, { width: cw / 2, align: 'left' });
    doc.text('VALOR', M + cw / 2, y, { width: cw / 2, align: 'right' });
    y += 11;

    lineaGuiones();

    // ============ ITEMS ============
    items.rows.forEach(it => {
      const cant = parseFloat(it.cantidad);
      const precio = parseFloat(it.precio_unitario);
      const subtotalItem = cant * precio;

      // Linea 1: Descripcion completa
      doc.font('Helvetica').fontSize(8);
      doc.text(it.descripcion, M, y, { width: cw });
      y += 11;

      // Linea 2: Cantidad x precio = total
      filaLR(
        `${cant.toFixed(2)} x ${precio.toLocaleString('es-DO', {minimumFractionDigits: 2})}`,
        subtotalItem.toLocaleString('es-DO', {minimumFractionDigits: 2}),
        8
      );
      y += 2;
    });

    y += 2;
    lineaGuiones();

    // ============ TOTALES ============
    filaLR('SUBTOTAL', parseFloat(data.subtotal).toLocaleString('es-DO', {minimumFractionDigits: 2}), 9);
    filaLR('ITBIS', parseFloat(data.itbis).toLocaleString('es-DO', {minimumFractionDigits: 2}), 9);

    y += 3;

    // TOTAL en grande y destacado
    filaLR('TOTAL A PAGAR', parseFloat(data.total).toLocaleString('es-DO', {minimumFractionDigits: 2}), 11, true);

    y += 5;
    lineaGuiones();

    // ============ NUMERO DE FACTURA CONSECUTIVO ============
    if (data.numero_factura) {
      y += 2;
      const numeroFormateado = String(data.numero_factura).padStart(8, '0');
      izquierda(`Factura No.: ${numeroFormateado}`, 9, true);
      y += 3;
      lineaGuiones();
    }

    // ============ BLOQUE e-CF (Solo facturas electronicas DGII) ============
    if (esElectronica) {
      y += 4;

      // Generar QR con datos DGII
      const qrData = `https://ecf.dgii.gov.do/ecf/ConsultaTimbre?RncEmisor=${data.empresa_rnc || ''}&ENCF=${data.ncf || ''}&MontoTotal=${parseFloat(data.total).toFixed(2)}&FechaEmision=${data.fecha_emision ? new Date(data.fecha_emision).toISOString().split('T')[0] : ''}&CodigoSeguridad=${data.codigo_seguridad || ''}`;

      try {
        const qrPng = await QRCode.toBuffer(qrData, { width: 200, margin: 1 });

        // QR centrado
        const qrSize = 100;
        const qrX = (W - qrSize) / 2;
        doc.image(qrPng, qrX, y, { width: qrSize, height: qrSize });
        y += qrSize + 6;

        // Datos DGII
        if (data.codigo_seguridad) {
          centrado(`Codigo de seguridad: ${data.codigo_seguridad}`, 7);
        }
        if (data.fecha_firma_digital) {
          const fechaFirma = new Date(data.fecha_firma_digital).toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo' });
          centrado(`Fecha de firma digital: ${fechaFirma}`, 7);
        }
      } catch (qrError) {
        console.error('Error QR:', qrError.message);
      }

      y += 4;
    }

    // ============ CODIGO DE BARRAS DEL NCF ============
    if (data.ncf) {
      try {
        const barcodePng = await bwipjs.toBuffer({
          bcid: 'code128',
          text: data.ncf,
          scale: 2,
          height: 10,
          includetext: false,
          textxalign: 'center'
        });

        // Codigo de barras centrado
        const bcWidth = cw;
        doc.image(barcodePng, M, y, { width: bcWidth, height: 30 });
        y += 32;

        // NCF en texto debajo del codigo
        centrado(data.ncf, 7);
        y += 3;
      } catch (bcError) {
        console.error('Error codigo barras:', bcError.message);
      }
    }

    y += 4;
    lineaGuiones();

    // ============ FOOTER ============
    y += 2;
    centrado('GRACIAS POR SU COMPRA', 9, true);
    y += 2;
    centrado('Este documento es valido como', 7);
    centrado('comprobante fiscal', 7);
    y += 3;
    centrado(`Impreso: ${new Date().toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo' })}`, 6);

    doc.end();
  } catch (error) {
    console.error('Error generando PDF POS:', error);
    res.status(500).json({ success: false, mensaje: error.message });
  }
});


// GET - Generar PDF de factura
router.get('/:id/pdf', verifyToken, tenantGuard, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;

    const invoice = await pool.query(
      `SELECT i.*, c.nombre as cliente_nombre, c.rnc_cedula, c.telefono as cliente_telefono,
              c.direccion as cliente_direccion, c.condiciones as cliente_condiciones,
              c.email as cliente_negocio,
              t.nombre as empresa_nombre, t.rnc as empresa_rnc, t.email as empresa_email,
              v.nombre as vendedor_nombre
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       JOIN tenants t ON i.tenant_id = t.id
       LEFT JOIN vendedores v ON c.vendedor_id = v.id
       WHERE i.id = $1 AND i.tenant_id = $2`,
      [id, tenant_id]
    );
    if (!invoice.rows[0]) return res.status(404).json({ success: false, mensaje: 'Factura no encontrada' });

    const items = await pool.query(`SELECT * FROM invoice_items WHERE invoice_id = $1`, [id]);
    const data = invoice.rows[0];

    const PDFDocument = require('pdfkit');
// Media carta: 5.5 x 8.5 pulgadas = 396 x 612 puntos
    const doc = new PDFDocument({ margin: 30, size: [396, 612] });

    // Detectar si es e-CF (Factura Electronica DGII)
    const esElectronica = ['E31', 'E32', 'E34'].includes(data.ncf_tipo);
    const tituloDocumento = {
      'E31': 'FACTURA CREDITO FISCAL ELECTRONICA',
      'E32': 'FACTURA CONSUMO ELECTRONICA',
      'E34': 'NOTA DE CREDITO ELECTRONICA'
    }[data.ncf_tipo] || 'FACTURA';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=factura-${data.ncf || data.id}.pdf`);
    doc.pipe(res);

    const W = 396;
    const M = 30;
    const col = W - M * 2;
    const azul = '#1E40AF';
    const gris = '#F1F5F9';
    const negro = '#1E293B';

    // === ENCABEZADO AZUL ===
    doc.rect(0, 0, W, 80).fill(azul);
    doc.fillColor('white').fontSize(15).font('Helvetica-Bold')
       .text(data.empresa_nombre || 'Mi Empresa', M, 15, { width: col });
    doc.fontSize(8).font('Helvetica')
       .text(`RNC: ${data.empresa_rnc || 'N/A'}`, M, 35, { width: col });
    doc.fontSize(8).text(data.empresa_email || '', M, 47, { width: col });

    // Número de factura (derecha)
    doc.fontSize(esElectronica ? 7 : 9).font('Helvetica-Bold').text(tituloDocumento, M, 15, { width: col, align: 'right' });
    doc.fontSize(8).font('Helvetica').text(`NCF: ${data.ncf || 'N/A'}`, M, 28, { width: col, align: 'right' });
    doc.fontSize(7).text(`Estado: ${data.estado.toUpperCase()}`, M, 40, { width: col, align: 'right' });
    doc.fontSize(7).text(`Fecha: ${data.fecha_emision ? new Date(data.fecha_emision).toLocaleDateString('es-DO') : new Date().toLocaleDateString('es-DO')}`, M, 52, { width: col, align: 'right' });
    if (data.numero_factura) {
      doc.fontSize(7).font('Helvetica-Bold').text(`Factura No.: ${String(data.numero_factura).padStart(8, '0')}`, M, 64, { width: col, align: 'right' });
    }

    let y = 90;

    // === BLOQUE CLIENTE ===
    doc.rect(M, y, col, 150).fill(gris).stroke('#E2E8F0');
    doc.fillColor(azul).fontSize(11).font('Helvetica-Bold').text('CLIENTE', M + 10, y + 10);
    doc.fillColor(negro).fontSize(11).font('Helvetica-Bold')
       .text(data.cliente_nombre || 'Consumidor Final', M + 10, y + 26, { width: (col / 2) - 15 });
    doc.fontSize(10).font('Helvetica')
       .text(`RNC/Cédula: ${data.rnc_cedula || 'N/A'}`, M + 10, y + 44)
       .text(`Tel: ${data.cliente_telefono || 'N/A'}`, M + 10, y + 60)
       .text(`Dir: ${data.cliente_direccion || 'N/A'}`, M + 10, y + 76, { width: (col / 2) - 15 });

    // Lado derecho del bloque cliente
    const rx = M + col / 2 + 10;
    doc.fillColor(azul).fontSize(11).font('Helvetica-Bold').text('CONDICIONES', rx, y + 10);
    const condMap = { contado: 'Contado', '7_dias': '7 Días', '15_dias': '15 Días', '30_dias': '30 Días', '45_dias': '45 Días', '60_dias': '60 Días' };
    doc.fillColor(negro).fontSize(10).font('Helvetica')
       .text(condMap[data.cliente_condiciones] || 'Contado', rx, y + 26)
       .text(`Vendedor: ${data.vendedor_nombre || 'N/A'}`, rx, y + 44)
       .text(`Negocio: ${data.cliente_negocio || 'N/A'}`, rx, y + 60, { width: col / 2 - 15 });

    y += 160;

    // === TABLA ENCABEZADO ===
    doc.rect(M, y, col, 16).fill(azul);
    doc.fillColor('white').fontSize(6.5).font('Helvetica-Bold');
    doc.text('DESCRIPCIÓN', M + 4, y + 4, { width: 100 });
    doc.text('CANT', M + 108, y + 4, { width: 28, align: 'right' });
    doc.text('P. UNIT', M + 140, y + 4, { width: 48, align: 'right' });
    doc.text('SUBTOTAL', M + 192, y + 4, { width: 48, align: 'right' });
    doc.text('ITBIS', M + 244, y + 4, { width: 38, align: 'right' });
    doc.text('TOTAL', M + 286, y + 4, { width: 46, align: 'right' });
    y += 16;

    // === ITEMS ===
    doc.fontSize(6.5).font('Helvetica');
    let rowColor = true;
    for (const item of items.rows) {
      const rowH = 14;
      if (rowColor) doc.rect(M, y, col, rowH).fill('#F8FAFC');
      rowColor = !rowColor;
      const subtotalLinea = parseFloat(item.cantidad) * parseFloat(item.precio_unitario);
      doc.fillColor(negro)
         .text(item.descripcion, M + 4, y + 3, { width: 100 })
         .text(parseFloat(item.cantidad).toFixed(0), M + 108, y + 3, { width: 28, align: 'right' })
         .text(parseFloat(item.precio_unitario).toLocaleString('es-DO', {minimumFractionDigits: 2}), M + 140, y + 3, { width: 48, align: 'right' })
         .text(subtotalLinea.toLocaleString('es-DO', {minimumFractionDigits: 2}), M + 192, y + 3, { width: 48, align: 'right' })
         .text(parseFloat(item.itbis_monto).toLocaleString('es-DO', {minimumFractionDigits: 2}), M + 244, y + 3, { width: 38, align: 'right' })
         .text(parseFloat(item.total).toLocaleString('es-DO', {minimumFractionDigits: 2}), M + 286, y + 3, { width: 46, align: 'right' });
      doc.moveTo(M, y + rowH).lineTo(M + col, y + rowH).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
      y += rowH;
    }

    y += 8;

    // === TOTALES ===
    const tw = 180;
    const tx = M + col - tw;
    doc.rect(tx, y, tw, 14).fill(gris);
    doc.fillColor(negro).fontSize(7).font('Helvetica')
       .text('Subtotal:', tx + 4, y + 3, { width: tw - 60 })
       .text(`RD$${parseFloat(data.subtotal).toLocaleString('es-DO', {minimumFractionDigits: 2})}`, tx, y + 3, { width: tw - 4, align: 'right' });
    y += 14;
    doc.rect(tx, y, tw, 14).fill(gris);
    doc.fillColor(negro).fontSize(7).font('Helvetica')
       .text('ITBIS (18%):', tx + 4, y + 3)
       .text(`RD$${parseFloat(data.itbis).toLocaleString('es-DO', {minimumFractionDigits: 2})}`, tx, y + 3, { width: tw - 4, align: 'right' });
    y += 14;
    doc.rect(tx, y, tw, 18).fill(azul);
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
       .text('TOTAL:', tx + 4, y + 4)
       .text(`RD$${parseFloat(data.total).toLocaleString('es-DO', {minimumFractionDigits: 2})}`, tx, y + 4, { width: tw - 4, align: 'right' });
    y += 26;

    // === BLOQUE e-CF (Solo facturas electronicas DGII) ===
    if (esElectronica) {
      y += 4;

      // Generar QR con datos DGII
      const qrData = `https://ecf.dgii.gov.do/ecf/ConsultaTimbre?RncEmisor=${data.empresa_rnc || ''}&ENCF=${data.ncf || ''}&MontoTotal=${parseFloat(data.total).toFixed(2)}&FechaEmision=${data.fecha_emision ? new Date(data.fecha_emision).toISOString().split('T')[0] : ''}&CodigoSeguridad=${data.codigo_seguridad || ''}`;

      try {
        const qrPng = await QRCode.toBuffer(qrData, { width: 90, margin: 1 });

        // Dibujar QR a la izquierda
        doc.image(qrPng, M, y, { width: 75, height: 75 });

        // Datos DGII a la derecha del QR
        const infoX = M + 85;
        doc.fillColor('#1E40AF').fontSize(7).font('Helvetica-Bold')
           .text('VALIDACION DGII (e-CF)', infoX, y);
        doc.fillColor('#1E293B').fontSize(6).font('Helvetica')
           .text(`NCF: ${data.ncf || '-'}`, infoX, y + 11)
           .text(`Codigo Seguridad: ${data.codigo_seguridad || '-'}`, infoX, y + 21)
           .text(`Fecha Firma: ${data.fecha_firma_digital ? new Date(data.fecha_firma_digital).toLocaleString('es-DO') : '-'}`, infoX, y + 31)
           .text(`Vence eNCF: ${data.fecha_vencimiento_encf ? new Date(data.fecha_vencimiento_encf).toLocaleDateString('es-DO') : '-'}`, infoX, y + 41)
           .text('Escanee el QR para validar en DGII', infoX, y + 55, { width: col - 90 });

        y += 80;
      } catch (qrError) {
        // Si falla el QR, continuar sin el
        doc.fillColor('#EF4444').fontSize(6).text('Error generando QR', M, y);
        y += 10;
      }

      // Leyenda DGII obligatoria
      doc.fillColor('#475569').fontSize(6).font('Helvetica-Oblique')
         .text('Representacion Impresa del e-CF (Comprobante Fiscal Electronico)', M, y, { width: col, align: 'center' });
      y += 8;
    }

    // === FOOTER ===
    doc.moveTo(M, y).lineTo(M + col, y).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
    y += 6;
    doc.fillColor('#94A3B8').fontSize(6).font('Helvetica')
       .text('Gracias por su preferencia', M, y, { width: col, align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});


// GET - Generar PDF de factura formato CARTA ENTERA (8.5 x 11) - DISEÑO PROFESIONAL MODERNO
router.get('/:id/pdf-carta', verifyToken, tenantGuard, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;

    const invoice = await pool.query(
      `SELECT i.*, c.nombre as cliente_nombre, c.rnc_cedula, c.telefono as cliente_telefono,
              c.direccion as cliente_direccion, c.condiciones as cliente_condiciones,
              c.email as cliente_negocio,
              t.nombre as empresa_nombre, t.rnc as empresa_rnc, t.email as empresa_email,
              v.nombre as vendedor_nombre
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       JOIN tenants t ON i.tenant_id = t.id
       LEFT JOIN vendedores v ON c.vendedor_id = v.id
       WHERE i.id = $1 AND i.tenant_id = $2`,
      [id, tenant_id]
    );
    if (!invoice.rows[0]) return res.status(404).json({ success: false, mensaje: 'Factura no encontrada' });

    const items = await pool.query(`SELECT * FROM invoice_items WHERE invoice_id = $1`, [id]);
    const data = invoice.rows[0];

    const PDFDocument = require('pdfkit');
    // Carta Entera: 8.5 x 11 pulgadas = 612 x 792 puntos
    const doc = new PDFDocument({ margin: 40, size: [612, 792] });

    // Detectar si es e-CF (Factura Electronica DGII)
    const esElectronica = ['E31', 'E32', 'E34'].includes(data.ncf_tipo);
    const tituloDocumento = {
      'E31': 'FACTURA CREDITO FISCAL ELECTRONICA',
      'E32': 'FACTURA CONSUMO ELECTRONICA',
      'E34': 'NOTA DE CREDITO ELECTRONICA'
    }[data.ncf_tipo] || 'FACTURA';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=factura-carta-${data.ncf || data.id}.pdf`);
    doc.pipe(res);

    // === CONFIGURACION DE AREA SEGURA ===
    const W = 612;          // Ancho total: 8.5"
    const H = 792;          // Alto total: 11"
    const M = 40;           // Margen seguro: ~14mm (compatible con cualquier impresora)
    const col = W - M * 2;  // Area utilizable: 532pt
    const tableMaxX = M + col;  // Limite derecho de la tabla: 572pt

    // === PALETA DE COLORES PROFESIONAL ===
    const azulOscuro = '#1E3A8A';   // Azul corporativo
    const azulMedio = '#2563EB';    // Azul medio
    const grisClaro = '#F8FAFC';    // Gris muy claro (filas alternadas)
    const grisFondo = '#F1F5F9';    // Gris fondo (cajas)
    const grisBorde = '#CBD5E1';    // Gris borde
    const negro = '#0F172A';        // Negro suave
    const grisTexto = '#64748B';    // Gris texto secundario

    // === ENCABEZADO PRINCIPAL (BANNER AZUL) ===
    doc.rect(0, 0, W, 100).fill(azulOscuro);

    // Lado izquierdo: Nombre empresa
    doc.fillColor('white').fontSize(24).font('Helvetica-Bold')
       .text(data.empresa_nombre || 'MI EMPRESA', M, 25, { width: col / 2 });
    doc.fontSize(9).font('Helvetica')
       .text(`RNC: ${data.empresa_rnc || 'N/A'}`, M, 56, { width: col / 2 });
    doc.fontSize(9).text(data.empresa_email || '', M, 72, { width: col / 2 });

    // Lado derecho: Tipo documento + datos factura
    const rightX = M + col / 2;
    const rightW = col / 2;
    doc.fillColor('white').fontSize(esElectronica ? 11 : 14).font('Helvetica-Bold')
       .text(tituloDocumento, rightX, 25, { width: rightW, align: 'right' });
    doc.fontSize(10).font('Helvetica')
       .text(`NCF: ${data.ncf || 'N/A'}`, rightX, 48, { width: rightW, align: 'right' });
    doc.fontSize(9).text(`Estado: ${data.estado.toUpperCase()}`, rightX, 64, { width: rightW, align: 'right' });
    doc.fontSize(9).text(`Fecha: ${data.fecha_emision ? new Date(data.fecha_emision).toLocaleDateString('es-DO') : new Date().toLocaleDateString('es-DO')}`, rightX, 78, { width: rightW, align: 'right' });

    // Numero de factura (debajo del encabezado)
    let y = 110;
    if (data.numero_factura) {
      doc.rect(M, y, col, 20).fill(azulMedio);
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
         .text(`FACTURA No.: ${String(data.numero_factura).padStart(8, '0')}`, M + 10, y + 6, { width: col - 20, align: 'right' });
      y += 28;
    } else {
      y = 118;
    }

    // === BLOQUES CLIENTE Y CONDICIONES (LADO A LADO) ===
    const blockH = 110;
    const blockW = (col - 10) / 2;
    const block1X = M;
    const block2X = M + blockW + 10;

    // Bloque CLIENTE
    doc.rect(block1X, y, blockW, blockH).fill(grisFondo).stroke(grisBorde);
    doc.rect(block1X, y, blockW, 22).fill(azulOscuro);
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
       .text('CLIENTE', block1X + 10, y + 7);

    doc.fillColor(negro).fontSize(11).font('Helvetica-Bold')
       .text(data.cliente_nombre || 'Consumidor Final', block1X + 10, y + 30, { width: blockW - 20 });
    doc.fontSize(9).font('Helvetica').fillColor(grisTexto)
       .text('RNC/Cedula:', block1X + 10, y + 50);
    doc.fillColor(negro)
       .text(data.rnc_cedula || 'N/A', block1X + 75, y + 50);
    doc.fillColor(grisTexto)
       .text('Telefono:', block1X + 10, y + 65);
    doc.fillColor(negro)
       .text(data.cliente_telefono || 'N/A', block1X + 75, y + 65);
    doc.fillColor(grisTexto)
       .text('Direccion:', block1X + 10, y + 80);
    doc.fillColor(negro)
       .text(data.cliente_direccion || 'N/A', block1X + 75, y + 80, { width: blockW - 85 });

    // Bloque CONDICIONES
    doc.rect(block2X, y, blockW, blockH).fill(grisFondo).stroke(grisBorde);
    doc.rect(block2X, y, blockW, 22).fill(azulOscuro);
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
       .text('CONDICIONES DE PAGO', block2X + 10, y + 7);

    const condMap = { contado: 'Contado', '7_dias': '7 Dias', '15_dias': '15 Dias', '30_dias': '30 Dias', '45_dias': '45 Dias', '60_dias': '60 Dias' };
    doc.fillColor(negro).fontSize(11).font('Helvetica-Bold')
       .text(condMap[data.cliente_condiciones] || 'Contado', block2X + 10, y + 30);
    doc.fontSize(9).font('Helvetica').fillColor(grisTexto)
       .text('Vendedor:', block2X + 10, y + 50);
    doc.fillColor(negro)
       .text(data.vendedor_nombre || 'N/A', block2X + 75, y + 50, { width: blockW - 85 });
    doc.fillColor(grisTexto)
       .text('Negocio:', block2X + 10, y + 65);
    doc.fillColor(negro)
       .text(data.cliente_negocio || 'N/A', block2X + 75, y + 65, { width: blockW - 85 });

    y += blockH + 20;

    // === TABLA DE PRODUCTOS ===
    // Distribucion matematica precisa para ancho seguro de 532pt
    // DESCRIPCION (220) + CANT (40) + P.UNIT (60) + SUBTOTAL (60) + ITBIS (50) + TOTAL (60) + spacing = 532
    const colDescX = M + 8;          // 48
    const colDescW = 200;
    const colCantX = M + 220;        // 260
    const colCantW = 40;
    const colPUnitX = M + 264;       // 304
    const colPUnitW = 60;
    const colSubX = M + 328;         // 368
    const colSubW = 60;
    const colItbisX = M + 392;       // 432
    const colItbisW = 50;
    const colTotalX = M + 446;       // 486
    const colTotalW = 80;            // 486 + 80 = 566 (margen seguro: 6pt)

    // Encabezado de tabla
    doc.rect(M, y, col, 24).fill(azulOscuro);
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
    doc.text('DESCRIPCION', colDescX, y + 8, { width: colDescW });
    doc.text('CANT', colCantX, y + 8, { width: colCantW, align: 'right' });
    doc.text('P. UNIT', colPUnitX, y + 8, { width: colPUnitW, align: 'right' });
    doc.text('SUBTOTAL', colSubX, y + 8, { width: colSubW, align: 'right' });
    doc.text('ITBIS', colItbisX, y + 8, { width: colItbisW, align: 'right' });
    doc.text('TOTAL', colTotalX, y + 8, { width: colTotalW, align: 'right' });
    y += 24;

    // Filas de items
    doc.fontSize(9).font('Helvetica');
    let rowColor = true;
    for (const item of items.rows) {
      const rowH = 22;
      if (rowColor) doc.rect(M, y, col, rowH).fill(grisClaro);
      rowColor = !rowColor;
      const subtotalLinea = parseFloat(item.cantidad) * parseFloat(item.precio_unitario);
      doc.fillColor(negro)
         .text(item.descripcion, colDescX, y + 7, { width: colDescW })
         .text(parseFloat(item.cantidad).toFixed(0), colCantX, y + 7, { width: colCantW, align: 'right' })
         .text(parseFloat(item.precio_unitario).toLocaleString('es-DO', {minimumFractionDigits: 2}), colPUnitX, y + 7, { width: colPUnitW, align: 'right' })
         .text(subtotalLinea.toLocaleString('es-DO', {minimumFractionDigits: 2}), colSubX, y + 7, { width: colSubW, align: 'right' })
         .text(parseFloat(item.itbis_monto).toLocaleString('es-DO', {minimumFractionDigits: 2}), colItbisX, y + 7, { width: colItbisW, align: 'right' })
         .text(parseFloat(item.total).toLocaleString('es-DO', {minimumFractionDigits: 2}), colTotalX, y + 7, { width: colTotalW, align: 'right' });
      doc.moveTo(M, y + rowH).lineTo(M + col, y + rowH).strokeColor(grisBorde).lineWidth(0.5).stroke();
      y += rowH;
    }

    // Borde inferior de la tabla
    doc.rect(M, y, col, 1).fill(azulOscuro);
    y += 15;

    // === BLOQUE DE TOTALES (DERECHA) ===
    const tw = 240;
    const tx = M + col - tw;

    // Subtotal
    doc.rect(tx, y, tw, 22).fill(grisFondo).stroke(grisBorde);
    doc.fillColor(negro).fontSize(10).font('Helvetica')
       .text('Subtotal:', tx + 12, y + 7);
    doc.font('Helvetica-Bold')
       .text(`RD$ ${parseFloat(data.subtotal).toLocaleString('es-DO', {minimumFractionDigits: 2})}`, tx, y + 7, { width: tw - 12, align: 'right' });
    y += 22;

    // ITBIS
    doc.rect(tx, y, tw, 22).fill(grisFondo).stroke(grisBorde);
    doc.fillColor(negro).fontSize(10).font('Helvetica')
       .text('ITBIS (18%):', tx + 12, y + 7);
    doc.font('Helvetica-Bold')
       .text(`RD$ ${parseFloat(data.itbis).toLocaleString('es-DO', {minimumFractionDigits: 2})}`, tx, y + 7, { width: tw - 12, align: 'right' });
    y += 22;

    // TOTAL (destacado)
    doc.rect(tx, y, tw, 32).fill(azulOscuro);
    doc.fillColor('white').fontSize(14).font('Helvetica-Bold')
       .text('TOTAL:', tx + 12, y + 9);
    doc.fontSize(15)
       .text(`RD$ ${parseFloat(data.total).toLocaleString('es-DO', {minimumFractionDigits: 2})}`, tx, y + 8, { width: tw - 12, align: 'right' });
    y += 42;

    // === BLOQUE e-CF (Solo facturas electronicas DGII) ===
    if (esElectronica) {
      y += 8;

      const qrData = `https://ecf.dgii.gov.do/ecf/ConsultaTimbre?RncEmisor=${data.empresa_rnc || ''}&ENCF=${data.ncf || ''}&MontoTotal=${parseFloat(data.total).toFixed(2)}&FechaEmision=${data.fecha_emision ? new Date(data.fecha_emision).toISOString().split('T')[0] : ''}&CodigoSeguridad=${data.codigo_seguridad || ''}`;

      try {
        const qrPng = await QRCode.toBuffer(qrData, { width: 130, margin: 1 });

        // Caja del bloque e-CF
        doc.rect(M, y, col, 130).fill(grisFondo).stroke(grisBorde);

        // QR a la izquierda
        doc.image(qrPng, M + 10, y + 10, { width: 110, height: 110 });

        // Datos DGII a la derecha del QR
        const infoX = M + 135;
        doc.fillColor(azulOscuro).fontSize(11).font('Helvetica-Bold')
           .text('VALIDACION DGII (e-CF)', infoX, y + 12);
        doc.fillColor(negro).fontSize(9).font('Helvetica')
           .text(`eNCF: ${data.ncf || '-'}`, infoX, y + 32)
           .text(`Codigo Seguridad: ${data.codigo_seguridad || '-'}`, infoX, y + 48)
           .text(`Fecha Firma: ${data.fecha_firma_digital ? new Date(data.fecha_firma_digital).toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo' }) : '-'}`, infoX, y + 64)
           .text(`Vence eNCF: ${data.fecha_vencimiento_encf ? new Date(data.fecha_vencimiento_encf).toLocaleDateString('es-DO') : '-'}`, infoX, y + 80);
        doc.fillColor(grisTexto).fontSize(8).font('Helvetica-Oblique')
           .text('Escanee el QR para validar en DGII', infoX, y + 105, { width: col - 145 });

        y += 140;
      } catch (qrError) {
        doc.fillColor('#EF4444').fontSize(9).text('Error generando QR', M, y);
        y += 14;
      }

      // Leyenda DGII obligatoria
      doc.fillColor(grisTexto).fontSize(9).font('Helvetica-Oblique')
         .text('Representacion Impresa del e-CF (Comprobante Fiscal Electronico)', M, y, { width: col, align: 'center' });
      y += 16;
    }

    // === FOOTER ===
    // Linea separadora
    doc.moveTo(M, y).lineTo(M + col, y).strokeColor(grisBorde).lineWidth(0.5).stroke();
    y += 12;

    // Mensaje de gracias
    doc.fillColor(azulOscuro).fontSize(11).font('Helvetica-Bold')
       .text('Gracias por su preferencia', M, y, { width: col, align: 'center' });
    y += 16;

    // Texto secundario
    doc.fillColor(grisTexto).fontSize(8).font('Helvetica')
       .text('Este documento es valido como comprobante fiscal', M, y, { width: col, align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

module.exports = router;