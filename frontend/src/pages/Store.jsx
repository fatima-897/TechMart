import { useMemo } from 'react';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { filterProducts } from '../utils';

const COLLECTIONS = [
  { cat: 'Laptops', lines: ['Laptop', 'Collection'], cls: 'c1' },
  { cat: 'Accessories', lines: ['Accessories', 'Collection'], cls: 'c2' },
  { cat: 'Cameras', lines: ['Camera', 'Collection'], cls: 'c3' },
];

export default function Store({ products, loading, error, filters, setFilters, onSelectCategory }) {
  const { addToCart } = useCart();
  const list = useMemo(() => filterProducts(products, filters), [products, filters]);

  function pickCollection(cat) {
    onSelectCategory(cat);
    document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  let body;
  if (loading) body = [1, 2, 3, 4].map((n) => <div className="skeleton" key={n} />);
  else if (error) body = <div className="empty">{error}</div>;
  else if (!list.length) body = <div className="empty">No products match your search.</div>;
  else body = list.map((p) => <ProductCard key={p._id} product={p} onAdd={addToCart} />);

  return (
    <section>
      <div className="collections">
        {COLLECTIONS.map((c) => (
          <button key={c.cat} type="button" className={`collection ${c.cls}`} onClick={() => pickCollection(c.cat)}>
            <span>{c.lines[0]}<br />{c.lines[1]}</span>
            <em>Shop now →</em>
          </button>
        ))}
      </div>

      <div className="section-head">
        <h2>{filters.category || 'New products'}</h2>
        <label className="sort">Sort
          <select value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}>
            <option value="new">Newest</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </label>
      </div>

      <div id="products-grid" className="grid" aria-live="polite">{body}</div>
    </section>
  );
}
