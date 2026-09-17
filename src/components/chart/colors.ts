/**
 * COLORI DEI GRAFICI
 *
 * Le due serie usano i primi due colori di una palette verificata per il tema
 * scuro (blu e arancione): distinguibili anche da chi ha difficoltà a
 * distinguere i colori (daltonismo) e leggibili sullo sfondo delle schede.
 * Se li cambi, mantieni colori molto diversi tra loro per luminosità e tinta.
 */
export const SERIES_COLORS = {
  primary: '#3987e5', // blu: 1RM stimato / ripetizioni migliori
  secondary: '#d95926', // arancione: carico massimo / zavorra
};

/** Griglia, assi e testi: discreti, per lasciare in evidenza i dati. */
export const CHART_CHROME = {
  surface: '#15181d', // come bg-surface (serve per l'anello attorno ai pallini)
  grid: '#232830',
  baseline: '#343b45',
  crosshair: '#6b7480',
  mutedText: '#9aa3ad',
  text: '#e8eaed',
};
