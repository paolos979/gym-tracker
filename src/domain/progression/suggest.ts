/**
 * REGOLE DI PROGRESSIONE (doppia progressione)
 *
 * Questa è la funzione principale: dato l'esercizio e lo storico,
 * dice cosa fare la prossima volta.
 *
 * Le regole vengono controllate in quest'ordine (la prima che si applica vince):
 *   1. Nessuno storico                         → prima volta, scegli tu il carico
 *   2. Sotto il minimo per N sessioni di fila  → SCARICO (−10%, arrotondato)
 *   3. Almeno una serie sotto il minimo        → MANTIENI il carico
 *   4. Tutte le serie al massimo del range     → AUMENTA IL CARICO, riparti dal minimo
 *   5. Dentro al range                         → MANTIENI il carico, +1 ripetizione
 *                                                 alle serie non al massimo
 *      + se RPE medio ≤ 7 → avviso "potresti già aumentare"
 */
import type { ExerciseTarget } from '../types';
import {
  analyzePerformance,
  countBelowMinStreak,
  type PerformanceAnalysis,
  type PerformedExercise,
} from './analyze';
import { PROGRESSION_CONFIG, type ProgressionConfig } from './config';
import * as msg from './messages';
import { deloadedLoad, increasedLoad } from './rounding';

export type SuggestionAction =
  | 'first_time'
  | 'increase_load'
  | 'increase_reps'
  | 'hold'
  | 'deload';

/** Avviso facoltativo quando le serie sono state facili (RPE basso). */
export interface EarlyIncreaseHint {
  averageRpe: number;
  /** Carico a cui si potrebbe già passare. */
  weightKg: number;
  message: string;
}

export interface Suggestion {
  action: SuggestionAction;
  /** Carico da usare la prossima volta; null alla prima volta. */
  weightKg: number | null;
  /** Ripetizioni obiettivo per ogni serie (lunghezza = serie previste). */
  targetReps: number[];
  /** Spiegazione in italiano da mostrare all'utente. */
  reason: string;
  earlyIncrease: EarlyIncreaseHint | null;
  /** Sessioni consecutive sotto il minimo (0 se l'ultima non lo era). */
  belowMinStreak: number;
}

/** Cosa serve sapere dell'esercizio per calcolare il suggerimento. */
export interface ExerciseForProgression {
  /** Obiettivi ATTUALI dell'esercizio (quelli da usare la prossima volta). */
  target: ExerciseTarget;
  isBodyweight: boolean;
}

/**
 * Calcola il suggerimento per la prossima sessione.
 *
 * @param exercise obiettivi attuali dell'esercizio
 * @param history  sessioni passate, dalla PIÙ RECENTE alla più vecchia
 * @param config   parametri (soglie); di default quelli in config.ts
 */
export function suggestNextSession(
  exercise: ExerciseForProgression,
  history: PerformedExercise[],
  config: ProgressionConfig = PROGRESSION_CONFIG,
): Suggestion {
  const { target, isBodyweight } = exercise;

  // Analizza lo storico scartando le sessioni senza serie allenanti.
  const analyses = history
    .map(analyzePerformance)
    .filter((a): a is PerformanceAnalysis => a !== null);

  // --- Regola 1: prima volta ---
  if (analyses.length === 0) {
    return {
      action: 'first_time',
      weightKg: null,
      targetReps: fill(target.targetSets, target.repMin),
      reason: msg.firstTimeMessage(target.repMin, target.repMax),
      earlyIncrease: null,
      belowMinStreak: 0,
    };
  }

  const last = analyses[0];
  const weight = last.referenceWeightKg;
  const streak = countBelowMinStreak(analyses);

  // --- Regola 2: scarico ---
  if (streak >= config.sessionsBelowMinForDeload) {
    if (weight <= 0) {
      // Corpo libero senza zavorra: non c'è niente da togliere.
      return {
        action: 'hold',
        weightKg: 0,
        targetReps: fill(target.targetSets, target.repMin),
        reason: msg.cannotDeloadMessage({ streak, repMin: target.repMin }),
        earlyIncrease: null,
        belowMinStreak: streak,
      };
    }
    const newWeight = deloadedLoad(weight, config.deloadFraction, target.roundingStepKg);
    return {
      action: 'deload',
      weightKg: newWeight,
      targetReps: fill(target.targetSets, target.repMin),
      reason: msg.deloadMessage({
        streak,
        repMin: target.repMin,
        newWeightKg: newWeight,
        percent: Math.round(config.deloadFraction * 100),
        isBodyweight,
      }),
      earlyIncrease: null,
      belowMinStreak: streak,
    };
  }

  const nextReps = nextRepTargets(last.countedReps, target);

  // --- Regola 3: sotto il minimo → mantieni ---
  if (last.status === 'below_min') {
    return {
      action: 'hold',
      weightKg: weight,
      targetReps: nextReps,
      reason: msg.holdBelowMinMessage({
        weightKg: weight,
        isBodyweight,
        targets: nextReps,
        setsBelowMin: last.setsBelowMin,
        countedSets: last.countedReps.length,
        repMin: last.target.repMin,
        streak,
        sessionsForDeload: config.sessionsBelowMinForDeload,
      }),
      earlyIncrease: null,
      belowMinStreak: streak,
    };
  }

  // --- Regola 4: tutte al massimo → aumenta il carico ---
  if (last.status === 'all_at_max') {
    const newWeight = increasedLoad(weight, target.incrementKg, target.roundingStepKg);
    return {
      action: 'increase_load',
      weightKg: newWeight,
      targetReps: fill(target.targetSets, target.repMin),
      reason: msg.increaseLoadMessage({
        doneReps: last.countedReps,
        repMax: last.target.repMax,
        newWeightKg: newWeight,
        newRepTarget: target.repMin,
        isBodyweight,
        wasBodyweightOnly: weight === 0,
      }),
      earlyIncrease: null,
      belowMinStreak: 0,
    };
  }

  // --- Regola 5: nel range → +1 ripetizione (ed eventuale avviso RPE) ---
  let earlyIncrease: EarlyIncreaseHint | null = null;
  if (
    last.missingSets === 0 &&
    last.averageRpe !== null &&
    last.averageRpe <= config.easyRpeThreshold
  ) {
    const earlyWeight = increasedLoad(weight, target.incrementKg, target.roundingStepKg);
    earlyIncrease = {
      averageRpe: last.averageRpe,
      weightKg: earlyWeight,
      message: msg.earlyIncreaseMessage(last.averageRpe, earlyWeight, isBodyweight),
    };
  }

  return {
    action: 'increase_reps',
    weightKg: weight,
    targetReps: nextReps,
    reason: msg.increaseRepsMessage({
      weightKg: weight,
      isBodyweight,
      targets: nextReps,
      doneSets: last.countedReps.length,
      missingSets: last.missingSets,
    }),
    earlyIncrease,
    belowMinStreak: 0,
  };
}

/**
 * Ripetizioni obiettivo per ogni serie a carico invariato:
 * - serie sotto il minimo (o non fatta) → il minimo del range
 * - serie nel range                     → +1, senza superare il massimo
 * - serie già al massimo                → resta al massimo
 */
export function nextRepTargets(doneReps: number[], target: ExerciseTarget): number[] {
  return Array.from({ length: target.targetSets }, (_, i) => {
    const done = doneReps[i];
    if (done === undefined || done < target.repMin) return target.repMin;
    return Math.min(done + 1, target.repMax);
  });
}

function fill(length: number, value: number): number[] {
  return Array.from({ length }, () => value);
}
