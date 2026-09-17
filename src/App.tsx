/**
 * NAVIGAZIONE DELL'APP
 *
 * Si usa l'"hash router" (indirizzi tipo .../#/storico): funziona su qualsiasi
 * hosting statico, GitHub Pages compreso, senza configurazioni particolari.
 */
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { TabLayout } from './components/layout';
import { BackupPage } from './features/backup/BackupPage';
import { ExerciseFormPage } from './features/exercises/ExerciseFormPage';
import { ExerciseListPage } from './features/exercises/ExerciseListPage';
import { ExerciseHistoryPage } from './features/history/ExerciseHistoryPage';
import { HistoryPage } from './features/history/HistoryPage';
import { HomePage } from './features/home/HomePage';
import { ManagePage } from './features/manage/ManagePage';
import { SessionPage } from './features/session/SessionPage';
import { SummaryPage } from './features/session/SummaryPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { TemplateFormPage } from './features/templates/TemplateFormPage';
import { TemplateListPage } from './features/templates/TemplateListPage';
import { RestTimerProvider } from './features/timer/RestTimerProvider';

export default function App() {
  return (
    <HashRouter>
      <RestTimerProvider>
        <Routes>
          {/* Pagine con la barra di navigazione in basso */}
          <Route element={<TabLayout />}>
            <Route index element={<HomePage />} />
            <Route path="storico" element={<HistoryPage />} />
            <Route path="storico/esercizio/:id" element={<ExerciseHistoryPage />} />
            <Route path="gestione" element={<ManagePage />} />
            <Route path="gestione/esercizi" element={<ExerciseListPage />} />
            <Route path="gestione/schede" element={<TemplateListPage />} />
            <Route path="gestione/impostazioni" element={<SettingsPage />} />
            <Route path="gestione/backup" element={<BackupPage />} />
          </Route>

          {/* Pagine a tutto schermo */}
          <Route path="gestione/esercizi/nuovo" element={<ExerciseFormPage />} />
          <Route path="gestione/esercizi/:id" element={<ExerciseFormPage />} />
          <Route path="gestione/schede/nuova" element={<TemplateFormPage />} />
          <Route path="gestione/schede/:id" element={<TemplateFormPage />} />
          <Route path="sessione/:id" element={<SessionPage />} />
          <Route path="sessione/:id/riepilogo" element={<SummaryPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RestTimerProvider>
    </HashRouter>
  );
}
