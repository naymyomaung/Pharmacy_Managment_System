import { Link } from 'react-router-dom';
import { useDrugs, usePurchases, useSales, useSuppliers } from '../hooks/queries';
import { Badge, Card, Spinner } from '../components/ui';
import { useAuth } from '../store/auth';

export default function Dashboard() {
  const drugs = useDrugs();
  const sales = useSales();
  const purchases = usePurchases();
  const suppliers = useSuppliers();
  const user = useAuth((s) => s.user);
  if (drugs.isLoading || sales.isLoading) return <Spinner text="Preparing clinic overview…" />;

  const low = (drugs.data ?? []).filter((d) => d.stockQuantity < 10);
  const revenue = (sales.data ?? []).reduce((s, x) => s + (x.netAmount ?? x.totalAmount), 0);
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  const stats = [
    { label: 'Drugs in stock', value: drugs.data?.length ?? 0, icon: '💊', tile: 'bg-brand-100', to: '/drugs' },
    { label: 'Low stock (<10)', value: low.length, icon: '⚠️', tile: 'bg-amber-100', to: '/drugs' },
    { label: 'Sales receipts', value: sales.data?.length ?? 0, icon: '🧾', tile: 'bg-cyan-100', to: '/sales' },
    { label: 'Revenue', value: `${revenue.toFixed(0)} MMK`, icon: '💰', tile: 'bg-emerald-100', to: '/reports/sales' },
    { label: 'Purchases', value: purchases.data?.length ?? 0, icon: '📦', tile: 'bg-sky-100', to: '/purchases' },
    { label: 'Suppliers', value: suppliers.data?.length ?? 0, icon: '🚚', tile: 'bg-teal-100', to: '/suppliers' },
  ];

  return (
    <div className="grid gap-4">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-clinic-accent p-5 text-white shadow-card sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-32 h-40 w-40 rounded-full bg-white/10" />
        <p className="text-xs uppercase tracking-[.18em] text-white/75">{today}</p>
        <h1 className="mt-1 text-xl font-bold sm:text-2xl">Hello, {user?.fullName ?? 'Doctor'} 👋</h1>
        <p className="mt-1 max-w-xl text-sm text-white/85">
          {low.length ? `${low.length} drug${low.length > 1 ? 's need' : ' needs'} restocking.` : 'All shelves are stocked.'} Here is your clinic at a glance.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/sales" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-brand-700 shadow transition hover:bg-brand-50 active:scale-[.98]">+ New sale</Link>
          <Link to="/purchases" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/25 active:scale-[.98]">+ New purchase</Link>
          <Link to="/reports/closing" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/25 active:scale-[.98]">Closing report</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="card !p-4 transition hover:-translate-y-0.5 hover:shadow-pop">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${s.tile}`}>{s.icon}</span>
            <p className="mt-2 truncate text-lg font-bold text-clinic-ink">{s.value}</p>
            <p className="text-xs text-clinic-muted">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Low stock */}
      <Card title="Low stock alerts" icon="⚠️" action={<Link to="/drugs" className="btn-ghost !px-3 !py-1.5 text-xs">Manage drugs</Link>}>
        {low.length === 0 ? <p className="text-sm text-slate-500">✅ All stocked. Great job!</p> :
          <ul className="divide-y divide-clinic-line text-sm">
            {low.slice(0, 10).map((d) => (
              <li key={d.drugId} className="flex items-center justify-between gap-2 py-2">
                <span className="font-medium">{d.drugName} <span className="text-xs font-normal text-slate-400">• {d.genericName}</span></span>
                <Badge tone={d.stockQuantity <= 0 ? 'red' : 'amber'}>{d.stockQuantity} left</Badge>
              </li>
            ))}
          </ul>}
      </Card>
    </div>
  );
}
