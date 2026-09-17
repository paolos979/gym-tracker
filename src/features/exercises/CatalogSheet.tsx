/**
 * LIBRERIA: pannello per aggiungere esercizi pronti alla propria lista.
 * Gli esercizi che hai già compaiono come «già presente» e non si possono riselezionare.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { IconCheck } from '../../components/icons';
import { Sheet } from '../../components/layout';
import { inputClasses } from '../../components/styles';
import { Button, EmptyState } from '../../components/ui';
import { addExercisesFromCatalog, listExercises } from '../../db/exercises';
import { MUSCLE_GROUP_LABELS } from '../../domain/defaults';
import {
  EQUIPMENT_LABELS,
  EQUIPMENT_ORDER,
  EXERCISE_CATALOG,
  normalizeExerciseName,
  type CatalogExercise,
} from '../../domain/exerciseCatalog';

export function CatalogSheet({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  /** Chiamata dopo l'aggiunta, con quanti esercizi sono stati creati. */
  onAdded: (count: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  // Nomi già presenti (archiviati compresi): non vanno aggiunti di nuovo.
  const existingNames = useLiveQuery(async () => {
    const all = await listExercises({ includeArchived: true });
    return new Set(all.map((e) => normalizeExerciseName(e.name)));
  });

  const isPresent = (entry: CatalogExercise) => existingNames?.has(normalizeExerciseName(entry.name)) ?? false;

  const needle = normalizeExerciseName(query);
  const matches = EXERCISE_CATALOG.filter(
    (e) =>
      needle === '' ||
      normalizeExerciseName(e.name).includes(needle) ||
      normalizeExerciseName(MUSCLE_GROUP_LABELS[e.muscleGroup]).includes(needle),
  );
  const groups = EQUIPMENT_ORDER.map((equipment) => ({
    equipment,
    items: matches.filter((e) => e.equipment === equipment),
  })).filter((g) => g.items.length > 0);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const close = () => {
    setSelected(new Set());
    setQuery('');
    onClose();
  };

  const add = async () => {
    setBusy(true);
    try {
      const { added } = await addExercisesFromCatalog([...selected]);
      onAdded(added.length);
      close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      title="Libreria esercizi"
      onClose={close}
      footer={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={selected.size === 0 || busy}
          onClick={add}
        >
          {selected.size === 0 ? 'Scegli gli esercizi da aggiungere' : `Aggiungi ${selected.size}`}
        </Button>
      }
    >
      <input
        type="search"
        className={`${inputClasses} mb-4`}
        placeholder="Cerca per nome o gruppo muscolare…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {groups.length === 0 && <EmptyState title="Nessun risultato" />}

      <div className="space-y-5">
        {groups.map(({ equipment, items }) => (
          <section key={equipment}>
            <h3 className="mb-2 px-1 text-sm font-bold tracking-wide text-muted uppercase">
              {EQUIPMENT_LABELS[equipment]}
            </h3>
            <div className="space-y-2">
              {items.map((entry) => {
                const present = isPresent(entry);
                const chosen = selected.has(entry.id);
                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-pressed={chosen}
                    disabled={present}
                    onClick={() => toggle(entry.id)}
                    className={`flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 py-2 text-left ${
                      present ? 'bg-surface/60' : chosen ? 'bg-accent/15' : 'bg-surface'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        chosen ? 'bg-accent text-accent-ink' : 'border-2 border-line'
                      }`}
                    >
                      {(chosen || present) && <IconCheck size={18} className={present ? 'text-muted' : undefined} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-semibold ${present ? 'text-muted' : ''}`}>
                        {entry.name}
                      </span>
                      <span className="block text-sm text-muted">
                        {present
                          ? 'già presente'
                          : `${MUSCLE_GROUP_LABELS[entry.muscleGroup]} · ${entry.sets ?? 3} × ${entry.repMin}-${entry.repMax}`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Sheet>
  );
}
