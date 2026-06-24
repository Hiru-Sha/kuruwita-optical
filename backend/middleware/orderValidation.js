// ============================================================
//  Order Validation Middleware
//  Fixed: was written but never imported anywhere — now usable
//  Usage: router.post('/', auth, orderValidation, validate, handler)
// ============================================================
const { body, validationResult } = require('express-validator');

// Run this after orderValidation to return errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

const orderValidation = [
  body('customer_id')
    .isInt({ min: 1 })
    .withMessage('A valid customer is required'),
  body('total_amount')
    .isNumeric()
    .withMessage('Total amount must be a number'),
  body('advance_amount')
    .isNumeric()
    .withMessage('Advance amount must be a number'),
  body('deliver_date')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Deliver date must be a valid date (YYYY-MM-DD)'),
];

module.exports = { orderValidation, validate };