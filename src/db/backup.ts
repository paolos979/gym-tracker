/**
 * BACKUP: esportazione e importazione di tutti i dati.
 */
import { buildBackup, type BackupFile } from '../domain/backup';
import { DEFAULT_SETTINGS } from '../domain/defaults';
import { db, nowIso, type GymDatabase, type Snapshot } from './database';
import { getSettings } from './settings';

/** Legge tutti i dati e li prepara per il file di backup. */
export async function exportBackup(database: GymDatabase = db): Promise<BackupFile> {
  return database.transaction(
    'r',
    [database.settings, database.exercises, database.templates, database.sessions, database.exerciseLogs],
    async () =>
      buildBackup({
        settings: await getSettings(database),
        exercises: await database.exercises.toArray(),
        templates: await database.templates.toArray(),
        sessions: await database.sessions.toArray(),
        exerciseLogs: await database.exerciseLogs.toArray(),
      }),
  );
}

/**
 * Sostituisce TUTTI i dati con quelli del backup (già controllato con parseBackup).
 *
 * Prima di cancellare, salva una copia dei dati attuali sul dispositivo:
 * se qualcosa non va, si può tornare indietro con restoreSnapshot().
 * Tutto avviene in un'unica transazione: o riesce tutto, o non cambia niente.
 */
export async function importBackup(backup: BackupFile, database: GymDatabase = db): Promise<void> {
  const current = await exportBackup(database);
  const tables = [
    database.settings,
    database.exercises,
    database.templates,
    database.sessions,
    database.exerciseLogs,
    database.snapshots,
  ];
  await database.transaction('rw', tables, async () => {
    await database.snapshots.put({ id: 'pre-import', createdAt: nowIso(), backup: current });

    await Promise.all([
      database.settings.clear(),
      database.exercises.clear(),
      database.templates.clear(),
      database.sessions.clear(),
      database.exerciseLogs.clear(),
    ]);

    const { data } = backup;
    // Le impostazioni vanno sempre scritte: senza, al riavvio verrebbero ricreati i dati di esempio.
    await database.settings.put(data.settings ?? DEFAULT_SETTINGS);
    await database.exercises.bulkAdd(data.exercises);
    await database.templates.bulkAdd(data.templates);
    await database.sessions.bulkAdd(data.sessions);
    await database.exerciseLogs.bulkAdd(data.exerciseLogs);
  });
}

/** La copia automatica fatta prima dell'ultima importazione, se esiste. */
export async function getSnapshot(database: GymDatabase = db): Promise<Snapshot | null> {
  return (await database.snapshots.get('pre-import')) ?? null;
}

/**
 * Ripristina la copia automatica. I dati attuali diventano a loro volta la nuova
 * copia, quindi anche il ripristino si può annullare.
 */
export async function restoreSnapshot(database: GymDatabase = db): Promise<void> {
  const snapshot = await getSnapshot(database);
  if (!snapshot) throw new Error('Nessuna copia da ripristinare.');
  await importBackup(snapshot.backup, database);
}
