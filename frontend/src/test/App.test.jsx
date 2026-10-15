import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import Providers from '../Providers';
import { PRODUCTS, loggedIn, mockBackend } from './mockApi';

const renderApp = () => render(<Providers><App /></Providers>);
const cards = () => document.querySelectorAll('#products-grid .card');
const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => { localStorage.clear(); window.history.replaceState({}, '', '/'); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('storefront', () => {
  it('renders products from the API', async () => {
    mockBackend(); renderApp();
    await waitFor(() => expect(cards().length).toBe(4));
  });

  it('filters by category and by live search', async () => {
    mockBackend(); renderApp();
    await waitFor(() => expect(cards().length).toBe(4));
    fireEvent.click(screen.getAllByRole('button', { name: 'Smartphones' })[0]);
    expect(cards().length).toBe(2);
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '' } });
    type('Search products', 'keyboard');
    expect(cards().length).toBe(1);
  });

  it('sorts by price', async () => {
    mockBackend(); renderApp();
    await waitFor(() => expect(cards().length).toBe(4));
    fireEvent.change(screen.getByLabelText(/Sort/), { target: { value: 'low' } });
    expect(within(cards()[0]).getByRole('heading').textContent).toBe('Mechanical Keyboard');
  });

  it('shows sale %, low-stock and sold-out states (sold-out button disabled)', async () => {
    mockBackend(); renderApp();
    await waitFor(() => expect(cards().length).toBe(4));
    expect(screen.getByText('-10%')).toBeTruthy();
    expect(screen.getByText('Only 3 left')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sold out' }).disabled).toBe(true);
  });

  it('renders hostile product data as plain text (no script/markup injection)', async () => {
    mockBackend({ products: [{ _id: 'x', name: '<img src=x onerror="window.__xss=1">', category: 'Cameras', priceCents: 100, stock: 5, description: '<script>window.__xss=1</script>' }] });
    renderApp();
    await waitFor(() => expect(cards().length).toBe(1));
    expect(window.__xss).toBeUndefined();
    expect(document.querySelector('#products-grid img')).toBeNull();
  });

  it('shows a friendly message when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    renderApp();
    expect(await screen.findByText(/Cannot reach the server/)).toBeTruthy();
  });

  it('mobile menu toggle flips aria-expanded and the open class', async () => {
    mockBackend(); renderApp();
    await waitFor(() => expect(cards().length).toBe(4));
    const toggle = screen.getByRole('button', { name: /Toggle categories menu/ });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('main-nav').classList.contains('open')).toBe(true);
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('auth + cart', () => {
  it('logged-out "Add to cart" opens the login popup and sends NO cart request', async () => {
    const calls = mockBackend(); renderApp();
    await waitFor(() => expect(cards().length).toBe(4));
    fireEvent.click(screen.getAllByRole('button', { name: 'Add to cart' })[0]);
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(calls.some((c) => c.path === '/cart')).toBe(false);
  });

  it('wrong password shows an inline error and stays logged out', async () => {
    mockBackend(); renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    type('Email', 'a@b.com'); type('Password', 'badbadbad');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('invalid email or password')).toBeTruthy();
    expect(localStorage.getItem('tm_token')).toBeNull();
  });

  it('login completes the pending add: token stored, POST /cart carries the Bearer token, badge shows 1', async () => {
    const calls = mockBackend(); renderApp();
    await waitFor(() => expect(cards().length).toBe(4));
    fireEvent.click(screen.getAllByRole('button', { name: 'Add to cart' })[0]);
    type('Email', 'a@b.com'); type('Password', 'goodpass1');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(calls.find((c) => c.path === '/cart' && c.method === 'POST')).toBeTruthy());
    expect(calls.find((c) => c.path === '/cart' && c.method === 'POST').auth).toBe('Bearer T');
    expect(localStorage.getItem('tm_token')).toBe('T');
    await waitFor(() => expect(document.querySelector('.badge').textContent).toBe('1'));
    expect(screen.getAllByRole('button', { name: 'Log out' }).length).toBeGreaterThan(0);
  });

  it('dismissing the login popup forgets the pending add', async () => {
    const calls = mockBackend(); renderApp();
    await waitFor(() => expect(cards().length).toBe(4));
    fireEvent.click(screen.getAllByRole('button', { name: 'Add to cart' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(calls.some((c) => c.path === '/cart')).toBe(false);
  });

  it('restores a saved session on reload (calls /auth/me with the token)', async () => {
    const calls = mockBackend(); loggedIn(); renderApp();
    expect(await screen.findByText('Hi, Sunny')).toBeTruthy();
    expect(calls.some((c) => c.path === '/auth/me' && c.auth === 'Bearer T')).toBe(true);
  });

  it('an expired token clears the session', async () => {
    mockBackend();
    localStorage.setItem('tm_token', 'EXPIRED'); localStorage.setItem('tm_user', JSON.stringify({ name: 'Sunny', email: 'a@b.com', role: 'customer' }));
    renderApp();
    expect(await screen.findByRole('button', { name: 'Log in' })).toBeTruthy();
    expect(localStorage.getItem('tm_token')).toBeNull();
  });
});

describe('admin', () => {
  it('Admin link is hidden for a customer', async () => {
    mockBackend(); loggedIn('customer'); renderApp();
    await screen.findByText('Hi, Sunny');
    expect(screen.queryByRole('button', { name: 'Admin' })).toBeNull();
  });

  it('Admin link appears once /auth/me reports the admin role (no re-login needed)', async () => {
    mockBackend({ me: { name: 'Sunny', role: 'admin' } }); loggedIn('customer'); renderApp();
    expect(await screen.findByRole('button', { name: 'Admin' })).toBeTruthy();
  });

  it('adding a product sends the price in integer cents', async () => {
    const calls = mockBackend({ me: { name: 'Sunny', role: 'admin' } }); loggedIn('admin'); renderApp();
    fireEvent.click(await screen.findByRole('button', { name: 'Admin' }));
    type('Name', 'Test Cam'); type('Price (USD)', '123.45'); type('Stock', '7');
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }));
    await waitFor(() => expect(calls.find((c) => c.path === '/products' && c.method === 'POST')).toBeTruthy());
    const post = calls.find((c) => c.path === '/products' && c.method === 'POST');
    expect(post.body.priceCents).toBe(12345);
    expect(post.body.stock).toBe(7);
    expect(post.body.oldPriceCents).toBeNull();
    expect(post.auth).toBe('Bearer T');
  });
});

const ORDER = '65f1a2b3c4d5e6f7a8b9c0d1';
const returnFromStripe = (query = `checkout=success&order=${ORDER}`) => window.history.replaceState({}, '', `/?${query}`);
const heldCart = [{ product: PRODUCTS[0], quantity: 2 }];

describe('Stripe return', () => {
  it('says "Confirming…" first, and "successful" only after the backend confirms the payment', async () => {
    const calls = mockBackend({ cart: heldCart }); loggedIn(); returnFromStripe();
    renderApp();
    expect(screen.getByText(/Confirming your payment/)).toBeTruthy();
    expect(await screen.findByText(/Payment successful — order #B9C0D1 · \$395\.00/)).toBeTruthy();
    const confirm = calls.find((c) => c.path === '/checkout/confirm');
    expect(confirm.body).toEqual({ orderId: ORDER });
    expect(confirm.auth).toBe('Bearer T');
    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('after a confirmed payment, the cart and product stock are reloaded and the cart ends up empty', async () => {
    const calls = mockBackend({ cart: heldCart }); loggedIn(); returnFromStripe();
    renderApp();
    await screen.findByText(/Payment successful/);
    const i = calls.findIndex((c) => c.path === '/checkout/confirm');
    await waitFor(() => {
      const after = calls.slice(i + 1);
      expect(after.some((c) => c.path === '/cart' && c.method === 'GET')).toBe(true);
      expect(after.some((c) => c.path === '/products' && c.method === 'GET')).toBe(true);
    });
    await waitFor(() => expect(document.querySelector('.badge').textContent).toBe('0'));
  });

  it('if Stripe has not confirmed the payment: warns instead of claiming success, cart untouched', async () => {
    mockBackend({ confirmStatus: 'pending', cart: heldCart }); loggedIn(); returnFromStripe();
    renderApp();
    expect(await screen.findByText(/haven't received confirmation/)).toBeTruthy();
    expect(screen.queryByText(/Payment successful/)).toBeNull();
    await waitFor(() => expect(document.querySelector('.badge').textContent).toBe('2'));
  });

  it('if confirming fails, shows the reason', async () => {
    mockBackend({ confirmStatus: 'error' }); loggedIn(); returnFromStripe();
    renderApp();
    expect(await screen.findByText(/couldn't confirm your payment: order not found/)).toBeTruthy();
  });

  it('returning while logged out asks you to log in and sends no confirm request', async () => {
    const calls = mockBackend(); returnFromStripe();
    renderApp();
    expect(await screen.findByText(/log in to confirm your order/i)).toBeTruthy();
    expect(calls.some((c) => c.path === '/checkout/confirm')).toBe(false);
  });

  it('cancelled: shows a warning banner and makes no confirm request', async () => {
    const calls = mockBackend(); loggedIn(); returnFromStripe('checkout=cancelled');
    renderApp();
    expect(await screen.findByText(/Checkout cancelled/)).toBeTruthy();
    expect(calls.some((c) => c.path === '/checkout/confirm')).toBe(false);
  });
});

describe('footer', () => {
  const footer = () => within(screen.getByRole('contentinfo'));

  it('shows the brand, shop links and a copyright line with the current year', async () => {
    mockBackend(); renderApp();
    await waitFor(() => expect(cards().length).toBe(4));
    expect(footer().getByText(/All rights reserved/).textContent).toContain(String(new Date().getFullYear()));
    expect(footer().getByRole('button', { name: 'Laptops' })).toBeTruthy();
    expect(screen.queryByText(/Task 4/)).toBeNull(); // no internship/task wording in the storefront
  });

  it('a Shop link filters the catalogue', async () => {
    mockBackend(); renderApp();
    await waitFor(() => expect(cards().length).toBe(4));
    fireEvent.click(footer().getByRole('button', { name: 'Laptops' }));
    expect(cards().length).toBe(1);
  });

  it('"Log in / Sign up" opens the login popup when logged out', async () => {
    mockBackend(); renderApp();
    fireEvent.click(footer().getByRole('button', { name: 'Log in / Sign up' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });

  it('"Manage products" shows for admins only', async () => {
    mockBackend(); loggedIn('customer'); renderApp();
    await screen.findByText('Hi, Sunny');
    expect(footer().queryByRole('button', { name: 'Manage products' })).toBeNull();
    cleanup(); localStorage.clear();

    mockBackend({ me: { name: 'Sunny', role: 'admin' } }); loggedIn('admin'); renderApp();
    expect(await footer().findByRole('button', { name: 'Manage products' })).toBeTruthy();
  });
});
