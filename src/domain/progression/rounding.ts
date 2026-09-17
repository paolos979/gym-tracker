/**
 * ARROTONDAMENTO DEI CARICHI
 *
 * I carichi suggeriti devono essere realmente caricabili: con dischi da
 * 0,625 kg per lato il passo è 1,25 kg, con manubri da 2 in 2 il passo è 2 kg, ecc.
 */

/**
 * Elimina gli errori dei numeri decimali (es. 0.1 + 0.2 = 0.30000000000000004)
 * arrotondando a 3 cifre decimali.
 */
function clean(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Tolleranza per i confronti tra decimali. */
const EPSILON = 1e-9;

/** Arrotonda al multiplo di `step` più vicino. Es. roundToStep(54, 2.5) → 55. */
export function roundToStep(value: number, step: number): number {
  if (step <= 0) return clean(value);
  return clean(Math.round(value / step + EPSILON) * step);
}

/**
 * Carico dopo un aumento: carico attuale + incremento, arrotondato.
 * Garantisce che il risultato sia SEMPRE più alto del carico attuale
 * (es. incremento 1 kg con passo 2,5 kg: da 60 si va a 62,5, non si resta a 60).
 */
export function increasedLoad(currentKg: number, incrementKg: number, step: number): number {
  const candidate = roundToStep(currentKg + incrementKg, step);
  if (candidate > currentKg + EPSILON) return candidate;
  // Primo multiplo del passo sopra il carico attuale.
  return clean((Math.floor(currentKg / step + EPSILON) + 1) * step);
}

/**
 * Carico dopo uno scarico: riduce della percentuale indicata e arrotonda.
 * Garantisce che il risultato sia SEMPRE più basso del carico attuale
 * (almeno un passo in meno) e mai negativo.
 * Es. deloadedLoad(60, 0.1, 2.5) → 54 arrotondato → 55.
 */
export function deloadedLoad(currentKg: number, fraction: number, step: number): number {
  let candidate = roundToStep(currentKg * (1 - fraction), step);
  if (candidate >= currentKg - EPSILON) {
    // Primo multiplo del passo sotto il carico attuale.
    candidate = clean((Math.ceil(currentKg / step - EPSILON) - 1) * step);
  }
  return Math.max(0, candidate);
}
