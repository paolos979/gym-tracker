/**
 * SUONO DI FINE RECUPERO
 *
 * Su iPhone l'audio può partire solo dopo un tocco dell'utente: per questo
 * `unlockAudio()` va chiamata quando spunti una serie. Il suono vero e proprio
 * viene generato al momento (niente file audio da scaricare).
 *
 * Nota: con l'iPhone in modalità silenziosa il suono potrebbe non sentirsi.
 */

let context: AudioContext | null = null;

/** Da chiamare dentro un gestore di tocco (es. onClick). */
export function unlockAudio(): void {
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
  } catch {
    // Audio non disponibile: pazienza, resta l'avviso visivo.
  }
}

/** Tre brevi "bip". */
export function playFinishSound(): void {
  if (!context) return;
  const start = context.currentTime + 0.05;
  for (let i = 0; i < 3; i++) {
    const t = start + i * 0.22;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.value = i === 2 ? 1320 : 880;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(gain).connect(context.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  }
}
