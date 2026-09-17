/**
 * VALORI PREDEFINITI ED ETICHETTE IN ITALIANO
 */
import type {
  BodyRegion,
  Exercise,
  ExerciseTarget,
  ExerciseType,
  MuscleGroup,
  Settings,
} from './types';

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  defaultRoundingStepKg: 1.25,
  defaultIncrementsKg: {
    compoundUpper: 2.5,
    compoundLower: 5,
    isolation: 2,
  },
  defaultRestSeconds: {
    compound: 150,
    isolation: 90,
  },
  keepScreenAwake: true,
  timerSound: true,
};

/** Nomi dei gruppi muscolari da mostrare nell'interfaccia. */
export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Petto',
  back: 'Dorso',
  shoulders: 'Spalle',
  biceps: 'Bicipiti',
  triceps: 'Tricipiti',
  forearms: 'Avambracci',
  abs: 'Addome',
  quads: 'Quadricipiti',
  hamstrings: 'Femorali',
  glutes: 'Glutei',
  calves: 'Polpacci',
  other: 'Altro',
};

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  compound: 'Multiarticolare',
  isolation: 'Isolamento',
};

export const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  upper: 'Parte superiore',
  lower: 'Parte inferiore',
};

/** Gruppi muscolari considerati "parte inferiore". Tutti gli altri sono "superiore". */
const LOWER_BODY_GROUPS: MuscleGroup[] = ['quads', 'hamstrings', 'glutes', 'calves'];

export function bodyRegionFor(muscleGroup: MuscleGroup): BodyRegion {
  return LOWER_BODY_GROUPS.includes(muscleGroup) ? 'lower' : 'upper';
}

/**
 * Incremento di carico proposto per un nuovo esercizio:
 * isolamento → 2 kg; multiarticolare superiore → 2,5 kg; inferiore → 5 kg
 * (valori presi dalle impostazioni, quindi modificabili).
 */
export function defaultIncrementFor(
  type: ExerciseType,
  region: BodyRegion,
  settings: Settings,
): number {
  if (type === 'isolation') return settings.defaultIncrementsKg.isolation;
  return region === 'lower'
    ? settings.defaultIncrementsKg.compoundLower
    : settings.defaultIncrementsKg.compoundUpper;
}

export function defaultRestFor(type: ExerciseType, settings: Settings): number {
  return settings.defaultRestSeconds[type];
}

/**
 * Obiettivi "risolti" di un esercizio: se l'esercizio non ha un suo passo
 * di arrotondamento, usa quello globale.
 */
export function targetFromExercise(exercise: Exercise, settings: Settings): ExerciseTarget {
  return {
    repMin: exercise.repMin,
    repMax: exercise.repMax,
    targetSets: exercise.targetSets,
    incrementKg: exercise.incrementKg,
    roundingStepKg: exercise.roundingStepKg ?? settings.defaultRoundingStepKg,
  };
}
