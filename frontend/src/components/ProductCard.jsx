import { useState } from 'react';
import { EMOJI } from '../constants';
import { money, safeUrl } from '../utils';

export default function ProductCard({ product: p, onAdd }) {
  const [imgFailed, setImgFailed] = useState(false);
  const emoji = EMOJI[p.category] || '🛍️';
  const img = safeUrl(p.imageUrl);
  const hasSale = Boolean(p.oldPriceCents && p.oldPriceCents > p.priceCents);
  const pct = hasSale ? Math.round((1 - p.priceCents / p.oldPriceCents) * 100) : 0;
  const soldOut = p.stock === 0;

  return (
    <article className="card">
      <div className="card-media">
        {img && !imgFailed
          ? <img src={img} alt={p.name} loading="lazy" onError={() => setImgFailed(true)} />
          : <span className="ph" aria-hidden="true">{emoji}</span>}
        <div className="tags">
          {hasSale && <span className="tag tag-sale">-{pct}%</span>}
          {soldOut && <span className="tag tag-out">Sold out</span>}
          {!soldOut && p.stock <= 3 && <span className="tag tag-low">Only {p.stock} left</span>}
        </div>
      </div>
      <div className="card-body">
        <p className="cat">{p.category}</p>
        <h3>{p.name}</h3>
        <p className="desc">{p.description}</p>
        <p className="price">{money(p.priceCents)}{hasSale && <> <s>{money(p.oldPriceCents)}</s></>}</p>
        <button type="button" className="btn btn-primary block add-btn" disabled={soldOut} onClick={() => onAdd(p._id)}>
          {soldOut ? 'Sold out' : 'Add to cart'}
        </button>
      </div>
    </article>
  );
}
