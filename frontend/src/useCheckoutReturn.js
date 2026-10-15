import { useEffect, useState } from 'react';
import { api, session } from './api';

// Stripe sends the buyer back to /?checkout=success&order=<id> (or ?checkout=cancelled).
function readReturn() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('checkout');
  return status ? { status, order: params.get('order') } : null;
}

// Handles the return from Stripe. Landing on "success" is NOT proof of payment, so we ask the
// backend to verify the order with Stripe (POST /checkout/confirm). Only a confirmed order shows
// "Payment successful"; the backend empties the cart and reduces stock as part of confirming.
export function useCheckoutReturn({ onPaid }) {
  const [info] = useState(readReturn); // {status, order} or null — read once on page load
  const [payment, setPayment] = useState(() => (info?.status === 'success' ? { state: 'confirming' } : null));

  // Tidy the address bar so a refresh doesn't replay the return
  useEffect(() => {
    if (info) window.history.replaceState({}, '', window.location.pathname);
  }, [info]);

  useEffect(() => {
    if (info?.status !== 'success') return undefined;
    if (!info.order || !session.token) { setPayment({ state: 'login' }); return undefined; }

    let cancelled = false;
    api('/checkout/confirm', { method: 'POST', body: { orderId: info.order }, auth: true })
      .then((r) => {
        if (cancelled) return;
        setPayment({ state: r.status === 'paid' ? 'paid' : 'pending', total: r.totalCents });
        if (r.status === 'paid') onPaid(); // reload the (now empty) cart and the updated stock
      })
      .catch((err) => { if (!cancelled) setPayment({ state: 'error', message: err.message }); });
    return () => { cancelled = true; };
  }, [info, onPaid]);

  return { info, payment };
}
