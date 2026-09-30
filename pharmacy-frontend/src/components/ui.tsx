import type { ReactNode } from 'react';

export const Card = ({ title, icon, action, children }: { title?: string; icon?: string; action?: ReactNode; children: ReactNode }) => (
  <div className="card">
    {(title || action) && (
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="card-title flex items-center gap-2">
          {icon && <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-base">{icon}</span>}
          {title}
        </h2>
        {action}
      </div>
    )}
    {children}
  </div>
);

export const Spinner = ({ text = 'Loading…' }: { text?: string }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-clinic-muted">
    <div className="h-9 w-9 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
    {text}
  </div>
);

export const Empty = ({ text = 'No records found.', icon = '🩺' }: { text?: string; icon?: string }) => (
  <div className="flex flex-col items-center gap-1 py-10 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl">{icon}</span>
    <p className="mt-1 text-sm font-medium text-slate-500">{text}</p>
  </div>
);

export const Badge = ({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'red' | 'amber' | 'teal' | 'blue' }) => {
  const map: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-800',
    red: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-800',
    teal: 'bg-brand-100 text-brand-800',
    blue: 'bg-cyan-100 text-cyan-800',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[tone]}`}>{children}</span>;
};
