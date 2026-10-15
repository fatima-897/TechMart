# Task 4 — Backend (Express + MongoDB + Stripe sandbox)

See the root `../README.md` for the architecture and how everything fits together.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | What to put |
|---|---|
| `MONGO_URI` | local MongoDB, e.g. `mongodb://127.0.0.1:27017/ecommerce_sandbox` |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `STRIPE_SECRET_KEY` | test key from https://dashboard.stripe.com/test/apikeys (`sk_test_...`) |
| `CLIENT_URL`, `CORS_ORIGINS` | where the frontend runs (default `http://localhost:5173`) |

```bash
npm run seed         # demo products (skips if products exist; add -- --reset to wipe first)
npm start            # http://localhost:5001
npm run make-admin -- you@email.com    # promote a registered user to admin
```

## API

### Auth
| Method | Route | Body / notes |
|---|---|---|
| POST | `/auth/register` | `{ name, email, password }` (password ≥ 8 chars) → `{ token, user }` |
| POST | `/auth/login` | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | 🔒 returns the current user (used by the frontend to re-validate its token and refresh the role) |

### Products
| Method | Route | Notes |
|---|---|---|
| GET | `/products` | public |
| GET | `/products/:id` | public |
| POST | `/products` | 🔒 admin — `{ name, category, priceCents, oldPriceCents?, stock, description?, imageUrl? }` |
| PUT | `/products/:id` | 🔒 admin — partial update (only whitelisted fields are applied) |
| DELETE | `/products/:id` | 🔒 admin |

Categories: `Laptops`, `Smartphones`, `Cameras`, `Accessories`.

### Cart (🔒 all require `Authorization: Bearer <token>`)
| Method | Route | Body |
|---|---|---|
| GET | `/cart` | — |
| POST | `/cart` | `{ productId, quantity }` |
| PUT | `/cart/:productId` | `{ quantity }` |
| DELETE | `/cart/:productId` | — |

### Checkout
| Method | Route | Notes |
|---|---|---|
| POST | `/checkout/session` | 🔒 builds a Stripe Checkout Session from the cart → `{ checkoutUrl }` |
| POST | `/checkout/confirm` | 🔒 `{ orderId }` — called by the frontend after returning from Stripe. Asks Stripe whether the order's session is paid; if so fulfils it (order → paid, stock reduced, cart emptied). Safe to call repeatedly. Returns `{ status, orderId, totalCents }` |

## Automated tests

```bash
npm test      # 8 tests: fulfilment idempotency, simultaneous confirms, /checkout/confirm rules
```
No database or Stripe account is needed — models and the Stripe client are stubbed.

## Testing with Postman (before using the UI)

1. `POST /auth/register` → copy `token`
2. `npm run seed`, then `GET /products` → copy a product `_id`
3. Add header `Authorization: Bearer <token>`; `POST /cart` `{ "productId": "<id>", "quantity": 2 }`; `GET /cart`
4. `POST /checkout/session` → open `checkoutUrl`, pay with `4242 4242 4242 4242`
5. Return to the store (the app calls `/checkout/confirm`), or call `POST /checkout/confirm {"orderId": "<id>"}` yourself. In MongoDB: the order's `status` is `paid`, the product's `stock` dropped by 2, and the user's cart is empty
