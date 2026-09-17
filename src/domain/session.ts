/**
 * LOGICA DELLA SESSIONE DI ALLENAMENTO
 *
 * Funzioni pure sulle serie: precompilazione, modifiche, riepiloghi.
 * Non salvano niente: restituiscono sempre un NUOVO elenco di serie,
 * che poi l'interfaccia salva nel database.
 */
import { formatLoad, joinItalian } from './format';
import type { Suggestion } from './progression';
import type { ExerciseLog, ExerciseTarget, SetEntry } from './types';

/** Una serie ancora da fare. */
export function pendingSet(weightKg: number, reps: number): SetEntry {
  return { weightKg, reps, rpe: null, isWarmup: false, completedAt: null };
}

/**
 * Serie precompilate all'avvio della sessione:
 * carico e ripetizioni presi dal suggerimento. Alla prima volta
 * il carico parte da 0 e le ripetizioni dal minimo del range.
 */
export function buildInitialSets(target: ExerciseTarget, suggestion: Suggestion): SetEntry[] {
  return Array.from({ length: target.targetSets }, (_, i) =>
    pendingSet(suggestion.weightKg ?? 0, suggestion.targetReps[i] ?? target.repMin),
  );
}

/** Aggiorna alcuni campi di una serie. */
export function updateSet(sets: SetEntry[], index: number, patch: Partial<SetEntry>): SetEntry[] {
  return sets.map((s, i) => (i === index ? { ...s, ...patch } : s));
}

/**
 * Cambia il carico di una serie e, per comodità, anche quello delle serie
 * SUCCESSIVE non ancora fatte che avevano lo stesso carico.
 * Es. se alla prima serie passi da 60 a 57,5 kg, anche le altre passano a 57,5.
 */
export function changeSetWeight(sets: SetEntry[], index: number, weightKg: number): SetEntry[] {
  const oldWeight = sets[index]?.weightKg;
  return sets.map((s, i) => {
    if (i === index) return { ...s, weightKg };
    const follows = i > index && s.completedAt === null && !s.isWarmup && s.weightKg === oldWeight;
    return follows ? { ...s, weightKg } : s;
  });
}

/** Aggiunge una serie copiando carico e ripetizioni dell'ultima. */
export function addSet(sets: SetEntry[], fallback: { weightKg: number; reps: number }): SetEntry[] {
  const last = sets[sets.length - 1];
  return [...sets, pendingSet(last?.weightKg ?? fallback.weightKg, last?.reps ?? fallback.reps)];
}

export function removeSet(sets: SetEntry[], index: number): SetEntry[] {
  return sets.filter((_, i) => i !== index);
}

/** Spunta (o toglie la spunta a) una serie. */
export function toggleSetCompleted(sets: SetEntry[], index: number, nowIso: string): SetEntry[] {
  const set = sets[index];
  return updateSet(sets, index, { completedAt: set.completedAt === null ? nowIso : null });
}

/**
 * Applica l'avviso "RPE basso": alle serie allenanti non ancora fatte
 * imposta il carico più alto e il minimo del range di ripetizioni.
 */
export function applyEarlyIncrease(sets: SetEntry[], weightKg: number, reps: number): SetEntry[] {
  return sets.map((s) => (s.completedAt === null && !s.isWarmup ? { ...s, weightKg, reps } : s));
}

/** true se l'avviso RPE è già stato applicato a tutte le serie da fare. */
export function isEarlyIncreaseApplied(sets: SetEntry[], weightKg: number): boolean {
  const pending = sets.filter((s) => s.completedAt === null && !s.isWarmup);
  return pending.length > 0 && pending.every((s) => s.weightKg === weightKg);
}

/** Numero di serie fatte e totali di un esercizio. */
export function setProgress(sets: SetEntry[]): { done: number; total: number } {
  return { done: sets.filter((s) => s.completedAt !== null).length, total: sets.length };
}

/** Serie non ancora spuntate in tutta la sessione. */
export function countPendingSets(logs: ExerciseLog[]): number {
  return logs.reduce((sum, log) => sum + log.sets.filter((s) => s.completedAt === null).length, 0);
}

/**
 * Riassunto testuale delle serie allenanti completate, raggruppando
 * quelle consecutive con lo stesso carico.
 * Es. "60 kg × 12, 12, 11" oppure "60 kg × 12, 12 · 55 kg × 10".
 * Stringa vuota se non ci sono serie completate.
 */
export function summarizeSets(sets: SetEntry[], isBodyweight = false): string {
  const done = sets.filter((s) => s.completedAt !== null && !s.isWarmup);
  const groups: { weightKg: number; reps: number[] }[] = [];
  for (const s of done) {
    const last = groups[groups.length - 1];
    if (last && last.weightKg === s.weightKg) last.reps.push(s.reps);
    else groups.push({ weightKg: s.weightKg, reps: [s.reps] });
  }
  return groups
    .map((g) => `${formatLoad(g.weightKg, isBodyweight)} × ${g.reps.join(', ')}`)
    .join(' · ');
}

/** Statistiche di una sessione: serie completate e volume (kg × ripetizioni). */
export function sessionStats(logs: ExerciseLog[]): { completedSets: number; volumeKg: number } {
  let completedSets = 0;
  let volumeKg = 0;
  for (const log of logs) {
    for (const s of log.sets) {
      if (s.completedAt === null || s.isWarmup) continue;
      completedSets++;
      volumeKg += s.weightKg * s.reps;
    }
  }
  return { completedSets, volumeKg: Math.round(volumeKg) };
}

/** Testo per la conferma di fine sessione. */
export function finishWarning(pendingSets: number): string {
  if (pendingSets === 0) return 'Hai completato tutte le serie.';
  const what = pendingSets === 1 ? '1 serie non spuntata' : `${pendingSets} serie non spuntate`;
  return `Hai ancora ${what}: ${pendingSets === 1 ? 'verrà scartata' : 'verranno scartate'}.`;
}

/** Nomi degli esercizi di una scheda in una riga: "Panca, Lento e Croci". */
export function exerciseNamesLine(names: string[], max = 4): string {
  if (names.length <= max) return joinItalian(names);
  const others = names.length - max;
  return `${names.slice(0, max).join(', ')} e ${others === 1 ? 'un altro' : `altri ${others}`}`;
}
