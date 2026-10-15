const User = require('../models/User');
const Order = require('../models/Order');
const stripe = require('../services/stripe');
const { fulfillOrder } = require('../services/fulfillOrder');
const { requireAuth } = require('../middleware/auth');

const router = require('../middleware/asyncRouter')();

// POST /checkout/session — build a Stripe Checkout session from the user's cart
router.post('/session', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).populate('cart.product');
  if (!user.cart.length) return res.status(400).json({ error: 'cart is empty' });

  // Re-check stock right before checkout — it may have changed since items were added
  for (const item of user.cart) {
    if (!item.product || item.product.stock < item.quantity) {
      return res.status(409).json({ error: `not enough stock for ${item.product?.name || 'a product'}` });
    }
  }

  const totalCents = user.cart.reduce((sum, i) => sum + i.product.priceCents * i.quantity, 0);

  // Order starts as "pending" — only /checkout/confirm (after Stripe verifies the payment) flips it to "paid"
  const order = await Order.create({
    user: user._id,
    items: user.cart.map(i => ({
      product: i.product._id,
      name: i.product.name,
      priceCents: i.product.priceCents,
      quantity: i.quantity,
    })),
    totalCents,
    status: 'pending',
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: user.cart.map(i => ({
      price_data: {
        currency: 'usd',
        product_data: { name: i.product.name },
        unit_amount: i.product.priceCents,
      },
      quantity: i.quantity,
    })),
    success_url: `${process.env.CLIENT_URL}/?checkout=success&order=${order._id}`,
    cancel_url: `${process.env.CLIENT_URL}/?checkout=cancelled`,
    metadata: { orderId: order._id.toString() },
  });

  order.stripeSessionId = session.id;
  await order.save();

  res.json({ checkoutUrl: session.url, orderId: order._id });
});

// POST /checkout/confirm — called by the frontend when the buyer returns from Stripe.
// Instead of trusting the browser ("I paid!"), the server asks STRIPE directly whether this
// order's checkout session is paid, and only then fulfils it (order -> paid, stock reduced, cart
// emptied). This is the single place payments are finalised — no webhook needed to run locally.
router.post('/confirm', requireAuth, async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId is required' });

  // Scoped to the logged-in user: you can only confirm your own orders
  const order = await Order.findOne({ _id: orderId, user: req.userId });
  if (!order) return res.status(404).json({ error: 'order not found' });

  if (order.status !== 'paid' && order.stripeSessionId) {
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    if (session.payment_status === 'paid') await fulfillOrder(order._id);
  }

  const fresh = await Order.findById(order._id);
  res.json({ status: fresh.status, orderId: fresh._id, totalCents: fresh.totalCents });
});

module.exports = router;
