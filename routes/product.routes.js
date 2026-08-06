import express from 'express';
import { body } from 'express-validator';
import {
  getProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProductImage,
  deleteProduct,
} from '../controllers/product.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import validate from '../middleware/validate.js';

const router = express.Router();

const productValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('unit')
    .isIn(['kg', 'g', 'lb', 'piece', 'dozen', 'liter', 'ml', 'pack'])
    .withMessage('Invalid unit'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('category').isMongoId().withMessage('Valid category id required'),
];

router.get('/', getProducts);
router.get('/:slug', getProductBySlug);

router.post(
  '/',
  protect,
  authorize('admin'),
  upload.array('images', 6),
  productValidation,
  validate,
  createProduct
);

router.put('/:id', protect, authorize('admin'), upload.array('images', 6), updateProduct);
router.delete('/:id/image', protect, authorize('admin'), deleteProductImage);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

export default router;
