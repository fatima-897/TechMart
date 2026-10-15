// Run with:  npm test      (no database or Stripe account needed — models and Stripe are stubbed)
process.env.JWT_SECRET = 'test_secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.CLIENT_URL = 'http://localhost:5173';

const { test, beforeEach, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const stripe = require('../services/stripe');
const { fulfillOrder } = require('../services/fulfillOrder');

// ---- in-memory fakes for the database calls the code makes ----
let orders, stockCalls, cartCalls, stripeLookups, sessionPaymentStatus;

beforeEach(() => {
  orders = {
    o1: { _id: 'o1', user: 'u1', status: 'pending', totalCents: 39500, stripeSessionId: 'cs_1',
      items: [{ product: 'p1', quantity: 2 }, { product: 'p2', quantity: 1 }] },
  };
  stockCalls = []; cartCalls = []; stripeLookups = 0; sessionPaymentStatus = 'paid';
});

// Mimics Mongo's atomic "update only if still pending"
Order.findOneAndUpdate = async (filter, update) => {
  const o = orders[filter._id];
  if (!o || o.status !== filter.status) return null;
  Object.assign(o, update);
  return o;
};
Order.findOne = async (filter) => (orders[filter._id] && orders[filter._id].user === filter.user ? orders[filter._id] : null);
Order.findById = async (id) => orders[id] || null;
Product.findByIdAndUpdate = async (id, update) => { stockCalls.push([id, update]); };
User.findByIdAndUpdate = async (id, update) => { cartCalls.push([id, update]); };
stripe.checkout.sessions.retrieve = async () => { stripeLookups++; return { payment_status: sessionPaymentStatus }; };

// ---- app under test ----
let server, base;
before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/checkout', require('../routes/checkout'));
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

const token = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);
const confirm = (body, who = 'u1') => fetch(`${base}/checkout/confirm`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer ${token(who)}` } : {}) },
  body: JSON.stringify(body),
});

// ---------------- fulfillOrder ----------------
test('fulfillOrder: marks paid, reduces stock per item, empties the buyer\'s cart', async () => {
  assert.equal(await fulfillOrder('o1'), true);
  assert.equal(orders.o1.status, 'paid');
  assert.deepEqual(stockCalls, [['p1', { $inc: { stock: -2 } }], ['p2', { $inc: { stock: -1 } }]]);
  assert.deepEqual(cartCalls, [['u1', { $set: { cart: [] } }]]);
});

test('fulfillOrder is idempotent: a second call changes nothing', async () => {
  await fulfillOrder('o1');
  assert.equal(await fulfillOrder('o1'), false);
  assert.equal(stockCalls.length, 2); // still only the first call's two decrements
});

// ---------------- POST /checkout/confirm ----------------
test('confirm: Stripe says paid -> order fulfilled, response says paid', async () => {
  const res = await confirm({ orderId: 'o1' });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'paid');
  assert.equal(body.totalCents, 39500);
  assert.equal(stockCalls.length, 2);
  assert.equal(cartCalls.length, 1);
});

test('confirm: two simultaneous requests (double-click / refresh) reduce stock only once', async () => {
  const [a, b] = await Promise.all([confirm({ orderId: 'o1' }), confirm({ orderId: 'o1' })]);
  assert.equal((await a.json()).status, 'paid');
  assert.equal((await b.json()).status, 'paid');
  assert.equal(stockCalls.length, 2); // 2 items decremented once, not twice
  assert.equal(cartCalls.length, 1);
});

test('confirm: Stripe says NOT paid -> stays pending, stock and cart untouched', async () => {
  sessionPaymentStatus = 'unpaid';
  const body = await (await confirm({ orderId: 'o1' })).json();
  assert.equal(body.status, 'pending');
  assert.equal(stockCalls.length, 0);
  assert.equal(cartCalls.length, 0);
});

test('confirm: an order that is already paid does not call Stripe again', async () => {
  orders.o1.status = 'paid';
  const body = await (await confirm({ orderId: 'o1' })).json();
  assert.equal(body.status, 'paid');
  assert.equal(stripeLookups, 0);
  assert.equal(stockCalls.length, 0);
});

test('confirm: someone else\'s order -> 404, nothing happens', async () => {
  const res = await confirm({ orderId: 'o1' }, 'u2');
  assert.equal(res.status, 404);
  assert.equal(stripeLookups, 0);
  assert.equal(orders.o1.status, 'pending');
});

test('confirm: missing orderId -> 400; no token -> 401', async () => {
  assert.equal((await confirm({})).status, 400);
  assert.equal((await confirm({ orderId: 'o1' }, null)).status, 401);
});
