import express from 'express';
import { body } from 'express-validator';
import {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import validate from '../middleware/validate.js';

const router = express.Router();

router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

router.post(
  '/',
  protect,
  authorize('admin'),
  upload.single('image'),
  [body('name').trim().notEmpty().withMessage('Name is required')],
  validate,
  createCategory
);

router.put('/:id', protect, authorize('admin'), upload.single('image'), updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);

export default router;
