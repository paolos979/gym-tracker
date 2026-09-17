import { useLiveQuery } from 'dexie-react-hooks';
import { getSettings } from '../db/settings';
import type { Settings } from '../domain/types';

/** Impostazioni sempre aggiornate (undefined durante il primo caricamento). */
export function useSettings(): Settings | undefined {
  return useLiveQuery(() => getSettings());
}
