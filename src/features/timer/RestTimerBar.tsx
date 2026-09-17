/**
 * Barra del timer di recupero, fissa in basso durante l'allenamento.
 */
import { useEffect } from 'react';
import { IconTimer } from '../../components/icons';
import { formatClock } from '../../domain/format';
import { useNow } from '../../hooks/useNow';
import { remainingSeconds, useRestTimer } from './timerContext';

/** Dopo quanti secondi dalla fine la barra sparisce da sola. */
const AUTO_HIDE_AFTER_SEC = 60;

export function RestTimerBar() {
  const { timer, addSeconds, stop } = useRestTimer();
  const now = useNow(250, timer !== null);

  const remaining = timer ? remainingSeconds(timer, now) : 0;
  const finished = timer !== null && remaining === 0;
  const secondsSinceEnd = timer ? (now - timer.endsAt) / 1000 : 0;

  useEffect(() => {
    if (finished && secondsSinceEnd > AUTO_HIDE_AFTER_SEC) stop();
  }, [finished, secondsSinceEnd, stop]);

  if (!timer) return null;

  const progress = timer.durationSec > 0 ? 1 - remaining / timer.durationSec : 1;

  return (
    <div
      className={`pb-safe fixed inset-x-0 bottom-0 z-40 border-t transition-colors ${
        finished ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface'
      }`}
      role="timer"
      aria-live="polite"
    >
      {!finished && (
        <div className="h-1 bg-line">
          <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      <div className="mx-auto flex max-w-xl items-center gap-2 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className={`flex items-center gap-1 truncate text-xs font-semibold ${finished ? '' : 'text-muted'}`}>
            <IconTimer size={14} />
            {finished ? 'Recupero finito: vai!' : `Recupero · ${timer.label}`}
          </div>
          <div className="text-4xl font-black tabular-nums leading-tight">{formatClock(remaining)}</div>
        </div>
        {finished ? (
          <button
            type="button"
            onClick={stop}
            className="min-h-14 rounded-2xl bg-accent-ink px-6 text-lg font-bold text-accent"
          >
            OK
          </button>
        ) : (
          <>
            <TimerButton onClick={() => addSeconds(-15)}>−15</TimerButton>
            <TimerButton onClick={() => addSeconds(30)}>+30</TimerButton>
            <TimerButton onClick={stop}>Salta</TimerButton>
          </>
        )}
      </div>
    </div>
  );
}

function TimerButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-14 min-w-14 rounded-2xl bg-surface-2 px-3 font-bold active:scale-95"
    >
      {children}
    </button>
  );
}
