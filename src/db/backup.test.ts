/**
 * TEST DEL BACKUP: esportazione, controllo del file, importazione e ripristino.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BackupError, backupFileName, describeBackup, parseBackup } from '../domain/backup';
import { DEFAULT_SETTINGS } from '../domain/defaults';
import { exportBackup, getSnapshot, importBackup, restoreSnapshot } from './backup';
import { GymDatabase, newId } from './database';
import { buildExercise, listExercises, listTemplates, saveExercise } from './exercises';
import { seedOnFirstLaunch } from './seed';
import { getSettings, saveSettings } from './settings';
import { finishSession, getSessionLogs, saveLogSets, startSession } from './sessions';

let database: GymDatabase;

beforeEach(() => {
  database = new GymDatabase(`test-${newId()}`);
});

afterEach(async () => {
  await database.delete();
});

/** Dati di esempio + un allenamento terminato. */
async function fillWithData() {
  await seedOnFirstLaunch(database);
  const [template] = await listTemplates(database);
  const sessionId = await startSession(template.id, database);
  const [log] = await getSessionLogs(sessionId, database);
  await saveLogSets(log.id, log.sets.map((s) => ({ ...s, weightKg: 60, reps: 10, completedAt: '2026-09-17T18:00:00.000Z' })), database);
  await finishSession(sessionId, database);
}

describe('esportazione', () => {
  it('include tutti i dati e si rilegge senza errori', async () => {
    await fillWithData();
    const backup = await exportBackup(database);
    expect(backup.app).toBe('gym-tracker');
    expect(backup.data.exercises).toHaveLength(15);
    expect(backup.data.templates).toHaveLength(3);
    expect(backup.data.sessions).toHaveLength(1);
    expect(backup.data.exerciseLogs).toHaveLength(1);

    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.data).toEqual(backup.data);
    expect(describeBackup(parsed.data)).toBe('15 esercizi, 3 schede e 1 allenamento');
  });

  it('nome del file con la data', () => {
    expect(backupFileName(new Date(2026, 8, 7))).toBe('gym-backup-2026-09-07.json');
  });
});

describe('controllo del file', () => {
  const expectError = (text: string, message: string) => {
    expect(() => parseBackup(text)).toThrow(BackupError);
    expect(() => parseBackup(text)).toThrow(message);
  };

  it('rifiuta file non JSON o di altre app', () => {
    expectError('ciao', 'non è un JSON valido');
    expectError('{"app":"altro"}', 'non è un backup di Gym Tracker');
    expectError('[]', 'non è un backup di Gym Tracker');
  });

  it('rifiuta backup di versioni future', () => {
    expectError(JSON.stringify({ app: 'gym-tracker', version: 99 }), 'versione più recente');
  });

  it('indica quale elemento non è valido', async () => {
    await fillWithData();
    const backup = await exportBackup(database);
    const broken = structuredClone(backup);
    (broken.data.exercises[2] as unknown as Record<string, unknown>).repMin = 'otto';
    expectError(JSON.stringify(broken), 'Esercizio n. 3: il campo «repMin» manca o non è valido.');
  });

  it('rifiuta riferimenti a esercizi o allenamenti inesistenti', async () => {
    await fillWithData();
    const backup = await exportBackup(database);
    const broken = structuredClone(backup);
    broken.data.exerciseLogs[0].sessionId = 'inesistente';
    expectError(JSON.stringify(broken), 'fa riferimento a un allenamento che non esiste');
  });

  it('completa le impostazioni mancanti con quelle predefinite', async () => {
    const backup = await exportBackup(database);
    const partial = { ...backup, data: { ...backup.data, settings: { defaultRoundingStepKg: 2.5 } } };
    const parsed = parseBackup(JSON.stringify(partial));
    expect(parsed.data.settings).toEqual({ ...DEFAULT_SETTINGS, defaultRoundingStepKg: 2.5 });
  });
});

describe('importazione', () => {
  it('sostituisce tutti i dati con quelli del backup', async () => {
    await fillWithData();
    const backup = await exportBackup(database);

    // Dati diversi su un altro "telefono"
    const other = new GymDatabase(`test-${newId()}`);
    await saveExercise(buildExercise({ name: 'Solo questo', muscleGroup: 'chest', type: 'compound' }, DEFAULT_SETTINGS), other);
    await saveSettings({ ...DEFAULT_SETTINGS, defaultRoundingStepKg: 5 }, other);

    await importBackup(parseBackup(JSON.stringify(backup)), other);

    expect(await listExercises({}, other)).toHaveLength(15);
    expect((await listExercises({}, other)).some((e) => e.name === 'Solo questo')).toBe(false);
    expect((await getSettings(other)).defaultRoundingStepKg).toBe(1.25);
    // Dopo l'importazione i dati di esempio non vengono ricreati
    expect(await seedOnFirstLaunch(other)).toBe(false);
    await other.delete();
  });

  it('salva una copia dei dati precedenti e permette di ripristinarla', async () => {
    await saveExercise(buildExercise({ name: 'Vecchio', muscleGroup: 'chest', type: 'compound' }, DEFAULT_SETTINGS), database);
    await saveSettings(DEFAULT_SETTINGS, database);
    const emptyBackup = parseBackup(
      JSON.stringify({ app: 'gym-tracker', version: 1, exportedAt: new Date().toISOString(), data: { exercises: [], templates: [], sessions: [], exerciseLogs: [] } }),
    );

    await importBackup(emptyBackup, database);
    expect(await listExercises({}, database)).toHaveLength(0);
    expect((await getSnapshot(database))?.backup.data.exercises).toHaveLength(1);

    await restoreSnapshot(database);
    expect((await listExercises({}, database)).map((e) => e.name)).toEqual(['Vecchio']);
    // Anche il ripristino si può annullare: ora la copia contiene i dati vuoti.
    expect((await getSnapshot(database))?.backup.data.exercises).toHaveLength(0);
  });
});
