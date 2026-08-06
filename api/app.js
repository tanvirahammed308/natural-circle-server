import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import connectDB from '../config/db.js';
import { notFound, errorHandler } from '../middleware/errorHandler.js';
import { handleStripeWebhook } from '../controllers/payment.controller.js';

import productRoutes from '../routes/product.routes.js';
import categoryRoutes from '../routes/category.routes.js';
import userRoutes from '../routes/user.routes.js';
import orderRoutes from '../routes/order.routes.js';
import reviewRoutes from '../routes/review.routes.js';
import paymentRoutes from '../routes/payment.routes.js';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  })
);
app.use(helmet());
app.use(compression());
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Stripe webhook needs the raw body for signature verification, so it must be
// registered BEFORE express.json() and must not go through JSON parsing.
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure a DB connection exists before handling any request (cached across
// invocations in the serverless environment, see config/db.js)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Organic Food API is running' });
});

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
