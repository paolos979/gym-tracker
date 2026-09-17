/**
 * STORICO E SUGGERIMENTI
 *
 * Collega il database al modulo di progressione: legge le sessioni passate
 * di un esercizio e calcola il suggerimento per la prossima volta.
 */
import Dexie from 'dexie';
import { targetFromExercise } from '../domain/defaults';
import { suggestNextSession, type PerformedExercise, type Suggestion } from '../domain/progression';
import type { Exercise, ExerciseLog } from '../domain/types';
import { db, type GymDatabase } from './database';
import { getSettings } from './settings';

/**
 * Esecuzioni passate di un esercizio, dalla più recente.
 * Considera solo le sessioni TERMINATE, così la sessione in corso
 * non influenza il suggerimento che vedi mentre ti alleni.
 */
export async function getExerciseHistory(
  exerciseId: string,
  options: { limit?: number } = {},
  database: GymDatabase = db,
): Promise<ExerciseLog[]> {
  const logs = await database.exerciseLogs
    .where('[exerciseId+date]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .reverse()
    .toArray();

  const sessions = await database.sessions.bulkGet(logs.map((l) => l.sessionId));
  const finished = logs.filter((_, i) => sessions[i]?.finishedAt != null);
  return options.limit === undefined ? finished : finished.slice(0, options.limit);
}

/** Converte un'esecuzione salvata nel formato del modulo di progressione. */
export function toPerformedExercise(log: ExerciseLog): PerformedExercise {
  return {
    target: log.target,
    // Le serie non spuntate come fatte non contano.
    sets: log.sets.filter((s) => s.completedAt !== null),
  };
}

/** Quante sessioni passate leggere: bastano per contare le sessioni di fila sotto il minimo. */
const HISTORY_FOR_SUGGESTION = 20;

/** Suggerimento per la prossima sessione di un esercizio. */
export async function suggestionForExercise(
  exercise: Exercise,
  database: GymDatabase = db,
): Promise<Suggestion> {
  const settings = await getSettings(database);
  const history = await getExerciseHistory(exercise.id, { limit: HISTORY_FOR_SUGGESTION }, database);
  return suggestNextSession(
    { target: targetFromExercise(exercise, settings), isBodyweight: exercise.isBodyweight },
    history.map(toPerformedExercise),
  );
}

/** Tutti gli esercizi svolti in sessioni terminate (per le statistiche dello storico). */
export async function getAllFinishedLogs(database: GymDatabase = db): Promise<ExerciseLog[]> {
  const [logs, sessions] = await Promise.all([database.exerciseLogs.toArray(), database.sessions.toArray()]);
  const finished = new Set(sessions.filter((s) => s.finishedAt !== null).map((s) => s.id));
  return logs.filter((l) => finished.has(l.sessionId));
}
