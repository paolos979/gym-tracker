/**
 * TESTI DEI SUGGERIMENTI
 *
 * Tutte le frasi mostrate all'utente sono qui, separate dalla logica,
 * così puoi cambiarne il tono senza rischiare di rompere le regole.
 */
import { formatDecimal, formatKg, joinItalian, pluralReps } from '../format';

/** "62,5 kg", oppure per esercizi a corpo libero "corpo libero" / "zavorra di 5 kg". */
function load(weightKg: number, isBodyweight: boolean): string {
  if (!isBodyweight) return formatKg(weightKg);
  return weightKg === 0 ? 'il corpo libero' : `la zavorra di ${formatKg(weightKg)}`;
}

/** "in tutte e 3 le serie", "in entrambe le serie", "nell'unica serie" */
function inAllSets(n: number): string {
  if (n === 1) return "nell'unica serie";
  if (n === 2) return 'in entrambe le serie';
  return `in tutte e ${n} le serie`;
}

/** [10, 10, 10] → "10 ripetizioni in ogni serie"; [11, 10, 10] → "11, 10 e 10 ripetizioni" */
function repsTargets(targets: number[]): string {
  if (targets.length > 1 && targets.every((t) => t === targets[0])) {
    return `${pluralReps(targets[0])} in ogni serie`;
  }
  if (targets.length === 1) return pluralReps(targets[0]);
  return `${joinItalian(targets.map(String))} ripetizioni`;
}

export function firstTimeMessage(repMin: number, repMax: number): string {
  return (
    `Prima volta con questo esercizio: scegli un carico con cui arrivi a ${repMin}-${repMax} ripetizioni. ` +
    'Dalla prossima volta ti suggerirò io come progredire.'
  );
}

export function increaseLoadMessage(p: {
  doneReps: number[];
  repMax: number;
  newWeightKg: number;
  newRepTarget: number;
  isBodyweight: boolean;
  wasBodyweightOnly: boolean;
}): string {
  const allExact = p.doneReps.every((r) => r === p.repMax);
  const done = `Hai fatto ${allExact ? '' : 'almeno '}${pluralReps(p.repMax)} ${inAllSets(p.doneReps.length)}`;

  let action: string;
  if (p.isBodyweight && p.wasBodyweightOnly) {
    action = `aggiungi una zavorra di ${formatKg(p.newWeightKg)}`;
  } else if (p.isBodyweight) {
    action = `aumenta la zavorra a ${formatKg(p.newWeightKg)}`;
  } else {
    action = `aumenta a ${formatKg(p.newWeightKg)}`;
  }
  return `${done}: ${action} e punta a ${pluralReps(p.newRepTarget)}.`;
}

export function increaseRepsMessage(p: {
  weightKg: number;
  isBodyweight: boolean;
  targets: number[];
  doneSets: number;
  missingSets: number;
}): string {
  const keep = `mantieni ${load(p.weightKg, p.isBodyweight)}`;
  if (p.missingSets > 0) {
    const planned = p.doneSets + p.missingSets;
    return (
      `Hai completato ${p.doneSets} serie su ${planned}: ${keep}, ` +
      `fai tutte le serie e punta a ${repsTargets(p.targets)}.`
    );
  }
  return (
    `Sei nel range ma non al massimo in tutte le serie: ${keep} ` +
    `e punta a ${repsTargets(p.targets)}.`
  );
}

export function holdBelowMinMessage(p: {
  weightKg: number;
  isBodyweight: boolean;
  targets: number[];
  setsBelowMin: number;
  countedSets: number;
  repMin: number;
  streak: number;
  sessionsForDeload: number;
}): string {
  const where =
    p.countedSets === 1 ? "Nell'unica serie" : `In ${p.setsBelowMin} serie su ${p.countedSets}`;
  let text =
    `${where} sei sotto il minimo di ${pluralReps(p.repMin)}: ` +
    `mantieni ${load(p.weightKg, p.isBodyweight)} e punta a ${repsTargets(p.targets)}.`;

  const remaining = p.sessionsForDeload - p.streak;
  if (remaining === 1) {
    text += ' Se succede anche la prossima volta, ti suggerirò uno scarico.';
  } else if (remaining > 1) {
    text += ` Dopo altre ${remaining} sessioni così ti suggerirò uno scarico.`;
  }
  return text;
}

export function deloadMessage(p: {
  streak: number;
  repMin: number;
  newWeightKg: number;
  percent: number;
  isBodyweight: boolean;
}): string {
  const reduce = p.isBodyweight
    ? `riduci la zavorra a ${formatKg(p.newWeightKg)}`
    : `riduci a ${formatKg(p.newWeightKg)} (−${p.percent}%)`;
  return (
    `Sotto il minimo di ${pluralReps(p.repMin)} per ${p.streak} sessioni di fila: ` +
    `fai uno scarico, ${reduce} e punta a ${pluralReps(p.repMin)}.`
  );
}

export function cannotDeloadMessage(p: { streak: number; repMin: number }): string {
  return (
    `Sotto il minimo di ${pluralReps(p.repMin)} per ${p.streak} sessioni di fila a corpo libero: ` +
    'non c\'è carico da togliere. Prova una variante più facile (es. assistita) o abbassa il range.'
  );
}

export function earlyIncreaseMessage(averageRpe: number, weightKg: number, isBodyweight: boolean): string {
  const rounded = Math.round(averageRpe * 10) / 10;
  const target = isBodyweight ? `una zavorra di ${formatKg(weightKg)}` : formatKg(weightKg);
  return (
    `RPE medio ${formatDecimal(rounded)}: le serie sembrano facili. ` +
    `Se te la senti, puoi già passare a ${target}.`
  );
}
