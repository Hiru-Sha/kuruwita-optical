// backend/middleware/orderValidation.js
const { body } = require('express-validator');

module.exports = [
  body('total_amount').isNumeric().withMessage('Total must be a number'),
  body('advance_amount').isNumeric().withMessage('Advance must be a number'),
  body('customer_id').isInt().withMessage('Customer ID missing'),
  // Add more as needed
];