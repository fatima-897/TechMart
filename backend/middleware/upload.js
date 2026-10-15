const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const dir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(dir, { recursive: true });

// Allowed types -> the extension we save with. (SVG is deliberately excluded: it can carry scripts.)
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

module.exports = multer({
  storage: multer.diskStorage({
    destination: dir,
    // random name: never use the visitor's original filename
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + EXT[file.mimetype]),
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => (EXT[file.mimetype]
    ? cb(null, true)
    : cb(Object.assign(new Error('Only JPG, PNG, WEBP or GIF images are allowed'), { status: 400, expose: true }))),
});