# Gym Tracker — istruzioni per Claude

App per registrare gli allenamenti in palestra con suggerimenti automatici di progressione.
Web app (PWA) mobile-first in italiano, installata sulla schermata Home di un **iPhone**.
I dati stanno **solo sul dispositivo** (IndexedDB): nessun server, nessun account.

Pubblicata su **https://paolos979.github.io/gym-tracker/** — repo pubblico `paolos979/gym-tracker`.

## Chi è l'utente (importante)

Paolo **non è uno sviluppatore**. Quindi:

- parla e scrivi **in italiano**, senza gergo non spiegato; i commenti nel codice sono in italiano;
- non dare per scontato niente sugli strumenti (terminale, git, GitHub);
- se serve un comando che deve lanciare lui (login, autorizzazioni), scrivi il comando esatto
  da incollare e cosa succederà passo per passo;
- usa un **iPhone**: vedi «Limiti di iOS» sotto.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Avvia in locale su http://localhost:5173 |
| `npm test` | Esegue tutti i test (134, tutti devono passare) |
| `npm run test:watch` | Test a ogni salvataggio |
| `npx tsc -b` | Controllo dei tipi |
| `npm run lint` | oxlint (deve uscire senza avvisi) |
| `npm run build` | Tipi + versione di produzione in `dist/` |
| `npm run preview` | Prova `dist/` in locale, con funzionamento offline |
| `npm run icons` | Rigenera le icone PNG da `public/icon.svg` |

**Prima di dire che una modifica è finita**: `npm test` + `npx tsc -b` + `npm run lint`, e per le
modifiche all'interfaccia guardala davvero nel browser a larghezza telefono (~400px).

## Pubblicare

`git push` sul ramo `main` → GitHub Actions esegue i test e, **solo se passano**, aggiorna il sito
(`.github/workflows/deploy.yml`, 1-2 minuti). L'app installata sull'iPhone si aggiorna da sola alla
riapertura successiva. Dopo un push, controlla l'esito con `gh run watch <id>`.

Il percorso di pubblicazione è `/gym-tracker/`: in `vite.config.ts` arriva dalla variabile
`BASE_PATH`, impostata dal workflow. In locale resta `/`.

## Stack

Vite + React + TypeScript · Tailwind CSS v4 (tema in `src/index.css`) · Dexie (IndexedDB) ·
react-router (**HashRouter**: indirizzi tipo `#/storico`, necessari su GitHub Pages) ·
vite-plugin-pwa (offline) · Vitest. Grafici fatti a mano in SVG, nessuna libreria.

## Struttura e regole di dipendenza

```
src/
  domain/      logica pura: niente database, niente React. Qui va la logica da testare.
    types.ts             modello dati (Exercise, WorkoutTemplate, Session, ExerciseLog, SetEntry, Settings)
    defaults.ts          valori predefiniti, etichette italiane dei gruppi muscolari
    format.ts            formattazione (kg con la virgola, date, durate, orologio del timer)
    session.ts           operazioni sulle serie durante l'allenamento
    stats.ts             1RM stimato (Epley), andamento, record, conteggi
    backup.ts            formato del file JSON e controllo campo per campo
    exerciseCatalog.ts   libreria di 61 esercizi pronti
    progression/         ★ LA PARTE PIÙ IMPORTANTE (vedi sotto)
  db/          accesso a IndexedDB con Dexie; ogni funzione accetta un database come ultimo
               parametro (`database: GymDatabase = db`) così i test usano un database finto.
  components/  pezzi di interfaccia riusabili (ui.tsx, layout.tsx, icons.tsx, chart/)
  hooks/       useNow, useSettings, useWakeLock
  features/    le pagine, una cartella per area (home, session, history, exercises,
               templates, settings, manage, backup, timer)
```

Direzione delle dipendenze: `features → hooks/components → db → domain`. **Il contrario mai**:
`domain/` non importa nulla da `db/` o da React.

## La logica di progressione

`src/domain/progression/` — doppia progressione. Ordine delle regole (la prima che si applica vince):

1. nessuno storico → «prima volta», nessun carico suggerito
2. sotto il minimo del range per 3 sessioni di fila → **scarico** −10% arrotondato
3. almeno una serie sotto il minimo → **mantieni** il carico
4. tutte le serie al massimo del range → **aumenta** il carico e riparti dal minimo
5. dentro al range → **mantieni** e +1 ripetizione alle serie non al massimo
   (+ avviso se l'RPE medio è ≤ 7: «potresti già aumentare»)

| File | Contenuto |
|---|---|
| `config.ts` | le soglie: 3 sessioni, −10%, RPE ≤ 7 |
| `rounding.ts` | arrotondamento ai carichi realmente caricabili |
| `analyze.ts` | analisi di una sessione passata e conteggio delle sessioni sotto il minimo |
| `suggest.ts` | le regole (`suggestNextSession`) |
| `messages.ts` | tutte le frasi mostrate all'utente |

Per cambiare un comportamento: modifica il file giusto e **aggiorna o aggiungi un test** in
`suggest.test.ts`. Ogni regola ha già il suo blocco `describe`.

Dettagli decisi con l'utente, da non "semplificare" per sbaglio:

- contano solo le serie al **carico più alto**, al massimo quante sono le serie previste; se sono
  meno del previsto il carico **non** aumenta;
- le serie di **riscaldamento** e quelle non spuntate non contano;
- il conteggio per lo scarico si azzera con una sessione riuscita **o** quando il carico scende
  (segno che uno scarico c'è già stato);
- l'RPE medio usa solo le serie in cui è stato inserito; nessun avviso se mancano serie;
- **corpo libero**: il carico è la zavorra; a 0 kg non si può scaricare, si suggerisce una variante.

## Modello dati: due cose da sapere

- Ogni `ExerciseLog` contiene una **copia** degli obiettivi di allora (`target`): le sessioni passate
  restano valutate con il range che avevano. Non sostituirla con una lettura dell'esercizio attuale.
- Gli indici di IndexedDB sono in `src/db/database.ts`. Per aggiungere una tabella o un indice
  **non toccare `version(1)`/`version(2)`**: aggiungi un nuovo blocco `this.version(3).stores({...})`,
  altrimenti i dati già sul telefono si rompono. I booleani non sono indicizzabili.

## Attività ricorrenti

- **Aggiungere un esercizio alla libreria**: una riga in `src/domain/exerciseCatalog.ts` (i commenti
  in cima spiegano i campi). I test controllano coerenza e nomi doppi. Ricorda: passo 2 kg per i
  manubri, 2,5 kg per cavi/piastre piccole, 5 kg per pressa e macchine grandi.
- **Cambiare i dati creati al primo avvio**: `src/db/seed.ts` (usa i codici della libreria). Vale
  **solo** per chi installa da zero: per chi ha già l'app serve la libreria in Gestione → Esercizi.
- **Aggiungere un campo alle impostazioni**: `Settings` in `types.ts` + `DEFAULT_SETTINGS` in
  `defaults.ts`; `getSettings` completa già i campi mancanti sui dati vecchi.
- **Toccare il backup**: se cambia il modello dati, aggiorna `parseBackup` in `domain/backup.ts`
  e i suoi test; alza `BACKUP_VERSION` solo se il formato diventa incompatibile.

## Limiti di iOS (già affrontati, non reintrodurre i problemi)

- **Niente vibrazione** e, a schermo bloccato, l'app è sospesa e il timer non può suonare: per
  questo il timer salva l'**ora di fine** (non conta i secondi) e c'è lo «schermo sempre acceso»
  (`useWakeLock`). Non esistono notifiche programmate senza un server.
- L'audio parte solo dopo un tocco: `unlockAudio()` viene chiamata quando si spunta una serie.
- Il **pannello Condividi** (esportazione backup) si apre solo se parte subito dal tocco: i dati da
  esportare sono già pronti prima del clic (`useLiveQuery` in `BackupPage.tsx`). Non inserire attese
  prima di `navigator.share`.
- I campi di testo hanno `font-size: 16px` minimo, altrimenti Safari fa zoom.
- Lo `Stepper` si **svuota** al tocco mostrando il valore attuale in grigio: la selezione automatica
  del testo su iPhone non è affidabile (scrivendo "60" usciva "600").
- L'app installata dalla schermata Home ha dati propri, separati da quelli della scheda di Safari.

## Convenzioni di interfaccia

Tema scuro, un pollice, pulsanti alti almeno 44-48px, testi e messaggi in italiano con il «tu».
Colori come classi Tailwind (`bg-surface`, `text-muted`, `text-accent`…) definite in `index.css`;
niente colori scritti a mano nei componenti, tranne i due colori delle serie dei grafici in
`components/chart/colors.ts` (verificati per il daltonismo: se li cambi, ricontrollali).
Nei grafici: un solo asse Y per unità di misura, legenda quando ci sono 2 serie, i valori
compaiono in una fascia **sopra** il grafico (sul telefono il dito copre il punto toccato).

## Stato del progetto

Fasi completate: modello dati e progressione con test · allenamento con timer e PWA offline ·
storico con grafici · backup JSON · pubblicazione · libreria esercizi.

Da verificare sull'iPhone di Paolo (non verificabile dal computer): suono di fine recupero,
schermo sempre acceso, esportazione del backup con il pannello Condividi.

Idee proposte e rimandate, in attesa del primo collaudo in palestra: note per allenamento ed
esercizio, modificare la scheda durante l'allenamento (aggiungere/saltare/riordinare), allenamento
libero senza scheda, riscaldamento suggerito in percentuale, grafico del volume per gruppo
muscolare.
