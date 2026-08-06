import Review from '../models/Review.js';
import Product from '../models/Product.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

const recalculateRatings = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: productId } },
    { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  await Product.findByIdAndUpdate(productId, {
    ratingsAverage: stats[0]?.avgRating || 0,
    ratingsCount: stats[0]?.count || 0,
  });
};

export const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId })
    .populate('user', 'name avatar')
    .sort('-createdAt');
  res.json({ success: true, data: reviews });
});

export const createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, comment } = req.body;

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');

  const existing = await Review.findOne({ product: productId, user: req.user._id });
  if (existing) throw new ApiError(409, 'You have already reviewed this product');

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    rating,
    comment,
  });

  await recalculateRatings(product._id);

  res.status(201).json({ success: true, data: review });
});

export const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');
  if (String(review.user) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only edit your own review');
  }

  if (req.body.rating !== undefined) review.rating = req.body.rating;
  if (req.body.comment !== undefined) review.comment = req.body.comment;
  await review.save();

  await recalculateRatings(review.product);

  res.json({ success: true, data: review });
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');

  const isOwner = String(review.user) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw new ApiError(403, 'You can only delete your own review');
  }

  const productId = review.product;
  await review.deleteOne();
  await recalculateRatings(productId);

  res.json({ success: true, message: 'Review deleted' });
});
