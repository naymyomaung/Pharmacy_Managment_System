import { Link } from 'react-router-dom';
import { useDrugs, usePurchases, useSales, useSuppliers } from '../hooks/queries';
import { Badge, Card, Spinner } from '../components/ui';
import { useAuth } from '../store/auth';
import { day } from '../lib/report';

const EXPIRY_WINDOW = 7;

export default function Dashboard() {
  const drugs = useDrugs();
  const sales = useSales();
  const purchases = usePurchases();
  const suppliers = useSuppliers();
  const user = useAuth((s) => s.user);
  if (drugs.isLoading || sales.isLoading) return <Spinner text="Preparing clinic overview…" />;

  const todayKey = day(new Date());
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  const drugList = drugs.data ?? [];
  const saleList = sales.data ?? [];
  const low = drugList.filter((d) => d.stockQuantity < 10);
  const outOfStock = drugList.filter((d) => d.stockQuantity <= 0);
  const revenue = saleList.reduce((s, x) => s + Number(x.netAmount ?? x.totalAmount ?? 0), 0);
  const todaySales = saleList.filter((s) => day(s.saleDate) === todayKey);
  const todayRevenue = todaySales.reduce((s, x) => s + Number(x.netAmount ?? x.totalAmount ?? 0), 0);
  const inventoryValue = drugList.reduce((s, d) => s + Number(d.stockQuantity || 0) * Number(d.sellingPrice || 0), 0);
  const expiring = drugList
    .filter((d) => d.expiryDate && Math.ceil((new Date(d.expiryDate).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000) <= EXPIRY_WINDOW)
    .sort((a, b) => +new Date(a.expiryDate!) - +new Date(b.expiryDate!));

  const paySplit = ['Cash', 'Card', 'Mobile'].map((m) => ({
    method: m,
    count: saleList.filter((s) => (s.paymentMethod ?? 'Cash') === m).length,
    total: saleList.filter((s) => (s.paymentMethod ?? 'Cash') === m).reduce((s, x) => s + Number(x.netAmount ?? x.totalAmount ?? 0), 0),
  }));

  // Last 7 days revenue (oldest → today)
  const last7 = Array.from({ length: 7 }, (_, k) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - (6 - k));
    const key = day(dt);
    const rows = saleList.filter((s) => day(s.saleDate) === key);
    return {
      key,
      label: dt.toLocaleDateString(undefined, { weekday: 'short' }),
      date: dt.getDate(),
      total: rows.reduce((s, x) => s + Number(x.netAmount ?? x.totalAmount ?? 0), 0),
      count: rows.length,
      isToday: key === todayKey,
    };
  });
  const maxDay = Math.max(1, ...last7.map((d) => d.total));
  const weekTotal = last7.reduce((s, d) => s + d.total, 0);

  const topValue = [...drugList]
    .map((d) => ({ d, value: Number(d.stockQuantity || 0) * Number(d.sellingPrice || 0) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const stats = [
    { label: 'Drugs in stock', value: drugList.length, sub: `${outOfStock.length} out of stock`, icon: '💊', tile: 'bg-brand-100', to: '/drugs' },
    { label: 'Low stock (<10)', value: low.length, sub: 'needs restocking', icon: '⚠️', tile: 'bg-amber-100', to: '/drugs' },
    { label: "Today's sales", value: todaySales.length, sub: `${todayRevenue.toFixed(0)} MMK today`, icon: '🧾', tile: 'bg-cyan-100', to: '/sales/history' },
    { label: 'Revenue (all)', value: `${revenue.toFixed(0)} MMK`, sub: `${saleList.length} receipts`, icon: '💰', tile: 'bg-emerald-100', to: '/reports/sales' },
    { label: 'Inventory value', value: `${inventoryValue.toFixed(0)} MMK`, sub: 'stock × price', icon: '🏦', tile: 'bg-violet-100', to: '/reports/closing' },
    { label: `Expiring ≤${EXPIRY_WINDOW}d`, value: expiring.length, sub: 'check soon', icon: '⏳', tile: 'bg-rose-100', to: '/reports/near-expiry' },
    { label: 'Purchases', value: purchases.data?.length ?? 0, sub: 'stock in', icon: '📦', tile: 'bg-sky-100', to: '/purchases' },
    { label: 'Suppliers', value: suppliers.data?.length ?? 0, sub: 'partners', icon: '🚚', tile: 'bg-teal-100', to: '/suppliers' },
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
          {low.length ? `${low.length} drug${low.length > 1 ? 's need' : ' needs'} restocking` : 'All shelves are stocked'}
          {expiring.length ? ` • ${expiring.length} expiring within ${EXPIRY_WINDOW} days` : ''}. Here is your clinic at a glance.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/sales" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-brand-700 shadow transition hover:bg-brand-50 active:scale-[.98]">+ New sale</Link>
          <Link to="/purchases" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/25 active:scale-[.98]">+ New purchase</Link>
          <Link to="/reports/closing" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/25 active:scale-[.98]">Closing report</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="card !p-4 transition hover:-translate-y-0.5 hover:shadow-pop">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${s.tile}`}>{s.icon}</span>
            <p className="mt-2 truncate text-lg font-bold text-clinic-ink">{s.value}</p>
            <p className="text-xs text-clinic-muted">{s.label}</p>
            <p className="truncate text-[11px] text-slate-400">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* Chart + alerts */}
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Card
          title="Sales — last 7 days"
          icon="📈"
          action={<Link to="/reports/sales" className="btn-ghost !px-3 !py-1.5 text-xs">Full report</Link>}
        >
          <div className="flex h-44 items-end gap-2 sm:gap-3" title={`${weekTotal.toFixed(0)} MMK this week`}>
            {last7.map((d) => (
              <div key={d.key} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${d.label}: ${d.total.toFixed(0)} MMK (${d.count} receipts)`}>
                <span className="text-[11px] font-bold text-slate-600">{d.total >= 1000 ? `${(d.total / 1000).toFixed(d.total >= 10000 ? 0 : 1)}k` : d.total.toFixed(0)}</span>
                <div className="flex h-28 w-full items-end rounded-lg bg-slate-100">
                  <div
                    className={`w-full rounded-lg transition-all ${d.isToday ? 'bg-gradient-to-t from-brand-600 to-clinic-accent' : 'bg-brand-300'}`}
                    style={{ height: `${Math.max(d.total > 0 ? 6 : 2, (d.total / maxDay) * 100)}%` }}
                  />
                </div>
                <span className={`text-[11px] ${d.isToday ? 'font-bold text-brand-700' : 'text-slate-500'}`}>{d.label}</span>
                <span className="text-[10px] text-slate-400">{d.date} • {d.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-clinic-line pt-3 text-xs">
            <Badge tone="teal">Week: {weekTotal.toFixed(0)} MMK</Badge>
            <Badge tone="slate">{last7.reduce((s, d) => s + d.count, 0)} receipts</Badge>
            <Badge tone="blue">Avg: {(saleList.length ? revenue / saleList.length : 0).toFixed(0)} MMK/sale</Badge>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {paySplit.map((p) => (
              <div key={p.method} className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                <p className="text-xs font-semibold text-slate-600">{p.method}</p>
                <p className="text-sm font-bold text-clinic-ink">{p.total.toFixed(0)}</p>
                <p className="text-[11px] text-slate-400">{p.count} sales</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card title="Low stock alerts" icon="⚠️" action={<Link to="/drugs" className="btn-ghost !px-3 !py-1.5 text-xs">Manage drugs</Link>}>
            {low.length === 0 ? <p className="text-sm text-slate-500">✅ All stocked. Great job!</p> :
              <ul className="divide-y divide-clinic-line text-sm">
                {low.slice(0, 8).map((d) => (
                  <li key={d.drugId} className="flex items-center justify-between gap-2 py-2">
                    <span className="font-medium">{d.drugName} <span className="text-xs font-normal text-slate-400">• {d.genericName}</span></span>
                    <Badge tone={d.stockQuantity <= 0 ? 'red' : 'amber'}>{d.stockQuantity} left</Badge>
                  </li>
                ))}
              </ul>}
          </Card>

          <Card title={`Expiring ≤${EXPIRY_WINDOW} days`} icon="⏳" action={<Link to="/reports/near-expiry" className="btn-ghost !px-3 !py-1.5 text-xs">Full list</Link>}>
            {!expiring.length ? <p className="text-sm text-slate-500">✅ Nothing expiring soon.</p> :
              <ul className="divide-y divide-clinic-line text-sm">
                {expiring.slice(0, 5).map((d) => {
                  const n = Math.ceil((new Date(d.expiryDate!).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
                  return (
                    <li key={d.drugId} className="flex items-center justify-between gap-2 py-2">
                      <span className="font-medium">{d.drugName}
                        <span className="block text-xs font-normal text-slate-400">{d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : ''} • {d.stockQuantity} in stock</span>
                      </span>
                      <Badge tone={n < 0 ? 'red' : 'amber'}>{n < 0 ? `expired ${Math.abs(n)}d ago` : n === 0 ? 'today' : `${n}d left`}</Badge>
                    </li>
                  );
                })}
              </ul>}
          </Card>
        </div>
      </div>

      {/* Top inventory value */}
      <Card title="Top inventory value" icon="🏦" action={<Link to="/reports/closing" className="btn-ghost !px-3 !py-1.5 text-xs">Closing report</Link>}>
        {!topValue.length ? <p className="text-sm text-slate-500">No drugs yet.</p> :
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {topValue.map(({ d, value }) => (
              <li key={d.drugId} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="truncate text-sm font-semibold text-slate-800">{d.drugName}</p>
                <p className="text-xs text-slate-500">{d.stockQuantity} × {Number(d.sellingPrice).toFixed(0)} MMK</p>
                <p className="text-sm font-bold text-emerald-700">{value.toFixed(0)} MMK</p>
              </li>
            ))}
          </ul>}
      </Card>
    </div>
  );
}
