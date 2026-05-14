require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const app     = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '25mb' }));
app.use('/api/auth',               require('./routes/auth'));
app.use('/api/orders',             require('./routes/orders'));
app.use('/api/customers',          require('./routes/customers'));
app.use('/api/inventory',          require('./routes/inventory'));
app.use('/api/dealers',            require('./routes/dealers'));
app.use('/api/reports',            require('./routes/reports'));
app.use('/api/lens-prices',        require('./routes/lensPrices'));
app.use('/api/quick-sales',        require('./routes/quickSales'));
app.use('/api/expenses',           require('./routes/expenses'));
app.use('/api/cash-deposits',      require('./routes/cashDeposits'));
app.use('/api/stock-adjustments',  require('./routes/stockAdjustments'));
app.use('/api/kalutota',           require('./routes/kalutota'));         // ← Kalutota trade account
app.use('/api/dealer-purchases',   require('./routes/dealerPurchases'));
app.use('/api/repairs',            require('./routes/repairs'));
app.use('/api/dashboard-today',    require('./routes/dashboardToday'));  // ← fast single-request dashboard
app.use('/api/full-report',         require('./routes/fullReport'));        // ← NEW            // ← NEW
app.get('/api/health', (req,res)=>res.json({ status:'ok', time:new Date() }));
const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>console.log(`✅ Kuruwita Optical on port ${PORT}`));
