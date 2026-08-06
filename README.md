# Organic Food — Backend API

Express (JavaScript, no TypeScript) backend for an organic food e‑commerce site.

- **Auth**: Firebase Authentication (client signs in with Firebase; this API verifies the ID token)
- **Database**: MongoDB + Mongoose
- **Images**: Cloudinary
- **Payments**: Stripe (PaymentIntents + webhook)
- **Deployment**: Vercel serverless functions

## 1. Project structure

```
organic-food-backend/
├── api/
│   ├── app.js          # Express app: middleware + routes
│   └── index.js         # Vercel entry point / local server bootstrap
├── config/               # db, firebase, cloudinary, stripe setup
├── controllers/          # route handler logic
├── middleware/            # auth, error handling, validation, upload
├── models/                # Mongoose schemas
├── routes/                # Express routers
├── utils/                 # asyncHandler, ApiError, seed script
├── vercel.json
├── package.json
└── .env.example
```

## 2. Install

```bash
npm install
cp .env.example .env
# fill in .env with your real credentials
npm run dev
```

Server runs at `http://localhost:5000`, health check at `GET /api/health`.

## 3. Environment variables

See `.env.example`. Key ones:

- `MONGODB_URI` — MongoDB Atlas connection string
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — from your Firebase service account JSON (Project Settings → Service Accounts → Generate new private key). Keep the `\n` escapes in `FIREBASE_PRIVATE_KEY` when pasting into `.env`.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — from your Cloudinary dashboard
- `STRIPE_SECRET_KEY` — from Stripe Dashboard → Developers → API keys
- `STRIPE_WEBHOOK_SECRET` — created when you register the webhook endpoint (see below)

## 4. How authentication works

The frontend authenticates the user with the **Firebase client SDK** (email/password, Google, etc.) and gets an ID token:

```js
const idToken = await firebaseUser.getIdToken();
```

Send it on every protected request:

```
Authorization: Bearer <idToken>
```

The `protect` middleware (`middleware/auth.js`) verifies the token with `firebase-admin`, then finds or auto-creates a matching `User` document in MongoDB (keyed by `firebaseUid`). The first user you want as an admin, promote manually in the database or via the `/api/users/:id/role` admin route once one admin exists.

## 5. API overview

| Resource | Endpoints |
|---|---|
| Products | `GET /api/products`, `GET /api/products/:slug`, `POST/PUT/DELETE /api/products/:id` (admin) |
| Categories | `GET /api/categories`, `GET /api/categories/:slug`, `POST/PUT/DELETE` (admin) |
| Users | `GET/PUT /api/users/me`, address sub-routes, admin listing/role/block |
| Orders | `GET /api/orders/my-orders`, `GET /api/orders/:id`, admin listing/status update |
| Reviews | `GET/POST /api/reviews/product/:productId`, `PUT/DELETE /api/reviews/:id` |
| Payments | `POST /api/payments/create-intent`, `POST /api/payments/webhook` |

Product/category image uploads use `multipart/form-data` with field name `images` (products, up to 6) or `image` (categories), handled in-memory by Multer and streamed straight to Cloudinary — nothing is written to disk, which is required for Vercel's read-only filesystem.

## 6. Payment flow (Stripe)

1. Client calls `POST /api/payments/create-intent` with cart items + shipping address (must be authenticated).
2. Server validates stock/prices server-side, creates a pending `Order`, and returns a Stripe `clientSecret`.
3. Client confirms the payment with Stripe.js/Elements using that `clientSecret`.
4. Stripe calls `POST /api/payments/webhook` on success/failure; the server marks the order paid and decrements stock there — **not** from the client — so payment confirmation can't be spoofed.

## 7. Deploying to Vercel

```bash
npm i -g vercel
vercel login
vercel
```

Then in the Vercel project dashboard, add all variables from `.env.example` under **Settings → Environment Variables** (do this for Production, Preview, and Development as needed). Redeploy after adding them.

After the first deploy, register the Stripe webhook against your live URL:

```
https://your-project.vercel.app/api/payments/webhook
```

Stripe Dashboard → Developers → Webhooks → Add endpoint, subscribe to `payment_intent.succeeded` and `payment_intent.payment_failed`, then copy the generated signing secret into `STRIPE_WEBHOOK_SECRET` on Vercel.

**Note on serverless MongoDB connections**: `config/db.js` caches the Mongoose connection on the global object so warm Lambda invocations reuse it instead of reconnecting on every request — this is required for acceptable performance/costs on Vercel.

## 8. Seeding sample categories

```bash
npm run seed
```

## 9. Notes / things you'll likely want to add next

- Rate limiting is applied globally to `/api`; tighten further on auth-sensitive routes if needed.
- Add pagination/cursor support to reviews if a product gets a lot of them.
- Consider adding a `Coupon`/`Discount` model if you want promo codes at checkout.
- CORS currently allows a single `CLIENT_URL` origin — extend to an array if you have multiple frontends (web + admin panel).
