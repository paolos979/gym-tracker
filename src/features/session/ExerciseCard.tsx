/**
 * Un esercizio durante l'allenamento: ultima volta, suggerimento e serie.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { IconPlus } from '../../components/icons';
import { Button } from '../../components/ui';
import { getExerciseHistory, suggestionForExercise } from '../../db/history';
import { formatClock, formatRelativeDay } from '../../domain/format';
import {
  addSet,
  applyEarlyIncrease,
  changeSetWeight,
  isEarlyIncreaseApplied,
  removeSet,
  summarizeSets,
  toggleSetCompleted,
  updateSet,
} from '../../domain/session';
import type { Exercise, ExerciseLog, SetEntry } from '../../domain/types';
import { SetRow } from './SetRow';
import { SuggestionBox } from './SuggestionBox';

export function ExerciseCard({
  log,
  exercise,
  onSetsChange,
  onSetCompleted,
}: {
  log: ExerciseLog;
  exercise: Exercise | undefined;
  onSetsChange: (sets: SetEntry[]) => void;
  /** Chiamata quando una serie viene spuntata (per far partire il timer). */
  onSetCompleted: (restSeconds: number, exerciseName: string) => void;
}) {
  const exerciseId = log.exerciseId;
  const suggestion = useLiveQuery(
    async () => (exercise ? suggestionForExercise(exercise) : null),
    [exercise],
  );
  const last = useLiveQuery(
    async () => (await getExerciseHistory(exerciseId, { limit: 1 }))[0] ?? null,
    [exerciseId],
  );

  const name = exercise?.name ?? 'Esercizio eliminato';
  const isBodyweight = exercise?.isBodyweight ?? false;
  const restSeconds = exercise?.restSeconds ?? 90;
  const { target, sets } = log;

  // Numerazione: le serie di riscaldamento non contano nel numero di serie.
  let workingNumber = 0;
  const labels = sets.map((s) => (s.isWarmup ? 'Riscaldamento' : `Serie ${++workingNumber}`));

  const early = suggestion?.earlyIncrease;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-2xl leading-tight font-bold">{name}</h2>
        <p className="text-sm text-muted">
          {target.targetSets} × {target.repMin}-{target.repMax} rip · recupero {formatClock(restSeconds)}
        </p>
      </div>

      <div className="rounded-2xl bg-surface p-3 text-sm">
        <span className="text-muted">Ultima volta{last ? ` (${formatRelativeDay(last.date)})` : ''}: </span>
        <span className="font-semibold">
          {last ? summarizeSets(last.sets, isBodyweight) || '—' : 'mai fatto'}
        </span>
      </div>

      {suggestion && (
        <SuggestionBox
          suggestion={suggestion}
          title="Oggi"
          earlyIncreaseApplied={early ? isEarlyIncreaseApplied(sets, early.weightKg) : false}
          onApplyEarlyIncrease={
            early ? () => onSetsChange(applyEarlyIncrease(sets, early.weightKg, target.repMin)) : undefined
          }
        />
      )}

      <div className="space-y-2">
        {sets.map((set, i) => (
          <SetRow
            // L'indice basta: le serie non vengono riordinate.
            key={i}
            set={set}
            label={labels[i]}
            weightStep={target.roundingStepKg}
            isBodyweight={isBodyweight}
            onWeightChange={(w) => onSetsChange(changeSetWeight(sets, i, w))}
            onChange={(patch) => onSetsChange(updateSet(sets, i, patch))}
            onRemove={() => onSetsChange(removeSet(sets, i))}
            onToggleComplete={() => {
              const wasDone = set.completedAt !== null;
              onSetsChange(toggleSetCompleted(sets, i, new Date().toISOString()));
              if (!wasDone) onSetCompleted(restSeconds, name);
            }}
          />
        ))}
      </div>

      <Button
        className="w-full"
        onClick={() =>
          onSetsChange(addSet(sets, { weightKg: suggestion?.weightKg ?? 0, reps: target.repMin }))
        }
      >
        <IconPlus size={20} /> Aggiungi serie
      </Button>
    </section>
  );
}
