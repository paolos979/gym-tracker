/**
 * SALVATAGGIO E LETTURA DI FILE
 *
 * Su iPhone il modo più affidabile per salvare un file è il pannello
 * "Condividi" (da lì: "Salva su File", AirDrop, Mail…). Dove non è
 * disponibile, il file viene scaricato normalmente.
 */

const LAST_BACKUP_KEY = 'gym.lastBackupAt';

export type DeliveryResult = 'shared' | 'downloaded' | 'cancelled';

export async function deliverJsonFile(fileName: string, content: string): Promise<DeliveryResult> {
  const file = new File([content], fileName, { type: 'application/json' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return 'shared';
    } catch (error) {
      // L'utente ha chiuso il pannello: nessun errore da mostrare.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Altri problemi: si prova con il download.
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

/** Data dell'ultimo backup esportato da questo dispositivo (null se mai). */
export function getLastBackupAt(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

export function setLastBackupAt(iso: string): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, iso);
  } catch {
    // Non indispensabile.
  }
}
