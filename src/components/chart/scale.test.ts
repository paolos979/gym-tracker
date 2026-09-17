import { describe, expect, it } from 'vitest';
import { formatTimeTick, nearestIndex, niceScale, timeTicks } from './scale';

describe('niceScale', () => {
  it('usa valori tondi che contengono i dati', () => {
    expect(niceScale(57, 83)).toEqual({ min: 50, max: 90, ticks: [50, 60, 70, 80, 90] });
    expect(niceScale(61.5, 67.5)).toEqual({ min: 60, max: 68, ticks: [60, 62, 64, 66, 68] });
  });

  it('con un solo valore allarga l\'intervallo', () => {
    const scale = niceScale(60, 60);
    expect(scale.min).toBeLessThan(60);
    expect(scale.max).toBeGreaterThan(60);
  });

  it('non scende sotto zero con dati positivi', () => {
    expect(niceScale(0, 0).min).toBe(0);
    expect(niceScale(1, 20).min).toBe(0);
  });
});

describe('asse del tempo', () => {
  it('distribuisce le date tra inizio e fine', () => {
    const start = new Date(2026, 0, 1).getTime();
    const end = new Date(2026, 3, 1).getTime();
    const ticks = timeTicks(start, end, 4);
    expect(ticks).toHaveLength(4);
    expect(ticks[0]).toBe(start);
    expect(ticks[3]).toBe(end);
  });

  it('formatta le etichette in italiano', () => {
    const d = new Date(2026, 8, 3).getTime();
    expect(formatTimeTick(d, 30 * 86_400_000)).toBe('3 set');
    expect(formatTimeTick(d, 400 * 86_400_000)).toBe('set 26');
  });

  it('trova il punto più vicino', () => {
    expect(nearestIndex([0, 10, 20], 14)).toBe(1);
    expect(nearestIndex([0, 10, 20], 16)).toBe(2);
  });
});
