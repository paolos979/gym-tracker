/**
 * PAGINA "ALLENA": elenco delle schede da avviare con un tocco.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { IconPlay } from '../../components/icons';
import { PageBody, PageHeader } from '../../components/layout';
import { Button, ButtonLink, Card, EmptyState } from '../../components/ui';
import { listExercises, listTemplates } from '../../db/exercises';
import { getActiveSession, lastSessionDateByTemplate, startSession } from '../../db/sessions';
import { formatRelativeDay, formatTime } from '../../domain/format';
import { exerciseNamesLine } from '../../domain/session';

export function HomePage() {
  const navigate = useNavigate();
  const templates = useLiveQuery(() => listTemplates());
  const active = useLiveQuery(() => getActiveSession());
  const lastDates = useLiveQuery(() => lastSessionDateByTemplate());
  const exercises = useLiveQuery(async () => {
    const all = await listExercises({ includeArchived: true });
    return new Map(all.map((e) => [e.id, e]));
  });
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async (templateId: string) => {
    setStarting(templateId);
    setError(null);
    try {
      const id = await startSession(templateId);
      navigate(`/sessione/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossibile avviare l\'allenamento.');
      setStarting(null);
    }
  };

  const loading = templates === undefined || active === undefined;

  return (
    <>
      <PageHeader title="Allena" />
      <PageBody>
        {active && (
          <Card className="border border-accent/50 bg-accent/10">
            <div className="text-sm font-semibold text-accent">Allenamento in corso</div>
            <div className="mt-1 text-lg font-bold">{active.templateName}</div>
            <div className="text-sm text-muted">Iniziato alle {formatTime(active.startedAt)}</div>
            <ButtonLink to={`/sessione/${active.id}`} variant="primary" size="lg" className="mt-3 w-full">
              Riprendi
            </ButtonLink>
          </Card>
        )}

        {error && <div className="rounded-2xl bg-red-500/15 p-3 text-red-300">{error}</div>}

        {!loading && templates.length === 0 && (
          <EmptyState title="Nessuna scheda">
            Crea la tua prima scheda da <strong>Gestione → Schede</strong>.
          </EmptyState>
        )}

        {templates?.map((t) => {
          const names = t.exerciseIds
            .map((id) => exercises?.get(id))
            .filter((e) => e && !e.archived)
            .map((e) => e!.name);
          const last = lastDates?.get(t.id);
          return (
            <Card key={t.id}>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-2xl font-bold">{t.name}</h2>
                <span className="shrink-0 text-sm text-muted">
                  {last ? `Ultima: ${formatRelativeDay(last)}` : 'Mai fatta'}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {names.length} {names.length === 1 ? 'esercizio' : 'esercizi'} · {exerciseNamesLine(names)}
              </p>
              <Button
                variant="primary"
                size="lg"
                className="mt-4 w-full"
                disabled={!!active || names.length === 0 || starting !== null}
                onClick={() => start(t.id)}
              >
                <IconPlay size={20} />
                {starting === t.id ? 'Avvio…' : 'Avvia'}
              </Button>
            </Card>
          );
        })}

        {active && templates && templates.length > 0 && (
          <p className="text-center text-sm text-muted">Termina l'allenamento in corso per avviarne un altro.</p>
        )}
      </PageBody>
    </>
  );
}
