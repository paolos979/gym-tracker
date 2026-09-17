import { describe, expect, it } from 'vitest';
import { deloadedLoad, increasedLoad, roundToStep } from './rounding';

describe('roundToStep', () => {
  it('arrotonda al multiplo più vicino', () => {
    expect(roundToStep(54, 2.5)).toBe(55);
    expect(roundToStep(54, 1.25)).toBe(53.75);
    expect(roundToStep(61, 2)).toBe(62);
  });

  it('non lascia errori di virgola mobile', () => {
    expect(roundToStep(0.1 + 0.2, 0.1)).toBe(0.3);
    expect(roundToStep(3 * 1.25, 1.25)).toBe(3.75);
  });
});

describe('increasedLoad', () => {
  it('somma l\'incremento e arrotonda', () => {
    expect(increasedLoad(60, 2.5, 1.25)).toBe(62.5);
    expect(increasedLoad(100, 5, 2.5)).toBe(105);
  });

  it('sale sempre di almeno un passo', () => {
    expect(increasedLoad(60, 1, 2.5)).toBe(62.5);
    expect(increasedLoad(20, 0.5, 2)).toBe(22);
  });

  it('funziona con un carico attuale fuori passo', () => {
    // 61 + 1 = 62 → multiplo di 2,5 più vicino = 62,5
    expect(increasedLoad(61, 1, 2.5)).toBe(62.5);
    // 61 + 0,5 = 61,5 → arrotondato sarebbe 62,5 comunque
    expect(increasedLoad(61, 0.5, 2.5)).toBe(62.5);
  });
});

describe('deloadedLoad', () => {
  it('riduce del 10% e arrotonda', () => {
    expect(deloadedLoad(60, 0.1, 2.5)).toBe(55);
    expect(deloadedLoad(60, 0.1, 1.25)).toBe(53.75);
    expect(deloadedLoad(100, 0.1, 2.5)).toBe(90);
  });

  it('scende sempre di almeno un passo', () => {
    // 10 × 0,9 = 9 → arrotondato a 2,5 sarebbe 10: deve scendere a 7,5
    expect(deloadedLoad(10, 0.1, 2.5)).toBe(7.5);
  });

  it('non va mai sotto zero', () => {
    expect(deloadedLoad(2.5, 0.1, 2.5)).toBe(0);
    expect(deloadedLoad(1, 0.1, 2.5)).toBe(0);
  });
});
