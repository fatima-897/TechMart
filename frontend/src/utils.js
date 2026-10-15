export const money = (cents) => '$' + (cents / 100).toFixed(2);

// Only allow http(s) image URLs (blocks javascript: and data: URLs)
export const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');

export function filterProducts(products, { category, query, sort }) {
  const q = query.trim().toLowerCase();
  let list = products.filter((p) => {
    const inCategory = !category || p.category === category;
    const haystack = `${p.name} ${p.description} ${p.category}`.toLowerCase();
    return inCategory && (!q || haystack.includes(q));
  });
  if (sort === 'low') list = [...list].sort((a, b) => a.priceCents - b.priceCents);
  if (sort === 'high') list = [...list].sort((a, b) => b.priceCents - a.priceCents);
  return list;
}
