import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

// Loads the public product list. reload(true) refreshes quietly (no skeleton flash).
export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      setProducts(await api('/products'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { products, loading, error, reload };
}
