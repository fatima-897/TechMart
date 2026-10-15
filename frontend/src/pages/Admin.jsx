import { useRef, useState } from 'react';
import { api } from '../api';
import { CATEGORIES } from '../constants';
import { useToast } from '../context/ToastContext';
import { money, safeUrl } from '../utils';

const EMPTY = { id: '', name: '', category: CATEGORIES[0], description: '', price: '', oldPrice: '', stock: '', image: '', file: null };

export default function Admin({ products, reload, onBack }) {
  const toast = useToast();
  const formRef = useRef(null);
  const fileRef = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const resetForm = () => { setForm(EMPTY); if (fileRef.current) fileRef.current.value = ''; };

  async function submit(e) {
    e.preventDefault();
    if (form.file && form.file.size > 2 * 1024 * 1024) { toast('Image must be 2 MB or smaller', 'error'); return; }

    // multipart/form-data so the image file can travel with the text fields
    const data = new FormData();
    data.append('name', form.name.trim());
    data.append('category', form.category);
    data.append('description', form.description.trim());
    data.append('priceCents', Math.round(Number(form.price) * 100)); // dollars in the form -> integer cents for the API
    data.append('oldPriceCents', form.oldPrice === '' ? '' : Math.round(Number(form.oldPrice) * 100));
    data.append('stock', Number(form.stock));
    if (form.file) data.append('image', form.file);

    try {
      await api(form.id ? `/products/${form.id}` : '/products', { method: form.id ? 'PUT' : 'POST', body: data, auth: true });
      toast(form.id ? 'Product updated.' : 'Product added.', 'ok');
      resetForm();
      reload(true);
    } catch (err) { toast(err.message, 'error'); }
  }

  function edit(p) {
    setForm({
      id: p._id, name: p.name, category: p.category, description: p.description || '',
      price: (p.priceCents / 100).toFixed(2), oldPrice: p.oldPriceCents ? (p.oldPriceCents / 100).toFixed(2) : '',
      stock: String(p.stock), image: p.imageUrl || '', file: null,
    });
    if (fileRef.current) fileRef.current.value = '';
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function remove(p) {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try {
      await api(`/products/${p._id}`, { method: 'DELETE', auth: true });
      toast('Product deleted.', 'ok');
      reload(true);
    } catch (err) { toast(err.message, 'error'); }
  }

  return (
    <section>
      <div className="section-head">
        <h2>Manage products</h2>
        <button className="btn" type="button" onClick={onBack}>← Back to store</button>
      </div>

      <form className="admin-form" ref={formRef} onSubmit={submit}>
        <label>Name<input value={form.name} onChange={set('name')} required /></label>
        <label>Category
          <select value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="wide">Description<input value={form.description} onChange={set('description')} /></label>
        <label>Price (USD)<input type="number" step="0.01" min="0" value={form.price} onChange={set('price')} required /></label>
        <label>Old price (optional)<input type="number" step="0.01" min="0" value={form.oldPrice} onChange={set('oldPrice')} /></label>
        <label>Stock<input type="number" step="1" min="0" value={form.stock} onChange={set('stock')} required /></label>
        <label>Product image (JPG, PNG, WEBP or GIF, max 2 MB)
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" ref={fileRef}
            onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] || null }))} />
        </label>
        {form.id && safeUrl(form.image) && !form.file && (
          <div className="wide current-image">
            <img className="thumb" src={safeUrl(form.image)} alt="" />
            <span className="muted">Current image — choose a file only if you want to replace it</span>
          </div>
        )}
        <div className="wide form-actions">
          <button type="submit" className="btn btn-primary">{form.id ? 'Save changes' : 'Add product'}</button>
          {form.id && <button type="button" className="btn" onClick={resetForm}>Cancel edit</button>}
        </div>
      </form>

      <div className="table-wrap">
        <table className="admin-table">
          <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th /></tr></thead>
          <tbody>
            {products.length === 0 && <tr><td colSpan="6" className="muted">No products yet.</td></tr>}
            {products.map((p) => (
              <tr key={p._id}>
                <td>
                  {safeUrl(p.imageUrl)
                    ? <img className="thumb" src={safeUrl(p.imageUrl)} alt={p.name} loading="lazy" />
                    : <span className="thumb thumb-empty" aria-label="No image">—</span>}
                </td>
                <td>{p.name}</td><td>{p.category}</td><td>{money(p.priceCents)}</td><td>{p.stock}</td>
                <td className="row-actions">
                  <button type="button" className="btn" onClick={() => edit(p)}>Edit</button>
                  <button type="button" className="btn btn-danger" onClick={() => remove(p)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}