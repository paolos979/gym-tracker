/**
 * SESSIONI DI ALLENAMENTO: avvio, salvataggio delle serie, fine.
 */
import { targetFromExercise } from '../domain/defaults';
import { buildInitialSets } from '../domain/session';
import type { Exercise, ExerciseLog, Session, SetEntry } from '../domain/types';
import { db, newId, nowIso, type GymDatabase } from './database';
import { suggestionForExercise } from './history';
import { getSettings } from './settings';

/** La sessione in corso (non terminata), se c'è. */
export async function getActiveSession(database: GymDatabase = db): Promise<Session | null> {
  const active = await database.sessions
    .orderBy('startedAt')
    .reverse()
    .filter((s) => s.finishedAt === null)
    .first();
  return active ?? null;
}

/** Esercizi di una sessione, nell'ordine della scheda. */
export async function getSessionLogs(sessionId: string, database: GymDatabase = db): Promise<ExerciseLog[]> {
  return database.exerciseLogs.where('sessionId').equals(sessionId).sortBy('order');
}

/** Sessioni terminate, dalla più recente. */
export async function listFinishedSessions(database: GymDatabase = db): Promise<Session[]> {
  return database.sessions
    .orderBy('startedAt')
    .reverse()
    .filter((s) => s.finishedAt !== null)
    .toArray();
}

/** Per ogni scheda, la data dell'ultima sessione terminata. */
export async function lastSessionDateByTemplate(database: GymDatabase = db): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (const s of await listFinishedSessions(database)) {
    // Le sessioni sono dalla più recente: la prima trovata per ogni scheda è l'ultima fatta.
    if (s.templateId && !result.has(s.templateId)) result.set(s.templateId, s.startedAt);
  }
  return result;
}

/**
 * Avvia una sessione da una scheda.
 * Per ogni esercizio (esclusi gli archiviati) calcola il suggerimento
 * e precompila le serie con carico e ripetizioni suggeriti.
 * @returns l'id della nuova sessione
 */
export async function startSession(templateId: string, database: GymDatabase = db): Promise<string> {
  if (await getActiveSession(database)) {
    throw new Error('Hai già un allenamento in corso: terminalo prima di iniziarne un altro.');
  }
  const template = await database.templates.get(templateId);
  if (!template) throw new Error('Scheda non trovata.');

  const settings = await getSettings(database);
  const exercises = (await database.exercises.bulkGet(template.exerciseIds)).filter(
    (e): e is Exercise => e !== undefined && !e.archived,
  );
  if (exercises.length === 0) throw new Error('La scheda non contiene esercizi.');

  const session: Session = {
    id: newId(),
    templateId: template.id,
    templateName: template.name,
    startedAt: nowIso(),
    finishedAt: null,
    notes: '',
  };

  // I suggerimenti si calcolano PRIMA di salvare la nuova sessione.
  const logs: ExerciseLog[] = [];
  for (const [order, exercise] of exercises.entries()) {
    const target = targetFromExercise(exercise, settings);
    const suggestion = await suggestionForExercise(exercise, database);
    logs.push({
      id: newId(),
      sessionId: session.id,
      exerciseId: exercise.id,
      date: session.startedAt,
      order,
      target,
      sets: buildInitialSets(target, suggestion),
    });
  }

  await database.transaction('rw', database.sessions, database.exerciseLogs, async () => {
    await database.sessions.add(session);
    await database.exerciseLogs.bulkAdd(logs);
  });
  return session.id;
}

/** Salva le serie di un esercizio (chiamata a ogni modifica). */
export async function saveLogSets(logId: string, sets: SetEntry[], database: GymDatabase = db): Promise<void> {
  await database.exerciseLogs.update(logId, { sets });
}

/**
 * Termina la sessione: scarta le serie non spuntate e gli esercizi
 * rimasti senza serie, poi segna l'ora di fine.
 */
export async function finishSession(sessionId: string, database: GymDatabase = db): Promise<void> {
  await database.transaction('rw', database.sessions, database.exerciseLogs, async () => {
    const logs = await database.exerciseLogs.where('sessionId').equals(sessionId).toArray();
    for (const log of logs) {
      const completed = log.sets.filter((s) => s.completedAt !== null);
      if (completed.length === 0) await database.exerciseLogs.delete(log.id);
      else if (completed.length !== log.sets.length) await database.exerciseLogs.update(log.id, { sets: completed });
    }
    await database.sessions.update(sessionId, { finishedAt: nowIso() });
  });
}

/** Elimina una sessione e tutte le sue serie. */
export async function deleteSession(sessionId: string, database: GymDatabase = db): Promise<void> {
  await database.transaction('rw', database.sessions, database.exerciseLogs, async () => {
    await database.exerciseLogs.where('sessionId').equals(sessionId).delete();
    await database.sessions.delete(sessionId);
  });
}

/** Dopo la modifica di un allenamento passato: toglie gli esercizi rimasti senza serie. */
export async function removeEmptyLogs(sessionId: string, database: GymDatabase = db): Promise<void> {
  const logs = await database.exerciseLogs.where('sessionId').equals(sessionId).toArray();
  await database.exerciseLogs.bulkDelete(logs.filter((l) => l.sets.length === 0).map((l) => l.id));
}
