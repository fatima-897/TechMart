require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const checkoutRoutes = require('./routes/checkout');

const app = express();
const PORT = process.env.PORT || 5001;

// Only the frontend's origin(s) may call this API from a browser.
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',').map(s => s.trim());
app.use(cors({ origin: allowedOrigins }));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // uploaded product images

app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/cart', cartRoutes);
app.use('/checkout', checkoutRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use((req, res) => res.status(404).json({ error: 'route not found' }));

// Central error handler: anything thrown/rejected in a route lands here instead of crashing the server.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === 'CastError') return res.status(400).json({ error: 'invalid id' });
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 2 MB or smaller' : err.message });
  }
  if (err.expose) return res.status(err.status || 400).json({ error: err.message });
  if (err.type && err.type.startsWith('Stripe')) {
    console.error('Stripe error:', err.message);
    return res.status(502).json({ error: 'payment provider error — check STRIPE_SECRET_KEY in .env' });
  }
  console.error(err);
  res.status(err.status || 500).json({ error: 'something went wrong' });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log(`Connected to MongoDB: ${process.env.MONGO_URI}`);
    app.listen(PORT, () => console.log(` API running at http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });