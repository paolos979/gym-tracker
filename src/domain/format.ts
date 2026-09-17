/**
 * FORMATTAZIONE IN ITALIANO
 */

const kgFormatter = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });

/** 62.5 → "62,5 kg" */
export function formatKg(value: number): string {
  return `${kgFormatter.format(value)} kg`;
}

/** 6.5 → "6,5" */
export function formatDecimal(value: number): string {
  return kgFormatter.format(value);
}

/** ["a", "b", "c"] → "a, b e c" */
export function joinItalian(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

/** 1 → "1 ripetizione", 8 → "8 ripetizioni" */
export function pluralReps(n: number): string {
  return n === 1 ? '1 ripetizione' : `${n} ripetizioni`;
}

/** 1 → "1 serie", 3 → "3 serie" (in italiano "serie" è invariabile) */
export function pluralSets(n: number): string {
  return `${n} serie`;
}

/**
 * Carico da mostrare: per gli esercizi a corpo libero 0 = "Corpo libero"
 * e un valore positivo è la zavorra ("+5 kg").
 */
export function formatLoad(weightKg: number, isBodyweight: boolean): string {
  if (!isBodyweight) return formatKg(weightKg);
  return weightKg === 0 ? 'Corpo libero' : `+${formatKg(weightKg)}`;
}

/** 150 → "2:30" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Durata in millisecondi → "42 min" oppure "1 h 05 min" */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${String(minutes).padStart(2, '0')} min`;
}

/** "18:32" */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

/** "oggi", "ieri", "3 giorni fa", oppure "12 set" / "12 set 2025" */
export function formatRelativeDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return 'oggi';
  if (days === 1) return 'ieri';
  if (days > 1 && days < 7) return `${days} giorni fa`;
  return date.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}
