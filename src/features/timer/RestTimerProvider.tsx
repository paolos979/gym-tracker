/**
 * Gestisce il timer di recupero per tutta l'app e dà l'avviso a fine recupero.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { playFinishSound } from './sound';
import { RestTimerContext, type RestTimerApi, type RestTimerState } from './timerContext';

const STORAGE_KEY = 'gym.restTimer';
/** Se ci si accorge della fine con più di 3 secondi di ritardo (app chiusa), niente suono. */
const LATE_TOLERANCE_MS = 3000;

function loadTimer(): RestTimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RestTimerState) : null;
  } catch {
    return null;
  }
}

function persistTimer(timer: RestTimerState | null) {
  try {
    if (timer) localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Salvataggio non disponibile: il timer funziona lo stesso finché l'app è aperta.
  }
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [timer, setTimer] = useState<RestTimerState | null>(loadTimer);
  const settings = useSettings();
  const soundOn = settings?.timerSound ?? true;

  useEffect(() => persistTimer(timer), [timer]);

  // Avviso di fine recupero: programmato per l'ora di fine.
  useEffect(() => {
    if (!timer || timer.notified) return;
    const notify = () => {
      const late = Date.now() - timer.endsAt > LATE_TOLERANCE_MS;
      if (!late) {
        if (soundOn) playFinishSound();
        // Vibrazione: funziona su Android, su iPhone viene ignorata.
        navigator.vibrate?.([200, 100, 200]);
      }
      setTimer((t) => (t && t.endsAt === timer.endsAt ? { ...t, notified: true } : t));
    };
    const delay = timer.endsAt - Date.now();
    if (delay <= 0) {
      notify();
      return;
    }
    const id = window.setTimeout(notify, delay);
    return () => window.clearTimeout(id);
  }, [timer, soundOn]);

  const start = useCallback((durationSec: number, label: string) => {
    setTimer({ endsAt: Date.now() + durationSec * 1000, durationSec, label, notified: false });
  }, []);

  const addSeconds = useCallback((seconds: number) => {
    setTimer((t) => {
      if (!t) return t;
      // Se il recupero era già finito, si riparte da adesso.
      const base = Math.max(t.endsAt, Date.now());
      const endsAt = Math.max(Date.now(), base + seconds * 1000);
      return { ...t, endsAt, durationSec: Math.max(t.durationSec, Math.ceil((endsAt - Date.now()) / 1000)), notified: false };
    });
  }, []);

  const stop = useCallback(() => setTimer(null), []);

  const api = useMemo<RestTimerApi>(() => ({ timer, start, addSeconds, stop }), [timer, start, addSeconds, stop]);

  return <RestTimerContext.Provider value={api}>{children}</RestTimerContext.Provider>;
}
