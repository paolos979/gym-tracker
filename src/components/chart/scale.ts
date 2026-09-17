/**
 * CALCOLI PER GLI ASSI DEI GRAFICI (funzioni pure, testate)
 */

/** Passo "rotondo" (1, 2, 2,5, 5 × 10ⁿ) vicino a quello richiesto. */
function niceStep(rough: number): number {
  const exponent = Math.floor(Math.log10(rough));
  const base = 10 ** exponent;
  const fraction = rough / base;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * base;
}

/**
 * Asse Y con valori tondi che contengono tutti i dati.
 * Es. niceScale(57, 83) → { min: 50, max: 90, ticks: [50, 60, 70, 80, 90] }
 */
export function niceScale(minValue: number, maxValue: number, targetTicks = 4): { min: number; max: number; ticks: number[] } {
  let lo = minValue;
  let hi = maxValue;
  if (lo === hi) {
    // Un solo valore: allarga un po' l'intervallo per centrarlo.
    const pad = lo === 0 ? 1 : Math.abs(lo) * 0.1;
    lo -= pad;
    hi += pad;
  }
  const step = niceStep((hi - lo) / targetTicks);
  // Con dati tutti positivi (i kg) l'asse non scende mai sotto zero.
  const min = minValue >= 0 ? Math.max(0, Math.floor(lo / step) * step) : Math.floor(lo / step) * step;
  const max = Math.round(Math.ceil(hi / step) * step * 1000) / 1000;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { min, max, ticks };
}

const DAY = 86_400_000;

/**
 * Date per le etichette dell'asse X: circa `count` date distribuite
 * uniformemente tra inizio e fine (sempre a mezzanotte).
 */
export function timeTicks(startMs: number, endMs: number, count = 4): number[] {
  if (endMs <= startMs) return [startMs];
  const ticks: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = startMs + ((endMs - startMs) * i) / (count - 1);
    const d = new Date(t);
    ticks.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
  }
  return [...new Set(ticks)];
}

/** Etichetta di una data sull'asse: "3 set" per periodi brevi, "set 25" per periodi lunghi. */
export function formatTimeTick(ms: number, spanMs: number): string {
  const d = new Date(ms);
  if (spanMs > 300 * DAY) {
    const month = d.toLocaleDateString('it-IT', { month: 'short' });
    return `${month} ${String(d.getFullYear()).slice(2)}`;
  }
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

/** Indice del valore di `xs` (ordinato) più vicino a `x`. */
export function nearestIndex(xs: number[], x: number): number {
  let best = 0;
  for (let i = 1; i < xs.length; i++) {
    if (Math.abs(xs[i] - x) < Math.abs(xs[best] - x)) best = i;
  }
  return best;
}
