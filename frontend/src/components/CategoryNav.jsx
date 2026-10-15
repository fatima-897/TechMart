import { CATEGORIES } from '../constants';

export default function CategoryNav({ active, open, onSelect }) {
  const links = [['', 'Home'], ...CATEGORIES.map((c) => [c, c])];
  return (
    <nav className={`main-nav${open ? ' open' : ''}`} id="main-nav" aria-label="Product categories">
      <div className="container">
        <ul>
          {links.map(([value, label]) => (
            <li key={label}>
              <button type="button" className={active === value ? 'active' : ''} onClick={() => onSelect(value)}>{label}</button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
