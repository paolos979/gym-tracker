import { describe, expect, it } from 'vitest';
import { formatClock, formatDuration, formatLoad, formatRelativeDay } from './format';
import type { Suggestion } from './progression';
import {
  addSet,
  applyEarlyIncrease,
  buildInitialSets,
  changeSetWeight,
  countPendingSets,
  exerciseNamesLine,
  finishWarning,
  isEarlyIncreaseApplied,
  pendingSet,
  sessionStats,
  summarizeSets,
  toggleSetCompleted,
} from './session';
import type { ExerciseLog, ExerciseTarget, SetEntry } from './types';

const target: ExerciseTarget = { repMin: 8, repMax: 12, targetSets: 3, incrementKg: 2.5, roundingStepKg: 1.25 };
const NOW = '2026-09-17T18:00:00.000Z';

function suggestion(overrides: Partial<Suggestion>): Suggestion {
  return {
    action: 'increase_reps',
    weightKg: 60,
    targetReps: [12, 11, 10],
    reason: '',
    earlyIncrease: null,
    belowMinStreak: 0,
    ...overrides,
  };
}

const done = (weightKg: number, reps: number, extra: Partial<SetEntry> = {}): SetEntry => ({
  ...pendingSet(weightKg, reps),
  completedAt: NOW,
  ...extra,
});

describe('buildInitialSets', () => {
  it('precompila carico e ripetizioni dal suggerimento', () => {
    const sets = buildInitialSets(target, suggestion({}));
    expect(sets.map((s) => [s.weightKg, s.reps])).toEqual([[60, 12], [60, 11], [60, 10]]);
    expect(sets.every((s) => s.completedAt === null && !s.isWarmup && s.rpe === null)).toBe(true);
  });

  it('alla prima volta parte da 0 kg e dal minimo del range', () => {
    const sets = buildInitialSets(target, suggestion({ action: 'first_time', weightKg: null, targetReps: [] }));
    expect(sets.map((s) => [s.weightKg, s.reps])).toEqual([[0, 8], [0, 8], [0, 8]]);
  });
});

describe('modifica delle serie', () => {
  it('cambiando il carico si aggiornano le serie successive da fare con lo stesso carico', () => {
    const sets = [done(60, 10), pendingSet(60, 10), pendingSet(60, 10), pendingSet(55, 10)];
    const result = changeSetWeight(sets, 1, 57.5);
    expect(result.map((s) => s.weightKg)).toEqual([60, 57.5, 57.5, 55]);
  });

  it('non tocca le serie già fatte né quelle precedenti', () => {
    const sets = [pendingSet(60, 10), done(60, 10), pendingSet(60, 10)];
    const result = changeSetWeight(sets, 2, 62.5);
    expect(result.map((s) => s.weightKg)).toEqual([60, 60, 62.5]);
  });

  it('aggiunge una serie copiando l\'ultima', () => {
    const result = addSet([done(60, 9)], { weightKg: 0, reps: 8 });
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual(pendingSet(60, 9));
    expect(addSet([], { weightKg: 20, reps: 8 })[0]).toEqual(pendingSet(20, 8));
  });

  it('spunta e toglie la spunta', () => {
    const sets = toggleSetCompleted([pendingSet(60, 10)], 0, NOW);
    expect(sets[0].completedAt).toBe(NOW);
    expect(toggleSetCompleted(sets, 0, NOW)[0].completedAt).toBeNull();
  });

  it('applica l\'aumento anticipato solo alle serie allenanti da fare', () => {
    const sets = [pendingSet(40, 10), done(60, 10), pendingSet(60, 11), pendingSet(60, 11)];
    sets[0] = { ...sets[0], isWarmup: true };
    const result = applyEarlyIncrease(sets, 62.5, 8);
    expect(result.map((s) => [s.weightKg, s.reps])).toEqual([[40, 10], [60, 10], [62.5, 8], [62.5, 8]]);
    expect(isEarlyIncreaseApplied(result, 62.5)).toBe(true);
    expect(isEarlyIncreaseApplied(sets, 62.5)).toBe(false);
  });
});

describe('riepiloghi', () => {
  it('raggruppa le serie con lo stesso carico', () => {
    expect(summarizeSets([done(60, 12), done(60, 12), done(60, 11)])).toBe('60 kg × 12, 12, 11');
    expect(summarizeSets([done(60, 12), done(60, 12), done(55, 10)])).toBe('60 kg × 12, 12 · 55 kg × 10');
  });

  it('esclude riscaldamento e serie non fatte', () => {
    expect(summarizeSets([done(40, 10, { isWarmup: true }), done(60, 10), pendingSet(60, 10)])).toBe('60 kg × 10');
    expect(summarizeSets([pendingSet(60, 10)])).toBe('');
  });

  it('mostra il corpo libero e la zavorra', () => {
    expect(summarizeSets([done(0, 8), done(0, 7)], true)).toBe('Corpo libero × 8, 7');
    expect(formatLoad(5, true)).toBe('+5 kg');
  });

  it('calcola serie completate e volume', () => {
    const log = { sets: [done(40, 10, { isWarmup: true }), done(60, 10), done(60, 8), pendingSet(60, 8)] } as ExerciseLog;
    expect(sessionStats([log])).toEqual({ completedSets: 2, volumeKg: 1080 });
    expect(countPendingSets([log])).toBe(1);
  });

  it('avvisa delle serie non spuntate', () => {
    expect(finishWarning(0)).toBe('Hai completato tutte le serie.');
    expect(finishWarning(1)).toBe('Hai ancora 1 serie non spuntata: verrà scartata.');
    expect(finishWarning(3)).toBe('Hai ancora 3 serie non spuntate: verranno scartate.');
  });

  it('elenca i nomi degli esercizi', () => {
    expect(exerciseNamesLine(['A', 'B', 'C'])).toBe('A, B e C');
    expect(exerciseNamesLine(['A', 'B', 'C', 'D', 'E', 'F'])).toBe('A, B, C, D e altri 2');
    expect(exerciseNamesLine(['A', 'B', 'C', 'D', 'E'])).toBe('A, B, C, D e un altro');
  });
});

describe('formattazione di tempi e date', () => {
  it('orologio del timer', () => {
    expect(formatClock(150)).toBe('2:30');
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(-3)).toBe('0:00');
  });

  it('durata della sessione', () => {
    expect(formatDuration(42 * 60000)).toBe('42 min');
    expect(formatDuration(65 * 60000)).toBe('1 h 05 min');
  });

  it('giorni relativi', () => {
    const now = new Date(2026, 8, 17, 20, 0);
    expect(formatRelativeDay(new Date(2026, 8, 17, 8, 0).toISOString(), now)).toBe('oggi');
    expect(formatRelativeDay(new Date(2026, 8, 16, 23, 0).toISOString(), now)).toBe('ieri');
    expect(formatRelativeDay(new Date(2026, 8, 14, 10, 0).toISOString(), now)).toBe('3 giorni fa');
    expect(formatRelativeDay(new Date(2026, 8, 1, 10, 0).toISOString(), now)).toBe('1 set');
  });
});
