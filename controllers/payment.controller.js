import stripe from '../config/stripe.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

const SHIPPING_FLAT_RATE = 5;
const TAX_RATE = 0.05;

// POST /api/payments/create-intent
// Body: { items: [{ productId, quantity }], shippingAddress }
export const createPaymentIntent = asyncHandler(async (req, res) => {
  const { items, shippingAddress } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'No items provided');
  }

  const productIds = items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });

  let itemsPrice = 0;
  const orderItems = items.map((item) => {
    const product = products.find((p) => String(p._id) === item.productId);
    if (!product) throw new ApiError(404, `Product not found: ${item.productId}`);
    if (product.stock < item.quantity) {
      throw new ApiError(400, `Insufficient stock for ${product.name}`);
    }

    const unitPrice = product.discountPrice > 0 ? product.discountPrice : product.price;
    itemsPrice += unitPrice * item.quantity;

    return {
      product: product._id,
      name: product.name,
      image: product.images[0]?.url || '',
      price: unitPrice,
      quantity: item.quantity,
      unit: product.unit,
    };
  });

  const shippingPrice = itemsPrice > 50 ? 0 : SHIPPING_FLAT_RATE;
  const taxPrice = Number((itemsPrice * TAX_RATE).toFixed(2));
  const totalPrice = Number((itemsPrice + shippingPrice + taxPrice).toFixed(2));

  // Ensure the user has a Stripe customer record for future reuse
  let stripeCustomerId = req.user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: req.user.email,
      name: req.user.name,
      metadata: { userId: String(req.user._id) },
    });
    stripeCustomerId = customer.id;
    req.user.stripeCustomerId = stripeCustomerId;
    await req.user.save();
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(totalPrice * 100),
    currency: 'usd',
    customer: stripeCustomerId,
    automatic_payment_methods: { enabled: true },
    metadata: { userId: String(req.user._id) },
  });

  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
    stripePaymentIntentId: paymentIntent.id,
    paymentStatus: 'pending',
  });

  res.status(201).json({
    success: true,
    data: {
      clientSecret: paymentIntent.client_secret,
      orderId: order._id,
      totalPrice,
    },
  });
});

// POST /api/payments/webhook — raw body required, configured in routes
export const handleStripeWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object;
      const order = await Order.findOne({ stripePaymentIntentId: intent.id });
      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.orderStatus = 'confirmed';
        await order.save();

        // Decrement stock for each purchased item
        await Promise.all(
          order.items.map((item) =>
            Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } })
          )
        );
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const intent = event.data.object;
      await Order.findOneAndUpdate(
        { stripePaymentIntentId: intent.id },
        { paymentStatus: 'failed' }
      );
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
});
