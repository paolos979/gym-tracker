import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../domain/defaults';
import { toggleSetCompleted } from '../domain/session';
import { GymDatabase, newId } from './database';
import { buildExercise, buildTemplate, saveExercise, saveTemplate } from './exercises';
import { getExerciseHistory, suggestionForExercise } from './history';
import {
  deleteSession,
  finishSession,
  getActiveSession,
  getSessionLogs,
  lastSessionDateByTemplate,
  saveLogSets,
  startSession,
} from './sessions';

let database: GymDatabase;

beforeEach(() => {
  database = new GymDatabase(`test-${newId()}`);
});

afterEach(async () => {
  await database.delete();
});

/** Crea una scheda con panca e curl (più un esercizio archiviato). */
async function setup() {
  const bench = buildExercise({ name: 'Panca', muscleGroup: 'chest', type: 'compound' }, DEFAULT_SETTINGS);
  const curl = buildExercise({ name: 'Curl', muscleGroup: 'biceps', type: 'isolation' }, DEFAULT_SETTINGS);
  const old = buildExercise({ name: 'Vecchio', muscleGroup: 'chest', type: 'compound', archived: true }, DEFAULT_SETTINGS);
  for (const e of [bench, curl, old]) await saveExercise(e, database);
  const template = buildTemplate('Push', [bench.id, old.id, curl.id]);
  await saveTemplate(template, database);
  return { bench, curl, template };
}

/** Spunta tutte le serie di una sessione impostando carico e ripetizioni. */
async function completeAll(sessionId: string, weightKg: number, reps: number) {
  for (const log of await getSessionLogs(sessionId, database)) {
    let sets = log.sets.map((s) => ({ ...s, weightKg, reps }));
    sets.forEach((_, i) => (sets = toggleSetCompleted(sets, i, '2026-09-17T18:00:00.000Z')));
    await saveLogSets(log.id, sets, database);
  }
}

describe('avvio della sessione', () => {
  it('crea un esercizio per ogni esercizio non archiviato, nell\'ordine della scheda', async () => {
    const { template } = await setup();
    const id = await startSession(template.id, database);
    const logs = await getSessionLogs(id, database);
    expect(logs).toHaveLength(2);
    expect(logs.map((l) => l.order)).toEqual([0, 1]);
    expect((await getActiveSession(database))?.id).toBe(id);
  });

  it('copia gli obiettivi dell\'esercizio', async () => {
    const { template, curl } = await setup();
    const id = await startSession(template.id, database);
    const curlLog = (await getSessionLogs(id, database)).find((l) => l.exerciseId === curl.id)!;
    expect(curlLog.target).toEqual({ repMin: 8, repMax: 12, targetSets: 3, incrementKg: 2, roundingStepKg: 1.25 });
  });

  it('non permette due sessioni in corso', async () => {
    const { template } = await setup();
    await startSession(template.id, database);
    await expect(startSession(template.id, database)).rejects.toThrow('già un allenamento in corso');
  });

  it('precompila le serie con il suggerimento della volta precedente', async () => {
    const { template, bench } = await setup();
    const first = await startSession(template.id, database);
    await completeAll(first, 60, 12);
    await finishSession(first, database);

    const second = await startSession(template.id, database);
    const benchLog = (await getSessionLogs(second, database)).find((l) => l.exerciseId === bench.id)!;
    // 3 × 12 a 60 kg → aumenta a 62,5 kg e riparti da 8
    expect(benchLog.sets.map((s) => [s.weightKg, s.reps])).toEqual([[62.5, 8], [62.5, 8], [62.5, 8]]);
  });

  it('la sessione in corso non cambia il suggerimento finché non è terminata', async () => {
    const { template, bench } = await setup();
    const id = await startSession(template.id, database);
    await completeAll(id, 60, 12);
    expect((await suggestionForExercise(bench, database)).action).toBe('first_time');
    await finishSession(id, database);
    expect((await suggestionForExercise(bench, database)).action).toBe('increase_load');
  });
});

describe('fine della sessione', () => {
  it('scarta le serie non spuntate e gli esercizi senza serie', async () => {
    const { template, bench, curl } = await setup();
    const id = await startSession(template.id, database);
    const benchLog = (await getSessionLogs(id, database)).find((l) => l.exerciseId === bench.id)!;
    await saveLogSets(benchLog.id, toggleSetCompleted(benchLog.sets, 0, '2026-09-17T18:00:00.000Z'), database);

    await finishSession(id, database);

    const logs = await getSessionLogs(id, database);
    expect(logs).toHaveLength(1);
    expect(logs[0].sets).toHaveLength(1);
    expect(await getExerciseHistory(curl.id, {}, database)).toHaveLength(0);
    expect(await getActiveSession(database)).toBeNull();
  });

  it('ricorda l\'ultima data per scheda', async () => {
    const { template } = await setup();
    const id = await startSession(template.id, database);
    await completeAll(id, 60, 10);
    await finishSession(id, database);
    expect((await lastSessionDateByTemplate(database)).has(template.id)).toBe(true);
  });

  it('eliminare una sessione rimuove anche le sue serie', async () => {
    const { template } = await setup();
    const id = await startSession(template.id, database);
    await deleteSession(id, database);
    expect(await getSessionLogs(id, database)).toHaveLength(0);
    expect(await getActiveSession(database)).toBeNull();
  });
});
