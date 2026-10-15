import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, session } from '../api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user, modal, openAuth } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [pendingAdd, setPendingAdd] = useState(null); // product the visitor tried to add while logged out

  const userKey = user ? user.email : null; // stable across user-object refreshes

  const refresh = useCallback(async () => {
    if (!session.token) { setItems([]); return; }
    try {
      setItems(await api('/cart', { auth: true }));
    } catch (err) {
      if (session.token) toast(err.message, 'error');
    }
  }, [toast]);

  // Load the cart whenever the logged-in user changes; clear it on logout
  useEffect(() => {
    if (userKey) refresh();
    else { setItems([]); setOpen(false); }
  }, [userKey, refresh]);

  const add = useCallback(async (productId) => {
    try {
      setItems(await api('/cart', { method: 'POST', body: { productId, quantity: 1 }, auth: true }));
      toast('Added to cart.', 'ok');
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [toast]);

  const addToCart = useCallback((productId) => {
    if (!user) {
      setPendingAdd(productId);
      openAuth('Log in or create an account to add items to your cart.');
      return undefined;
    }
    return add(productId);
  }, [user, add, openAuth]);

  // After a successful login, finish the add the visitor started
  useEffect(() => {
    if (user && pendingAdd) { add(pendingAdd); setPendingAdd(null); }
  }, [user, pendingAdd, add]);

  // If the login popup is dismissed without logging in, forget the pending add
  useEffect(() => {
    if (!modal.open && !user) setPendingAdd(null);
  }, [modal.open, user]);

  const setQuantity = useCallback(async (productId, quantity) => {
    try {
      setItems(await api(`/cart/${productId}`, { method: 'PUT', body: { quantity }, auth: true }));
    } catch (err) { toast(err.message, 'error'); }
  }, [toast]);

  const remove = useCallback(async (productId) => {
    try {
      await api(`/cart/${productId}`, { method: 'DELETE', auth: true });
      await refresh();
    } catch (err) { toast(err.message, 'error'); }
  }, [refresh, toast]);

  const openCart = useCallback(() => {
    if (!user) { openAuth('Log in to view your cart.'); return; }
    refresh();
    setOpen(true);
  }, [user, openAuth, refresh]);
  const closeCart = useCallback(() => setOpen(false), []);

  const value = useMemo(() => {
    const valid = items.filter((i) => i.product); // a product may have been deleted by an admin
    return {
      items: valid,
      count: valid.reduce((n, i) => n + i.quantity, 0),
      total: valid.reduce((s, i) => s + i.product.priceCents * i.quantity, 0),
      open, openCart, closeCart, addToCart, setQuantity, remove, refresh,
    };
  }, [items, open, openCart, closeCart, addToCart, setQuantity, remove, refresh]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
