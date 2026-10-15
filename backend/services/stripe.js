// One shared Stripe client (test or live depends on the key in .env).
// Kept in its own module so routes share it and tests can stub it.
const Stripe = require('stripe');

module.exports = Stripe(process.env.STRIPE_SECRET_KEY);
