import express from 'express';
import { body } from 'express-validator';
import { createPaymentIntent } from '../controllers/payment.controller.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';

const router = express.Router();

router.post(
  '/create-intent',
  protect,
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.productId').isMongoId().withMessage('Invalid product id'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('shippingAddress.street').trim().notEmpty(),
    body('shippingAddress.city').trim().notEmpty(),
    body('shippingAddress.postalCode').trim().notEmpty(),
    body('shippingAddress.country').trim().notEmpty(),
    body('shippingAddress.phone').trim().notEmpty(),
  ],
  validate,
  createPaymentIntent
);

// NOTE: the actual /webhook route is mounted in app.js BEFORE express.json()
// because Stripe requires the raw request body to verify signatures.

export default router;
