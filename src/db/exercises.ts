/**
 * ESERCIZI E SCHEDE: creazione, lettura, modifica.
 */
import {
  bodyRegionFor,
  defaultIncrementFor,
  defaultRestFor,
} from '../domain/defaults';
import type { Exercise, Settings, WorkoutTemplate } from '../domain/types';
import { db, newId, nowIso, type GymDatabase } from './database';

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
