import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const EMPTY = { name: '', email: '', password: '' };

export default function AuthModal() {
  const { modal, closeAuth, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!modal.open) return null;

  const signup = mode === 'signup';
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const switchMode = (next) => { setMode(next); setError(''); };

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (signup) await register(form.name, form.email, form.password);
      else await login(form.email, form.password);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"
      onClick={(e) => { if (e.target === e.currentTarget) closeAuth(); }}>
      <div className="modal-card">
        <button className="icon-btn modal-x" type="button" aria-label="Close" onClick={closeAuth}>✕</button>
        <h2 id="auth-title">{signup ? 'Create account' : 'Log in'}</h2>
        {modal.hint && <p className="muted">{modal.hint}</p>}
        <p className="error" role="alert">{error}</p>

        <form className="stack" onSubmit={submit}>
          {signup && <label>Name<input value={form.name} onChange={set('name')} required autoComplete="name" /></label>}
          <label>Email<input type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></label>
          <label>{signup ? 'Password (min 8 characters)' : 'Password'}
            <input type="password" value={form.password} onChange={set('password')} required minLength={signup ? 8 : undefined}
              autoComplete={signup ? 'new-password' : 'current-password'} />
          </label>
          <button className="btn btn-primary block" type="submit" disabled={busy}>{signup ? 'Create account' : 'Log in'}</button>
        </form>

        <p className="switch">
          {signup
            ? <>Already registered? <button type="button" className="link-btn" onClick={() => switchMode('login')}>Log in</button></>
            : <>New here? <button type="button" className="link-btn" onClick={() => switchMode('signup')}>Create an account</button></>}
        </p>
      </div>
    </div>
  );
}
