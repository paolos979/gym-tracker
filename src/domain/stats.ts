/**
 * STATISTICHE PER LO STORICO
 *
 * 1RM stimato, andamento di un esercizio nel tempo, record personali
 * e conteggi degli allenamenti. Tutte funzioni pure.
 */
import type { ExerciseLog, Session } from './types';

/**
 * 1RM stimato con la formula di Epley: carico × (1 + ripetizioni / 30).
 * Con 1 ripetizione il 1RM è il carico stesso; senza ripetizioni o senza carico è 0.
 * Risultato arrotondato a 0,1 kg.
 */
export function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/** Un punto dell'andamento: i valori migliori di un esercizio in una sessione. */
export interface ProgressPoint {
  sessionId: string;
  date: string;
  /** Carico più alto usato nelle serie allenanti. */
  maxWeightKg: number;
  /** 1RM stimato migliore tra le serie. */
  estimated1RMKg: number;
  /** La serie che ha dato il 1RM stimato migliore. */
  bestSet: { weightKg: number; reps: number };
  /** Ripetizioni più alte in una singola serie (utile a corpo libero). */
  maxReps: number;
  workingSets: number;
  volumeKg: number;
}

/**
 * Andamento di un esercizio: un punto per sessione, dalla più VECCHIA alla più recente.
 * Considera solo serie completate e non di riscaldamento; salta le sessioni senza.
 */
export function progressPoints(logs: ExerciseLog[]): ProgressPoint[] {
  const points: ProgressPoint[] = [];
  for (const log of logs) {
    const sets = log.sets.filter((s) => s.completedAt !== null && !s.isWarmup);
    if (sets.length === 0) continue;

    let bestSet = sets[0];
    let best1RM = epley1RM(bestSet.weightKg, bestSet.reps);
    for (const s of sets.slice(1)) {
      const value = epley1RM(s.weightKg, s.reps);
      // A parità di 1RM stimato vince la serie più pesante.
      if (value > best1RM || (value === best1RM && s.weightKg > bestSet.weightKg)) {
        best1RM = value;
        bestSet = s;
      }
    }

    points.push({
      sessionId: log.sessionId,
      date: log.date,
      maxWeightKg: Math.max(...sets.map((s) => s.weightKg)),
      estimated1RMKg: best1RM,
      bestSet: { weightKg: bestSet.weightKg, reps: bestSet.reps },
      maxReps: Math.max(...sets.map((s) => s.reps)),
      workingSets: sets.length,
      volumeKg: Math.round(sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0)),
    });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export interface PersonalRecords {
  best1RM: ProgressPoint | null;
  heaviest: ProgressPoint | null;
  mostReps: ProgressPoint | null;
  sessions: number;
}

/** Record personali. A parità di valore vale il primo raggiunto (il più vecchio). */
export function personalRecords(points: ProgressPoint[]): PersonalRecords {
  const bestBy = (value: (p: ProgressPoint) => number) =>
    points.reduce<ProgressPoint | null>((best, p) => (best === null || value(p) > value(best) ? p : best), null);
  return {
    best1RM: bestBy((p) => p.estimated1RMKg),
    heaviest: bestBy((p) => p.maxWeightKg),
    mostReps: bestBy((p) => p.maxReps),
    sessions: points.length,
  };
}

export type TimeRange = '3m' | '6m' | '1y' | 'all';

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '3m': '3 mesi',
  '6m': '6 mesi',
  '1y': '1 anno',
  all: 'Tutto',
};

/** Punti degli ultimi 3/6/12 mesi (o tutti). */
export function filterByRange<T extends { date: string }>(items: T[], range: TimeRange, now: Date = new Date()): T[] {
  if (range === 'all') return items;
  const months = range === '3m' ? 3 : range === '6m' ? 6 : 12;
  const from = new Date(now);
  from.setMonth(from.getMonth() - months);
  const fromIso = from.toISOString();
  return items.filter((i) => i.date >= fromIso);
}

/** Lunedì della settimana della data indicata, a mezzanotte (ora locale). */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - daysSinceMonday);
  return d;
}

/** Conteggi degli allenamenti terminati: questa settimana, questo mese, totale. */
export function sessionCounts(sessions: Session[], now: Date = new Date()) {
  const weekStart = startOfWeek(now).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const finished = sessions.filter((s) => s.finishedAt !== null);
  return {
    thisWeek: finished.filter((s) => new Date(s.startedAt).getTime() >= weekStart).length,
    thisMonth: finished.filter((s) => new Date(s.startedAt).getTime() >= monthStart).length,
    total: finished.length,
  };
}

/** Raggruppa le sessioni per mese, mantenendo l'ordine ricevuto. Etichetta: "Settembre 2026". */
export function groupByMonth<T extends { startedAt: string }>(items: T[]): { key: string; label: string; items: T[] }[] {
  const groups: { key: string; label: string; items: T[] }[] = [];
  for (const item of items) {
    const d = new Date(item.startedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let group = groups.find((g) => g.key === key);
    if (!group) {
      const label = d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
      group = { key, label: label.charAt(0).toUpperCase() + label.slice(1), items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}
