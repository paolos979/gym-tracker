/**
 * DATI DI ESEMPIO
 *
 * Al primo avvio l'app crea alcuni esercizi (presi dalla libreria in
 * src/domain/exerciseCatalog.ts) e le schede Push / Pull / Gambe,
 * così puoi provarla subito. Puoi modificarli o archiviarli liberamente:
 * non verranno ricreati.
 */
import { DEFAULT_SETTINGS } from '../domain/defaults';
import { catalogExercise } from '../domain/exerciseCatalog';
import type { Exercise } from '../domain/types';
import { db, type GymDatabase } from './database';
import { buildExercise, buildTemplate, catalogToInput } from './exercises';

/** Schede iniziali, indicate con i codici della libreria. */
const STARTER_TEMPLATES: { name: string; exercises: string[] }[] = [
  {
    name: 'Push',
    exercises: ['panca-piana-bilanciere', 'lento-avanti-manubri', 'croci-ai-cavi', 'alzate-laterali', 'push-down-cavi'],
  },
  {
    name: 'Pull',
    exercises: ['trazioni', 'rematore-bilanciere', 'lat-machine', 'curl-manubri', 'face-pull'],
  },
  {
    name: 'Gambe',
    exercises: ['squat-bilanciere', 'stacco-rumeno', 'leg-press', 'leg-curl', 'calf-raise-in-piedi'],
  },
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

    for (const template of STARTER_TEMPLATES) {
      const exercises: Exercise[] = template.exercises.map((id) =>
        buildExercise(catalogToInput(catalogExercise(id)), settings),
      );
      await database.exercises.bulkPut(exercises);
      await database.templates.put(buildTemplate(template.name, exercises.map((e) => e.id)));
    }
    return true;
  });
}
