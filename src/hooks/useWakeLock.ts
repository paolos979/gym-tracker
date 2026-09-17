import { useEffect } from 'react';

/**
 * Tiene lo schermo acceso finché `enabled` è true.
 *
 * Utile in palestra: con lo schermo bloccato iPhone sospende l'app e il
 * timer non può suonare. Se il browser non lo supporta, non succede nulla.
 * Il blocco si perde quando esci dall'app: viene richiesto di nuovo al rientro.
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) void lock.release();
        else sentinel = lock;
      } catch {
        // Non concesso (es. batteria scarica): pazienza.
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void sentinel?.release();
    };
  }, [enabled]);
}
