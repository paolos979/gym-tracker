/**
 * RIEPILOGO DI UN ALLENAMENTO TERMINATO
 * Mostra cosa hai fatto e cosa fare la prossima volta per ogni esercizio.
 * Con «Modifica» puoi correggere carichi e ripetizioni inseriti per errore:
 * i suggerimenti futuri terranno conto delle correzioni.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { IconPlus, IconTrash } from '../../components/icons';
import { BottomActions, ConfirmDialog, PageBody, PageHeader } from '../../components/layout';
import { Button, Card, StatTile, Stepper } from '../../components/ui';
import { db } from '../../db/database';
import { suggestionForExercise } from '../../db/history';
import { deleteSession, getSessionLogs, removeEmptyLogs, saveLogSets } from '../../db/sessions';
import { formatDuration, formatRelativeDay, formatTime } from '../../domain/format';
import { addSet, removeSet, sessionStats, summarizeSets, updateSet } from '../../domain/session';
import type { Exercise, ExerciseLog, SetEntry } from '../../domain/types';
import { SuggestionBox } from './SuggestionBox';

export function SummaryPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  const session = useLiveQuery(async () => (await db.sessions.get(id)) ?? null, [id]);
  const logs = useLiveQuery(() => getSessionLogs(id), [id]);

  if (session === null) return <Navigate to="/" replace />;
  if (!session || !logs) return null;
  if (session.finishedAt === null) return <Navigate to={`/sessione/${id}`} replace />;

  const stats = sessionStats(logs);
  const duration = new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime();

  const stopEditing = async () => {
    await removeEmptyLogs(id);
    setEditing(false);
  };

  return (
    <div className="min-h-dvh pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <PageHeader
        back="/storico"
        title={session.templateName}
        subtitle={`${formatRelativeDay(session.startedAt)} alle ${formatTime(session.startedAt)}`}
        right={
          editing ? null : (
            <Button onClick={() => setEditing(true)} disabled={logs.length === 0}>
              Modifica
            </Button>
          )
        }
      />
      <PageBody>
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Durata" value={formatDuration(duration)} />
          <StatTile label="Serie" value={String(stats.completedSets)} />
          <StatTile label="Volume" value={`${stats.volumeKg.toLocaleString('it-IT')} kg`} />
        </div>

        {editing && (
          <p className="rounded-2xl bg-surface p-3 text-sm text-muted">
            Le modifiche vengono salvate subito. Gli esercizi senza serie verranno rimossi quando tocchi «Fine».
          </p>
        )}

        {logs.length === 0 && <p className="text-muted">Nessuna serie registrata.</p>}

        {logs.map((log) => (
          <LogSummary key={log.id} log={log} editing={editing} completedAt={session.finishedAt!} />
        ))}

        {!editing && (
          <div className="pt-4 text-center">
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
              Elimina allenamento
            </Button>
          </div>
        )}
      </PageBody>

      <BottomActions>
        {editing ? (
          <Button variant="primary" size="lg" className="flex-1" onClick={stopEditing}>
            Fine modifica
          </Button>
        ) : (
          <Button variant="primary" size="lg" className="flex-1" onClick={() => navigate('/')}>
            Fine
          </Button>
        )}
      </BottomActions>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminare l'allenamento?"
        message="Verrà rimosso dallo storico e i suggerimenti futuri non ne terranno conto."
        confirmLabel="Elimina"
        danger
        onConfirm={async () => {
          await deleteSession(id);
          navigate('/storico', { replace: true });
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function LogSummary({ log, editing, completedAt }: { log: ExerciseLog; editing: boolean; completedAt: string }) {
  const exercise = useLiveQuery(async () => (await db.exercises.get(log.exerciseId)) ?? null, [log.exerciseId]);
  const suggestion = useLiveQuery(
    async () => (exercise ? suggestionForExercise(exercise as Exercise) : null),
    [exercise],
  );
  return (
    <Card className="space-y-3">
      <div>
        <h2 className="text-lg font-bold">{exercise?.name ?? 'Esercizio eliminato'}</h2>
        {!editing && (
          <p className="text-sm text-muted tabular-nums">{summarizeSets(log.sets, exercise?.isBodyweight)}</p>
        )}
      </div>
      {editing ? (
        <EditSets log={log} completedAt={completedAt} isBodyweight={exercise?.isBodyweight ?? false} />
      ) : (
        suggestion && <SuggestionBox suggestion={suggestion} title="Prossima volta" />
      )}
    </Card>
  );
}

/** Modifica delle serie di un allenamento passato. */
function EditSets({ log, completedAt, isBodyweight }: { log: ExerciseLog; completedAt: string; isBodyweight: boolean }) {
  // Copia locale: lo schermo si aggiorna subito, il salvataggio avviene in parallelo.
  const [sets, setSets] = useState<SetEntry[]>(log.sets);

  const change = (next: SetEntry[]) => {
    setSets(next);
    void saveLogSets(log.id, next);
  };

  let workingNumber = 0;
  return (
    <div className="space-y-2">
      {sets.map((set, i) => (
        <div key={i} className="rounded-2xl bg-surface-2/50 p-2">
          <div className="mb-1 flex items-center justify-between pl-1">
            <span className="text-sm font-semibold text-muted">
              {set.isWarmup ? 'Riscaldamento' : `Serie ${++workingNumber}`}
            </span>
            <button
              type="button"
              aria-label="Elimina serie"
              onClick={() => change(removeSet(sets, i))}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted active:bg-surface-2"
            >
              <IconTrash size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stepper
              label={isBodyweight ? 'Zavorra' : 'Carico'}
              unit="kg"
              value={set.weightKg}
              step={log.target.roundingStepKg}
              onChange={(weightKg) => change(updateSet(sets, i, { weightKg }))}
            />
            <Stepper
              label="Ripetizioni"
              unit="rip"
              value={set.reps}
              step={1}
              inputMode="numeric"
              onChange={(reps) => change(updateSet(sets, i, { reps: Math.round(reps) }))}
            />
          </div>
        </div>
      ))}
      <Button
        className="w-full"
        onClick={() => {
          const next = addSet(sets, { weightKg: 0, reps: log.target.repMin });
          // Le serie aggiunte qui risultano fatte, all'ora di fine dell'allenamento.
          next[next.length - 1] = { ...next[next.length - 1], completedAt };
          change(next);
        }}
      >
        <IconPlus size={20} /> Aggiungi serie
      </Button>
    </div>
  );
}
