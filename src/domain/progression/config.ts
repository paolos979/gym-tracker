/**
 * PARAMETRI DELLA PROGRESSIONE
 *
 * Cambia questi numeri per modificare il comportamento dei suggerimenti
 * senza toccare la logica. Dopo ogni modifica lancia `npm test`.
 */
export interface ProgressionConfig {
  /** Dopo quante sessioni consecutive sotto il minimo suggerire uno scarico. */
  sessionsBelowMinForDeload: number;
  /** Riduzione del carico nello scarico (0.10 = 10%). */
  deloadFraction: number;
  /** Se l'RPE medio è minore o uguale a questo valore, le serie sono "facili". */
  easyRpeThreshold: number;
}

export const PROGRESSION_CONFIG: ProgressionConfig = {
  sessionsBelowMinForDeload: 3,
  deloadFraction: 0.1,
  easyRpeThreshold: 7,
};
