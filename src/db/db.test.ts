/**
 * TEST DEL DATABASE
 * IndexedDB non esiste in Node: `fake-indexeddb/auto` lo simula in memoria.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../domain/defaults';
import type { Exercise, ExerciseLog, Session, SetEntry } from '../domain/types';
import { GymDatabase, newId } from './database';
import { buildExercise, listExercises, listTemplates, saveExercise } from './exercises';
import { getExerciseHistory, suggestionForExercise } from './history';
import { seedOnFirstLaunch } from './seed';
import { getSettings, saveSettings } from './settings';

let database: GymDatabase;

beforeEach(() => {
  // Un database nuovo e vuoto per ogni test.
  database = new GymDatabase(`test-${newId()}`);
});

afterEach(async () => {
  await database.delete();
});

/** Salva una sessione con un esercizio svolto. */
async function addSession(
  exercise: Exercise,
  date: string,
  sets: Partial<SetEntry>[],
  finished = true,
): Promise<void> {
  const session: Session = {
    id: newId(),
    templateId: null,
    templateName: 'Test',
    startedAt: date,
    finishedAt: finished ? date : null,
    notes: '',
  };
  const log: ExerciseLog = {
    id: newId(),
    sessionId: session.id,
    exerciseId: exercise.id,
    date,
    order: 0,
    target: {
      repMin: exercise.repMin,
      repMax: exercise.repMax,
      targetSets: exercise.targetSets,
      incrementKg: exercise.incrementKg,
      roundingStepKg: exercise.roundingStepKg ?? 1.25,
    },
    sets: sets.map((s) => ({
      weightKg: 60,
      reps: 10,
      rpe: null,
      isWarmup: false,
      completedAt: date,
      ...s,
    })),
  };
  await database.sessions.add(session);
  await database.exerciseLogs.add(log);
}

describe('impostazioni', () => {
  it('senza impostazioni salvate usa quelle predefinite', async () => {
    expect(await getSettings(database)).toEqual(DEFAULT_SETTINGS);
  });

  it('salva e rilegge le impostazioni', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, defaultRoundingStepKg: 2.5 }, database);
    expect((await getSettings(database)).defaultRoundingStepKg).toBe(2.5);
  });
});

describe('dati di esempio', () => {
  it('al primo avvio crea esercizi e schede Push, Pull e Gambe', async () => {
    expect(await seedOnFirstLaunch(database)).toBe(true);
    expect(await listExercises({}, database)).toHaveLength(15);
    const templates = await listTemplates(database);
    expect(templates.map((t) => t.name).sort()).toEqual(['Gambe', 'Pull', 'Push']);
    expect(templates.every((t) => t.exerciseIds.length === 5)).toBe(true);
  });

  it('applica gli incrementi predefiniti in base a tipo e zona', async () => {
    await seedOnFirstLaunch(database);
    const byName = new Map((await listExercises({}, database)).map((e) => [e.name, e]));
    expect(byName.get('Panca piana con bilanciere')?.incrementKg).toBe(2.5);
    expect(byName.get('Squat con bilanciere')?.incrementKg).toBe(5);
    expect(byName.get('Curl con manubri')?.incrementKg).toBe(2);
  });

  it('non ricrea i dati ai successivi avvii', async () => {
    await seedOnFirstLaunch(database);
    expect(await seedOnFirstLaunch(database)).toBe(false);
    expect(await listExercises({}, database)).toHaveLength(15);
  });
});

describe('esercizi', () => {
  it('nasconde gli esercizi archiviati salvo richiesta', async () => {
    await saveExercise(buildExercise({ name: 'A', muscleGroup: 'chest', type: 'compound' }, DEFAULT_SETTINGS), database);
    await saveExercise(
      buildExercise({ name: 'B', muscleGroup: 'chest', type: 'compound', archived: true }, DEFAULT_SETTINGS),
      database,
    );
    expect(await listExercises({}, database)).toHaveLength(1);
    expect(await listExercises({ includeArchived: true }, database)).toHaveLength(2);
  });
});

describe('storico e suggerimenti', () => {
  const bench = () => buildExercise({ name: 'Panca', muscleGroup: 'chest', type: 'compound' }, DEFAULT_SETTINGS);

  it('restituisce lo storico dalla sessione più recente', async () => {
    const ex = bench();
    await saveExercise(ex, database);
    await addSession(ex, '2026-09-01T18:00:00.000Z', [{ weightKg: 55 }]);
    await addSession(ex, '2026-09-08T18:00:00.000Z', [{ weightKg: 57.5 }]);
    await addSession(ex, '2026-09-04T18:00:00.000Z', [{ weightKg: 56.25 }]);

    const history = await getExerciseHistory(ex.id, {}, database);
    expect(history.map((l) => l.sets[0].weightKg)).toEqual([57.5, 56.25, 55]);
  });

  it('esclude le sessioni non terminate e gli altri esercizi', async () => {
    const ex = bench();
    const other = bench();
    await addSession(ex, '2026-09-01T18:00:00.000Z', [{}]);
    await addSession(ex, '2026-09-08T18:00:00.000Z', [{}], false);
    await addSession(other, '2026-09-05T18:00:00.000Z', [{}]);

    expect(await getExerciseHistory(ex.id, {}, database)).toHaveLength(1);
  });

  it('calcola il suggerimento dalle sessioni salvate', async () => {
    const ex = bench();
    await saveExercise(ex, database);
    await addSession(ex, '2026-09-01T18:00:00.000Z', [{ reps: 12 }, { reps: 12 }, { reps: 12 }]);

    const s = await suggestionForExercise(ex, database);
    expect(s.action).toBe('increase_load');
    expect(s.weightKg).toBe(62.5);
  });

  it('ignora le serie non spuntate come fatte', async () => {
    const ex = bench();
    await addSession(ex, '2026-09-01T18:00:00.000Z', [
      { reps: 12 },
      { reps: 12 },
      { reps: 0, completedAt: null },
    ]);
    const s = await suggestionForExercise(ex, database);
    // Solo 2 serie fatte su 3: non aumenta il carico.
    expect(s.action).toBe('increase_reps');
    expect(s.targetReps).toEqual([12, 12, 8]);
  });

  it('senza storico è la prima volta', async () => {
    const s = await suggestionForExercise(bench(), database);
    expect(s.action).toBe('first_time');
  });
});
