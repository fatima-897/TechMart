const fs = require('fs');
const upload = require('../middleware/upload');
const express = require('express');
const Product = require('../models/Product');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = require('../middleware/asyncRouter')();

// GET /products — public, anyone can browse
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch products' });
  }
});

// GET /products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'product not found' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: 'invalid product id' });
  }
});

function validateProductInput(body, { partial = false } = {}) {
  const errors = [];
  if (!partial || body.name !== undefined) {
    if (!body.name || !body.name.trim()) errors.push('name is required');
  }
  if (!partial || body.priceCents !== undefined) {
    if (typeof body.priceCents !== 'number' || body.priceCents < 0) {
      errors.push('priceCents must be a non-negative number');
    }
  }
  if (body.stock !== undefined && (typeof body.stock !== 'number' || body.stock < 0)) {
    errors.push('stock must be a non-negative number');
  }
  if (body.category !== undefined && !Product.CATEGORIES.includes(body.category)) {
    errors.push(`category must be one of: ${Product.CATEGORIES.join(', ')}`);
  }
  if (body.oldPriceCents !== undefined && body.oldPriceCents !== null &&
      (typeof body.oldPriceCents !== 'number' || body.oldPriceCents < 0)) {
    errors.push('oldPriceCents must be a non-negative number');
  }
  return errors;
}

// Everything below requires a logged-in ADMIN — customers can only read products (routes above this line).
router.use(requireAuth, requireAdmin);

// multipart/form-data sends every field as a string, so turn the numeric ones back into numbers
function normalizeBody(body) {
  const out = { ...body };
  for (const key of ['priceCents', 'oldPriceCents', 'stock']) {
    if (out[key] === undefined) continue;
    const n = Number(out[key]);
    out[key] = out[key] === '' || !Number.isFinite(n) ? null : n;
  }
  return out;
}
const imageUrlFor = (req) => `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
const discardUpload = (req) => { if (req.file) fs.unlink(req.file.path, () => {}); }; // don't keep files from rejected requests

// POST /products — create (multipart form; optional file field "image")
router.post('/', upload.single('image'), async (req, res) => {
  const body = normalizeBody(req.body);
  const errors = validateProductInput(body);
  if (errors.length) { discardUpload(req); return res.status(400).json({ errors }); }

  const { name, description = '', category, priceCents, oldPriceCents, stock = 0 } = body;
  const product = await Product.create({
    name: name.trim(), description, category, priceCents,
    oldPriceCents: oldPriceCents ?? undefined, stock,
    imageUrl: req.file ? imageUrlFor(req) : '',
  });
  res.status(201).json(product);
});

// PUT /products/:id — update (partial allowed; the image is only replaced if a new file is sent)
router.put('/:id', upload.single('image'), async (req, res) => {
  const existing = await Product.findById(req.params.id);
  if (!existing) { discardUpload(req); return res.status(404).json({ error: 'product not found' }); }

  const body = normalizeBody(req.body);
  const errors = validateProductInput(body, { partial: true });
  if (errors.length) { discardUpload(req); return res.status(400).json({ errors }); }

  for (const key of ['name', 'description', 'category', 'priceCents', 'oldPriceCents', 'stock']) {
    if (body[key] !== undefined) existing[key] = body[key];
  }
  if (existing.oldPriceCents === null) existing.oldPriceCents = undefined;
  if (req.file) existing.imageUrl = imageUrlFor(req);
  await existing.save();
  res.json(existing);
});

// POST /products — create
// router.post('/', async (req, res) => {
//   const errors = validateProductInput(req.body);
//   if (errors.length) return res.status(400).json({ errors });

//   const { name, description = '', category, priceCents, oldPriceCents, stock = 0, imageUrl = '' } = req.body;
//   try {
//     const product = await Product.create({ name: name.trim(), description, category, priceCents, oldPriceCents, stock, imageUrl });
//     res.status(201).json(product);
//   } catch (err) {
//     res.status(500).json({ error: 'failed to create product' });
//   }
// });

// PUT /products/:id — update (partial allowed)
// router.put('/:id', async (req, res) => {
//   const existing = await Product.findById(req.params.id);
//   if (!existing) return res.status(404).json({ error: 'product not found' });

//   const errors = validateProductInput(req.body, { partial: true });
//   if (errors.length) return res.status(400).json({ errors });

//   try {
//     const allowed = ['name', 'description', 'category', 'priceCents', 'oldPriceCents', 'stock', 'imageUrl'];
//     for (const key of allowed) {
//       if (req.body[key] !== undefined) existing[key] = req.body[key];
//     }
//     if (existing.oldPriceCents === null) existing.oldPriceCents = undefined;
//     await existing.save();
//     res.json(existing);
//   } catch (err) {
//     res.status(500).json({ error: 'failed to update product' });
//   }
// });

// DELETE /products/:id
router.delete('/:id', async (req, res) => {
  const existing = await Product.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'product not found' });

  try {
    await existing.deleteOne();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'failed to delete product' });
  }
});

module.exports = router;
