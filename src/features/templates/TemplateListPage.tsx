/**
 * ELENCO DELLE SCHEDE
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { IconChevronRight, IconPlus } from '../../components/icons';
import { PageBody, PageHeader } from '../../components/layout';
import { ButtonLink, EmptyState } from '../../components/ui';
import { listExercises, listTemplates } from '../../db/exercises';
import { exerciseNamesLine } from '../../domain/session';

export function TemplateListPage() {
  const templates = useLiveQuery(() => listTemplates());
  const exercises = useLiveQuery(async () => {
    const all = await listExercises({ includeArchived: true });
    return new Map(all.map((e) => [e.id, e]));
  });

  return (
    <>
      <PageHeader
        back="/gestione"
        title="Schede"
        right={
          <ButtonLink to="/gestione/schede/nuova" variant="primary">
            <IconPlus size={20} /> Nuova
          </ButtonLink>
        }
      />
      <PageBody className="space-y-2">
        {templates?.length === 0 && (
          <EmptyState title="Nessuna scheda">Tocca «Nuova» per creare la prima scheda.</EmptyState>
        )}
        {templates?.map((t) => {
          const names = t.exerciseIds
            .map((id) => exercises?.get(id))
            .filter((e) => e && !e.archived)
            .map((e) => e!.name);
          return (
            <Link
              key={t.id}
              to={`/gestione/schede/${t.id}`}
              className="flex items-center gap-3 rounded-3xl bg-surface px-4 py-3 active:bg-surface-2"
            >
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold">{t.name}</div>
                <div className="text-sm text-muted">
                  {names.length} {names.length === 1 ? 'esercizio' : 'esercizi'} · {exerciseNamesLine(names, 3)}
                </div>
              </div>
              <IconChevronRight className="shrink-0 text-muted" />
            </Link>
          );
        })}
      </PageBody>
    </>
  );
}
