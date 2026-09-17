/**
 * ANALISI DI UNA SESSIONE PASSATA
 *
 * Prende le serie fatte in un esercizio e risponde a: che carico ho usato?
 * Quante serie sono al massimo del range, quante sotto il minimo, ne mancano?
 */
import type { ExerciseTarget, SetEntry } from '../types';

/** Una serie svolta: solo i campi che servono alla progressione. */
export type PerformedSet = Pick<SetEntry, 'weightKg' | 'reps' | 'rpe' | 'isWarmup'>;

/** Un esercizio svolto in una sessione, con gli obiettivi che aveva in quel momento. */
export interface PerformedExercise {
  target: ExerciseTarget;
  /** Solo serie effettivamente completate. */
  sets: PerformedSet[];
}

export type PerformanceStatus =
  /** Tutte le serie previste fatte e tutte al massimo del range. */
  | 'all_at_max'
  /** Nessuna serie sotto il minimo, ma non tutte al massimo (o mancano serie). */
  | 'in_range'
  /** Almeno una serie sotto il minimo del range. */
  | 'below_min';

export interface PerformanceAnalysis {
  /** Obiettivi che l'esercizio aveva in quella sessione. */
  target: ExerciseTarget;
  /** Carico di riferimento: il più alto tra le serie allenanti. */
  referenceWeightKg: number;
  /** Ripetizioni delle serie considerate, nell'ordine in cui sono state fatte. */
  countedReps: number[];
  /** Serie previste ma non fatte al carico di riferimento. */
  missingSets: number;
  setsAtMax: number;
  setsBelowMin: number;
  /** Media dell'RPE sulle serie considerate che lo hanno; null se nessuna. */
  averageRpe: number | null;
  status: PerformanceStatus;
}

/**
 * Regole di conteggio:
 * 1. le serie di riscaldamento vengono ignorate;
 * 2. il carico di riferimento è il più alto usato;
 * 3. si considerano solo le serie a quel carico, al massimo tante quante previste
 *    (eventuali serie extra non contano);
 * 4. se le serie al carico di riferimento sono meno di quelle previste,
 *    quelle mancanti contano come "non al massimo" (bloccano l'aumento di carico)
 *    ma NON come "sotto il minimo".
 *
 * Restituisce null se non c'è nessuna serie allenante.
 */
export function analyzePerformance(performed: PerformedExercise): PerformanceAnalysis | null {
  const { target } = performed;
  const workingSets = performed.sets.filter((s) => !s.isWarmup);
  if (workingSets.length === 0) return null;

  const referenceWeightKg = Math.max(...workingSets.map((s) => s.weightKg));
  const countedSets = workingSets
    .filter((s) => s.weightKg === referenceWeightKg)
    .slice(0, target.targetSets);

  const countedReps = countedSets.map((s) => s.reps);
  const missingSets = Math.max(0, target.targetSets - countedSets.length);
  const setsAtMax = countedReps.filter((r) => r >= target.repMax).length;
  const setsBelowMin = countedReps.filter((r) => r < target.repMin).length;

  const rpeValues = countedSets.map((s) => s.rpe).filter((r): r is number => r !== null);
  const averageRpe =
    rpeValues.length > 0 ? rpeValues.reduce((sum, r) => sum + r, 0) / rpeValues.length : null;

  let status: PerformanceStatus;
  if (setsBelowMin > 0) status = 'below_min';
  else if (missingSets === 0 && setsAtMax === countedReps.length) status = 'all_at_max';
  else status = 'in_range';

  return { target, referenceWeightKg, countedReps, missingSets, setsAtMax, setsBelowMin, averageRpe, status };
}

/**
 * Quante sessioni consecutive (partendo dalla più recente) sono sotto il minimo.
 *
 * Il conteggio si interrompe:
 * - alla prima sessione che NON è sotto il minimo (una sessione riuscita azzera tutto);
 * - dopo una sessione fatta con un carico più basso della precedente: vuol dire
 *   che c'è stato uno scarico, quindi le sessioni prima non contano più.
 *
 * @param analyses analisi ordinate dalla più recente alla più vecchia
 */
export function countBelowMinStreak(analyses: PerformanceAnalysis[]): number {
  let streak = 0;
  for (let i = 0; i < analyses.length; i++) {
    const current = analyses[i];
    if (current.status !== 'below_min') break;
    streak++;
    const older = analyses[i + 1];
    if (older && current.referenceWeightKg < older.referenceWeightKg) break;
  }
  return streak;
}
