const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const { requireAuth } = require('../middleware/auth');

const router = require('../middleware/asyncRouter')();
router.use(requireAuth); // every route below requires a valid token

// GET /cart — the logged-in user's cart, with product details populated
router.get('/', async (req, res) => {
  const user = await User.findById(req.userId).populate('cart.product');
  res.json(user.cart);
});

// POST /cart — add an item (or increase quantity if it's already in the cart)
router.post('/', async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId is required' });
  if (quantity < 1) return res.status(400).json({ error: 'quantity must be at least 1' });

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ error: 'product not found' });

  const user = await User.findById(req.userId);
  const existing = user.cart.find(item => item.product.toString() === productId);

  if (existing) existing.quantity += quantity;
  else user.cart.push({ product: productId, quantity });

  await user.save();
  await user.populate('cart.product');
  res.status(201).json(user.cart);
});

// PUT /cart/:productId — set an exact quantity
router.put('/:productId', async (req, res) => {
  const { quantity } = req.body;
  if (typeof quantity !== 'number' || quantity < 1) {
    return res.status(400).json({ error: 'quantity must be a number >= 1 (use DELETE to remove an item)' });
  }

  const user = await User.findById(req.userId);
  const item = user.cart.find(i => i.product.toString() === req.params.productId);
  if (!item) return res.status(404).json({ error: 'item not in cart' });

  item.quantity = quantity;
  await user.save();
  await user.populate('cart.product');
  res.json(user.cart);
});

// DELETE /cart/:productId — remove one item
router.delete('/:productId', async (req, res) => {
  const user = await User.findById(req.userId);
  user.cart = user.cart.filter(i => i.product.toString() !== req.params.productId);
  await user.save();
  res.status(204).send();
});

module.exports = router;
