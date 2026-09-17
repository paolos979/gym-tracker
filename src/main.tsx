/**
 * AVVIO DELL'APP
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { seedOnFirstLaunch } from './db/seed';
import './index.css';

async function bootstrap() {
  // Al primo avvio crea esercizi e schede di esempio.
  try {
    await seedOnFirstLaunch();
  } catch (error) {
    console.error('Impossibile creare i dati di esempio', error);
  }

  // Chiede al browser di non cancellare mai i dati salvati (se lo permette).
  void navigator.storage?.persist?.().catch(() => undefined);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
