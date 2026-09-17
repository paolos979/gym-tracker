/**
 * Quanti esercizi della libreria non sono ancora nella propria lista.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { listExercises } from '../../db/exercises';
import { EXERCISE_CATALOG, normalizeExerciseName } from '../../domain/exerciseCatalog';

/** Quanti esercizi della libreria non hai ancora. */
export function useCatalogAvailableCount(): number | undefined {
  const existingNames = useLiveQuery(async () => {
    const all = await listExercises({ includeArchived: true });
    return new Set(all.map((e) => normalizeExerciseName(e.name)));
  });
  if (!existingNames) return undefined;
  return EXERCISE_CATALOG.filter((e) => !existingNames.has(normalizeExerciseName(e.name))).length;
}
