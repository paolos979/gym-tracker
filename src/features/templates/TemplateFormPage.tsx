/**
 * CREAZIONE / MODIFICA DI UNA SCHEDA
 * Nome, esercizi (aggiungi, riordina, rimuovi) ed eliminazione.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { IconArrowDown, IconArrowUp, IconCheck, IconPlus, IconX } from '../../components/icons';
import { BottomActions, ConfirmDialog, PageBody, PageHeader, Sheet } from '../../components/layout';
import { Button, EmptyState, Field } from '../../components/ui';
import { inputClasses } from '../../components/styles';
import { buildTemplate, deleteTemplate, listExercises, saveTemplate } from '../../db/exercises';
import { db } from '../../db/database';
import { MUSCLE_GROUP_LABELS } from '../../domain/defaults';
import type { MuscleGroup, WorkoutTemplate } from '../../domain/types';

export function TemplateFormPage() {
  const { id } = useParams();
  const existing = useLiveQuery(async () => (id ? ((await db.templates.get(id)) ?? null) : null), [id]);

  if (id === undefined) return <TemplateForm isNew initial={buildTemplate('', [])} />;
  if (existing === undefined) return null;
  if (existing === null) return <PageHeader back="/gestione/schede" title="Scheda non trovata" />;
  return <TemplateForm key={existing.id} isNew={false} initial={existing} />;
}

function TemplateForm({ initial, isNew }: { initial: WorkoutTemplate; isNew: boolean }) {
  const navigate = useNavigate();
  const allExercises = useLiveQuery(() => listExercises({ includeArchived: true }));

  const [draft, setDraft] = useState<WorkoutTemplate>(initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!allExercises) return null;

  const byId = new Map(allExercises.map((e) => [e.id, e]));

  const move = (index: number, delta: number) => {
    const ids = [...draft.exerciseIds];
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setDraft({ ...draft, exerciseIds: ids });
  };

  const save = async () => {
    const name = draft.name.trim();
    if (!name) return setError('Inserisci il nome della scheda.');
    if (draft.exerciseIds.length === 0) return setError('Aggiungi almeno un esercizio.');
    await saveTemplate({ ...draft, name });
    navigate('/gestione/schede', { replace: true });
  };

  return (
    <div className="min-h-dvh pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <PageHeader back="/gestione/schede" title={isNew ? 'Nuova scheda' : 'Modifica scheda'} />
      <PageBody className="space-y-6">
        <Field label="Nome">
          <input
            className={inputClasses}
            value={draft.name}
            placeholder="Es. Push"
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </Field>

        <Field label="Esercizi">
          {draft.exerciseIds.length === 0 && <EmptyState title="Nessun esercizio" />}
          <ol className="space-y-2">
            {draft.exerciseIds.map((exerciseId, i) => {
              const exercise = byId.get(exerciseId);
              return (
                <li key={exerciseId} className="flex items-center gap-1 rounded-2xl bg-surface py-1 pr-1 pl-4">
                  <span className="w-6 shrink-0 text-muted tabular-nums">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{exercise?.name ?? 'Esercizio eliminato'}</div>
                    {exercise?.archived && <div className="text-xs text-amber-300">Archiviato: verrà saltato</div>}
                  </div>
                  <IconButton label="Sposta su" disabled={i === 0} onClick={() => move(i, -1)}>
                    <IconArrowUp size={20} />
                  </IconButton>
                  <IconButton label="Sposta giù" disabled={i === draft.exerciseIds.length - 1} onClick={() => move(i, 1)}>
                    <IconArrowDown size={20} />
                  </IconButton>
                  <IconButton
                    label="Rimuovi"
                    onClick={() => setDraft({ ...draft, exerciseIds: draft.exerciseIds.filter((x) => x !== exerciseId) })}
                  >
                    <IconX size={20} />
                  </IconButton>
                </li>
              );
            })}
          </ol>
          <Button className="w-full" onClick={() => setPickerOpen(true)}>
            <IconPlus size={20} /> Aggiungi esercizi
          </Button>
        </Field>

        {error && <div className="rounded-2xl bg-red-500/15 p-3 text-red-300">{error}</div>}

        {!isNew && (
          <Button variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}>
            Elimina scheda
          </Button>
        )}
      </PageBody>

      <BottomActions>
        <Button variant="primary" size="lg" className="flex-1" onClick={save}>
          Salva
        </Button>
      </BottomActions>

      <ExercisePicker
        open={pickerOpen}
        selectedIds={draft.exerciseIds}
        onClose={() => setPickerOpen(false)}
        onChange={(exerciseIds) => setDraft({ ...draft, exerciseIds })}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminare la scheda?"
        message="Gli esercizi e lo storico degli allenamenti non verranno toccati."
        confirmLabel="Elimina"
        danger
        onConfirm={async () => {
          await deleteTemplate(draft.id);
          navigate('/gestione/schede', { replace: true });
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

/** Pannello per scegliere gli esercizi da aggiungere (tocca per selezionare/deselezionare). */
function ExercisePicker({
  open,
  selectedIds,
  onClose,
  onChange,
}: {
  open: boolean;
  selectedIds: string[];
  onClose: () => void;
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const exercises = useLiveQuery(() => listExercises());

  const filtered = (exercises ?? []).filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()));
  const groups = (Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[])
    .map((group) => ({ group, items: filtered.filter((e) => e.muscleGroup === group) }))
    .filter((g) => g.items.length > 0);

  const toggle = (exerciseId: string) =>
    onChange(
      selectedIds.includes(exerciseId) ? selectedIds.filter((x) => x !== exerciseId) : [...selectedIds, exerciseId],
    );

  return (
    <Sheet
      open={open}
      title="Scegli esercizi"
      onClose={onClose}
      footer={
        <Button variant="primary" size="lg" className="w-full" onClick={onClose}>
          Fatto ({selectedIds.length})
        </Button>
      }
    >
      <input
        type="search"
        className={`${inputClasses} mb-4`}
        placeholder="Cerca esercizio…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {exercises?.length === 0 && (
        <EmptyState title="Nessun esercizio">Crealo prima da Gestione → Esercizi.</EmptyState>
      )}
      <div className="space-y-4">
        {groups.map(({ group, items }) => (
          <section key={group}>
            <h3 className="mb-2 px-1 text-sm font-bold tracking-wide text-muted uppercase">{MUSCLE_GROUP_LABELS[group]}</h3>
            <div className="space-y-2">
              {items.map((e) => {
                const selected = selectedIds.includes(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggle(e.id)}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 text-left ${
                      selected ? 'bg-accent/15' : 'bg-surface'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        selected ? 'bg-accent text-accent-ink' : 'border-2 border-line'
                      }`}
                    >
                      {selected && <IconCheck size={18} />}
                    </span>
                    <span className="font-semibold">{e.name}</span>
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

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-11 items-center justify-center rounded-xl text-muted active:bg-surface-2 disabled:opacity-25"
    >
      {children}
    </button>
  );
}
