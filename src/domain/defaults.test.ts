import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  bodyRegionFor,
  defaultIncrementFor,
  defaultRestFor,
  targetFromExercise,
} from './defaults';
import { formatKg, joinItalian } from './format';
import type { Exercise } from './types';

describe('incrementi predefiniti', () => {
  it('2,5 kg per i multiarticolari della parte superiore', () => {
    expect(defaultIncrementFor('compound', bodyRegionFor('chest'), DEFAULT_SETTINGS)).toBe(2.5);
    expect(defaultIncrementFor('compound', bodyRegionFor('back'), DEFAULT_SETTINGS)).toBe(2.5);
  });

  it('5 kg per i multiarticolari della parte inferiore', () => {
    expect(defaultIncrementFor('compound', bodyRegionFor('quads'), DEFAULT_SETTINGS)).toBe(5);
    expect(defaultIncrementFor('compound', bodyRegionFor('glutes'), DEFAULT_SETTINGS)).toBe(5);
  });

  it('2 kg per gli esercizi di isolamento, di qualunque zona', () => {
    expect(defaultIncrementFor('isolation', 'upper', DEFAULT_SETTINGS)).toBe(2);
    expect(defaultIncrementFor('isolation', 'lower', DEFAULT_SETTINGS)).toBe(2);
  });

  it('recupero predefinito in base al tipo', () => {
    expect(defaultRestFor('compound', DEFAULT_SETTINGS)).toBe(150);
    expect(defaultRestFor('isolation', DEFAULT_SETTINGS)).toBe(90);
  });
});

describe('targetFromExercise', () => {
  const base: Exercise = {
    id: 'x',
    name: 'Panca piana',
    muscleGroup: 'chest',
    type: 'compound',
    bodyRegion: 'upper',
    repMin: 6,
    repMax: 10,
    targetSets: 4,
    incrementKg: 2.5,
    roundingStepKg: null,
    restSeconds: 150,
    isBodyweight: false,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('usa il passo globale se l\'esercizio non ne ha uno', () => {
    expect(targetFromExercise(base, DEFAULT_SETTINGS).roundingStepKg).toBe(1.25);
  });

  it('usa il passo dell\'esercizio se impostato', () => {
    expect(targetFromExercise({ ...base, roundingStepKg: 2 }, DEFAULT_SETTINGS).roundingStepKg).toBe(2);
  });
});

describe('formattazione', () => {
  it('scrive i kg con la virgola', () => {
    expect(formatKg(62.5)).toBe('62,5 kg');
    expect(formatKg(60)).toBe('60 kg');
    expect(formatKg(53.75)).toBe('53,75 kg');
  });

  it('unisce gli elenchi con "e"', () => {
    expect(joinItalian(['12', '11', '10'])).toBe('12, 11 e 10');
    expect(joinItalian(['12'])).toBe('12');
  });
});
