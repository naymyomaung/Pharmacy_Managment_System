import { useEffect, type ReactNode } from 'react';
import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useUi } from '../store/ui';

interface NavItem { to: string; label: string; icon: string; end?: boolean }

const groups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Operations',
    items: [
      { to: '/', label: 'Dashboard', icon: '🏥', end: true },
      { to: '/sales', label: 'Sales (POS)', icon: '🧾', end: true },
      { to: '/sales/history', label: 'Sales History', icon: '🧾' },
      { to: '/purchases', label: 'Purchases', icon: '📦' },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { to: '/drugs', label: 'Drugs', icon: '💊' },
      { to: '/units', label: 'Units', icon: '⚖️' },
      { to: '/conversions', label: 'Conversions', icon: '🔄' },
      { to: '/suppliers', label: 'Suppliers', icon: '🚚' },
    ],
  },
  {
    title: 'System',
    items: [{ to: '/users', label: 'Users', icon: '👥' }],
  },
];

const reportLinks: NavItem[] = [
  { to: '/reports/sales', label: 'Sale Report', icon: '📈' },
  { to: '/reports/purchases', label: 'Purchase Report', icon: '📉' },
  { to: '/reports/closing', label: 'Drug Closing', icon: '📋' },
];

function Item({ l }: { l: NavItem }) {
  return (
    <NavLink
      key={l.to}
      to={l.to}
      end={l.end}
      className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
    >
      <span className="nav-ico">{l.icon}</span>
      {l.label}
    </NavLink>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { sidebarOpen, toggleSidebar } = useUi();
  const nav = useNavigate();
  const loc = useLocation();
  const reportsActive = loc.pathname.startsWith('/reports');
  const [reportsOpen, setReportsOpen] = useState(reportsActive);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  useEffect(() => {
    const f = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  const showSidebar = isDesktop || sidebarOpen;
  const initial = (user?.fullName ?? user?.username ?? '?').trim().charAt(0).toUpperCase();

  const pageTitle = [...groups.flatMap((g) => g.items), ...reportLinks]
    .filter((l) => l.to !== '/' && loc.pathname.startsWith(l.to))
    .sort((a, b) => b.to.length - a.to.length)[0]?.label ?? 'Dashboard';

  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <header className="sticky top-0 z-20 border-b border-clinic-line bg-white/85 backdrop-blur">
        <div className="h-1 bg-gradient-to-r from-brand-500 via-brand-400 to-clinic-accent" />
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button className="btn-ghost !rounded-lg !px-2.5 !py-1.5 lg:hidden" onClick={toggleSidebar}>☰</button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-clinic-ink">{pageTitle}</p>
            <p className="hidden text-[11px] text-clinic-muted sm:block">Clinic Pharmacy Management</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="hidden items-center gap-2 rounded-full border border-clinic-line bg-brand-50/60 py-1 pl-1 pr-3 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-clinic-accent font-bold text-white">
                {initial}
              </span>
              <span className="leading-tight">
                <span className="block max-w-[140px] truncate font-semibold text-clinic-ink">{user?.fullName}</span>
                <span className="block text-[11px] capitalize text-clinic-muted">{user?.role}</span>
              </span>
            </span>
            <button className="btn-ghost !rounded-lg !px-3 !py-1.5" onClick={() => { logout(); nav('/login'); }}>Logout</button>
          </div>
        </div>
      </header>

      <div className="flex">
        {showSidebar && (
          <aside className="fixed z-10 h-[calc(100vh-65px)] w-64 overflow-y-auto border-r border-clinic-line bg-white p-3 lg:sticky lg:top-[65px]">
            {/* Brand */}
            <Link to="/" className="mb-2 flex items-center gap-2.5 rounded-2xl bg-gradient-to-br from-brand-600 via-brand-600 to-clinic-accent p-3 text-white shadow-card">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-2xl">✚</span>
              <span className="leading-tight">
                <span className="block font-bold">MediCare Pharmacy</span>
                <span className="block text-[11px] text-white/80">Clinic Management Suite</span>
              </span>
            </Link>

            <nav className="flex flex-col">
              {groups.map((g) => (
                <div key={g.title}>
                  <p className="nav-section">{g.title}</p>
                  {g.items.map((l) => <Item key={l.to} l={l} />)}
                </div>
              ))}

              {/* Reports dropdown */}
              <p className="nav-section">Analytics</p>
              <button
                type="button"
                onClick={() => setReportsOpen((o) => !o)}
                className={`nav-link w-full ${reportsActive ? 'nav-link-active' : ''}`}
              >
                <span className="nav-ico">📊</span>
                <span className="flex-1 text-left">Reports</span>
                <span className="text-xs">{reportsOpen ? '▾' : '▸'}</span>
              </button>
              {reportsOpen && (
                <div className="ml-5 flex flex-col gap-0.5 border-l-2 border-brand-100 py-1 pl-2">
                  {reportLinks.map((l) => <Item key={l.to} l={l} />)}
                </div>
              )}
            </nav>

            {/* Care note */}
            <div className="mt-4 rounded-2xl bg-brand-50 p-3 text-xs leading-relaxed text-brand-800">
              <p className="font-bold">💚 Care reminder</p>
              <p className="text-brand-800/80">Check expiry dates weekly and keep FEFO batches tidy.</p>
            </div>
          </aside>
        )}
        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
