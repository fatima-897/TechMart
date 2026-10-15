import { money } from '../utils';

export default function PaymentBanner({ info, payment }) {
  if (!info) return null;

  let kind = 'warn';
  let text;
  if (info.status !== 'success') {
    text = 'Checkout cancelled — your cart is still saved.';
  } else if (payment?.state === 'paid') {
    kind = 'ok';
    text = `✅ Payment successful — order #${info.order.slice(-6).toUpperCase()} · ${money(payment.total)}. Thank you!`;
  } else if (payment?.state === 'pending') {
    text = "We haven't received confirmation of this payment yet. If you were charged, refresh the page in a minute.";
  } else if (payment?.state === 'login') {
    text = 'Please log in to confirm your order.';
  } else if (payment?.state === 'error') {
    text = `We couldn't confirm your payment: ${payment.message}`;
  } else {
    kind = 'info';
    text = 'Confirming your payment…';
  }

  return <div className={`banner ${kind}`} role="status">{text}</div>;
}
