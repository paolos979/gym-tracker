/**
 * ANDAMENTO DI UN ESERCIZIO
 *
 * In alto i record di sempre; sotto, il periodo scelto vale per grafico ed elenco.
 * Esercizi con carico: grafico di 1RM stimato (Epley) e carico massimo (stessa unità: kg).
 * A corpo libero: ripetizioni migliori e, se usi la zavorra, un secondo grafico a parte
 * (unità diverse non vanno mai sullo stesso asse).
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ChartLegend, LineChart, type ChartSeries } from '../../components/chart/LineChart';
import { SERIES_COLORS } from '../../components/chart/colors';
import { IconChevronRight } from '../../components/icons';
import { PageBody, PageHeader } from '../../components/layout';
import { Card, Chips, EmptyState, StatTile } from '../../components/ui';
import { db } from '../../db/database';
import { getExerciseHistory } from '../../db/history';
import { MUSCLE_GROUP_LABELS } from '../../domain/defaults';
import { formatDecimal, formatKg, formatRelativeDay } from '../../domain/format';
import { summarizeSets } from '../../domain/session';
import {
  TIME_RANGE_LABELS,
  filterByRange,
  personalRecords,
  progressPoints,
  type ProgressPoint,
  type TimeRange,
} from '../../domain/stats';

const formatChartDate = (ms: number) =>
  new Date(ms).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export function ExerciseHistoryPage() {
  const { id = '' } = useParams();
  const [range, setRange] = useState<TimeRange>('all');

  const exercise = useLiveQuery(async () => (await db.exercises.get(id)) ?? null, [id]);
  const logs = useLiveQuery(() => getExerciseHistory(id), [id]);

  if (exercise === null) return <PageHeader back="/storico?vista=esercizi" title="Esercizio non trovato" />;
  if (!exercise || !logs) return null;

  const points = progressPoints(logs);
  const records = personalRecords(points);
  const visible = filterByRange(points, range);
  const logBySession = new Map(logs.map((l) => [l.sessionId, l]));
  const bodyweight = exercise.isBodyweight;
  const toXY = (value: (p: ProgressPoint) => number) =>
    visible.map((p) => ({ x: new Date(p.date).getTime(), y: value(p) }));

  const loadSeries: ChartSeries[] = [
    { id: '1rm', label: '1RM stimato', color: SERIES_COLORS.primary, points: toXY((p) => p.estimated1RMKg) },
    { id: 'max', label: 'Carico massimo', color: SERIES_COLORS.secondary, points: toXY((p) => p.maxWeightKg) },
  ];
  const repsSeries: ChartSeries[] = [
    { id: 'reps', label: 'Ripetizioni migliori', color: SERIES_COLORS.primary, points: toXY((p) => p.maxReps) },
  ];
  const ballastSeries: ChartSeries[] = [
    { id: 'zavorra', label: 'Zavorra massima', color: SERIES_COLORS.secondary, points: toXY((p) => p.maxWeightKg) },
  ];
  const usesBallast = bodyweight && points.some((p) => p.maxWeightKg > 0);

  const since = points[0] ? `dal ${formatRelativeDay(points[0].date)}` : undefined;

  return (
    <>
      <PageHeader
        back="/storico?vista=esercizi"
        title={exercise.name}
        subtitle={MUSCLE_GROUP_LABELS[exercise.muscleGroup]}
      />
      <PageBody>
        {points.length === 0 ? (
          <EmptyState title="Nessun allenamento registrato">
            L'andamento comparirà dopo il primo allenamento terminato con questo esercizio.
          </EmptyState>
        ) : (
          <>
            {/* Record di sempre */}
            <div className="grid grid-cols-3 gap-2">
              {bodyweight ? (
                <>
                  <StatTile
                    label="Rip. migliori"
                    value={String(records.mostReps?.maxReps ?? 0)}
                    detail={records.mostReps ? formatRelativeDay(records.mostReps.date) : undefined}
                  />
                  <StatTile
                    label="Zavorra max"
                    value={usesBallast ? formatKg(records.heaviest?.maxWeightKg ?? 0) : '—'}
                    detail={usesBallast && records.heaviest ? formatRelativeDay(records.heaviest.date) : undefined}
                  />
                </>
              ) : (
                <>
                  <StatTile
                    label="1RM stimato"
                    value={formatKg(records.best1RM?.estimated1RMKg ?? 0)}
                    detail={
                      records.best1RM
                        ? `${formatDecimal(records.best1RM.bestSet.weightKg)} × ${records.best1RM.bestSet.reps}`
                        : undefined
                    }
                  />
                  <StatTile
                    label="Carico max"
                    value={formatKg(records.heaviest?.maxWeightKg ?? 0)}
                    detail={records.heaviest ? formatRelativeDay(records.heaviest.date) : undefined}
                  />
                </>
              )}
              <StatTile label="Allenamenti" value={String(records.sessions)} detail={since} />
            </div>

            {/* Periodo: vale per tutto ciò che sta sotto */}
            <Chips
              value={range}
              onChange={setRange}
              options={(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((r) => ({
                value: r,
                label: TIME_RANGE_LABELS[r],
              }))}
            />

            {visible.length < 2 ? (
              <EmptyState title="Andamento non disponibile">
                Servono almeno 2 allenamenti nel periodo scelto per disegnare il grafico.
              </EmptyState>
            ) : bodyweight ? (
              <>
                <ChartCard title="Ripetizioni migliori per allenamento">
                  <LineChart
                    series={repsSeries}
                    ariaLabel={`Ripetizioni migliori di ${exercise.name} nel tempo`}
                    formatValue={formatDecimal}
                    formatDate={formatChartDate}
                  />
                </ChartCard>
                {usesBallast && (
                  <ChartCard title="Zavorra massima (kg)">
                    <LineChart
                      series={ballastSeries}
                      ariaLabel={`Zavorra massima di ${exercise.name} nel tempo`}
                      formatValue={formatDecimal}
                      formatDate={formatChartDate}
                      height={200}
                    />
                  </ChartCard>
                )}
              </>
            ) : (
              <ChartCard title="Andamento (kg)" legend={<ChartLegend series={loadSeries} />}>
                <LineChart
                  series={loadSeries}
                  ariaLabel={`1RM stimato e carico massimo di ${exercise.name} nel tempo`}
                  formatValue={formatDecimal}
                  formatDate={formatChartDate}
                />
                <p className="mt-2 text-xs text-muted">
                  1RM stimato con la formula di Epley: carico × (1 + ripetizioni ÷ 30).
                </p>
              </ChartCard>
            )}

            {/* Elenco: gli stessi dati del grafico, leggibili senza toccarlo */}
            <section className="space-y-2">
              <h2 className="px-1 pt-2 text-sm font-bold tracking-wide text-muted uppercase">Allenamenti</h2>
              {[...visible].reverse().map((p) => {
                const log = logBySession.get(p.sessionId);
                return (
                  <Link
                    key={p.sessionId}
                    to={`/sessione/${p.sessionId}/riepilogo`}
                    className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 active:bg-surface-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-muted">{formatRelativeDay(p.date)}</div>
                      <div className="truncate font-semibold">{log ? summarizeSets(log.sets, bodyweight) : ''}</div>
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      {bodyweight ? (
                        <div className="font-bold">{p.maxReps} rip</div>
                      ) : (
                        <>
                          <div className="font-bold">{formatKg(p.estimated1RMKg)}</div>
                          <div className="text-xs text-muted">max {formatKg(p.maxWeightKg)}</div>
                        </>
                      )}
                    </div>
                    <IconChevronRight className="shrink-0 text-muted" size={20} />
                  </Link>
                );
              })}
            </section>
          </>
        )}
      </PageBody>
    </>
  );
}

function ChartCard({ title, legend, children }: { title: string; legend?: ReactNode; children: ReactNode }) {
  return (
    <Card className="space-y-3 px-3">
      <div className="space-y-1 px-1">
        <h2 className="font-bold">{title}</h2>
        {legend}
      </div>
      {children}
    </Card>
  );
}
