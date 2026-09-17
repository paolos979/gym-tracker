/**
 * IMPOSTAZIONI: lettura e salvataggio.
 */
import { DEFAULT_SETTINGS } from '../domain/defaults';
import type { Settings } from '../domain/types';
import { db, type GymDatabase } from './database';

/**
 * Restituisce le impostazioni salvate, completate con i valori predefiniti.
 * Così, se una versione futura aggiunge un'impostazione, chi ha già dei dati
 * salvati riceve automaticamente il valore predefinito.
 */
export async function getSettings(database: GymDatabase = db): Promise<Settings> {
  const stored = await database.settings.get('app');
  if (!stored) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    defaultIncrementsKg: { ...DEFAULT_SETTINGS.defaultIncrementsKg, ...stored.defaultIncrementsKg },
    defaultRestSeconds: { ...DEFAULT_SETTINGS.defaultRestSeconds, ...stored.defaultRestSeconds },
  };
}

export async function saveSettings(settings: Settings, database: GymDatabase = db): Promise<void> {
  await database.settings.put(settings);
}
