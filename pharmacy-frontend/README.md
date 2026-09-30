# PharmacyMS Frontend

React + TypeScript + Vite + Tailwind + TanStack Query/Table + Zustand + SweetAlert2.

## Run

1. Start backend API (`http` profile → http://localhost:5084, swagger).
2. Copy `.env.example` → `.env` and set `VITE_API_URL` (default `http://localhost:5084/api`).
3. `npm install` → `npm run dev` (http://localhost:5173).

## Structure

- `src/api/` — axios client, TS types (mirror C# models), per-resource CRUD
- `src/hooks/queries.ts` — TanStack Query hooks per entity
- `src/store/` — Zustand: `auth` (persisted login), `saleCart` (POS cart), `ui`
- `src/components/` — `AppLayout` (responsive sidebar/topbar), `DataTable` (TanStack Table + pagination), `ui` (Card/Spinner/Badge)
- `src/pages/` — Dashboard, Login, Users, Units, Drugs, Conversions, Suppliers, Purchases, Sales (POS)
- `src/routes/router.tsx` — auth-guarded routes
- `src/lib/alert.ts` — SweetAlert2 toast + confirm helpers
