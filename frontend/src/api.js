// Session storage + one fetch wrapper used by the whole app.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const session = {
  get token() { return localStorage.getItem('tm_token'); },
  get user() {
    try { return JSON.parse(localStorage.getItem('tm_user') || 'null'); } catch { return null; }
  },
  save(token, user) {
    localStorage.setItem('tm_token', token);
    localStorage.setItem('tm_user', JSON.stringify(user));
  },
  saveUser(user) { localStorage.setItem('tm_user', JSON.stringify(user)); },
  clear() { localStorage.removeItem('tm_token'); localStorage.removeItem('tm_user'); },
};

// api('/products')                                   -> GET, public
// api('/cart', { method: 'POST', body, auth: true }) -> sends the JWT in the Authorization header
export async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  // if (body !== undefined) headers['Content-Type'] = 'application/json';
  // replace:  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const isForm = body instanceof FormData; // file uploads: the browser sets the multipart Content-Type itself
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (auth && session.token) headers.Authorization = `Bearer ${session.token}`;

  let res;
  try {
    res = await fetch(API_URL + path, {
      // method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
      // replace the fetch options line:  method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
      method, headers, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new Error(`Cannot reach the server at ${API_URL}. Is the backend running?`);
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Expired/invalid token: drop the session; AuthContext listens for this event.
    if (res.status === 401 && auth) {
      session.clear();
      window.dispatchEvent(new Event('session-expired'));
    }
    throw new Error((data.errors && data.errors.join(', ')) || data.error || `Request failed (${res.status})`);
  }
  return data;
}
