import { useEffect, useState } from 'react';

/**
 * Ora attuale (Date.now()) aggiornata ogni `intervalMs` millisecondi.
 * Se `active` è false non aggiorna, così non consuma batteria.
 */
export function useNow(intervalMs: number, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    // Al ritorno nell'app aggiorna subito, senza aspettare il prossimo intervallo.
    const onVisible = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs, active]);
  return now;
}
