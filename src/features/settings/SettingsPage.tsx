/**
 * IMPOSTAZIONI
 * Ogni modifica viene salvata subito.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { PageBody, PageHeader } from '../../components/layout';
import { Chips, Field, Stepper, Toggle } from '../../components/ui';
import { saveSettings } from '../../db/settings';
import { formatClock, formatDecimal } from '../../domain/format';
import type { Settings } from '../../domain/types';
import { useSettings } from '../../hooks/useSettings';

export function SettingsPage() {
  const settings = useSettings();
  const persisted = usePersistedStorage();

  if (!settings) return null;

  const update = (patch: Partial<Settings>) => void saveSettings({ ...settings, ...patch });
  const inc = settings.defaultIncrementsKg;
  const rest = settings.defaultRestSeconds;

  return (
    <>
      <PageHeader back="/gestione" title="Impostazioni" />
      <PageBody className="space-y-6">
        <Field
          label="Arrotondamento predefinito"
          hint="Vale per gli esercizi che non hanno un arrotondamento proprio."
        >
          <Chips
            value={settings.defaultRoundingStepKg}
            onChange={(v) => update({ defaultRoundingStepKg: v })}
            options={[0.5, 1, 1.25, 2, 2.5, 5].map((v) => ({ value: v, label: `${formatDecimal(v)} kg` }))}
          />
        </Field>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">Incrementi proposti per i nuovi esercizi</h2>
          <LabeledStepper label="Multiarticolari parte superiore">
            <Stepper label="Multiarticolari superiore" unit="kg" value={inc.compoundUpper} step={0.25} min={0.25}
              onChange={(v) => update({ defaultIncrementsKg: { ...inc, compoundUpper: v } })} />
          </LabeledStepper>
          <LabeledStepper label="Multiarticolari parte inferiore">
            <Stepper label="Multiarticolari inferiore" unit="kg" value={inc.compoundLower} step={0.25} min={0.25}
              onChange={(v) => update({ defaultIncrementsKg: { ...inc, compoundLower: v } })} />
          </LabeledStepper>
          <LabeledStepper label="Isolamento">
            <Stepper label="Isolamento" unit="kg" value={inc.isolation} step={0.25} min={0.25}
              onChange={(v) => update({ defaultIncrementsKg: { ...inc, isolation: v } })} />
          </LabeledStepper>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">Recupero proposto per i nuovi esercizi</h2>
          <LabeledStepper label="Multiarticolari">
            <Stepper label="Recupero multiarticolari" unit="min:sec" value={rest.compound} step={15} min={15} max={600}
              editable={false} format={formatClock}
              onChange={(v) => update({ defaultRestSeconds: { ...rest, compound: v } })} />
          </LabeledStepper>
          <LabeledStepper label="Isolamento">
            <Stepper label="Recupero isolamento" unit="min:sec" value={rest.isolation} step={15} min={15} max={600}
              editable={false} format={formatClock}
              onChange={(v) => update({ defaultRestSeconds: { ...rest, isolation: v } })} />
          </LabeledStepper>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">Durante l'allenamento</h2>
          <Toggle
            checked={settings.keepScreenAwake}
            onChange={(v) => update({ keepScreenAwake: v })}
            label="Schermo sempre acceso"
            description="Consigliato su iPhone: con lo schermo bloccato il timer non può suonare."
          />
          <Toggle
            checked={settings.timerSound}
            onChange={(v) => update({ timerSound: v })}
            label="Suono a fine recupero"
            description="Con l'iPhone in modalità silenziosa potrebbe non sentirsi."
          />
        </section>

        <section className="rounded-3xl bg-surface p-4 text-sm text-muted">
          <div className="font-semibold text-text">Dove sono i miei dati?</div>
          <p className="mt-1">
            Solo su questo dispositivo, anche senza connessione.
            {persisted === true && ' Il browser li conserva in modo permanente.'}
            {persisted === false &&
              ' Per evitare che il browser li cancelli, installa l\'app sulla schermata Home e fai backup regolari.'}
          </p>
        </section>
      </PageBody>
    </>
  );
}

function LabeledStepper({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_11rem] items-center gap-3">
      <span className="font-medium">{label}</span>
      {children}
    </div>
  );
}

/** Chiede se il browser conserva i dati in modo permanente (null = non si sa). */
function usePersistedStorage(): boolean | null {
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null));
  }, []);
  return persisted;
}
