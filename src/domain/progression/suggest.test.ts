/**
 * TEST DELLE REGOLE DI PROGRESSIONE
 *
 * Ogni blocco `describe` corrisponde a una regola. Per lanciarli: `npm test`.
 * Se modifichi le regole, aggiorna o aggiungi qui il caso corrispondente.
 */
import { describe, expect, it } from 'vitest';
import type { ExerciseTarget } from '../types';
import type { PerformedExercise } from './analyze';
import { PROGRESSION_CONFIG } from './config';
import { nextRepTargets, suggestNextSession } from './suggest';

// ---------------------------------------------------------------------------
// Funzioni di aiuto per costruire i dati dei test in poche righe
// ---------------------------------------------------------------------------

/** Obiettivi standard: 3 serie da 8-12, +2,5 kg, arrotondamento 1,25 kg. */
function target(overrides: Partial<ExerciseTarget> = {}): ExerciseTarget {
  return { repMin: 8, repMax: 12, targetSets: 3, incrementKg: 2.5, roundingStepKg: 1.25, ...overrides };
}

function exercise(overrides: Partial<ExerciseTarget> = {}, isBodyweight = false) {
  return { target: target(overrides), isBodyweight };
}

/**
 * Una sessione in cui tutte le serie sono fatte allo stesso carico.
 * Es. session(60, [12, 12, 12]) = 3 serie da 12 a 60 kg.
 */
function session(
  weightKg: number,
  reps: number[],
  options: { rpe?: (number | null)[]; target?: Partial<ExerciseTarget> } = {},
): PerformedExercise {
  return {
    target: target(options.target),
    sets: reps.map((r, i) => ({ weightKg, reps: r, rpe: options.rpe?.[i] ?? null, isWarmup: false })),
  };
}

// ---------------------------------------------------------------------------

describe('Regola 1 – prima volta', () => {
  it('senza storico non suggerisce un carico', () => {
    const s = suggestNextSession(exercise(), []);
    expect(s.action).toBe('first_time');
    expect(s.weightKg).toBeNull();
    expect(s.targetReps).toEqual([8, 8, 8]);
    expect(s.reason).toContain('Prima volta');
  });

  it('una sessione con solo serie di riscaldamento vale come nessuno storico', () => {
    const onlyWarmup: PerformedExercise = {
      target: target(),
      sets: [{ weightKg: 40, reps: 12, rpe: null, isWarmup: true }],
    };
    expect(suggestNextSession(exercise(), [onlyWarmup]).action).toBe('first_time');
  });
});

describe('Regola 4 – tutte le serie al massimo: aumenta il carico', () => {
  it('aumenta dell\'incremento e riparte dal minimo, con la spiegazione', () => {
    const s = suggestNextSession(exercise(), [session(60, [12, 12, 12])]);
    expect(s.action).toBe('increase_load');
    expect(s.weightKg).toBe(62.5);
    expect(s.targetReps).toEqual([8, 8, 8]);
    expect(s.reason).toBe(
      'Hai fatto 12 ripetizioni in tutte e 3 le serie: aumenta a 62,5 kg e punta a 8 ripetizioni.',
    );
  });

  it('conta come massimo anche chi supera il massimo', () => {
    const s = suggestNextSession(exercise(), [session(60, [13, 12, 12])]);
    expect(s.action).toBe('increase_load');
    expect(s.reason).toContain('almeno 12 ripetizioni');
  });

  it('usa l\'incremento dell\'esercizio (es. 5 kg per le gambe)', () => {
    const s = suggestNextSession(exercise({ incrementKg: 5 }), [session(100, [12, 12, 12])]);
    expect(s.weightKg).toBe(105);
  });

  it('arrotonda al passo dell\'esercizio (manubri da 2 kg)', () => {
    const s = suggestNextSession(
      exercise({ incrementKg: 2, roundingStepKg: 2 }),
      [session(14, [12, 12, 12])],
    );
    expect(s.weightKg).toBe(16);
  });

  it('arrotonda un incremento che non è multiplo del passo', () => {
    // 60 + 2 = 62 → multiplo di 1,25 più vicino = 62,5
    const s = suggestNextSession(exercise({ incrementKg: 2 }), [session(60, [12, 12, 12])]);
    expect(s.weightKg).toBe(62.5);
  });

  it('aumenta sempre, anche se l\'incremento è più piccolo del passo', () => {
    // 60 + 1 = 61 → arrotondato a 2,5 sarebbe 60: deve invece salire a 62,5
    const s = suggestNextSession(
      exercise({ incrementKg: 1, roundingStepKg: 2.5 }),
      [session(60, [12, 12, 12])],
    );
    expect(s.weightKg).toBe(62.5);
  });

  it('ignora le serie di riscaldamento', () => {
    const withWarmup: PerformedExercise = {
      target: target(),
      sets: [
        { weightKg: 40, reps: 5, rpe: null, isWarmup: true },
        ...session(60, [12, 12, 12]).sets,
      ],
    };
    const s = suggestNextSession(exercise(), [withWarmup]);
    expect(s.action).toBe('increase_load');
    expect(s.weightKg).toBe(62.5);
  });

  it('ignora le serie extra oltre quelle previste', () => {
    const s = suggestNextSession(exercise(), [session(60, [12, 12, 12, 9])]);
    expect(s.action).toBe('increase_load');
  });

  it('se ora sono previste più serie, gli obiettivi coprono tutte le serie nuove', () => {
    // Allora 3 serie, ora 4: la sessione passata è valutata con i suoi obiettivi.
    const s = suggestNextSession(exercise({ targetSets: 4 }), [session(60, [12, 12, 12])]);
    expect(s.action).toBe('increase_load');
    expect(s.targetReps).toEqual([8, 8, 8, 8]);
  });
});

describe('Regola 5 – nel range: mantieni e aggiungi ripetizioni', () => {
  it('mantiene il carico e aggiunge 1 ripetizione alle serie non al massimo', () => {
    const s = suggestNextSession(exercise(), [session(60, [12, 10, 9])]);
    expect(s.action).toBe('increase_reps');
    expect(s.weightKg).toBe(60);
    expect(s.targetReps).toEqual([12, 11, 10]);
    expect(s.reason).toBe(
      'Sei nel range ma non al massimo in tutte le serie: mantieni 60 kg e punta a 12, 11 e 10 ripetizioni.',
    );
  });

  it('con obiettivi tutti uguali usa una frase più breve', () => {
    const s = suggestNextSession(exercise(), [session(60, [10, 10, 10])]);
    expect(s.reason).toContain('punta a 11 ripetizioni in ogni serie');
  });

  it('non supera mai il massimo del range', () => {
    expect(nextRepTargets([12, 11, 13], target())).toEqual([12, 12, 12]);
  });

  it('con meno serie del previsto non aumenta il carico', () => {
    const s = suggestNextSession(exercise(), [session(60, [12, 12])]);
    expect(s.action).toBe('increase_reps');
    expect(s.weightKg).toBe(60);
    expect(s.targetReps).toEqual([12, 12, 8]);
    expect(s.reason).toContain('Hai completato 2 serie su 3');
  });

  it('una serie a carico più basso conta come serie non riuscita', () => {
    const mixed: PerformedExercise = {
      target: target(),
      sets: [
        { weightKg: 60, reps: 12, rpe: null, isWarmup: false },
        { weightKg: 60, reps: 12, rpe: null, isWarmup: false },
        { weightKg: 55, reps: 12, rpe: null, isWarmup: false },
      ],
    };
    const s = suggestNextSession(exercise(), [mixed]);
    expect(s.action).toBe('increase_reps');
    expect(s.weightKg).toBe(60);
  });
});

describe('Regola 3 – sotto il minimo: mantieni il carico', () => {
  it('mantiene il carico e punta al minimo nelle serie sotto il minimo', () => {
    const s = suggestNextSession(exercise(), [session(60, [10, 8, 7])]);
    expect(s.action).toBe('hold');
    expect(s.weightKg).toBe(60);
    expect(s.targetReps).toEqual([11, 9, 8]);
    expect(s.reason).toContain('In 1 serie su 3 sei sotto il minimo di 8 ripetizioni');
    expect(s.belowMinStreak).toBe(1);
  });

  it('ha la precedenza sull\'aumento anche se le altre serie sono al massimo', () => {
    const s = suggestNextSession(exercise(), [session(60, [12, 12, 7])]);
    expect(s.action).toBe('hold');
    expect(s.weightKg).toBe(60);
  });

  it('avvisa quante sessioni mancano allo scarico', () => {
    const first = suggestNextSession(exercise(), [session(60, [7, 7, 7])]);
    expect(first.reason).toContain('Dopo altre 2 sessioni così ti suggerirò uno scarico');

    const second = suggestNextSession(exercise(), [session(60, [7, 7, 7]), session(60, [7, 7, 7])]);
    expect(second.belowMinStreak).toBe(2);
    expect(second.reason).toContain('Se succede anche la prossima volta');
  });
});

describe('Regola 2 – sotto il minimo per 3 sessioni: scarico', () => {
  const threeBad = [session(60, [7, 7, 6]), session(60, [8, 7, 7]), session(60, [9, 8, 7])];

  it('riduce il carico del 10% arrotondato e riparte dal minimo', () => {
    // 60 × 0,9 = 54 → multiplo di 1,25 più vicino = 53,75
    const s = suggestNextSession(exercise(), threeBad);
    expect(s.action).toBe('deload');
    expect(s.weightKg).toBe(53.75);
    expect(s.targetReps).toEqual([8, 8, 8]);
    expect(s.belowMinStreak).toBe(3);
    expect(s.reason).toBe(
      'Sotto il minimo di 8 ripetizioni per 3 sessioni di fila: fai uno scarico, riduci a 53,75 kg (−10%) e punta a 8 ripetizioni.',
    );
  });

  it('arrotonda al passo disponibile (2,5 kg)', () => {
    // 60 × 0,9 = 54 → multiplo di 2,5 più vicino = 55
    const s = suggestNextSession(exercise({ roundingStepKg: 2.5 }), threeBad);
    expect(s.weightKg).toBe(55);
  });

  it('scarica anche dopo più di 3 sessioni sotto il minimo allo stesso carico', () => {
    const s = suggestNextSession(exercise(), [...threeBad, session(60, [7, 7, 7])]);
    expect(s.action).toBe('deload');
  });

  it('non scarica se le sessioni sotto il minimo non sono consecutive', () => {
    // dalla più recente: sotto, sotto, NEL RANGE, sotto
    const s = suggestNextSession(exercise(), [
      session(60, [7, 7, 7]),
      session(60, [7, 7, 7]),
      session(60, [10, 10, 10]),
      session(60, [7, 7, 7]),
    ]);
    expect(s.action).toBe('hold');
    expect(s.belowMinStreak).toBe(2);
  });

  it('dopo uno scarico il conteggio riparte da zero', () => {
    // La sessione più recente è a 55 kg (dopo lo scarico) ed è ancora sotto il minimo:
    // non deve suggerire un secondo scarico di fila.
    const s = suggestNextSession(exercise(), [session(55, [7, 7, 7]), ...threeBad]);
    expect(s.action).toBe('hold');
    expect(s.weightKg).toBe(55);
    expect(s.belowMinStreak).toBe(1);
  });

  it('salta le sessioni senza serie allenanti nel conteggio', () => {
    const onlyWarmup: PerformedExercise = {
      target: target(),
      sets: [{ weightKg: 40, reps: 10, rpe: null, isWarmup: true }],
    };
    const s = suggestNextSession(exercise(), [threeBad[0], onlyWarmup, threeBad[1], threeBad[2]]);
    expect(s.action).toBe('deload');
  });

  it('rispetta la soglia configurata', () => {
    const config = { ...PROGRESSION_CONFIG, sessionsBelowMinForDeload: 2 };
    const s = suggestNextSession(exercise(), threeBad.slice(0, 2), config);
    expect(s.action).toBe('deload');
  });
});

describe('Avviso RPE – serie facili', () => {
  it('con RPE medio ≤ 7 nel range suggerisce che si potrebbe già aumentare', () => {
    const s = suggestNextSession(exercise(), [session(60, [10, 10, 10], { rpe: [6, 7, 7] })]);
    // Il suggerimento principale non cambia…
    expect(s.action).toBe('increase_reps');
    expect(s.weightKg).toBe(60);
    // …ma c'è l'avviso con il carico a cui passare.
    expect(s.earlyIncrease).not.toBeNull();
    expect(s.earlyIncrease?.weightKg).toBe(62.5);
    expect(s.earlyIncrease?.averageRpe).toBeCloseTo(6.67, 2);
    expect(s.earlyIncrease?.message).toBe(
      'RPE medio 6,7: le serie sembrano facili. Se te la senti, puoi già passare a 62,5 kg.',
    );
  });

  it('RPE medio esattamente 7 fa comparire l\'avviso', () => {
    const s = suggestNextSession(exercise(), [session(60, [10, 10, 10], { rpe: [7, 7, 7] })]);
    expect(s.earlyIncrease).not.toBeNull();
  });

  it('RPE medio sopra 7 non fa comparire l\'avviso', () => {
    const s = suggestNextSession(exercise(), [session(60, [10, 10, 10], { rpe: [7, 8, 8] })]);
    expect(s.earlyIncrease).toBeNull();
  });

  it('senza RPE non c\'è avviso', () => {
    expect(suggestNextSession(exercise(), [session(60, [10, 10, 10])]).earlyIncrease).toBeNull();
  });

  it('usa la media delle sole serie in cui l\'RPE è stato inserito', () => {
    const s = suggestNextSession(exercise(), [session(60, [10, 10, 10], { rpe: [6, null, null] })]);
    expect(s.earlyIncrease?.averageRpe).toBe(6);
  });

  it('nessun avviso se sotto il minimo', () => {
    const s = suggestNextSession(exercise(), [session(60, [10, 10, 7], { rpe: [6, 6, 6] })]);
    expect(s.action).toBe('hold');
    expect(s.earlyIncrease).toBeNull();
  });

  it('nessun avviso se mancano delle serie', () => {
    const s = suggestNextSession(exercise(), [session(60, [10, 10], { rpe: [6, 6] })]);
    expect(s.earlyIncrease).toBeNull();
  });

  it('nessun avviso quando il carico aumenta già', () => {
    const s = suggestNextSession(exercise(), [session(60, [12, 12, 12], { rpe: [6, 6, 6] })]);
    expect(s.action).toBe('increase_load');
    expect(s.earlyIncrease).toBeNull();
  });
});

describe('Esercizi a corpo libero', () => {
  it('senza zavorra, al massimo suggerisce di aggiungere zavorra', () => {
    const s = suggestNextSession(exercise({}, true), [session(0, [12, 12, 12])]);
    expect(s.action).toBe('increase_load');
    expect(s.weightKg).toBe(2.5);
    expect(s.reason).toContain('aggiungi una zavorra di 2,5 kg');
  });

  it('con zavorra, al massimo suggerisce di aumentarla', () => {
    const s = suggestNextSession(exercise({}, true), [session(5, [12, 12, 12])]);
    expect(s.reason).toContain('aumenta la zavorra a 7,5 kg');
  });

  it('nel range dice di mantenere il corpo libero', () => {
    const s = suggestNextSession(exercise({}, true), [session(0, [10, 9, 8])]);
    expect(s.reason).toContain('mantieni il corpo libero');
  });

  it('sotto il minimo per 3 sessioni senza zavorra non può scaricare', () => {
    const bad = [session(0, [5, 5, 5]), session(0, [5, 5, 5]), session(0, [5, 5, 5])];
    const s = suggestNextSession(exercise({}, true), bad);
    expect(s.action).toBe('hold');
    expect(s.weightKg).toBe(0);
    expect(s.reason).toContain('variante più facile');
  });
});
