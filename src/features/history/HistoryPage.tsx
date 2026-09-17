/**
 * STORICO
 * Due viste: "Allenamenti" (sessioni per mese) ed "Esercizi" (andamento di ognuno).
 * La vista scelta resta nell'indirizzo (?vista=esercizi).
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useSearchParams } from 'react-router';
import { IconChevronRight } from '../../components/icons';
import { PageBody, PageHeader } from '../../components/layout';
import { EmptyState, Segmented, StatTile } from '../../components/ui';
import { listExercises } from '../../db/exercises';
import { getAllFinishedLogs } from '../../db/history';
import { listFinishedSessions } from '../../db/sessions';
import { MUSCLE_GROUP_LABELS } from '../../domain/defaults';
import { formatDecimal, formatDuration, formatKg, formatRelativeDay, formatTime } from '../../domain/format';
import { sessionStats } from '../../domain/session';
import { groupByMonth, personalRecords, progressPoints, sessionCounts } from '../../domain/stats';
import type { ExerciseLog } from '../../domain/types';

type View = 'allenamenti' | 'esercizi';

export function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const view: View = params.get('vista') === 'esercizi' ? 'esercizi' : 'allenamenti';

  return (
    <>
      <PageHeader title="Storico" />
      <PageBody>
        <Segmented
          value={view}
          onChange={(v) => setParams(v === 'esercizi' ? { vista: v } : {}, { replace: true })}
          options={[
            { value: 'allenamenti', label: 'Allenamenti' },
            { value: 'esercizi', label: 'Esercizi' },
          ]}
        />
        {view === 'allenamenti' ? <SessionsView /> : <ExercisesView />}
      </PageBody>
    </>
  );
}

// ---------------------------------------------------------------------------
// Vista "Allenamenti"
// ---------------------------------------------------------------------------

function SessionsView() {
  const data = useLiveQuery(async () => {
    const [sessions, logs] = await Promise.all([listFinishedSessions(), getAllFinishedLogs()]);
    const logsBySession = new Map<string, ExerciseLog[]>();
    for (const log of logs) logsBySession.set(log.sessionId, [...(logsBySession.get(log.sessionId) ?? []), log]);
    return { sessions, logsBySession };
  });

  if (!data) return null;
  const { sessions, logsBySession } = data;

  if (sessions.length === 0) {
    return <EmptyState title="Ancora nessun allenamento">Gli allenamenti terminati compariranno qui.</EmptyState>;
  }

  const counts = sessionCounts(sessions);

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Questa settimana" value={String(counts.thisWeek)} />
        <StatTile label="Questo mese" value={String(counts.thisMonth)} />
        <StatTile label="Totale" value={String(counts.total)} />
      </div>

      {groupByMonth(sessions).map((group) => (
        <section key={group.key} className="space-y-2">
          <h2 className="px-1 pt-2 text-sm font-bold tracking-wide text-muted uppercase">{group.label}</h2>
          {group.items.map((s) => {
            const logs = logsBySession.get(s.id) ?? [];
            const stats = sessionStats(logs);
            const duration = new Date(s.finishedAt!).getTime() - new Date(s.startedAt).getTime();
            return (
              <Link
                key={s.id}
                to={`/sessione/${s.id}/riepilogo`}
                className="flex items-center gap-3 rounded-3xl bg-surface px-4 py-3 active:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-lg font-bold">{s.templateName}</span>
                    <span className="shrink-0 text-sm text-muted">{formatRelativeDay(s.startedAt)}</span>
                  </div>
                  <div className="text-sm text-muted">
                    {formatTime(s.startedAt)} · {formatDuration(duration)} · {logs.length}{' '}
                    {logs.length === 1 ? 'esercizio' : 'esercizi'} ·{' '}
                    {stats.completedSets} serie · {stats.volumeKg.toLocaleString('it-IT')} kg
                  </div>
                </div>
                <IconChevronRight className="shrink-0 text-muted" />
              </Link>
            );
          })}
        </section>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Vista "Esercizi"
// ---------------------------------------------------------------------------

function ExercisesView() {
  const rows = useLiveQuery(async () => {
    const [exercises, logs] = await Promise.all([listExercises({ includeArchived: true }), getAllFinishedLogs()]);
    return exercises
      .map((exercise) => {
        const points = progressPoints(logs.filter((l) => l.exerciseId === exercise.id));
        return { exercise, points, records: personalRecords(points) };
      })
      .filter((r) => r.points.length > 0)
      .sort((a, b) => b.points[b.points.length - 1].date.localeCompare(a.points[a.points.length - 1].date));
  });

  if (!rows) return null;
  if (rows.length === 0) {
    return <EmptyState title="Ancora nessun esercizio svolto">Termina un allenamento per vedere l'andamento.</EmptyState>;
  }

  return (
    <div className="space-y-2">
      {rows.map(({ exercise, points, records }) => {
        const last = points[points.length - 1];
        const headline = exercise.isBodyweight
          ? { label: 'rip. max', value: formatDecimal(records.mostReps?.maxReps ?? 0) }
          : { label: '1RM stimato', value: formatKg(records.best1RM?.estimated1RMKg ?? 0) };
        return (
          <Link
            key={exercise.id}
            to={`/storico/esercizio/${exercise.id}`}
            className="flex items-center gap-3 rounded-3xl bg-surface px-4 py-3 active:bg-surface-2"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{exercise.name}</div>
              <div className="text-sm text-muted">
                {MUSCLE_GROUP_LABELS[exercise.muscleGroup]} · {points.length}{' '}
                {points.length === 1 ? 'volta' : 'volte'} · ultima {formatRelativeDay(last.date)}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-bold">{headline.value}</div>
              <div className="text-xs text-muted">{headline.label}</div>
            </div>
            <IconChevronRight className="shrink-0 text-muted" />
          </Link>
        );
      })}
    </div>
  );
}
