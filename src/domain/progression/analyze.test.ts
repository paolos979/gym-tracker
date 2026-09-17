import { describe, expect, it } from 'vitest';
import type { ExerciseTarget } from '../types';
import { analyzePerformance, countBelowMinStreak, type PerformedSet } from './analyze';

const target: ExerciseTarget = { repMin: 8, repMax: 12, targetSets: 3, incrementKg: 2.5, roundingStepKg: 1.25 };

function set(weightKg: number, reps: number, extra: Partial<PerformedSet> = {}): PerformedSet {
  return { weightKg, reps, rpe: null, isWarmup: false, ...extra };
}

describe('analyzePerformance', () => {
  it('restituisce null senza serie allenanti', () => {
    expect(analyzePerformance({ target, sets: [] })).toBeNull();
    expect(analyzePerformance({ target, sets: [set(40, 10, { isWarmup: true })] })).toBeNull();
  });

  it('usa il carico più alto come riferimento', () => {
    const a = analyzePerformance({ target, sets: [set(55, 12), set(60, 10), set(60, 9)] });
    expect(a?.referenceWeightKg).toBe(60);
    expect(a?.countedReps).toEqual([10, 9]);
    expect(a?.missingSets).toBe(1);
    expect(a?.status).toBe('in_range');
  });

  it('classifica tutte al massimo, nel range e sotto il minimo', () => {
    expect(analyzePerformance({ target, sets: [set(60, 12), set(60, 12), set(60, 12)] })?.status).toBe('all_at_max');
    expect(analyzePerformance({ target, sets: [set(60, 12), set(60, 11), set(60, 8)] })?.status).toBe('in_range');
    expect(analyzePerformance({ target, sets: [set(60, 12), set(60, 11), set(60, 7)] })?.status).toBe('below_min');
  });

  it('conta una serie da 0 ripetizioni come sotto il minimo', () => {
    const a = analyzePerformance({ target, sets: [set(60, 10), set(60, 9), set(60, 0)] });
    expect(a?.setsBelowMin).toBe(1);
    expect(a?.status).toBe('below_min');
  });

  it('calcola la media RPE solo sulle serie che lo hanno', () => {
    const a = analyzePerformance({ target, sets: [set(60, 10, { rpe: 8 }), set(60, 10, { rpe: 6 }), set(60, 10)] });
    expect(a?.averageRpe).toBe(7);
  });
});

describe('countBelowMinStreak', () => {
  const below = (w: number) => analyzePerformance({ target, sets: [set(w, 7), set(w, 7), set(w, 7)] })!;
  const ok = (w: number) => analyzePerformance({ target, sets: [set(w, 10), set(w, 10), set(w, 10)] })!;

  it('conta le sessioni consecutive sotto il minimo dalla più recente', () => {
    expect(countBelowMinStreak([below(60), below(60), ok(60)])).toBe(2);
    expect(countBelowMinStreak([ok(60), below(60), below(60)])).toBe(0);
    expect(countBelowMinStreak([])).toBe(0);
  });

  it('si ferma quando il carico era stato ridotto (scarico)', () => {
    expect(countBelowMinStreak([below(55), below(60), below(60)])).toBe(1);
  });

  it('continua a contare se il carico è salito', () => {
    expect(countBelowMinStreak([below(62.5), below(60)])).toBe(2);
  });
});
