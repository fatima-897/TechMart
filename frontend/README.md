# Task 4 — Frontend (React + Vite)

```bash
npm install
npm run dev      # http://localhost:5173  (port is fixed: the backend only accepts this origin)
npm test         # 26 UI tests with a mocked API
npm run build    # production build into dist/
```

The backend URL defaults to `http://localhost:5001`. To change it, copy `.env.example` to `.env` and edit `VITE_API_URL`.
There is no dev-server proxy: the browser calls the API directly and the backend allows this origin via CORS.

## Structure

| Path | Role |
|---|---|
| `src/api.js` | `api()` fetch wrapper (adds the JWT, normalises errors, signals expired sessions) + saved session |
| `src/context/` | `AuthContext` (login/register/logout, role), `CartContext` (server-backed cart, drawer, "add after login"), `ToastContext` |
| `src/components/` | `Header` (search, cart badge, mobile menu button), `CategoryNav`, `ProductCard`, `CartDrawer` (checkout → Stripe), `AuthModal` |
| `src/pages/` | `Store` (collections, sort, grid), `Admin` (product CRUD, admin only) |
| `src/App.jsx` | layout, filters, Escape-to-close |
| `src/useCheckoutReturn.js` | handles the return from Stripe: asks the backend to confirm the payment, then reloads cart and stock |
| `src/components/PaymentBanner.jsx`, `Footer.jsx` | confirmation banner; site footer |
| `src/test/` | Vitest + React Testing Library tests |
