/**
 * TEST DELLA LIBRERIA DI ESERCIZI
 * Controlla che ogni voce sia coerente: se aggiungi un esercizio alla libreria
 * e sbagli un valore, questi test lo segnalano.
 */
import { describe, expect, it } from 'vitest';
import { MUSCLE_GROUP_LABELS } from './defaults';
import {
  EQUIPMENT_LABELS,
  EQUIPMENT_ORDER,
  EXERCISE_CATALOG,
  catalogExercise,
  normalizeExerciseName,
} from './exerciseCatalog';

describe('libreria di esercizi', () => {
  it('ha voci a sufficienza per tutti gli attrezzi', () => {
    expect(EXERCISE_CATALOG.length).toBeGreaterThanOrEqual(50);
    for (const equipment of EQUIPMENT_ORDER) {
      expect(EXERCISE_CATALOG.filter((e) => e.equipment === equipment).length).toBeGreaterThanOrEqual(5);
    }
  });

  it('non ha codici né nomi doppi', () => {
    const ids = EXERCISE_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const names = EXERCISE_CATALOG.map((e) => normalizeExerciseName(e.name));
    expect(new Set(names).size).toBe(names.length);
  });

  it('ha valori validi in ogni voce', () => {
    for (const e of EXERCISE_CATALOG) {
      expect(e.name.trim(), e.id).toBe(e.name);
      expect(e.name.length, e.id).toBeGreaterThan(2);
      expect(e.muscleGroup in MUSCLE_GROUP_LABELS, e.id).toBe(true);
      expect(e.equipment in EQUIPMENT_LABELS, e.id).toBe(true);
      expect(e.repMin, e.id).toBeGreaterThan(0);
      expect(e.repMax, e.id).toBeGreaterThanOrEqual(e.repMin);
      expect(e.sets ?? 3, e.id).toBeGreaterThan(0);
      if (e.roundingStep != null) expect(e.roundingStep, e.id).toBeGreaterThan(0);
    }
  });

  it('usa il passo dei manubri (2 kg) per gli esercizi con i manubri', () => {
    for (const e of EXERCISE_CATALOG.filter((x) => x.equipment === 'dumbbell')) {
      expect(e.roundingStep, e.id).toBe(2);
    }
  });

  it('segna come corpo libero tutti e soli gli esercizi a corpo libero', () => {
    for (const e of EXERCISE_CATALOG) {
      expect(e.bodyweight === true, e.id).toBe(e.equipment === 'bodyweight');
    }
  });

  it('trova una voce dal codice e segnala i codici sbagliati', () => {
    expect(catalogExercise('lat-machine').name).toBe('Lat machine');
    expect(() => catalogExercise('inesistente')).toThrow('non presente nella libreria');
  });
});

describe('normalizeExerciseName', () => {
  it('ignora maiuscole, spazi in più e accenti', () => {
    expect(normalizeExerciseName('  Lat   Machine ')).toBe('lat machine');
    expect(normalizeExerciseName('Alzate posteriori a 90°')).toBe('alzate posteriori a 90°');
    expect(normalizeExerciseName('Pull-over à cavi')).toBe('pull-over a cavi');
  });
});
