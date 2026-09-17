/**
 * Punto di ingresso del modulo di progressione: il resto dell'app
 * importa da qui (es. `import { suggestNextSession } from './domain/progression'`).
 */
export { suggestNextSession, nextRepTargets } from './suggest';
export type {
  Suggestion,
  SuggestionAction,
  EarlyIncreaseHint,
  ExerciseForProgression,
} from './suggest';
export { analyzePerformance, countBelowMinStreak } from './analyze';
export type { PerformedExercise, PerformedSet, PerformanceAnalysis } from './analyze';
export { PROGRESSION_CONFIG } from './config';
export type { ProgressionConfig } from './config';
export { roundToStep, increasedLoad, deloadedLoad } from './rounding';
