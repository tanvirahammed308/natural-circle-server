import express from 'express';
import { body } from 'express-validator';
import {
  getMe,
  updateMe,
  addAddress,
  updateAddress,
  deleteAddress,
  getUsers,
  setUserRole,
  toggleBlockUser,
} from '../controllers/user.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import validate from '../middleware/validate.js';

const router = express.Router();

router.use(protect);

router.get('/me', getMe);
router.put('/me', updateMe);

const addressValidation = [
  body('street').trim().notEmpty().withMessage('Street is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('postalCode').trim().notEmpty().withMessage('Postal code is required'),
  body('country').trim().notEmpty().withMessage('Country is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
];

router.post('/me/addresses', addressValidation, validate, addAddress);
router.put('/me/addresses/:addressId', updateAddress);
router.delete('/me/addresses/:addressId', deleteAddress);

// Admin
router.get('/', authorize('admin'), getUsers);
router.put(
  '/:id/role',
  authorize('admin'),
  [body('role').isIn(['customer', 'admin'])],
  validate,
  setUserRole
);
router.put('/:id/block', authorize('admin'), toggleBlockUser);

export default router;
