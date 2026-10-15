// Fills the database with demo products so the storefront isn't empty.
// Usage:  node scripts/seed-products.js          (only seeds if no products exist)
//         node scripts/seed-products.js --reset  (wipes products first)
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const demo = [
  { name: 'AeroBook 14 Laptop',       category: 'Laptops',     priceCents: 89900, oldPriceCents: 99900, stock: 12, description: '14" display, 16GB RAM, 512GB SSD.' },
  { name: 'StudioBook Pro 16',        category: 'Laptops',     priceCents: 149900, stock: 5,  description: '16" creator laptop with dedicated GPU.' },
  { name: 'Nova X Smartphone',        category: 'Smartphones', priceCents: 59900, oldPriceCents: 69900, stock: 20, description: '6.5" AMOLED, 128GB, dual camera.' },
  { name: 'Nova Lite Smartphone',     category: 'Smartphones', priceCents: 29900, stock: 3,  description: 'Budget-friendly, great battery life.' },
  { name: 'Lumix Mirrorless Camera',  category: 'Cameras',     priceCents: 74900, oldPriceCents: 84900, stock: 7,  description: '24MP mirrorless with 4K video.' },
  { name: 'ActionCam 4K',             category: 'Cameras',     priceCents: 19900, stock: 15, description: 'Waterproof action camera.' },
  { name: 'Wireless Headphones',      category: 'Accessories', priceCents: 12900, oldPriceCents: 15900, stock: 30, description: 'Noise cancelling, 30h battery.' },
  { name: 'Mechanical Keyboard',      category: 'Accessories', priceCents: 8900,  stock: 0,  description: 'Hot-swappable switches (sold out demo).' },
];

mongoose.connect(process.env.MONGO_URI).then(async () => {
  if (process.argv.includes('--reset')) await Product.deleteMany({});
  const count = await Product.countDocuments();
  if (count > 0) {
    console.log(`Skipped: ${count} products already exist. Use --reset to wipe and reseed.`);
  } else {
    await Product.insertMany(demo);
    console.log(`✅  Seeded ${demo.length} demo products.`);
  }
  await mongoose.disconnect();
}).catch(err => { console.error('Failed:', err.message); process.exit(1); });
