/**
 * Riquadro con il suggerimento di progressione e la sua spiegazione.
 */
import type { Suggestion, SuggestionAction } from '../../domain/progression';
import { Button } from '../../components/ui';

const STYLES: Record<SuggestionAction, { label: string; className: string }> = {
  increase_load: { label: 'Aumenta il carico', className: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' },
  increase_reps: { label: 'Aggiungi ripetizioni', className: 'border-sky-400/40 bg-sky-400/10 text-sky-300' },
  hold: { label: 'Mantieni', className: 'border-amber-400/40 bg-amber-400/10 text-amber-300' },
  deload: { label: 'Scarico', className: 'border-rose-400/40 bg-rose-400/10 text-rose-300' },
  first_time: { label: 'Prima volta', className: 'border-line bg-surface-2 text-muted' },
};

export function SuggestionBox({
  suggestion,
  title,
  onApplyEarlyIncrease,
  earlyIncreaseApplied = false,
}: {
  suggestion: Suggestion;
  /** Testo sopra l'etichetta, es. "Oggi" o "Prossima volta". */
  title?: string;
  /** Se presente, mostra il pulsante per applicare subito l'aumento suggerito dall'RPE. */
  onApplyEarlyIncrease?: () => void;
  earlyIncreaseApplied?: boolean;
}) {
  const style = STYLES[suggestion.action];
  return (
    <div className="space-y-2">
      <div className={`rounded-2xl border p-3 ${style.className}`}>
        <div className="text-xs font-bold tracking-wide uppercase">
          {title ? `${title} · ` : ''}
          {style.label}
        </div>
        <p className="mt-1 text-sm leading-snug text-text">{suggestion.reason}</p>
      </div>
      {suggestion.earlyIncrease && (
        <div className="rounded-2xl border border-accent/40 bg-accent/10 p-3">
          <p className="text-sm leading-snug">{suggestion.earlyIncrease.message}</p>
          {onApplyEarlyIncrease && (
            <Button
              variant={earlyIncreaseApplied ? 'secondary' : 'primary'}
              className="mt-2 w-full"
              disabled={earlyIncreaseApplied}
              onClick={onApplyEarlyIncrease}
            >
              {earlyIncreaseApplied ? 'Aumento applicato' : 'Aumenta già da oggi'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
