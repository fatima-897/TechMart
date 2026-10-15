// Express 4 does not catch errors thrown inside async route handlers: an unhandled rejection
// (bad ObjectId, Stripe error, DB hiccup) would crash the Node process. This router forwards
// any rejection to the central error handler in server.js instead.
const express = require('express');

function asyncRouter() {
  const router = express.Router();
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const original = router[method].bind(router);
    router[method] = (path, ...handlers) => original(
      path,
      ...handlers.map((h) => (h.length >= 4 ? h : (req, res, next) => Promise.resolve(h(req, res, next)).catch(next)))
    );
  }
  return router;
}

module.exports = asyncRouter;
