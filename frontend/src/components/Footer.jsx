import { CATEGORIES } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Footer({ onSelectCategory, onAdmin }) {
  const { user, isAdmin, openAuth, logout } = useAuth();
  const { openCart } = useCart();

  const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const go = (action) => () => { action(); toTop(); };

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="logo">Tech<span>Mart</span></div>
          <p className="footer-about">Laptops, smartphones, cameras and accessories — a demo electronics store with account-based carts and secure card checkout.</p>
        </div>

        <nav aria-label="Shop">
          <h3>Shop</h3>
          <ul>
            {CATEGORIES.map((c) => (
              <li key={c}><button type="button" className="footer-link" onClick={go(() => onSelectCategory(c))}>{c}</button></li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Account">
          <h3>My account</h3>
          <ul>
            <li>
              {user
                ? <button type="button" className="footer-link" onClick={logout}>Log out</button>
                : <button type="button" className="footer-link" onClick={() => openAuth()}>Log in / Sign up</button>}
            </li>
            <li><button type="button" className="footer-link" onClick={openCart}>My cart</button></li>
            {isAdmin && <li><button type="button" className="footer-link" onClick={go(onAdmin)}>Manage products</button></li>}
          </ul>
        </nav>

        <div>
          <h3>Secure checkout</h3>
          <p className="footer-about">🔒 Card payments are processed by Stripe. Your card details never touch this site.</p>
          <p className="footer-about">Test mode: no real money is charged.</p>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-row">
          <p>© {new Date().getFullYear()} TechMart. All rights reserved.</p>
          <p>Fatima Nahid</p>
        </div>
      </div>
    </footer>
  );
}
