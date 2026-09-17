/**
 * BACKUP IN JSON: formato del file e controllo prima dell'importazione.
 *
 * Il file contiene TUTTI i dati dell'app. Prima di importarlo lo controlliamo
 * campo per campo: un file sbagliato o danneggiato non deve mai rovinare i dati.
 */
import { DEFAULT_SETTINGS } from './defaults';
import type { Exercise, ExerciseLog, Session, Settings, WorkoutTemplate } from './types';

export const BACKUP_APP_ID = 'gym-tracker';
/** Da aumentare se in futuro cambia il formato del file. */
export const BACKUP_VERSION = 1;

export interface BackupData {
  settings: Settings;
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  sessions: Session[];
  exerciseLogs: ExerciseLog[];
}

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  version: number;
  exportedAt: string;
  data: BackupData;
}

/** Errore con un messaggio in italiano da mostrare all'utente. */
export class BackupError extends Error {}

export function buildBackup(data: BackupData, now: Date = new Date()): BackupFile {
  return { app: BACKUP_APP_ID, version: BACKUP_VERSION, exportedAt: now.toISOString(), data };
}

/** "gym-backup-2026-09-17.json" (data locale) */
export function backupFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `gym-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** "15 esercizi, 3 schede e 12 allenamenti" */
export function describeBackup(data: BackupData): string {
  const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  const finished = data.sessions.filter((s) => s.finishedAt !== null).length;
  return `${n(data.exercises.length, 'esercizio', 'esercizi')}, ${n(data.templates.length, 'scheda', 'schede')} e ${n(finished, 'allenamento', 'allenamenti')}`;
}

// ---------------------------------------------------------------------------
// Controllo del file
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
const isDate = (v: unknown): v is string => isString(v) && !Number.isNaN(Date.parse(v));

/** Controlla che un campo esista e sia del tipo giusto, altrimenti lancia un errore leggibile. */
function check(record: Json, field: string, valid: (v: unknown) => boolean, where: string) {
  if (!valid(record[field])) {
    throw new BackupError(`${where}: il campo «${field}» manca o non è valido.`);
  }
}

function checkList(data: Json, key: string, what: string, checkItem: (item: Json, where: string) => void) {
  const list = data[key];
  if (!Array.isArray(list)) throw new BackupError(`Il file non contiene l'elenco «${key}».`);
  list.forEach((item, i) => {
    const where = `${what} n. ${i + 1}`;
    if (!isObject(item)) throw new BackupError(`${where}: formato non valido.`);
    checkItem(item, where);
  });
}

function checkTarget(target: unknown, where: string) {
  if (!isObject(target)) throw new BackupError(`${where}: obiettivi mancanti.`);
  for (const field of ['repMin', 'repMax', 'targetSets', 'incrementKg', 'roundingStepKg']) {
    check(target, field, isNumber, where);
  }
}

function checkSet(set: unknown, where: string) {
  if (!isObject(set)) throw new BackupError(`${where}: serie non valida.`);
  check(set, 'weightKg', isNumber, where);
  check(set, 'reps', isNumber, where);
  check(set, 'rpe', (v) => v === null || isNumber(v), where);
  check(set, 'isWarmup', isBoolean, where);
  check(set, 'completedAt', (v) => v === null || isDate(v), where);
}

/**
 * Legge e controlla il testo di un file di backup.
 * @throws BackupError con un messaggio in italiano se qualcosa non va
 */
export function parseBackup(text: string): BackupFile {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BackupError('Il file non è un JSON valido.');
  }

  if (!isObject(json) || json.app !== BACKUP_APP_ID) {
    throw new BackupError('Questo file non è un backup di Gym Tracker.');
  }
  if (!isNumber(json.version) || json.version > BACKUP_VERSION) {
    throw new BackupError('Il backup è stato creato da una versione più recente dell\'app: aggiornala e riprova.');
  }
  if (!isDate(json.exportedAt)) throw new BackupError('Il backup non ha una data valida.');
  if (!isObject(json.data)) throw new BackupError('Il backup non contiene dati.');
  const data = json.data;

  checkList(data, 'exercises', 'Esercizio', (e, where) => {
    for (const f of ['id', 'name', 'muscleGroup', 'type', 'bodyRegion']) check(e, f, isString, where);
    for (const f of ['repMin', 'repMax', 'targetSets', 'incrementKg', 'restSeconds']) check(e, f, isNumber, where);
    check(e, 'roundingStepKg', (v) => v === null || isNumber(v), where);
    check(e, 'isBodyweight', isBoolean, where);
    check(e, 'archived', isBoolean, where);
    check(e, 'createdAt', isDate, where);
  });

  checkList(data, 'templates', 'Scheda', (t, where) => {
    check(t, 'id', isString, where);
    check(t, 'name', isString, where);
    check(t, 'exerciseIds', (v) => Array.isArray(v) && v.every(isString), where);
    check(t, 'createdAt', isDate, where);
  });

  checkList(data, 'sessions', 'Allenamento', (s, where) => {
    check(s, 'id', isString, where);
    check(s, 'templateId', (v) => v === null || isString(v), where);
    check(s, 'templateName', isString, where);
    check(s, 'startedAt', isDate, where);
    check(s, 'finishedAt', (v) => v === null || isDate(v), where);
    check(s, 'notes', isString, where);
  });

  const sessionIds = new Set((data.sessions as Json[]).map((s) => s.id));
  const exerciseIds = new Set((data.exercises as Json[]).map((e) => e.id));

  checkList(data, 'exerciseLogs', 'Esercizio svolto', (l, where) => {
    for (const f of ['id', 'sessionId', 'exerciseId']) check(l, f, isString, where);
    check(l, 'date', isDate, where);
    check(l, 'order', isNumber, where);
    checkTarget(l.target, where);
    if (!Array.isArray(l.sets)) throw new BackupError(`${where}: elenco delle serie mancante.`);
    l.sets.forEach((set) => checkSet(set, where));
    if (!sessionIds.has(l.sessionId)) throw new BackupError(`${where}: fa riferimento a un allenamento che non esiste.`);
    if (!exerciseIds.has(l.exerciseId)) throw new BackupError(`${where}: fa riferimento a un esercizio che non esiste.`);
  });

  // Impostazioni: facoltative; i valori mancanti prendono quelli predefiniti.
  const rawSettings = isObject(data.settings) ? data.settings : {};
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...rawSettings,
    id: 'app',
    defaultIncrementsKg: {
      ...DEFAULT_SETTINGS.defaultIncrementsKg,
      ...(isObject(rawSettings.defaultIncrementsKg) ? rawSettings.defaultIncrementsKg : {}),
    },
    defaultRestSeconds: {
      ...DEFAULT_SETTINGS.defaultRestSeconds,
      ...(isObject(rawSettings.defaultRestSeconds) ? rawSettings.defaultRestSeconds : {}),
    },
  };

  return {
    app: BACKUP_APP_ID,
    version: json.version,
    exportedAt: json.exportedAt,
    data: {
      settings,
      exercises: data.exercises as unknown as Exercise[],
      templates: data.templates as unknown as WorkoutTemplate[],
      sessions: data.sessions as unknown as Session[],
      exerciseLogs: data.exerciseLogs as unknown as ExerciseLog[],
    },
  };
}
