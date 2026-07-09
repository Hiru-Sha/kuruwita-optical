const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/backup — export ALL data as JSON
router.get('/', auth, async (req, res) => {
  try {
    const [
      customers, orders, repairs, quickSales,
      expenses, inventory, kalutota, deposits,
      stockAdj, refractions
    ] = await Promise.all([
      pool.query(`SELECT * FROM customers ORDER BY id`).catch(()=>({rows:[]})),
      pool.query(`SELECT * FROM orders ORDER BY id`).catch(()=>({rows:[]})),
      pool.query(`SELECT * FROM repairs ORDER BY id`).catch(()=>({rows:[]})),
      pool.query(`SELECT * FROM quick_sales ORDER BY id`).catch(()=>({rows:[]})),
      pool.query(`SELECT * FROM expenses ORDER BY id`).catch(()=>({rows:[]})),
      pool.query(`SELECT id,name,category,brand,dealer,frame_type,frame_color,frame_shape,frame_material,frame_size,sg_type,sell_price,cost_price,buy_price,quantity,min_quantity,display_number,stock_number,location,created_at,updated_at FROM inventory ORDER BY id`).catch(()=>({rows:[]})),
      pool.query(`SELECT * FROM kalutota_transactions ORDER BY id`).catch(()=>({rows:[]})),
      pool.query(`SELECT * FROM cash_deposits ORDER BY id`).catch(()=>({rows:[]})),
      pool.query(`SELECT * FROM stock_adjustments ORDER BY id LIMIT 5000`).catch(()=>({rows:[]})),
      pool.query(`SELECT * FROM refractions ORDER BY id`).catch(()=>({rows:[]})),
    ]);

    res.json({
      exported_at: new Date().toISOString(),
      shop: 'Wickramakalutota Opticals',
      tables: {
        customers:    customers.rows,
        orders:       orders.rows,
        repairs:      repairs.rows,
        quick_sales:  quickSales.rows,
        expenses:     expenses.rows,
        inventory:    inventory.rows,
        kalutota:     kalutota.rows,
        deposits:     deposits.rows,
        stock_history:stockAdj.rows,
        refractions:  refractions.rows,
      },
      counts: {
        customers:   customers.rows.length,
        orders:      orders.rows.length,
        repairs:     repairs.rows.length,
        quick_sales: quickSales.rows.length,
        expenses:    expenses.rows.length,
        inventory:   inventory.rows.length,
      }
    });
  } catch(err) {
    console.error('Backup error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;