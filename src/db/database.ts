/**
 * DATABASE LOCALE (IndexedDB tramite Dexie)
 *
 * I dati restano sul dispositivo. Ogni "tabella" contiene oggetti del
 * modello dati (vedi src/domain/types.ts).
 *
 * La stringa accanto a ogni tabella elenca i campi INDICIZZATI, cioè quelli
 * usati per cercare o ordinare velocemente. Il primo è la chiave primaria.
 * Gli altri campi degli oggetti vengono salvati comunque, anche se non elencati.
 *
 * ATTENZIONE: se in futuro cambi gli indici, NON modificare version(1):
 * aggiungi un nuovo blocco this.version(2).stores({...}) sotto, così i dati
 * già salvati sul telefono vengono aggiornati senza perderli.
 */
import Dexie, { type EntityTable } from 'dexie';
import type { BackupFile } from '../domain/backup';
import type { Exercise, ExerciseLog, Session, Settings, WorkoutTemplate } from '../domain/types';

/** Copia di tutti i dati salvata sul dispositivo (non inclusa nei backup esportati). */
export interface Snapshot {
  id: 'pre-import';
  createdAt: string;
  backup: BackupFile;
}

export class GymDatabase extends Dexie {
  // `declare` dice a TypeScript che questi campi esistono (li crea Dexie).
  declare exercises: EntityTable<Exercise, 'id'>;
  declare templates: EntityTable<WorkoutTemplate, 'id'>;
  declare sessions: EntityTable<Session, 'id'>;
  declare exerciseLogs: EntityTable<ExerciseLog, 'id'>;
  declare settings: EntityTable<Settings, 'id'>;
  declare snapshots: EntityTable<Snapshot, 'id'>;

  constructor(name = 'gym-tracker') {
    super(name);
    this.version(1).stores({
      exercises: 'id, name, muscleGroup',
      templates: 'id, name',
      sessions: 'id, startedAt, finishedAt, templateId',
      // [exerciseId+date] = indice composto: storico di un esercizio in ordine di data
      exerciseLogs: 'id, sessionId, exerciseId, [exerciseId+date]',
      settings: 'id',
    });
    // Versione 2: copia automatica dei dati fatta prima di ogni importazione di un backup.
    this.version(2).stores({
      snapshots: 'id',
    });
  }
}

/** Il database usato dall'app. I test ne creano di separati. */
export const db = new GymDatabase();

/** Genera un id univoco. */
export function newId(): string {
  return crypto.randomUUID();
}

/** Data e ora attuali in formato ISO. */
export function nowIso(): string {
  return new Date().toISOString();
}
