/**
 * GRAFICO A LINEE (SVG, senza librerie esterne)
 *
 * - asse X = date (spaziate in proporzione al tempo trascorso)
 * - un solo asse Y: tutte le serie devono avere la stessa unità (es. kg)
 * - tocca o trascina il dito sul grafico per vedere i valori di una data
 *   (su computer: passa col mouse, oppure usa le frecce dopo averlo selezionato)
 */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { CHART_CHROME } from './colors';
import { formatTimeTick, nearestIndex, niceScale, timeTicks } from './scale';

export interface ChartSeries {
  id: string;
  label: string;
  /** Colore della linea (mai usato per i testi). */
  color: string;
  /** Punti ordinati per data: x = millisecondi, y = valore. */
  points: { x: number; y: number }[];
}

interface LineChartProps {
  series: ChartSeries[];
  /** Descrizione per i lettori di schermo. */
  ariaLabel: string;
  /** Formato dei valori (asse Y, etichette, riquadro). */
  formatValue: (value: number) => string;
  /** Formato della data nel riquadro dei valori. */
  formatDate: (ms: number) => string;
  /** Altezza totale, assi compresi. */
  height?: number;
}

const MARGIN = { top: 16, right: 48, bottom: 28, left: 40 };
/** Sopra questo numero di punti si disegna solo il pallino finale. */
const MAX_MARKERS = 24;
/** Distanza minima tra le etichette di fine linea; sotto, si tolgono (restano legenda e riquadro). */
const MIN_LABEL_GAP = 16;

export function LineChart({ series, ariaLabel, formatValue, formatDate, height = 240 }: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(containerRef);
  const [active, setActive] = useState<number | null>(null);

  // Tutte le date presenti, ordinate e senza doppioni.
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b);
  const ys = series.flatMap((s) => s.points.map((p) => p.y));

  if (xs.length === 0 || width === 0) {
    // Stessa altezza del grafico finale (fascia dei valori compresa): niente salti di impaginazione.
    return <div ref={containerRef} style={{ height: height + 52 }} />;
  }

  const plotW = Math.max(1, width - MARGIN.left - MARGIN.right);
  const plotH = height - MARGIN.top - MARGIN.bottom;
  const xMin = xs[0];
  const xMax = xs[xs.length - 1];
  const yScale = niceScale(Math.min(...ys), Math.max(...ys), 4);

  const xPos = (x: number) => MARGIN.left + (xMax === xMin ? plotW / 2 : ((x - xMin) / (xMax - xMin)) * plotW);
  const yPos = (y: number) => MARGIN.top + plotH - ((y - yScale.min) / (yScale.max - yScale.min || 1)) * plotH;

  // Etichette di fine linea: solo se non si sovrappongono.
  const ends = series
    .filter((s) => s.points.length > 0)
    .map((s) => ({ s, last: s.points[s.points.length - 1] }));
  const endYs = ends.map((e) => yPos(e.last.y)).sort((a, b) => a - b);
  const showEndLabels = endYs.every((y, i) => i === 0 || y - endYs[i - 1] >= MIN_LABEL_GAP);

  const activeX = active !== null ? xs[active] : null;

  const pick = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Il rettangolo sensibile parte 12px prima dell'area del grafico.
    const px = e.clientX - rect.left + MARGIN.left - 12;
    const positions = xs.map(xPos);
    setActive(nearestIndex(positions, px));
  };

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowLeft') setActive((i) => Math.max(0, (i ?? xs.length) - 1));
    else if (e.key === 'ArrowRight') setActive((i) => Math.min(xs.length - 1, (i ?? -1) + 1));
    else if (e.key === 'Escape') setActive(null);
    else return;
    e.preventDefault();
  };

  return (
    <div ref={containerRef} className="select-none">
      <Readout series={series} activeX={activeX} formatValue={formatValue} formatDate={formatDate} />
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((i) => i ?? xs.length - 1)}
        onBlur={() => setActive(null)}
        className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {/* Griglia orizzontale ed etichette dell'asse Y */}
        {yScale.ticks.map((t, i) => (
          <g key={t}>
            <line
              x1={MARGIN.left}
              x2={MARGIN.left + plotW}
              y1={yPos(t)}
              y2={yPos(t)}
              stroke={i === 0 ? CHART_CHROME.baseline : CHART_CHROME.grid}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
            <text
              x={MARGIN.left - 8}
              y={yPos(t)}
              dy="0.32em"
              textAnchor="end"
              fontSize={11}
              fill={CHART_CHROME.mutedText}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatValue(t)}
            </text>
          </g>
        ))}

        {/* Etichette dell'asse X */}
        {timeTicks(xMin, xMax, plotW < 260 ? 3 : 4).map((t, i, all) => (
          <text
            key={t}
            x={xMax === xMin ? xPos(xMin) : Math.min(Math.max(xPos(t), MARGIN.left), MARGIN.left + plotW)}
            y={height - 8}
            textAnchor={all.length === 1 ? 'middle' : i === 0 ? 'start' : i === all.length - 1 ? 'end' : 'middle'}
            fontSize={11}
            fill={CHART_CHROME.mutedText}
          >
            {formatTimeTick(t, xMax - xMin)}
          </text>
        ))}

        {/* Linea verticale del punto selezionato */}
        {activeX !== null && (
          <line
            x1={xPos(activeX)}
            x2={xPos(activeX)}
            y1={MARGIN.top}
            y2={MARGIN.top + plotH}
            stroke={CHART_CHROME.crosshair}
            strokeWidth={1}
            shapeRendering="crispEdges"
          />
        )}

        {/* Linee e pallini delle serie */}
        {series.map((s) => {
          const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xPos(p.x)},${yPos(p.y)}`).join(' ');
          const markers = s.points.length <= MAX_MARKERS ? s.points : s.points.slice(-1);
          return (
            <g key={s.id}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {markers.map((p) => (
                <circle
                  key={p.x}
                  cx={xPos(p.x)}
                  cy={yPos(p.y)}
                  r={p.x === activeX ? 5.5 : 4}
                  fill={s.color}
                  stroke={CHART_CHROME.surface}
                  strokeWidth={2}
                />
              ))}
              {activeX !== null && s.points.length > MAX_MARKERS && (
                <ActiveDot series={s} x={activeX} xPos={xPos} yPos={yPos} />
              )}
            </g>
          );
        })}

        {/* Valori a fine linea */}
        {showEndLabels &&
          ends.map(({ s, last }) => (
            <text
              key={s.id}
              x={xPos(last.x) + 9}
              y={yPos(last.y)}
              dy="0.32em"
              fontSize={12}
              fontWeight={600}
              fill={CHART_CHROME.text}
            >
              {formatValue(last.y)}
            </text>
          ))}

        {/* Area sensibile al tocco (più grande delle linee) */}
        <rect
          x={MARGIN.left - 12}
          y={0}
          width={plotW + 24}
          height={MARGIN.top + plotH + 8}
          fill="transparent"
          style={{ touchAction: 'pan-y', cursor: 'crosshair' }}
          onPointerDown={pick}
          onPointerMove={(e) => (e.pointerType === 'mouse' || e.buttons > 0 ? pick(e) : undefined)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
        />
      </svg>

    </div>
  );
}

/**
 * Fascia fissa sopra il grafico con i valori della data selezionata.
 * Sta sopra e non sul grafico: su telefono il dito copre già la zona toccata.
 */
function Readout({
  series,
  activeX,
  formatValue,
  formatDate,
}: {
  series: ChartSeries[];
  activeX: number | null;
  formatValue: (value: number) => string;
  formatDate: (ms: number) => string;
}) {
  return (
    <div className="min-h-12 px-1 pb-1" aria-live="polite">
      {activeX === null ? (
        <div className="pt-3 text-xs text-muted">Tocca o trascina sul grafico per vedere i valori.</div>
      ) : (
        <>
          <div className="text-xs text-muted">{formatDate(activeX)}</div>
          <div className="flex flex-wrap gap-x-4">
            {series.map((s) => {
              const point = s.points.find((p) => p.x === activeX);
              if (!point) return null;
              return (
                <span key={s.id} className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="font-bold">{formatValue(point.y)}</span>
                  <span className="text-xs text-muted">{s.label}</span>
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ActiveDot({
  series,
  x,
  xPos,
  yPos,
}: {
  series: ChartSeries;
  x: number;
  xPos: (x: number) => number;
  yPos: (y: number) => number;
}) {
  const point = series.points.find((p) => p.x === x);
  if (!point) return null;
  return (
    <circle cx={xPos(point.x)} cy={yPos(point.y)} r={5.5} fill={series.color} stroke={CHART_CHROME.surface} strokeWidth={2} />
  );
}

/** Legenda: una linea colorata accanto a ogni nome (il testo resta nel colore normale). */
export function ChartLegend({ series }: { series: Pick<ChartSeries, 'id' | 'label' | 'color'>[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
      {series.map((s) => (
        <span key={s.id} className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/** Larghezza di un elemento, aggiornata quando cambia (es. rotazione del telefono). */
function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}
