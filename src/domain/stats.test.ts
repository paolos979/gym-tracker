import { describe, expect, it } from 'vitest';
import {
  epley1RM,
  filterByRange,
  groupByMonth,
  personalRecords,
  progressPoints,
  sessionCounts,
  startOfWeek,
} from './stats';
import type { ExerciseLog, Session, SetEntry } from './types';

const target = { repMin: 8, repMax: 12, targetSets: 3, incrementKg: 2.5, roundingStepKg: 1.25 };

function set(weightKg: number, reps: number, extra: Partial<SetEntry> = {}): SetEntry {
  return { weightKg, reps, rpe: null, isWarmup: false, completedAt: '2026-09-01T18:00:00.000Z', ...extra };
}

function log(sessionId: string, date: string, sets: SetEntry[]): ExerciseLog {
  return { id: `log-${sessionId}`, sessionId, exerciseId: 'ex', date, order: 0, target, sets };
}

describe('epley1RM', () => {
  it('applica la formula carico × (1 + ripetizioni / 30)', () => {
    expect(epley1RM(100, 10)).toBe(133.3);
    expect(epley1RM(60, 12)).toBe(84);
  });

  it('con 1 ripetizione il 1RM è il carico stesso', () => {
    expect(epley1RM(140, 1)).toBe(140);
  });

  it('senza ripetizioni o senza carico vale 0', () => {
    expect(epley1RM(100, 0)).toBe(0);
    expect(epley1RM(0, 10)).toBe(0);
  });
});

describe('progressPoints', () => {
  it('un punto per sessione, dalla più vecchia, con carico massimo e 1RM migliore', () => {
    const points = progressPoints([
      log('b', '2026-09-08T18:00:00.000Z', [set(62.5, 8), set(62.5, 7)]),
      log('a', '2026-09-01T18:00:00.000Z', [set(60, 12), set(60, 11), set(55, 12)]),
    ]);
    expect(points.map((p) => p.sessionId)).toEqual(['a', 'b']);
    expect(points[0]).toMatchObject({
      maxWeightKg: 60,
      estimated1RMKg: 84,
      bestSet: { weightKg: 60, reps: 12 },
      maxReps: 12,
      workingSets: 3,
      volumeKg: 60 * 12 + 60 * 11 + 55 * 12,
    });
    expect(points[1].estimated1RMKg).toBe(79.2);
  });

  it('ignora riscaldamento, serie non fatte e sessioni vuote', () => {
    const points = progressPoints([
      log('a', '2026-09-01T18:00:00.000Z', [set(100, 5, { isWarmup: true }), set(60, 10), set(80, 10, { completedAt: null })]),
      log('b', '2026-09-02T18:00:00.000Z', [set(40, 10, { isWarmup: true })]),
    ]);
    expect(points).toHaveLength(1);
    expect(points[0].maxWeightKg).toBe(60);
  });

  it('a parità di 1RM stimato sceglie la serie più pesante', () => {
    // 90 × 1 = 90 e 75 × 6 = 90
    const [p] = progressPoints([log('a', '2026-09-01T18:00:00.000Z', [set(75, 6), set(90, 1)])]);
    expect(p.bestSet).toEqual({ weightKg: 90, reps: 1 });
  });
});

describe('personalRecords', () => {
  it('trova i migliori valori e, a parità, il primo raggiunto', () => {
    const points = progressPoints([
      log('a', '2026-09-01T18:00:00.000Z', [set(60, 12)]),
      log('b', '2026-09-08T18:00:00.000Z', [set(65, 8)]),
      log('c', '2026-09-15T18:00:00.000Z', [set(65, 6)]),
    ]);
    const records = personalRecords(points);
    expect(records.best1RM?.sessionId).toBe('a'); // 84 contro 82,3 e 78
    expect(records.heaviest?.sessionId).toBe('b');
    expect(records.mostReps?.sessionId).toBe('a');
    expect(records.sessions).toBe(3);
    expect(personalRecords([]).best1RM).toBeNull();
  });
});

describe('periodi e conteggi', () => {
  const now = new Date(2026, 8, 17, 12, 0); // giovedì 17 settembre 2026

  it('filtra per periodo', () => {
    const items = [
      { date: new Date(2026, 1, 1).toISOString() },
      { date: new Date(2026, 5, 1).toISOString() },
      { date: new Date(2026, 8, 1).toISOString() },
    ];
    expect(filterByRange(items, '3m', now)).toHaveLength(1);
    expect(filterByRange(items, '6m', now)).toHaveLength(2);
    expect(filterByRange(items, '1y', now)).toHaveLength(3);
    expect(filterByRange(items, 'all', now)).toHaveLength(3);
  });

  it('la settimana inizia di lunedì', () => {
    expect(startOfWeek(now)).toEqual(new Date(2026, 8, 14));
    expect(startOfWeek(new Date(2026, 8, 20, 23, 0))).toEqual(new Date(2026, 8, 14)); // domenica
  });

  it('conta gli allenamenti della settimana, del mese e totali', () => {
    const s = (d: Date, finished = true): Session => ({
      id: d.toISOString(),
      templateId: null,
      templateName: 'X',
      startedAt: d.toISOString(),
      finishedAt: finished ? d.toISOString() : null,
      notes: '',
    });
    const sessions = [
      s(new Date(2026, 8, 15)),
      s(new Date(2026, 8, 10)),
      s(new Date(2026, 7, 30)),
      s(new Date(2026, 8, 16), false), // in corso: non conta
    ];
    expect(sessionCounts(sessions, now)).toEqual({ thisWeek: 1, thisMonth: 2, total: 3 });
  });

  it('raggruppa per mese con etichetta in italiano', () => {
    const groups = groupByMonth([
      { startedAt: new Date(2026, 8, 15).toISOString() },
      { startedAt: new Date(2026, 8, 2).toISOString() },
      { startedAt: new Date(2026, 7, 30).toISOString() },
    ]);
    expect(groups.map((g) => [g.label, g.items.length])).toEqual([
      ['Settembre 2026', 2],
      ['Agosto 2026', 1],
    ]);
  });
});
