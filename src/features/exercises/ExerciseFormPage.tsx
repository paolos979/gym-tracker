/**
 * CREAZIONE / MODIFICA DI UN ESERCIZIO
 *
 * Per un esercizio nuovo, cambiando tipo o gruppo muscolare vengono proposti
 * automaticamente incremento, zona e recupero predefiniti — a meno che tu
 * non li abbia già modificati a mano.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { BottomActions, PageBody, PageHeader } from '../../components/layout';
import { Button, Chips, Field, Segmented, Stepper, Toggle } from '../../components/ui';
import { inputClasses } from '../../components/styles';
import { buildExercise, getExercise, saveExercise } from '../../db/exercises';
import {
  BODY_REGION_LABELS,
  EXERCISE_TYPE_LABELS,
  MUSCLE_GROUP_LABELS,
  bodyRegionFor,
  defaultIncrementFor,
  defaultRestFor,
} from '../../domain/defaults';
import { formatClock, formatDecimal } from '../../domain/format';
import type { BodyRegion, Exercise, ExerciseType, MuscleGroup, Settings } from '../../domain/types';
import { useSettings } from '../../hooks/useSettings';

type AutoField = 'bodyRegion' | 'incrementKg' | 'restSeconds';

export function ExerciseFormPage() {
  const { id } = useParams();
  const settings = useSettings();
  const existing = useLiveQuery(async () => (id ? ((await getExercise(id)) ?? null) : null), [id]);

  if (!settings) return null;
  if (id === undefined) {
    return (
      <ExerciseForm
        isNew
        settings={settings}
        initial={buildExercise({ name: '', muscleGroup: 'chest', type: 'compound' }, settings)}
      />
    );
  }
  if (existing === undefined) return null;
  if (existing === null) return <PageHeader back="/gestione/esercizi" title="Esercizio non trovato" />;
  // `key`: se cambia l'esercizio, il modulo riparte da zero.
  return <ExerciseForm key={existing.id} isNew={false} settings={settings} initial={existing} />;
}

function ExerciseForm({ initial, isNew, settings }: { initial: Exercise; isNew: boolean; settings: Settings }) {
  const navigate = useNavigate();
  // Bozza modificata nel modulo: viene salvata solo toccando «Salva».
  const [draft, setDraft] = useState<Exercise>(initial);
  // Campi modificati a mano: non vengono più ricalcolati automaticamente.
  const [touched, setTouched] = useState<Set<AutoField>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Exercise>(key: K, value: Exercise[K]) => setDraft({ ...draft, [key]: value });

  const touch = (field: AutoField) => setTouched((t) => new Set(t).add(field));

  /** Cambia tipo o gruppo e, per gli esercizi nuovi, ricalcola i valori predefiniti. */
  const changeKind = (patch: { type?: ExerciseType; muscleGroup?: MuscleGroup }) => {
    const next = { ...draft, ...patch };
    if (isNew) {
      if (!touched.has('bodyRegion')) next.bodyRegion = bodyRegionFor(next.muscleGroup);
      if (!touched.has('incrementKg')) next.incrementKg = defaultIncrementFor(next.type, next.bodyRegion, settings);
      if (!touched.has('restSeconds')) next.restSeconds = defaultRestFor(next.type, settings);
    }
    setDraft(next);
  };

  const save = async () => {
    const name = draft.name.trim();
    if (!name) return setError('Inserisci il nome dell\'esercizio.');
    if (draft.repMax < draft.repMin) return setError('Il massimo di ripetizioni deve essere almeno uguale al minimo.');
    await saveExercise({ ...draft, name });
    navigate('/gestione/esercizi', { replace: true });
  };

  const toggleArchived = async () => {
    await saveExercise({ ...draft, archived: !draft.archived });
    navigate('/gestione/esercizi', { replace: true });
  };

  const roundingOptions = [
    { value: 0, label: `Predefinito (${formatDecimal(settings.defaultRoundingStepKg)} kg)` },
    ...[0.5, 1, 1.25, 2, 2.5, 5].map((v) => ({ value: v, label: `${formatDecimal(v)} kg` })),
  ];

  return (
    <div className="min-h-dvh pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <PageHeader back="/gestione/esercizi" title={isNew ? 'Nuovo esercizio' : 'Modifica esercizio'} />
      <PageBody className="space-y-6">
        <Field label="Nome">
          <input
            className={inputClasses}
            value={draft.name}
            placeholder="Es. Panca piana"
            onChange={(e) => set('name', e.target.value)}
            autoFocus={isNew}
          />
        </Field>

        <Field label="Gruppo muscolare">
          <select
            className={inputClasses}
            value={draft.muscleGroup}
            onChange={(e) => changeKind({ muscleGroup: e.target.value as MuscleGroup })}
          >
            {(Object.entries(MUSCLE_GROUP_LABELS) as [MuscleGroup, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tipo">
          <Segmented
            value={draft.type}
            onChange={(type) => changeKind({ type })}
            options={(['compound', 'isolation'] as const).map((v) => ({ value: v, label: EXERCISE_TYPE_LABELS[v] }))}
          />
        </Field>

        <Field label="Zona del corpo" hint="Serve a proporre l'incremento predefinito.">
          <Segmented
            value={draft.bodyRegion}
            onChange={(bodyRegion: BodyRegion) => {
              touch('bodyRegion');
              const next = { ...draft, bodyRegion };
              if (isNew && !touched.has('incrementKg')) {
                next.incrementKg = defaultIncrementFor(draft.type, bodyRegion, settings);
              }
              setDraft(next);
            }}
            options={(['upper', 'lower'] as const).map((v) => ({ value: v, label: BODY_REGION_LABELS[v] }))}
          />
        </Field>

        <Toggle
          checked={draft.isBodyweight}
          onChange={(v) => set('isBodyweight', v)}
          label="Corpo libero"
          description="Il carico indica solo la zavorra (0 = senza zavorra)."
        />

        <Field label="Serie previste">
          <Stepper label="Serie" value={draft.targetSets} step={1} min={1} max={10} inputMode="numeric"
            onChange={(v) => set('targetSets', Math.round(v))} />
        </Field>

        <Field label="Range di ripetizioni">
          <div className="grid grid-cols-2 gap-2">
            <Stepper
              label="Minimo"
              unit="minimo"
              value={draft.repMin}
              step={1}
              min={1}
              max={50}
              inputMode="numeric"
              onChange={(v) => {
                const repMin = Math.round(v);
                setDraft({ ...draft, repMin, repMax: Math.max(draft.repMax, repMin) });
              }}
            />
            <Stepper
              label="Massimo"
              unit="massimo"
              value={draft.repMax}
              step={1}
              min={1}
              max={50}
              inputMode="numeric"
              onChange={(v) => {
                const repMax = Math.round(v);
                setDraft({ ...draft, repMax, repMin: Math.min(draft.repMin, repMax) });
              }}
            />
          </div>
        </Field>

        <Field label="Incremento di carico" hint="Di quanto aumentare quando raggiungi il massimo in tutte le serie.">
          <Stepper
            label="Incremento"
            unit="kg"
            value={draft.incrementKg}
            step={0.25}
            min={0.25}
            onChange={(v) => {
              touch('incrementKg');
              set('incrementKg', v);
            }}
          />
          <Chips
            value={draft.incrementKg}
            onChange={(v) => {
              touch('incrementKg');
              set('incrementKg', v);
            }}
            options={[1, 1.25, 2, 2.5, 5].map((v) => ({ value: v, label: `${formatDecimal(v)} kg` }))}
          />
        </Field>

        <Field
          label="Arrotondamento dei carichi"
          hint="Il passo con cui puoi davvero caricare: es. 2 kg per i manubri, 5 kg per il pacco pesi."
        >
          <Chips
            value={draft.roundingStepKg ?? 0}
            onChange={(v) => set('roundingStepKg', v === 0 ? null : v)}
            options={roundingOptions}
          />
        </Field>

        <Field label="Recupero tra le serie">
          <Stepper
            label="Recupero"
            unit="min:sec"
            value={draft.restSeconds}
            step={15}
            min={15}
            max={600}
            editable={false}
            format={formatClock}
            onChange={(v) => {
              touch('restSeconds');
              set('restSeconds', v);
            }}
          />
        </Field>

        {error && <div className="rounded-2xl bg-red-500/15 p-3 text-red-300">{error}</div>}

        {!isNew && (
          <Button variant={draft.archived ? 'secondary' : 'danger'} className="w-full" onClick={toggleArchived}>
            {draft.archived ? 'Ripristina esercizio' : 'Archivia esercizio'}
          </Button>
        )}
        {!isNew && !draft.archived && (
          <p className="-mt-4 text-center text-sm text-muted">
            Un esercizio archiviato sparisce dalle schede ma resta nello storico.
          </p>
        )}
      </PageBody>

      <BottomActions>
        <Button variant="primary" size="lg" className="flex-1" onClick={save}>
          Salva
        </Button>
      </BottomActions>
    </div>
  );
}
