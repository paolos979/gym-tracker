/**
 * ELENCO ESERCIZI, raggruppati per gruppo muscolare.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { IconChevronRight, IconLibrary, IconPlus } from '../../components/icons';
import { PageBody, PageHeader } from '../../components/layout';
import { Button, ButtonLink, EmptyState, Toggle } from '../../components/ui';
import { inputClasses } from '../../components/styles';
import { listExercises } from '../../db/exercises';
import { CatalogSheet } from './CatalogSheet';
import { useCatalogAvailableCount } from './useCatalogAvailableCount';
import { EXERCISE_TYPE_LABELS, MUSCLE_GROUP_LABELS } from '../../domain/defaults';
import { formatDecimal } from '../../domain/format';
import type { Exercise, MuscleGroup } from '../../domain/types';

export function ExerciseListPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const available = useCatalogAvailableCount();
  const exercises = useLiveQuery(() => listExercises({ includeArchived: showArchived }), [showArchived]);

  const filtered = (exercises ?? []).filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()));
  const groups = (Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[])
    .map((group) => ({ group, items: filtered.filter((e) => e.muscleGroup === group) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <PageHeader
        back="/gestione"
        title="Esercizi"
        right={
          <ButtonLink to="/gestione/esercizi/nuovo" variant="primary">
            <IconPlus size={20} /> Nuovo
          </ButtonLink>
        }
      />
      <PageBody>
        <input
          type="search"
          className={inputClasses}
          placeholder="Cerca esercizio…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <Button className="w-full" onClick={() => setLibraryOpen(true)}>
          <IconLibrary size={20} />
          Aggiungi dalla libreria{available !== undefined && available > 0 ? ` (${available} pronti)` : ''}
        </Button>

        {message && (
          <div role="status" className="rounded-2xl bg-accent/15 p-3 text-accent">
            {message}
          </div>
        )}

        {exercises && groups.length === 0 && (
          <EmptyState title={query ? 'Nessun risultato' : 'Nessun esercizio'}>
            {!query && 'Tocca «Nuovo» per creare il primo esercizio.'}
          </EmptyState>
        )}

        {groups.map(({ group, items }) => (
          <section key={group}>
            <h2 className="mb-2 px-1 text-sm font-bold tracking-wide text-muted uppercase">
              {MUSCLE_GROUP_LABELS[group]}
            </h2>
            <div className="space-y-2">
              {items.map((e) => (
                <ExerciseItem key={e.id} exercise={e} />
              ))}
            </div>
          </section>
        ))}

        <Toggle checked={showArchived} onChange={setShowArchived} label="Mostra archiviati" />
      </PageBody>

      <CatalogSheet
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onAdded={(count) =>
          setMessage(count === 1 ? 'Aggiunto 1 esercizio.' : `Aggiunti ${count} esercizi.`)
        }
      />
    </>
  );
}

function ExerciseItem({ exercise: e }: { exercise: Exercise }) {
  return (
    <Link
      to={`/gestione/esercizi/${e.id}`}
      className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 active:bg-surface-2"
    >
      <div className="min-w-0 flex-1">
        <div className={`truncate font-semibold ${e.archived ? 'text-muted line-through' : ''}`}>{e.name}</div>
        <div className="text-sm text-muted">
          {e.targetSets} × {e.repMin}-{e.repMax} · +{formatDecimal(e.incrementKg)} kg · {EXERCISE_TYPE_LABELS[e.type]}
        </div>
      </div>
      <IconChevronRight className="shrink-0 text-muted" />
    </Link>
  );
}
