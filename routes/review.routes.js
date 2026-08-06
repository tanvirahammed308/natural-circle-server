import express from 'express';
import { body } from 'express-validator';
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
} from '../controllers/review.controller.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';

const router = express.Router();

const reviewValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 1000 }),
];

router.get('/product/:productId', getProductReviews);
router.post('/product/:productId', protect, reviewValidation, validate, createReview);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);

export default router;
