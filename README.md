# Gym Tracker

App per registrare gli allenamenti con suggerimenti automatici di progressione
(doppia progressione). PWA mobile-first, dati salvati solo sul dispositivo.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm install` | Installa le dipendenze (solo la prima volta) |
| `npm run dev` | Avvia l'app in locale |
| `npm test` | Esegue tutti i test una volta |
| `npm run test:watch` | Riesegue i test a ogni modifica |
| `npm run build` | Controlla i tipi e crea la versione da pubblicare in `dist/` |
| `npm run preview` | Prova in locale la versione di `dist/` (con funzionamento offline) |
| `npm run icons` | Rigenera le icone PNG da `public/icon.svg` |

## Struttura

```
src/
  domain/                 Logica pura (niente database, niente interfaccia)
    types.ts              Modello dati
    defaults.ts           Valori predefiniti ed etichette in italiano
    format.ts             Formattazione (kg con la virgola, date, durate…)
    session.ts            Operazioni sulle serie durante l'allenamento
    exerciseCatalog.ts    Libreria di esercizi pronti (bilanciere, manubri, macchine, cavi…)
    stats.ts              1RM stimato (Epley), andamento, record, conteggi
    backup.ts             Formato del file di backup e controllo prima dell'importazione
    progression/          ★ Logica di progressione
      config.ts             Soglie modificabili (3 sessioni, −10%, RPE ≤ 7)
      rounding.ts           Arrotondamento dei carichi
      analyze.ts            Analisi di una sessione passata
      suggest.ts            Le regole
      messages.ts           Le frasi mostrate all'utente
  db/                     Database locale (IndexedDB con Dexie)
    database.ts           Tabelle e indici
    exercises.ts          Esercizi e schede
    sessions.ts           Avvio, salvataggio e fine degli allenamenti
    backup.ts             Esportazione, importazione e copia automatica
    history.ts            Storico e calcolo del suggerimento
    settings.ts           Impostazioni
    seed.ts               Dati di esempio al primo avvio
  components/             Pezzi di interfaccia riutilizzabili (pulsanti, stepper, intestazioni…)
    chart/                Grafico a linee, colori e calcolo degli assi
  hooks/                  Timer dell'ora attuale, schermo sempre acceso, impostazioni
  features/               Le pagine dell'app
    home/                 Allena (avvio schede)
    session/              Allenamento in corso e riepilogo
    timer/                Timer di recupero e suono
    exercises/            Elenco e modulo esercizi
    templates/            Elenco e modulo schede
    settings/             Impostazioni
    manage/               Menu Gestione
    history/              Storico, andamento per esercizio
    backup/               Pagina di backup e salvataggio dei file
  App.tsx                 Navigazione tra le pagine
  index.css               Colori del tema scuro
public/icon.svg           Icona dell'app (dopo averla cambiata: npm run icons)
```

I file `*.test.ts` accanto al codice contengono i test.

## Aggiungere esercizi alla libreria

La libreria è l'elenco di esercizi pronti che compare in **Gestione → Esercizi → «Aggiungi dalla
libreria»**. Per aggiungerne uno, copia una riga in `src/domain/exerciseCatalog.ts`: i commenti in
cima al file spiegano ogni campo. I test (`npm test`) segnalano valori incoerenti e nomi doppi.

## Modificare le regole di progressione

1. Soglie numeriche → `src/domain/progression/config.ts`
2. Regole → `src/domain/progression/suggest.ts` (l'ordine è spiegato in cima al file)
3. Testi → `src/domain/progression/messages.ts`
4. Lancia `npm test` e aggiorna i test in `suggest.test.ts` se hai cambiato un comportamento

## Backup

Da **Gestione → Backup**:

- **Esporta** crea un file `gym-backup-AAAA-MM-GG.json` con tutti i dati. Su iPhone si apre il pannello
  Condividi: scegli «Salva su File» (ad esempio su iCloud Drive).
- **Importa** sostituisce tutti i dati con quelli del file, dopo averlo controllato. Un file sbagliato
  viene rifiutato senza toccare nulla.
- Prima di ogni importazione l'app tiene una **copia automatica** dei dati precedenti, ripristinabile
  dalla stessa pagina.

## Pubblicare l'app (GitHub Pages)

La pubblicazione è automatica: a ogni invio di modifiche sul ramo `main`, GitHub esegue i test e,
se passano, aggiorna il sito (`.github/workflows/deploy.yml`).

Indirizzo dell'app: **https://paolos979.github.io/gym-tracker/**

Per pubblicare una modifica fatta sul Mac:

```bash
cd ~/Desktop/gym
git add -A
git commit -m "Descrizione della modifica"
git push
```

Dopo 1-2 minuti il sito è aggiornato (avanzamento nella scheda «Actions» del repository su GitHub).
Sul telefono l'app installata si aggiorna da sola alla riapertura successiva.

## Installare l'app su iPhone

1. Apri **https://paolos979.github.io/gym-tracker/** con **Safari** (non Chrome: solo Safari può
   installare le web app su iPhone).
2. Tocca l'icona **Condividi** (il quadrato con la freccia in alto, in basso al centro).
3. Scorri e tocca **«Aggiungi alla schermata Home»**, poi **«Aggiungi»**.
4. Avvia l'app dall'icona sulla schermata Home: parte a tutto schermo e funziona anche senza
   connessione.

Consigli:

- Apri l'app una prima volta con la connessione attiva: serve a salvare i file sul telefono.
- Usa sempre l'icona sulla schermata Home, non Safari: i dati salvati dall'app installata
  non vengono cancellati dal telefono e sono separati da quelli della scheda di Safari.
- I dati restano solo sul tuo iPhone: fai un backup di tanto in tanto (Gestione → Backup).

