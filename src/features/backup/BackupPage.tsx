/**
 * BACKUP: esporta, importa e ripristina i dati.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { ConfirmDialog, PageBody, PageHeader } from '../../components/layout';
import { Button, Card } from '../../components/ui';
import { exportBackup, getSnapshot, importBackup, restoreSnapshot } from '../../db/backup';
import { getActiveSession } from '../../db/sessions';
import {
  BackupError,
  backupFileName,
  buildBackup,
  describeBackup,
  parseBackup,
  type BackupFile,
} from '../../domain/backup';
import { formatRelativeDay, formatTime } from '../../domain/format';
import { useRestTimer } from '../timer/timerContext';
import { deliverJsonFile, getLastBackupAt, setLastBackupAt } from './fileTransfer';

type Message = { kind: 'ok' | 'error'; text: string } | null;

export function BackupPage() {
  const timer = useRestTimer();
  const fileInput = useRef<HTMLInputElement>(null);

  const snapshot = useLiveQuery(() => getSnapshot());
  const active = useLiveQuery(() => getActiveSession());
  /*
   * Dati sempre pronti per l'esportazione: su iPhone il pannello "Condividi"
   * si apre solo se parte SUBITO dal tocco, senza attese intermedie.
   */
  const ready = useLiveQuery(() => exportBackup());
  const current = ready ? describeBackup(ready.data) : undefined;

  const [lastBackupAt, setLastBackup] = useState(getLastBackupAt);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const doExport = async () => {
    if (!ready) return;
    setBusy(true);
    setMessage(null);
    try {
      const backup = buildBackup(ready.data);
      const result = await deliverJsonFile(backupFileName(), JSON.stringify(backup, null, 2));
      if (result !== 'cancelled') {
        setLastBackupAt(backup.exportedAt);
        setLastBackup(backup.exportedAt);
        setMessage({
          kind: 'ok',
          text:
            result === 'shared'
              ? 'Backup pronto. Se hai scelto «Salva su File», lo trovi nell\'app File.'
              : 'Backup scaricato.',
        });
      }
    } catch {
      setMessage({ kind: 'error', text: 'Esportazione non riuscita. Riprova.' });
    } finally {
      setBusy(false);
    }
  };

  const onFileChosen = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = ''; // permette di scegliere di nuovo lo stesso file
    if (!file) return;
    setMessage(null);
    try {
      setPending(parseBackup(await file.text()));
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof BackupError ? error.message : 'Impossibile leggere il file.',
      });
    }
  };

  const doImport = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await importBackup(pending);
      timer.stop();
      setMessage({ kind: 'ok', text: `Importazione completata: ${describeBackup(pending.data)}.` });
    } catch {
      setMessage({ kind: 'error', text: 'Importazione non riuscita: i tuoi dati non sono stati modificati.' });
    } finally {
      setPending(null);
      setBusy(false);
    }
  };

  const doRestore = async () => {
    setConfirmRestore(false);
    setBusy(true);
    try {
      await restoreSnapshot();
      timer.stop();
      setMessage({ kind: 'ok', text: 'Dati ripristinati.' });
    } catch {
      setMessage({ kind: 'error', text: 'Ripristino non riuscito: i tuoi dati non sono stati modificati.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader back="/gestione" title="Backup" />
      <PageBody>
        {message && (
          <div
            role="status"
            className={`rounded-2xl p-3 ${message.kind === 'ok' ? 'bg-accent/15 text-accent' : 'bg-red-500/15 text-red-300'}`}
          >
            {message.text}
          </div>
        )}

        <Card className="space-y-3">
          <h2 className="text-lg font-bold">Esporta</h2>
          <p className="text-sm text-muted">
            Crea un file con tutti i tuoi dati ({current ?? '…'}). Conservalo fuori dal telefono, ad esempio su
            iCloud Drive: se perdi o cambi telefono potrai reimportarlo.
          </p>
          <p className="text-sm">
            Ultimo backup:{' '}
            <strong>
              {lastBackupAt ? `${formatRelativeDay(lastBackupAt)} alle ${formatTime(lastBackupAt)}` : 'mai'}
            </strong>
          </p>
          <Button variant="primary" size="lg" className="w-full" disabled={busy || !ready} onClick={doExport}>
            Esporta backup
          </Button>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-bold">Importa</h2>
          <p className="text-sm text-muted">
            Sostituisce <strong className="text-text">tutti</strong> i dati attuali con quelli del file. Prima
            dell'importazione l'app salva una copia dei dati attuali su questo telefono.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onFileChosen(e.target.files?.[0])}
          />
          <Button size="lg" className="w-full" disabled={busy} onClick={() => fileInput.current?.click()}>
            Scegli file di backup…
          </Button>
        </Card>

        {snapshot && (
          <Card className="space-y-3">
            <h2 className="text-lg font-bold">Copia automatica</h2>
            <p className="text-sm text-muted">
              Dati com'erano prima dell'ultima importazione o dell'ultimo ripristino ({formatRelativeDay(snapshot.createdAt)} alle{' '}
              {formatTime(snapshot.createdAt)}): {describeBackup(snapshot.backup.data)}.
            </p>
            <Button size="lg" className="w-full" disabled={busy} onClick={() => setConfirmRestore(true)}>
              Ripristina questa copia
            </Button>
          </Card>
        )}
      </PageBody>

      <ConfirmDialog
        open={pending !== null}
        title="Importare il backup?"
        message={
          pending && (
            <>
              <p>
                Il file (creato {formatRelativeDay(pending.exportedAt)} alle {formatTime(pending.exportedAt)}) contiene{' '}
                {describeBackup(pending.data)}.
              </p>
              <p className="mt-2">
                I dati attuali ({current}) verranno sostituiti.
                {active && ' Anche l\'allenamento in corso verrà sostituito.'}
              </p>
            </>
          )
        }
        confirmLabel="Importa"
        danger
        onConfirm={doImport}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={confirmRestore}
        title="Ripristinare la copia?"
        message="I dati attuali verranno sostituiti con la copia. Potrai comunque tornare indietro: i dati attuali diventano la nuova copia."
        confirmLabel="Ripristina"
        danger
        onConfirm={doRestore}
        onCancel={() => setConfirmRestore(false)}
      />
    </>
  );
}
