/**
 * STRUTTURA DELLE PAGINE: intestazione, barra di navigazione in basso, finestre di conferma.
 */
import type { ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { IconChevronLeft, IconDumbbell, IconHistory, IconSliders } from './icons';
import { Button } from './ui';

/** Intestazione fissa in alto, con pulsante "indietro" facoltativo. */
export function PageHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Percorso a cui tornare, oppure true per tornare alla pagina precedente. */
  back?: string | true;
  right?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="pt-safe sticky top-0 z-20 border-b border-line/60 bg-bg/90 backdrop-blur">
      <div className="flex min-h-14 items-center gap-2 px-2">
        {back ? (
          <button
            type="button"
            aria-label="Indietro"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full active:bg-surface-2"
            onClick={() => (back === true ? navigate(-1) : navigate(back))}
          >
            <IconChevronLeft size={28} />
          </button>
        ) : (
          <div className="w-2" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{title}</h1>
          {subtitle && <div className="truncate text-sm text-muted">{subtitle}</div>}
        </div>
        {right && <div className="flex shrink-0 items-center gap-2 pr-2">{right}</div>}
      </div>
    </header>
  );
}

const TABS = [
  { to: '/', label: 'Allena', icon: IconDumbbell, end: true },
  { to: '/storico', label: 'Storico', icon: IconHistory, end: false },
  { to: '/gestione', label: 'Gestione', icon: IconSliders, end: false },
];

/** Layout con la barra di navigazione in basso. */
export function TabLayout() {
  return (
    <div className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <Outlet />
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-3">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              <Icon size={24} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

/** Contenitore centrale delle pagine (largo al massimo quanto un telefono grande). */
export function PageBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <main className={`mx-auto max-w-xl space-y-4 p-4 ${className}`}>{children}</main>;
}

/** Barra fissa in basso con il pulsante principale della pagina (es. "Salva"). */
export function BottomActions({ children }: { children: ReactNode }) {
  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-xl gap-2 p-3">{children}</div>
    </div>
  );
}

/** Finestra di conferma (al posto del confirm() del browser). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="pb-safe w-full max-w-md rounded-3xl bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold">{title}</h2>
        {message && <div className="mt-2 text-muted">{message}</div>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button onClick={onCancel} size="lg">
            Annulla
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} size="lg">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Pannello a tutto schermo che sale dal basso (es. scelta degli esercizi). */
export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <PageHeader title={title} right={<Button variant="ghost" onClick={onClose}>Chiudi</Button>} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-xl p-4">{children}</div>
      </div>
      {footer && (
        <div className="pb-safe border-t border-line">
          <div className="mx-auto max-w-xl p-3">{footer}</div>
        </div>
      )}
    </div>
  );
}
