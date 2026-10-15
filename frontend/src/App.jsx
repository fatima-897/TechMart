import { useCallback, useEffect, useState } from 'react';
import AuthModal from './components/AuthModal';
import CartDrawer from './components/CartDrawer';
import CategoryNav from './components/CategoryNav';
import Footer from './components/Footer';
import Header from './components/Header';
import PaymentBanner from './components/PaymentBanner';
import { useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import Admin from './pages/Admin';
import Store from './pages/Store';
import { useCheckoutReturn } from './useCheckoutReturn';
import { useProducts } from './useProducts';

export default function App() {
  const { isAdmin, closeAuth } = useAuth();
  const { closeCart, refresh } = useCart();
  const { products, loading, error, reload } = useProducts();

  const [view, setView] = useState('store');
  const [filters, setFilters] = useState({ category: '', query: '', sort: 'new' });
  const [navOpen, setNavOpen] = useState(false);

  // After Stripe returns the buyer: verify the payment, then reload the (now empty) cart and stock
  const onPaid = useCallback(() => { refresh(); reload(true); }, [refresh, reload]);
  const { info: checkoutInfo, payment } = useCheckoutReturn({ onPaid });

  const showAdmin = view === 'admin' && isAdmin; // never render the admin page for non-admins

  function selectCategory(category) {
    setFilters((f) => ({ ...f, category }));
    setView('store');
    setNavOpen(false);
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { closeCart(); closeAuth(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeCart, closeAuth]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="strip">
        WINTER <strong>Sale </strong>20% Off
      </div>

      <Header filters={filters} setFilters={setFilters} navOpen={navOpen} setNavOpen={setNavOpen}
        onAdmin={() => setView('admin')} onHome={() => { selectCategory(''); setFilters((f) => ({ ...f, query: '' })); }} />
      <CategoryNav active={filters.category} open={navOpen} onSelect={selectCategory} />

      <PaymentBanner info={checkoutInfo} payment={payment} />

      <main id="main" className="container">
        {showAdmin
          ? <Admin products={products} reload={reload} onBack={() => { setView('store'); reload(true); }} />
          : <Store products={products} loading={loading} error={error} filters={filters} setFilters={setFilters} onSelectCategory={selectCategory} />}
      </main>

      <CartDrawer />
      <AuthModal />

      <Footer onSelectCategory={selectCategory} onAdmin={() => setView('admin')} />
    </>
  );
}
