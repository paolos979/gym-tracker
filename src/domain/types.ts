/**
 * MODELLO DATI
 *
 * Qui sono descritte le "forme" di tutti i dati che l'app salva sul telefono.
 * Non c'è logica: solo definizioni. Se aggiungi un campo, aggiungilo qui
 * e TypeScript ti segnalerà tutti i punti del codice da aggiornare.
 *
 * Convenzioni:
 * - i carichi sono sempre in kg (numeri decimali, es. 62.5)
 * - le date sono stringhe ISO 8601 (es. "2026-09-17T18:30:00.000Z"),
 *   così si possono ordinare alfabeticamente e salvare in JSON senza problemi
 * - gli id sono stringhe casuali generate con crypto.randomUUID()
 */

/** Multiarticolare (panca, squat, rematore…) o isolamento (curl, alzate…). */
export type ExerciseType = 'compound' | 'isolation';

/** Parte del corpo: serve a scegliere l'incremento di carico predefinito. */
export type BodyRegion = 'upper' | 'lower';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'other';

/** Esercizio creato dall'utente, con i suoi obiettivi. */
export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  type: ExerciseType;
  /** Ricavata dal gruppo muscolare alla creazione, ma modificabile. */
  bodyRegion: BodyRegion;
  /** Range di ripetizioni target, es. 8-12. */
  repMin: number;
  repMax: number;
  /** Numero di serie previste. */
  targetSets: number;
  /** Di quanto aumentare il carico quando si progredisce (kg). */
  incrementKg: number;
  /**
   * Passo di arrotondamento dei carichi suggeriti (kg), es. 2 per i manubri.
   * Se null si usa quello globale delle impostazioni.
   */
  roundingStepKg: number | null;
  /** Durata del recupero tra le serie (secondi). */
  restSeconds: number;
  /** Esercizio a corpo libero: il carico indica solo la zavorra (0 = senza). */
  isBodyweight: boolean;
  /** Gli esercizi archiviati non compaiono nelle liste ma restano nello storico. */
  archived: boolean;
  createdAt: string;
}

/** Scheda di allenamento, es. "Push": un elenco ordinato di esercizi. */
export interface WorkoutTemplate {
  id: string;
  name: string;
  exerciseIds: string[];
  createdAt: string;
}

/** Una sessione di allenamento (una "giornata" in palestra). */
export interface Session {
  id: string;
  /** Scheda da cui è partita la sessione (null se libera). */
  templateId: string | null;
  /** Copia del nome della scheda: resta anche se la scheda viene rinominata o eliminata. */
  templateName: string;
  startedAt: string;
  /** null finché la sessione è in corso. */
  finishedAt: string | null;
  notes: string;
}

/** Una singola serie. */
export interface SetEntry {
  weightKg: number;
  reps: number;
  /** Sforzo percepito 1-10, facoltativo. */
  rpe: number | null;
  /** Le serie di riscaldamento non contano per la progressione. */
  isWarmup: boolean;
  /** Quando è stata spuntata come fatta; null = serie ancora da fare. */
  completedAt: string | null;
}

/**
 * Obiettivi dell'esercizio COPIATI al momento della sessione.
 * Se in futuro cambi il range (es. da 8-12 a 6-10), le sessioni passate
 * vengono comunque valutate con gli obiettivi che avevano allora.
 */
export interface ExerciseTarget {
  repMin: number;
  repMax: number;
  targetSets: number;
  incrementKg: number;
  /** Passo di arrotondamento già risolto (mai null qui). */
  roundingStepKg: number;
}

/** Un esercizio svolto all'interno di una sessione. */
export interface ExerciseLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  /** Uguale a Session.startedAt: serve a ordinare lo storico dell'esercizio. */
  date: string;
  /** Posizione dell'esercizio nella sessione (0, 1, 2…). */
  order: number;
  target: ExerciseTarget;
  sets: SetEntry[];
}

/** Impostazioni globali (un solo record con id "app"). */
export interface Settings {
  id: 'app';
  /** Passo di arrotondamento predefinito (kg). */
  defaultRoundingStepKg: number;
  /** Incrementi predefiniti proposti quando crei un esercizio. */
  defaultIncrementsKg: {
    compoundUpper: number;
    compoundLower: number;
    isolation: number;
  };
  /** Recupero predefinito proposto quando crei un esercizio (secondi). */
  defaultRestSeconds: {
    compound: number;
    isolation: number;
  };
  /** Tiene lo schermo acceso durante la sessione (evita che il timer si fermi). */
  keepScreenAwake: boolean;
  /** Suono alla fine del recupero. */
  timerSound: boolean;
}
