/**
 * ESERCIZI E SCHEDE: creazione, lettura, modifica.
 */
import {
  bodyRegionFor,
  defaultIncrementFor,
  defaultRestFor,
} from '../domain/defaults';
import {
  catalogExercise,
  normalizeExerciseName,
  type CatalogExercise,
} from '../domain/exerciseCatalog';
import type { Exercise, Settings, WorkoutTemplate } from '../domain/types';
import { db, newId, nowIso, type GymDatabase } from './database';
import { getSettings } from './settings';

/** Campi obbligatori per creare un esercizio; tutti gli altri hanno un valore predefinito. */
export type NewExerciseInput = Pick<Exercise, 'name' | 'muscleGroup' | 'type'> &
  Partial<Omit<Exercise, 'id' | 'createdAt'>>;

/**
 * Costruisce un esercizio completo applicando i valori predefiniti:
 * zona del corpo dal gruppo muscolare, incremento e recupero dalle impostazioni,
 * 3 serie da 8-12 ripetizioni.
 */
export function buildExercise(input: NewExerciseInput, settings: Settings): Exercise {
  const bodyRegion = input.bodyRegion ?? bodyRegionFor(input.muscleGroup);
  return {
    id: newId(),
    createdAt: nowIso(),
    bodyRegion,
    repMin: 8,
    repMax: 12,
    targetSets: 3,
    incrementKg: defaultIncrementFor(input.type, bodyRegion, settings),
    roundingStepKg: null,
    restSeconds: defaultRestFor(input.type, settings),
    isBodyweight: false,
    archived: false,
    ...input,
  };
}

/** Esercizi in ordine alfabetico (esclusi gli archiviati, salvo richiesta). */
export async function listExercises(
  options: { includeArchived?: boolean } = {},
  database: GymDatabase = db,
): Promise<Exercise[]> {
  const all = await database.exercises.orderBy('name').toArray();
  return options.includeArchived ? all : all.filter((e) => !e.archived);
}

export async function getExercise(id: string, database: GymDatabase = db) {
  return database.exercises.get(id);
}

/** Crea o aggiorna un esercizio. */
export async function saveExercise(exercise: Exercise, database: GymDatabase = db): Promise<void> {
  await database.exercises.put(exercise);
}

export function buildTemplate(name: string, exerciseIds: string[]): WorkoutTemplate {
  return { id: newId(), name, exerciseIds, createdAt: nowIso() };
}

export async function listTemplates(database: GymDatabase = db): Promise<WorkoutTemplate[]> {
  return database.templates.orderBy('name').toArray();
}

export async function saveTemplate(template: WorkoutTemplate, database: GymDatabase = db): Promise<void> {
  await database.templates.put(template);
}

export async function deleteTemplate(id: string, database: GymDatabase = db): Promise<void> {
  await database.templates.delete(id);
}

// ---------------------------------------------------------------------------
// Libreria di esercizi pronti
// ---------------------------------------------------------------------------

/** Trasforma una voce della libreria nei campi per creare un esercizio. */
export function catalogToInput(entry: CatalogExercise): NewExerciseInput {
  return {
    name: entry.name,
    muscleGroup: entry.muscleGroup,
    type: entry.type,
    repMin: entry.repMin,
    repMax: entry.repMax,
    targetSets: entry.sets ?? 3,
    roundingStepKg: entry.roundingStep ?? null,
    isBodyweight: entry.bodyweight ?? false,
  };
}

/**
 * Aggiunge alla propria lista gli esercizi scelti dalla libreria,
 * saltando quelli con un nome già presente (maiuscole e accenti esclusi).
 */
export async function addExercisesFromCatalog(
  ids: string[],
  database: GymDatabase = db,
): Promise<{ added: Exercise[]; skipped: string[] }> {
  const settings = await getSettings(database);
  const taken = new Set((await database.exercises.toArray()).map((e) => normalizeExerciseName(e.name)));

  const added: Exercise[] = [];
  const skipped: string[] = [];
  for (const id of ids) {
    const entry = catalogExercise(id);
    const key = normalizeExerciseName(entry.name);
    if (taken.has(key)) {
      skipped.push(entry.name);
      continue;
    }
    taken.add(key);
    added.push(buildExercise(catalogToInput(entry), settings));
  }
  if (added.length > 0) await database.exercises.bulkAdd(added);
  return { added, skipped };
}
