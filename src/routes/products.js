const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// GET - Listar todos los productos
router.get('/', verifyToken, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const result = await pool.query(
      `SELECT * FROM products WHERE tenant_id = $1 AND status = 'activo' ORDER BY name`,
      [tenant_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

// GET - Obtener un producto
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM products WHERE id = $1 AND tenant_id = $2`,
      [id, tenant_id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, mensaje: 'Producto no encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

// POST - Crear producto
router.post('/', verifyToken, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { name, description, price, itbis_rate, unit } = req.body;
    if (!name) return res.status(400).json({ success: false, mensaje: 'El nombre es requerido' });
    if (!price) return res.status(400).json({ success: false, mensaje: 'El precio es requerido' });
    const result = await pool.query(
      `INSERT INTO products (tenant_id, name, description, price, itbis_rate, unit)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenant_id, name, description, price, itbis_rate || 18.00, unit || 'unidad']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

// PUT - Actualizar producto
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;
    const { name, description, price, itbis_rate, unit } = req.body;
    const result = await pool.query(
      `UPDATE products SET name=$1, description=$2, price=$3, itbis_rate=$4, unit=$5, updated_at=NOW()
       WHERE id=$6 AND tenant_id=$7 RETURNING *`,
      [name, description, price, itbis_rate, unit, id, tenant_id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, mensaje: 'Producto no encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

// DELETE - Eliminar producto (soft delete)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;
    await pool.query(
      `UPDATE products SET status='inactivo', updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
      [id, tenant_id]
    );
    res.json({ success: true, mensaje: 'Producto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

module.exports = router;