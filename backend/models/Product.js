const mongoose = require('mongoose');

const CATEGORIES = ['Laptops', 'Smartphones', 'Cameras', 'Accessories'];

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, enum: CATEGORIES, default: 'Accessories' },
  priceCents: { type: Number, required: true, min: 0 }, // integer cents, never floats
  oldPriceCents: { type: Number, min: 0 },              // optional: shows strikethrough + % off
  stock: { type: Number, required: true, min: 0, default: 0 },
  imageUrl: { type: String, default: '' },
}, { timestamps: true });

productSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model('Product', productSchema);
