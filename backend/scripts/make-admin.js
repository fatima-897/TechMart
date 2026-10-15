// One-time setup script: promotes an already-registered user to admin.
// There's no API route for this on purpose — if "become admin" were a normal
// endpoint, any logged-in user could call it on themselves.
//
// Usage:
//   node scripts/make-admin.js your@email.com

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/make-admin.js your@email.com');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { role: 'admin' },
      { new: true }
    );
    if (!user) {
      console.error(`No user found with email: ${email}. Register that account first.`);
    } else {
      console.log(`✅  ${user.email} is now an admin. Reload the app to see the Admin link.`);
    }
    await mongoose.disconnect();
  })
  .catch(err => {
    console.error('Failed:', err.message);
    process.exit(1);
  });
