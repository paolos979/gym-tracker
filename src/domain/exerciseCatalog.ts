/**
 * LIBRERIA DI ESERCIZI PRONTI
 *
 * Elenco di esercizi comuni con valori già impostati, da aggiungere ai propri
 * con un tocco (Gestione → Esercizi → «Aggiungi dalla libreria»).
 * Dopo l'aggiunta sono esercizi normali: puoi modificarli o archiviarli.
 *
 * Per aggiungerne uno nuovo, copia una riga qui sotto. Campi:
 * - id            codice interno, non si mostra: non cambiarlo più una volta pubblicato
 * - equipment     attrezzo, serve solo a raggruppare l'elenco
 * - repMin/repMax range di ripetizioni consigliato
 * - roundingStep  passo di carico realmente caricabile (null = quello globale, 1,25 kg)
 *                 manubri: 2 · cavi e piastre piccole: 2,5 · pressa e macchine grandi: 5
 * - sets          serie previste (3 se non indicato)
 * - bodyweight    true se il carico indica solo la zavorra
 *
 * Nota sui manubri: il carico da inserire è quello di UN manubrio.
 */
import type { ExerciseType, MuscleGroup } from './types';

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight';

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Bilanciere',
  dumbbell: 'Manubri',
  machine: 'Macchinari',
  cable: 'Cavi',
  bodyweight: 'Corpo libero',
};

/** Ordine con cui i gruppi compaiono nella libreria. */
export const EQUIPMENT_ORDER: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'];

export interface CatalogExercise {
  id: string;
  name: string;
  equipment: Equipment;
  muscleGroup: MuscleGroup;
  type: ExerciseType;
  repMin: number;
  repMax: number;
  sets?: number;
  roundingStep?: number | null;
  bodyweight?: boolean;
}

export const EXERCISE_CATALOG: CatalogExercise[] = [
  // --- Bilanciere ---------------------------------------------------------
  { id: 'panca-piana-bilanciere', name: 'Panca piana con bilanciere', equipment: 'barbell', muscleGroup: 'chest', type: 'compound', repMin: 6, repMax: 10 },
  { id: 'panca-inclinata-bilanciere', name: 'Panca inclinata con bilanciere', equipment: 'barbell', muscleGroup: 'chest', type: 'compound', repMin: 6, repMax: 10 },
  { id: 'panca-presa-stretta', name: 'Panca presa stretta', equipment: 'barbell', muscleGroup: 'triceps', type: 'compound', repMin: 6, repMax: 10 },
  { id: 'lento-avanti-bilanciere', name: 'Lento avanti con bilanciere', equipment: 'barbell', muscleGroup: 'shoulders', type: 'compound', repMin: 6, repMax: 10 },
  { id: 'rematore-bilanciere', name: 'Rematore con bilanciere', equipment: 'barbell', muscleGroup: 'back', type: 'compound', repMin: 8, repMax: 12 },
  { id: 'stacco-da-terra', name: 'Stacco da terra', equipment: 'barbell', muscleGroup: 'hamstrings', type: 'compound', repMin: 4, repMax: 8, sets: 4, roundingStep: 2.5 },
  { id: 'stacco-rumeno', name: 'Stacco rumeno', equipment: 'barbell', muscleGroup: 'hamstrings', type: 'compound', repMin: 8, repMax: 10 },
  { id: 'squat-bilanciere', name: 'Squat con bilanciere', equipment: 'barbell', muscleGroup: 'quads', type: 'compound', repMin: 6, repMax: 10, sets: 4 },
  { id: 'front-squat', name: 'Front squat', equipment: 'barbell', muscleGroup: 'quads', type: 'compound', repMin: 6, repMax: 8 },
  { id: 'hip-thrust', name: 'Hip thrust con bilanciere', equipment: 'barbell', muscleGroup: 'glutes', type: 'compound', repMin: 8, repMax: 12, roundingStep: 2.5 },
  { id: 'curl-bilanciere', name: 'Curl con bilanciere', equipment: 'barbell', muscleGroup: 'biceps', type: 'isolation', repMin: 8, repMax: 12 },
  { id: 'french-press-bilanciere', name: 'French press con bilanciere', equipment: 'barbell', muscleGroup: 'triceps', type: 'isolation', repMin: 8, repMax: 12 },

  // --- Manubri (carico di un manubrio; passo 2 kg) ------------------------
  { id: 'panca-piana-manubri', name: 'Panca piana con manubri', equipment: 'dumbbell', muscleGroup: 'chest', type: 'compound', repMin: 8, repMax: 12, roundingStep: 2 },
  { id: 'panca-inclinata-manubri', name: 'Panca inclinata con manubri', equipment: 'dumbbell', muscleGroup: 'chest', type: 'compound', repMin: 8, repMax: 12, roundingStep: 2 },
  { id: 'lento-avanti-manubri', name: 'Lento avanti con manubri', equipment: 'dumbbell', muscleGroup: 'shoulders', type: 'compound', repMin: 8, repMax: 12, roundingStep: 2 },
  { id: 'arnold-press', name: 'Arnold press', equipment: 'dumbbell', muscleGroup: 'shoulders', type: 'compound', repMin: 8, repMax: 12, roundingStep: 2 },
  { id: 'alzate-laterali', name: 'Alzate laterali', equipment: 'dumbbell', muscleGroup: 'shoulders', type: 'isolation', repMin: 12, repMax: 15, roundingStep: 2 },
  { id: 'alzate-frontali', name: 'Alzate frontali', equipment: 'dumbbell', muscleGroup: 'shoulders', type: 'isolation', repMin: 12, repMax: 15, roundingStep: 2 },
  { id: 'alzate-posteriori', name: 'Alzate posteriori a 90°', equipment: 'dumbbell', muscleGroup: 'shoulders', type: 'isolation', repMin: 12, repMax: 15, roundingStep: 2 },
  { id: 'rematore-manubrio', name: 'Rematore con manubrio', equipment: 'dumbbell', muscleGroup: 'back', type: 'compound', repMin: 8, repMax: 12, roundingStep: 2 },
  { id: 'pullover-manubrio', name: 'Pullover con manubrio', equipment: 'dumbbell', muscleGroup: 'back', type: 'isolation', repMin: 10, repMax: 15, roundingStep: 2 },
  { id: 'shrug-manubri', name: 'Shrug con manubri', equipment: 'dumbbell', muscleGroup: 'back', type: 'isolation', repMin: 12, repMax: 15, roundingStep: 2 },
  { id: 'curl-manubri', name: 'Curl con manubri', equipment: 'dumbbell', muscleGroup: 'biceps', type: 'isolation', repMin: 8, repMax: 12, roundingStep: 2 },
  { id: 'curl-martello', name: 'Curl a martello', equipment: 'dumbbell', muscleGroup: 'biceps', type: 'isolation', repMin: 8, repMax: 12, roundingStep: 2 },
  { id: 'curl-panca-inclinata', name: 'Curl su panca inclinata', equipment: 'dumbbell', muscleGroup: 'biceps', type: 'isolation', repMin: 10, repMax: 12, roundingStep: 2 },
  { id: 'french-press-manubrio', name: 'French press con manubrio', equipment: 'dumbbell', muscleGroup: 'triceps', type: 'isolation', repMin: 10, repMax: 15, roundingStep: 2 },
  { id: 'kickback', name: 'Kickback per tricipiti', equipment: 'dumbbell', muscleGroup: 'triceps', type: 'isolation', repMin: 12, repMax: 15, roundingStep: 2 },
  { id: 'affondi-manubri', name: 'Affondi con manubri', equipment: 'dumbbell', muscleGroup: 'quads', type: 'compound', repMin: 8, repMax: 12, roundingStep: 2 },
  { id: 'bulgarian-split-squat', name: 'Bulgarian split squat', equipment: 'dumbbell', muscleGroup: 'quads', type: 'compound', repMin: 8, repMax: 12, roundingStep: 2 },
  { id: 'stacco-rumeno-manubri', name: 'Stacco rumeno con manubri', equipment: 'dumbbell', muscleGroup: 'hamstrings', type: 'compound', repMin: 8, repMax: 12, roundingStep: 2 },
  { id: 'calf-raise-manubri', name: 'Calf raise con manubri', equipment: 'dumbbell', muscleGroup: 'calves', type: 'isolation', repMin: 12, repMax: 20, roundingStep: 2 },

  // --- Macchinari ---------------------------------------------------------
  { id: 'lat-machine', name: 'Lat machine', equipment: 'machine', muscleGroup: 'back', type: 'compound', repMin: 8, repMax: 12, roundingStep: 2.5 },
  { id: 'lat-machine-presa-inversa', name: 'Lat machine presa inversa', equipment: 'machine', muscleGroup: 'back', type: 'compound', repMin: 8, repMax: 12, roundingStep: 2.5 },
  { id: 'pulley-basso', name: 'Pulley basso', equipment: 'machine', muscleGroup: 'back', type: 'compound', repMin: 8, repMax: 12, roundingStep: 2.5 },
  { id: 'rematore-macchina', name: 'Rematore a macchina', equipment: 'machine', muscleGroup: 'back', type: 'compound', repMin: 8, repMax: 12, roundingStep: 5 },
  { id: 'chest-press', name: 'Chest press', equipment: 'machine', muscleGroup: 'chest', type: 'compound', repMin: 8, repMax: 12, roundingStep: 5 },
  { id: 'pectoral-machine', name: 'Pectoral machine', equipment: 'machine', muscleGroup: 'chest', type: 'isolation', repMin: 10, repMax: 15, roundingStep: 2.5 },
  { id: 'shoulder-press-macchina', name: 'Shoulder press a macchina', equipment: 'machine', muscleGroup: 'shoulders', type: 'compound', repMin: 8, repMax: 12, roundingStep: 5 },
  { id: 'leg-press', name: 'Leg press', equipment: 'machine', muscleGroup: 'quads', type: 'compound', repMin: 10, repMax: 15, roundingStep: 5 },
  { id: 'hack-squat', name: 'Hack squat', equipment: 'machine', muscleGroup: 'quads', type: 'compound', repMin: 8, repMax: 12, roundingStep: 5 },
  { id: 'leg-extension', name: 'Leg extension', equipment: 'machine', muscleGroup: 'quads', type: 'isolation', repMin: 10, repMax: 15, roundingStep: 2.5 },
  { id: 'leg-curl', name: 'Leg curl', equipment: 'machine', muscleGroup: 'hamstrings', type: 'isolation', repMin: 10, repMax: 15, roundingStep: 2.5 },
  { id: 'abduttori-macchina', name: 'Abduttori a macchina', equipment: 'machine', muscleGroup: 'glutes', type: 'isolation', repMin: 12, repMax: 20, roundingStep: 2.5 },
  { id: 'adduttori-macchina', name: 'Adduttori a macchina', equipment: 'machine', muscleGroup: 'other', type: 'isolation', repMin: 12, repMax: 20, roundingStep: 2.5 },
  { id: 'calf-press', name: 'Calf press alla pressa', equipment: 'machine', muscleGroup: 'calves', type: 'isolation', repMin: 12, repMax: 20, roundingStep: 5 },
  { id: 'calf-raise-in-piedi', name: 'Calf raise in piedi', equipment: 'machine', muscleGroup: 'calves', type: 'isolation', repMin: 12, repMax: 15, roundingStep: 2.5 },

  // --- Cavi ---------------------------------------------------------------
  { id: 'croci-ai-cavi', name: 'Croci ai cavi', equipment: 'cable', muscleGroup: 'chest', type: 'isolation', repMin: 10, repMax: 15, roundingStep: 2.5 },
  { id: 'push-down-cavi', name: 'Push down ai cavi', equipment: 'cable', muscleGroup: 'triceps', type: 'isolation', repMin: 10, repMax: 15, roundingStep: 2.5 },
  { id: 'estensioni-sopra-la-testa-cavi', name: 'Estensioni sopra la testa ai cavi', equipment: 'cable', muscleGroup: 'triceps', type: 'isolation', repMin: 10, repMax: 15, roundingStep: 2.5 },
  { id: 'curl-cavi', name: 'Curl ai cavi', equipment: 'cable', muscleGroup: 'biceps', type: 'isolation', repMin: 10, repMax: 15, roundingStep: 2.5 },
  { id: 'face-pull', name: 'Face pull', equipment: 'cable', muscleGroup: 'shoulders', type: 'isolation', repMin: 12, repMax: 15, roundingStep: 2.5 },
  { id: 'pullover-cavi', name: 'Pullover ai cavi', equipment: 'cable', muscleGroup: 'back', type: 'isolation', repMin: 10, repMax: 15, roundingStep: 2.5 },
  { id: 'pulldown-un-braccio', name: 'Pulldown a un braccio ai cavi', equipment: 'cable', muscleGroup: 'back', type: 'isolation', repMin: 10, repMax: 15, roundingStep: 2.5 },
  { id: 'crunch-cavi', name: 'Crunch ai cavi', equipment: 'cable', muscleGroup: 'abs', type: 'isolation', repMin: 12, repMax: 20, roundingStep: 2.5 },

  // --- Corpo libero (il carico è la zavorra) ------------------------------
  { id: 'trazioni', name: 'Trazioni alla sbarra', equipment: 'bodyweight', muscleGroup: 'back', type: 'compound', repMin: 6, repMax: 10, bodyweight: true },
  { id: 'trazioni-presa-supina', name: 'Trazioni presa supina', equipment: 'bodyweight', muscleGroup: 'back', type: 'compound', repMin: 6, repMax: 10, bodyweight: true },
  { id: 'dip-parallele', name: 'Dip alle parallele', equipment: 'bodyweight', muscleGroup: 'triceps', type: 'compound', repMin: 6, repMax: 12, bodyweight: true },
  { id: 'push-up', name: 'Push up', equipment: 'bodyweight', muscleGroup: 'chest', type: 'compound', repMin: 10, repMax: 20, bodyweight: true },
  { id: 'hyperextension', name: 'Hyperextension', equipment: 'bodyweight', muscleGroup: 'hamstrings', type: 'isolation', repMin: 12, repMax: 20, bodyweight: true },
  { id: 'crunch', name: 'Crunch', equipment: 'bodyweight', muscleGroup: 'abs', type: 'isolation', repMin: 15, repMax: 25, bodyweight: true },
  { id: 'leg-raise', name: 'Leg raise alla sbarra', equipment: 'bodyweight', muscleGroup: 'abs', type: 'isolation', repMin: 10, repMax: 20, bodyweight: true },
];

/** Cerca un esercizio della libreria dal suo codice. */
export function catalogExercise(id: string): CatalogExercise {
  const found = EXERCISE_CATALOG.find((e) => e.id === id);
  if (!found) throw new Error(`Esercizio «${id}» non presente nella libreria.`);
  return found;
}

/**
 * Nome "normalizzato" per capire se un esercizio è già presente:
 * ignora maiuscole, accenti e spazi doppi.
 */
export function normalizeExerciseName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}
