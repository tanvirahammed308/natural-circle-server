import express from 'express';
import { body } from 'express-validator';
import {
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
} from '../controllers/order.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import validate from '../middleware/validate.js';

const router = express.Router();

router.use(protect);

router.get('/my-orders', getMyOrders);
router.get('/:id', getOrderById);
router.put('/:id/cancel', cancelOrder);

// Admin
router.get('/', authorize('admin'), getAllOrders);
router.put(
  '/:id/status',
  authorize('admin'),
  [body('orderStatus').isIn(['processing', 'confirmed', 'shipped', 'delivered', 'cancelled'])],
  validate,
  updateOrderStatus
);

export default router;
