import { useState } from 'react';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { money } from '../utils';

export default function CartDrawer() {
  const { items, total, open, closeCart, setQuantity, remove } = useCart();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function checkout() {
    setBusy(true);
    try {
      const { checkoutUrl } = await api('/checkout/session', { method: 'POST', auth: true });
      window.location.href = checkoutUrl; // Stripe-hosted payment page
    } catch (err) {
      toast(err.message, 'error');
      setBusy(false);
    }
  }

  return (
    <>
      {open && <div className="overlay" onClick={closeCart} />}
      <aside className={`drawer${open ? ' open' : ''}`} aria-hidden={!open} aria-labelledby="cart-title">
        <div className="drawer-head">
          <h2 id="cart-title">Your cart</h2>
          <button className="icon-btn" type="button" aria-label="Close cart" onClick={closeCart}>✕</button>
        </div>

        <div className="cart-items">
          {items.length === 0 && <div className="empty">Your cart is empty.</div>}
          {items.map(({ product: p, quantity }) => (
            <div className="cart-row" key={p._id}>
              <div className="cart-info">
                <strong>{p.name}</strong>
                <span className="muted">{money(p.priceCents)} each</span>
                {quantity > p.stock && <span className="error">Only {p.stock} in stock</span>}
              </div>
              <div className="qty">
                <button type="button" className="icon-btn" aria-label={`Decrease quantity of ${p.name}`}
                  disabled={quantity <= 1} onClick={() => setQuantity(p._id, quantity - 1)}>−</button>
                <span aria-live="polite">{quantity}</span>
                <button type="button" className="icon-btn" aria-label={`Increase quantity of ${p.name}`}
                  disabled={quantity >= p.stock} onClick={() => setQuantity(p._id, quantity + 1)}>+</button>
              </div>
              <strong className="line-total">{money(p.priceCents * quantity)}</strong>
              <button type="button" className="icon-btn" aria-label={`Remove ${p.name}`} onClick={() => remove(p._id)}>🗑</button>
            </div>
          ))}
        </div>

        <div className="drawer-foot">
          <div className="total-row"><span>Total</span><strong>{money(total)}</strong></div>
          <button type="button" className="btn btn-primary block" disabled={items.length === 0 || busy} onClick={checkout}>
            {busy ? 'Redirecting to Stripe…' : 'Checkout'}
          </button>
          <button type="button" className="btn block" onClick={closeCart}>Continue shopping</button>
        </div>
      </aside>
    </>
  );
}
