const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// GET - Listar todos los clientes
router.get('/', verifyToken, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const result = await pool.query(
      `SELECT * FROM customers WHERE tenant_id = $1 AND status = 'activo' ORDER BY name`,
      [tenant_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

// GET - Obtener un cliente
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM customers WHERE id = $1 AND tenant_id = $2`,
      [id, tenant_id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, mensaje: 'Cliente no encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

// POST - Crear cliente
router.post('/', verifyToken, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { name, rnc_cedula, email, phone, address, type } = req.body;
    if (!name) return res.status(400).json({ success: false, mensaje: 'El nombre es requerido' });
    const result = await pool.query(
      `INSERT INTO customers (tenant_id, name, rnc_cedula, email, phone, address, type)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [tenant_id, name, rnc_cedula, email, phone, address, type || 'consumidor_final']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

// PUT - Actualizar cliente
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;
    const { name, rnc_cedula, email, phone, address, type } = req.body;
    const result = await pool.query(
      `UPDATE customers SET name=$1, rnc_cedula=$2, email=$3, phone=$4, address=$5, type=$6, updated_at=NOW()
       WHERE id=$7 AND tenant_id=$8 RETURNING *`,
      [name, rnc_cedula, email, phone, address, type, id, tenant_id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, mensaje: 'Cliente no encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

// DELETE - Eliminar cliente (soft delete)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;
    await pool.query(
      `UPDATE customers SET status='inactivo', updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
      [id, tenant_id]
    );
    res.json({ success: true, mensaje: 'Cliente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

module.exports = router;