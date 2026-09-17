/**
 * COMPONENTI DI BASE DELL'INTERFACCIA
 * Pulsanti, campi, selettori: grandi e facili da toccare con il pollice.
 */
import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { formatDecimal } from '../domain/format';
import { IconMinus, IconPlus } from './icons';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './styles';

// ---------------------------------------------------------------------------
// Pulsanti
// ---------------------------------------------------------------------------

export function Button({
  variant,
  size,
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className = '',
  ...props
}: LinkProps & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}

// ---------------------------------------------------------------------------
// Stepper: valore numerico con pulsanti − e +
// ---------------------------------------------------------------------------

/** Arrotonda a 3 decimali per evitare valori tipo 62.50000001. */
const clean = (n: number) => Math.round(n * 1000) / 1000;

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  step: number;
  min?: number;
  max?: number;
  /** Testo sotto il numero, es. "kg" o "rip". */
  unit?: string;
  /** Etichetta per i lettori di schermo, es. "Carico". */
  label: string;
  /** Come mostrare il valore (predefinito: numero con la virgola). */
  format?: (value: number) => string;
  /** Tastiera: "decimal" per i kg, "numeric" per le ripetizioni. */
  inputMode?: 'decimal' | 'numeric';
  /** Il valore può essere scritto a mano toccando il numero. */
  editable?: boolean;
}

export function Stepper({
  value,
  onChange,
  step,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  unit,
  label,
  format = formatDecimal,
  inputMode = 'decimal',
  editable = true,
}: StepperProps) {
  // Testo in corso di digitazione (null quando non si sta scrivendo).
  const [draft, setDraft] = useState<string | null>(null);

  const clamp = (n: number) => Math.min(max, Math.max(min, clean(n)));

  const commit = () => {
    if (draft !== null) {
      const parsed = Number(draft.replace(',', '.'));
      if (draft.trim() !== '' && Number.isFinite(parsed)) onChange(clamp(parsed));
    }
    setDraft(null);
  };

  return (
    <div className="flex min-w-0 items-stretch rounded-2xl bg-surface-2">
      <button
        type="button"
        aria-label={`${label}: diminuisci`}
        className="flex w-12 shrink-0 items-center justify-center rounded-l-2xl text-muted active:bg-line disabled:opacity-30"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
      >
        <IconMinus size={22} />
      </button>
      <label className="flex min-w-0 flex-1 flex-col items-center justify-center py-1">
        <span className="sr-only">{label}</span>
        {editable ? (
          <input
            className="w-full min-w-0 bg-transparent text-center text-xl font-bold tabular-nums outline-none placeholder:text-muted"
            inputMode={inputMode}
            value={draft ?? format(value)}
            // Al tocco il campo si svuota (il valore attuale resta visibile in grigio):
            // così si scrive subito il nuovo numero. Se non scrivi nulla, resta quello di prima.
            placeholder={format(value)}
            onFocus={() => setDraft('')}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <span className="text-xl font-bold tabular-nums">{format(value)}</span>
        )}
        {unit && <span className="text-xs leading-none text-muted">{unit}</span>}
      </label>
      <button
        type="button"
        aria-label={`${label}: aumenta`}
        className="flex w-12 shrink-0 items-center justify-center rounded-r-2xl text-muted active:bg-line disabled:opacity-30"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
      >
        <IconPlus size={22} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selettori
// ---------------------------------------------------------------------------

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`min-h-11 rounded-xl px-2 text-sm font-semibold transition ${
            o.value === value ? 'bg-accent text-accent-ink' : 'text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Pulsanti "a pillola" per scegliere tra pochi valori. */
export function Chips<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`min-h-11 rounded-full px-4 text-sm font-semibold transition ${
            o.value === value ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-text'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl bg-surface p-4 text-left"
    >
      <span>
        <span className="block font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </span>
      <span
        className={`relative h-8 w-14 shrink-0 rounded-full transition ${checked ? 'bg-accent' : 'bg-line'}`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${checked ? 'left-7' : 'left-1'}`}
        />
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Struttura delle pagine
// ---------------------------------------------------------------------------

/** Campo di un modulo con etichetta e testo di aiuto. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-muted">{label}</div>
      {children}
      {hint && <div className="text-sm text-muted">{hint}</div>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-surface p-4 ${className}`}>{children}</div>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-line p-6 text-center">
      <div className="font-semibold">{title}</div>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

/** Riquadro con un numero importante (es. record, conteggi). */
export function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-xl font-bold">{value}</div>
      {detail && <div className="mt-0.5 text-xs text-muted">{detail}</div>}
    </div>
  );
}
