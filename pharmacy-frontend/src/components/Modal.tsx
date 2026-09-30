import { useEffect, type ReactNode } from 'react';

export function Modal({ title, onClose, children, size }: {
  title: string; onClose: () => void; children: ReactNode; size?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);

  const maxW = size === 'full' ? 'sm:max-w-[95vw]' : size === '2xl' ? 'sm:max-w-6xl' : size === 'xl' ? 'sm:max-w-4xl' : size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg';
  const maxH = size === 'full' ? 'max-h-[100dvh] min-h-[100dvh] sm:min-h-[96dvh]' : 'max-h-[90vh]';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-clinic-ink/50 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`modal-panel ${maxH} w-full overflow-y-auto rounded-t-3xl border border-clinic-line bg-white p-4 shadow-pop sm:rounded-3xl sm:p-6 ${maxW}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-clinic-ink">
            <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-brand-500 to-clinic-accent" />
            {title}
          </h2>
          <button className="btn-ghost rounded-full !px-2.5 !py-1" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
