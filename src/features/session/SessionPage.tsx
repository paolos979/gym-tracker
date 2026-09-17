/**
 * PAGINA DELL'ALLENAMENTO IN CORSO
 *
 * Un esercizio alla volta; in alto le "pillole" per saltare da uno all'altro.
 * L'esercizio mostrato è salvato nell'indirizzo (?e=2), così resta lo stesso
 * anche se l'app viene ricaricata.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { IconCheck, IconChevronLeft, IconChevronRight } from '../../components/icons';
import { ConfirmDialog, PageHeader } from '../../components/layout';
import { Button } from '../../components/ui';
import { db } from '../../db/database';
import { deleteSession, finishSession, getSessionLogs, saveLogSets } from '../../db/sessions';
import { formatDuration } from '../../domain/format';
import { countPendingSets, finishWarning, setProgress } from '../../domain/session';
import type { Exercise, SetEntry } from '../../domain/types';
import { useNow } from '../../hooks/useNow';
import { useSettings } from '../../hooks/useSettings';
import { useWakeLock } from '../../hooks/useWakeLock';
import { RestTimerBar } from '../timer/RestTimerBar';
import { unlockAudio } from '../timer/sound';
import { useRestTimer } from '../timer/timerContext';
import { ExerciseCard } from './ExerciseCard';

export function SessionPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const settings = useSettings();
  const timer = useRestTimer();

  // `?? null` distingue "non trovato" (null) da "sto caricando" (undefined).
  const session = useLiveQuery(async () => (await db.sessions.get(id)) ?? null, [id]);
  const logs = useLiveQuery(() => getSessionLogs(id), [id]);
  const exercises = useLiveQuery(async () => {
    if (!logs) return undefined;
    const list = await db.exercises.bulkGet(logs.map((l) => l.exerciseId));
    return new Map(list.filter((e): e is Exercise => !!e).map((e) => [e.id, e]));
  }, [logs?.map((l) => l.exerciseId).join()]);

  /*
   * Copia locale delle serie modificate: lo schermo si aggiorna subito
   * a ogni tocco, mentre il salvataggio nel database avviene in parallelo.
   * Evita di "perdere" tocchi molto rapidi sui pulsanti +/-.
   */
  const [localSets, setLocalSets] = useState<Record<string, SetEntry[]>>({});

  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isActive = session?.finishedAt === null;
  useWakeLock(isActive && (settings?.keepScreenAwake ?? true));

  const chipsRef = useRef<HTMLDivElement>(null);
  const count = logs?.length ?? 0;
  const index = Math.min(Math.max(0, Number(params.get('e')) || 0), Math.max(0, count - 1));

  // Porta in vista la "pillola" dell'esercizio corrente.
  useEffect(() => {
    chipsRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [index]);

  if (session === null) return <Navigate to="/" replace />;
  if (session && session.finishedAt !== null) return <Navigate to={`/sessione/${id}/riepilogo`} replace />;
  if (!session || !logs) return null;

  const setsOf = (logId: string, fallback: SetEntry[]) => localSets[logId] ?? fallback;
  const currentLog = logs[index];

  const goTo = (i: number) => {
    setParams({ e: String(i) }, { replace: true });
    window.scrollTo({ top: 0 });
  };

  const changeSets = (logId: string, sets: SetEntry[]) => {
    setLocalSets((prev) => ({ ...prev, [logId]: sets }));
    void saveLogSets(logId, sets);
  };

  const pending = countPendingSets(logs.map((l) => ({ ...l, sets: setsOf(l.id, l.sets) })));

  const finish = async () => {
    await finishSession(id);
    timer.stop();
    navigate(`/sessione/${id}/riepilogo`, { replace: true });
  };

  const discard = async () => {
    await deleteSession(id);
    timer.stop();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-dvh pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <PageHeader
        back="/"
        title={session.templateName}
        subtitle={<Elapsed startedAt={session.startedAt} />}
        right={
          <Button variant="primary" onClick={() => setConfirmFinish(true)}>
            Termina
          </Button>
        }
      />

      {/* Pillole degli esercizi */}
      <div ref={chipsRef} className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
        {logs.map((log, i) => {
          const { done, total } = setProgress(setsOf(log.id, log.sets));
          const complete = total > 0 && done === total;
          return (
            <button
              key={log.id}
              type="button"
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold whitespace-nowrap ${
                i === index ? 'bg-text text-bg' : complete ? 'bg-accent/15 text-accent' : 'bg-surface-2 text-muted'
              }`}
            >
              {complete && <IconCheck size={16} />}
              {exercises?.get(log.exerciseId)?.name ?? 'Esercizio'}
              <span className="opacity-70">
                {done}/{total}
              </span>
            </button>
          );
        })}
      </div>

      <main className="mx-auto max-w-xl space-y-4 px-4">
        {currentLog && (
          <ExerciseCard
            key={currentLog.id}
            log={{ ...currentLog, sets: setsOf(currentLog.id, currentLog.sets) }}
            exercise={exercises?.get(currentLog.exerciseId)}
            onSetsChange={(sets) => changeSets(currentLog.id, sets)}
            onSetCompleted={(restSeconds, name) => {
              unlockAudio();
              timer.start(restSeconds, name);
            }}
          />
        )}

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button size="lg" disabled={index === 0} onClick={() => goTo(index - 1)}>
            <IconChevronLeft size={22} /> Precedente
          </Button>
          {index < count - 1 ? (
            <Button size="lg" onClick={() => goTo(index + 1)}>
              Successivo <IconChevronRight size={22} />
            </Button>
          ) : (
            <Button size="lg" variant="primary" onClick={() => setConfirmFinish(true)}>
              Termina
            </Button>
          )}
        </div>

        <div className="pt-6 text-center">
          <Button variant="ghost" onClick={() => setConfirmDiscard(true)}>
            Annulla allenamento
          </Button>
        </div>
      </main>

      <RestTimerBar />

      <ConfirmDialog
        open={confirmFinish}
        title="Terminare l'allenamento?"
        message={finishWarning(pending)}
        confirmLabel="Termina"
        onConfirm={finish}
        onCancel={() => setConfirmFinish(false)}
      />
      <ConfirmDialog
        open={confirmDiscard}
        title="Annullare l'allenamento?"
        message="L'allenamento e tutte le serie inserite verranno eliminati. Non si può tornare indietro."
        confirmLabel="Elimina"
        danger
        onConfirm={discard}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>
  );
}

/** Tempo trascorso dall'inizio, aggiornato ogni 30 secondi. */
function Elapsed({ startedAt }: { startedAt: string }) {
  const now = useNow(30_000);
  return <>{formatDuration(now - new Date(startedAt).getTime())}</>;
}
