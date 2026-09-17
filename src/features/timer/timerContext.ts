/**
 * STATO CONDIVISO DEL TIMER DI RECUPERO
 *
 * Il timer non "conta i secondi": salva l'ORA DI FINE. Così resta preciso
 * anche se chiudi l'app, blocchi il telefono o ricarichi la pagina:
 * quando la riapri, il tempo rimanente viene ricalcolato.
 */
import { createContext, useContext } from 'react';

export interface RestTimerState {
  /** Ora di fine, in millisecondi (Date.now()). */
  endsAt: number;
  /** Durata impostata all'avvio (secondi), per la barra di avanzamento. */
  durationSec: number;
  /** Testo mostrato, es. il nome dell'esercizio. */
  label: string;
  /** true dopo che è stato dato l'avviso di fine. */
  notified: boolean;
}

export interface RestTimerApi {
  timer: RestTimerState | null;
  start: (durationSec: number, label: string) => void;
  addSeconds: (seconds: number) => void;
  stop: () => void;
}

export const RestTimerContext = createContext<RestTimerApi | null>(null);

export function useRestTimer(): RestTimerApi {
  const api = useContext(RestTimerContext);
  if (!api) throw new Error('useRestTimer va usato dentro <RestTimerProvider>');
  return api;
}

/** Secondi rimanenti (mai negativi). */
export function remainingSeconds(timer: RestTimerState, now: number): number {
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}
