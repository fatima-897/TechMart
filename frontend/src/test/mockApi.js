import { vi } from 'vitest';

export const PRODUCTS = [
  { _id: 'p1', name: 'AeroBook 14 Laptop', category: 'Laptops', priceCents: 89900, oldPriceCents: 99900, stock: 12, description: 'laptop' },
  { _id: 'p2', name: 'Nova X Smartphone', category: 'Smartphones', priceCents: 59900, stock: 20, description: 'phone' },
  { _id: 'p3', name: 'Nova Lite Smartphone', category: 'Smartphones', priceCents: 29900, stock: 3, description: 'phone' },
  { _id: 'p4', name: 'Mechanical Keyboard', category: 'Accessories', priceCents: 8900, stock: 0, description: 'sold out' },
];

const res = (status, data) => ({ ok: status < 400, status, json: async () => data });

// Installs a fake backend on global fetch and returns the list of calls it received.
export function mockBackend({ products = PRODUCTS, me = { name: 'Sunny', role: 'customer' }, confirmStatus = 'paid', cart: initialCart = [] } = {}) {
  const calls = [];
  let cart = initialCart;
  vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
    const path = url.replace('http://localhost:5001', '');
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : undefined;
    const auth = opts.headers?.Authorization;
    calls.push({ path, method, body, auth });

    if (path === '/products' && method === 'GET') return res(200, products);
    if (path === '/products' && method === 'POST') return res(201, { _id: 'new', ...body });
    if (path === '/auth/login') {
      return body.password === 'goodpass1'
        ? res(200, { token: 'T', user: { name: 'Sunny', email: body.email, role: 'customer' } })
        : res(401, { error: 'invalid email or password' });
    }
    if (path === '/auth/me') return auth === 'Bearer T' ? res(200, { user: { email: 'a@b.com', ...me } }) : res(401, { error: 'Invalid or expired token' });
    if (path === '/checkout/confirm') {
      if (confirmStatus === 'error') return res(404, { error: 'order not found' });
      if (confirmStatus === 'paid') cart = []; // the real backend empties the cart when it confirms a paid order
      return res(200, { status: confirmStatus, orderId: body.orderId, totalCents: 39500 });
    }
    if (path === '/cart' && method === 'GET') return res(200, cart);
    if (path === '/cart' && method === 'POST') {
      cart = [{ product: products.find((p) => p._id === body.productId), quantity: 1 }];
      return res(201, cart);
    }
    return res(404, { error: `not mocked: ${method} ${path}` });
  }));
  return calls;
}

export const loggedIn = (role = 'customer') => {
  localStorage.setItem('tm_token', 'T');
  localStorage.setItem('tm_user', JSON.stringify({ name: 'Sunny', email: 'a@b.com', role }));
};
