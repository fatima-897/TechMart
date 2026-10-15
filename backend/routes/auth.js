const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = require('../middleware/asyncRouter')();

function signToken(userId) {
  // Token expires in 7 days — after that the user must log in again
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'a valid email is required' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' });

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'an account with this email already exists' });

    // bcrypt.hash does the salting for you — never store the raw password
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), email: email.toLowerCase(), passwordHash });

    const token = signToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: 'registration failed' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    // Same error for "no such user" and "wrong password" — don't reveal which one it was
    if (!user) return res.status(401).json({ error: 'invalid email or password' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'invalid email or password' });

    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: 'login failed' });
  }
});

// GET /auth/me — returns the logged-in user (fresh role etc). Lets the frontend validate its saved token on page load.
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: 'user no longer exists' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'failed to load user' });
  }
});

module.exports = router;
