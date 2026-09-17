/**
 * PAGINA "GESTIONE": accesso a esercizi, schede e impostazioni.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { IconChevronRight } from '../../components/icons';
import { PageBody, PageHeader } from '../../components/layout';
import { listExercises, listTemplates } from '../../db/exercises';
import { listFinishedSessions } from '../../db/sessions';
import { formatRelativeDay } from '../../domain/format';
import { getLastBackupAt } from '../backup/fileTransfer';

export function ManagePage() {
  const exerciseCount = useLiveQuery(async () => (await listExercises()).length);
  const templateCount = useLiveQuery(async () => (await listTemplates()).length);

  return (
    <>
      <PageHeader title="Gestione" />
      <PageBody className="space-y-2">
        <MenuLink to="/gestione/schede" title="Schede" detail={count(templateCount, 'scheda', 'schede')} />
        <MenuLink to="/gestione/esercizi" title="Esercizi" detail={count(exerciseCount, 'esercizio', 'esercizi')} />
        <MenuLink to="/gestione/impostazioni" title="Impostazioni" detail="Arrotondamento, incrementi, timer" />
        <MenuLink to="/gestione/backup" title="Backup" detail={<BackupDetail />} />
      </PageBody>
    </>
  );
}

function count(n: number | undefined, one: string, many: string): string {
  if (n === undefined) return '';
  return `${n} ${n === 1 ? one : many}`;
}

function MenuLink({ to, title, detail }: { to: string; title: string; detail: ReactNode }) {
  return (
    <Link to={to} className="flex min-h-18 items-center gap-3 rounded-3xl bg-surface px-4 py-3 active:bg-surface-2">
      <div className="flex-1">
        <div className="text-lg font-bold">{title}</div>
        <div className="text-sm text-muted">{detail}</div>
      </div>
      <IconChevronRight className="text-muted" />
    </Link>
  );
}

/** Promemoria: dopo 2 settimane senza backup (e con allenamenti registrati) lo segnala. */
function BackupDetail() {
  const sessions = useLiveQuery(async () => (await listFinishedSessions()).length);
  // Letti una sola volta all'apertura della pagina.
  const [last] = useState(getLastBackupAt);
  const [now] = useState(() => Date.now());
  const stale = !last || now - new Date(last).getTime() > 14 * 86_400_000;
  const text = last ? `Ultimo backup: ${formatRelativeDay(last)}` : 'Nessun backup ancora';
  if (stale && (sessions ?? 0) > 0) return <span className="text-amber-300">{text} · consigliato farne uno</span>;
  return <>{text}</>;
}
