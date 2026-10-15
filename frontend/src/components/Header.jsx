import { CATEGORIES } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Header({ filters, setFilters, navOpen, setNavOpen, onAdmin, onHome }) {
  const { user, isAdmin, logout, openAuth } = useAuth();
  const { count, openCart } = useCart();

  return (
    <header className="site-header">
      <div className="container header-row">
        <a className="logo" href="/" aria-label="TechMart home" onClick={(e) => { e.preventDefault(); onHome(); }}>
          Tech<span>Mart</span>
        </a>

        <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
          <select aria-label="Category" value={filters.category}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="search" placeholder="Search products" aria-label="Search products" autoComplete="off"
            value={filters.query} onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))} />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>

        <div className="header-actions">
          {isAdmin && <button className="link-btn" type="button" onClick={onAdmin}>Admin</button>}
          {user && <span className="user-name">Hi, {user.name}</span>}
          <button className="link-btn" type="button" onClick={() => (user ? logout() : openAuth())}>
            {user ? 'Log out' : 'Log in'}
          </button>
          <button className="cart-btn" type="button" aria-label="Open cart" onClick={openCart}>
            <span aria-hidden="true">🛒</span>
            <span className="badge">{count}</span>
          </button>
          <button className="nav-toggle" type="button" aria-expanded={navOpen} aria-controls="main-nav"
            aria-label="Toggle categories menu" onClick={() => setNavOpen((o) => !o)}>
            <span /><span /><span />
          </button>
        </div>
      </div>
    </header>
  );
}
