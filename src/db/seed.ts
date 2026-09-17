/**
 * DATI DI ESEMPIO
 *
 * Al primo avvio l'app crea alcuni esercizi e le schede Push / Pull / Gambe,
 * così puoi provarla subito. Puoi modificarli o archiviarli liberamente:
 * non verranno ricreati.
 */
import { DEFAULT_SETTINGS } from '../domain/defaults';
import type { Exercise } from '../domain/types';
import { db, type GymDatabase } from './database';
import { buildExercise, buildTemplate, type NewExerciseInput } from './exercises';

const PUSH: NewExerciseInput[] = [
  { name: 'Panca piana con bilanciere', muscleGroup: 'chest', type: 'compound', repMin: 6, repMax: 10 },
  { name: 'Lento avanti con manubri', muscleGroup: 'shoulders', type: 'compound', roundingStepKg: 2 },
  { name: 'Croci ai cavi', muscleGroup: 'chest', type: 'isolation', repMin: 10, repMax: 15 },
  { name: 'Alzate laterali', muscleGroup: 'shoulders', type: 'isolation', repMin: 12, repMax: 15, roundingStepKg: 2 },
  { name: 'Push down ai cavi', muscleGroup: 'triceps', type: 'isolation', repMin: 10, repMax: 15 },
];

const PULL: NewExerciseInput[] = [
  { name: 'Trazioni alla sbarra', muscleGroup: 'back', type: 'compound', repMin: 6, repMax: 10, isBodyweight: true },
  { name: 'Rematore con bilanciere', muscleGroup: 'back', type: 'compound' },
  { name: 'Lat machine', muscleGroup: 'back', type: 'compound', roundingStepKg: 2.5 },
  { name: 'Curl con manubri', muscleGroup: 'biceps', type: 'isolation', roundingStepKg: 2 },
  { name: 'Face pull', muscleGroup: 'shoulders', type: 'isolation', repMin: 12, repMax: 15 },
];

const LEGS: NewExerciseInput[] = [
  { name: 'Squat con bilanciere', muscleGroup: 'quads', type: 'compound', repMin: 6, repMax: 10, targetSets: 4 },
  { name: 'Stacco rumeno', muscleGroup: 'hamstrings', type: 'compound', repMin: 8, repMax: 10 },
  { name: 'Leg press', muscleGroup: 'quads', type: 'compound', repMin: 10, repMax: 15, roundingStepKg: 5 },
  { name: 'Leg curl', muscleGroup: 'hamstrings', type: 'isolation', repMin: 10, repMax: 15, roundingStepKg: 2.5 },
  { name: 'Calf raise in piedi', muscleGroup: 'calves', type: 'isolation', repMin: 12, repMax: 15, roundingStepKg: 2.5 },
];

/**
 * Crea impostazioni, esercizi e schede di esempio SOLO al primo avvio
 * (cioè se le impostazioni non sono ancora state salvate).
 * @returns true se ha creato i dati
 */
export async function seedOnFirstLaunch(database: GymDatabase = db): Promise<boolean> {
  return database.transaction('rw', [database.settings, database.exercises, database.templates], async () => {
    if (await database.settings.get('app')) return false;

    const settings = DEFAULT_SETTINGS;
    await database.settings.put(settings);

    const groups: [string, NewExerciseInput[]][] = [
      ['Push', PUSH],
      ['Pull', PULL],
      ['Gambe', LEGS],
    ];
    for (const [templateName, inputs] of groups) {
      const exercises: Exercise[] = inputs.map((input) => buildExercise(input, settings));
      await database.exercises.bulkPut(exercises);
      await database.templates.put(buildTemplate(templateName, exercises.map((e) => e.id)));
    }
    return true;
  });
}
