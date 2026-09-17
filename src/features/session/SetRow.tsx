/**
 * Riga di una serie: carico, ripetizioni, RPE, riscaldamento e spunta.
 * Le serie già fatte si compattano su una riga; toccandole si riaprono.
 */
import { useState, type ReactNode } from 'react';
import { IconCheck, IconTrash } from '../../components/icons';
import { Stepper } from '../../components/ui';
import { formatDecimal, formatLoad } from '../../domain/format';
import type { SetEntry } from '../../domain/types';

interface SetRowProps {
  set: SetEntry;
  label: string;
  weightStep: number;
  isBodyweight: boolean;
  onWeightChange: (weightKg: number) => void;
  onChange: (patch: Partial<SetEntry>) => void;
  onToggleComplete: () => void;
  onRemove: () => void;
}

export function SetRow({
  set,
  label,
  weightStep,
  isBodyweight,
  onWeightChange,
  onChange,
  onToggleComplete,
  onRemove,
}: SetRowProps) {
  const done = set.completedAt !== null;
  const [expanded, setExpanded] = useState(false);
  const [rpeOpen, setRpeOpen] = useState(false);

  // Serie fatta e chiusa: una riga compatta.
  if (done && !expanded) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-accent/10 p-2 pl-3">
        <button type="button" className="min-h-12 min-w-0 flex-1 text-left" onClick={() => setExpanded(true)}>
          <div className="text-xs font-semibold text-muted">{label}</div>
          <div className="truncate font-bold tabular-nums">
            {formatLoad(set.weightKg, isBodyweight)} × {set.reps}
            {set.rpe !== null && <span className="font-normal text-muted"> · RPE {formatDecimal(set.rpe)}</span>}
          </div>
        </button>
        <CheckButton done onClick={onToggleComplete} />
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-3 ${done ? 'bg-accent/10' : 'bg-surface'} ${set.isWarmup ? 'opacity-90' : ''}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex-1 truncate text-sm font-semibold text-muted">{label}</span>
        <SmallChip active={set.isWarmup} onClick={() => onChange({ isWarmup: !set.isWarmup })}>
          Riscald.
        </SmallChip>
        <SmallChip active={set.rpe !== null} onClick={() => setRpeOpen((o) => !o)}>
          RPE {set.rpe !== null ? formatDecimal(set.rpe) : '–'}
        </SmallChip>
        <button
          type="button"
          aria-label="Elimina serie"
          onClick={onRemove}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted active:bg-surface-2"
        >
          <IconTrash size={18} />
        </button>
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] items-stretch gap-2">
        <Stepper
          label={isBodyweight ? 'Zavorra' : 'Carico'}
          unit={isBodyweight ? 'kg zavorra' : 'kg'}
          value={set.weightKg}
          step={weightStep}
          onChange={onWeightChange}
        />
        <Stepper
          label="Ripetizioni"
          unit="rip"
          value={set.reps}
          step={1}
          inputMode="numeric"
          onChange={(reps) => onChange({ reps: Math.round(reps) })}
        />
        <CheckButton
          done={done}
          onClick={() => {
            onToggleComplete();
            setExpanded(false);
            setRpeOpen(false);
          }}
        />
      </div>

      {rpeOpen && (
        <div className="mt-3">
          <div className="mb-2 text-xs text-muted">Quanto è stata dura? (10 = massimo sforzo)</div>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  onChange({ rpe: n });
                  setRpeOpen(false);
                }}
                className={`min-h-11 rounded-xl font-bold ${set.rpe === n ? 'bg-accent text-accent-ink' : 'bg-surface-2'}`}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 min-h-11 w-full rounded-xl bg-surface-2 text-sm text-muted"
            onClick={() => {
              onChange({ rpe: null });
              setRpeOpen(false);
            }}
          >
            Nessun RPE
          </button>
        </div>
      )}
    </div>
  );
}

function CheckButton({ done, onClick }: { done: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={done ? 'Segna come da fare' : 'Segna come fatta'}
      aria-pressed={done}
      onClick={onClick}
      className={`flex min-h-14 w-16 items-center justify-center rounded-2xl transition active:scale-95 ${
        done ? 'bg-accent text-accent-ink' : 'border-2 border-accent/60 text-accent'
      }`}
    >
      <IconCheck size={30} />
    </button>
  );
}

function SmallChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-9 rounded-full px-3 text-xs font-semibold ${
        active ? 'bg-accent/20 text-accent' : 'bg-surface-2 text-muted'
      }`}
    >
      {children}
    </button>
  );
}
