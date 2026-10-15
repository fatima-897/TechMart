const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// Turns a PAID Stripe checkout into its real-world effects: order -> "paid", stock reduced,
// buyer's cart emptied. Called by POST /checkout/confirm once Stripe says the session is paid.
//
// It must be safe to call repeatedly or at the same moment (double-click, page refresh on the
// success URL, React's double-run in dev). The atomic "pending -> paid" flip below guarantees only
// ONE call does the work; any later call sees the order is no longer pending and does nothing.
//
// Returns true if this call fulfilled the order, false if it had already been fulfilled.
async function fulfillOrder(orderId) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: 'pending' },
    { status: 'paid' },
    { new: true }
  );
  if (!order) return false;

  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
  }
  await User.findByIdAndUpdate(order.user, { $set: { cart: [] } });
  return true;
}

module.exports = { fulfillOrder };
