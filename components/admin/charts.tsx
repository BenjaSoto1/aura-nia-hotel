// Gráficos del panel (sin librerías): marcas finas, un solo tono de Aura, tooltip al pasar el cursor
// y vista de tabla debajo de cada gráfico. El texto nunca usa el color de la serie.
import * as React from "react";

const ACCENT = "#B8623F"; // terracota: la serie
const TRACK = "#EADFC9"; // arena: fondo de barras / sin dato
// Rampa secuencial de un solo tono (claro → oscuro) para ocupación.
const RAMP = ["#F3EAE0", "#EBCDB8", "#D9A27F", "#B8623F", "#8F4528"];

function compact(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toLocaleString("en-US");
}

/** Escala "limpia" para el eje: 0 / mitad / máximo redondeado. */
function niceMax(max: number) {
  if (max <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * p;
}

export function Card({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-arena-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-oscuro">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[12px] text-gris">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Variación vs período anterior. `goodWhenUp=false` para métricas donde subir es malo (cancelaciones). */
export function Delta({ value, goodWhenUp = true, label = "vs período anterior" }: { value: number | null; goodWhenUp?: boolean; label?: string }) {
  if (value === null) return <span className="text-[11px] text-gris">nuevo · {label}</span>;
  if (value === 0) return <span className="text-[11px] text-gris">= {label}</span>;
  const up = value > 0;
  const good = up === goodWhenUp;
  return (
    <span className={`text-[11px] font-semibold ${good ? "text-bruma" : "text-laguna-600"}`}>
      {up ? "▲" : "▼"} {Math.abs(Math.round(value * 100))}% <span className="font-normal text-gris">{label}</span>
    </span>
  );
}

export function StatTile({ label, value, delta, goodWhenUp, hint }: { label: string; value: string; delta?: number | null; goodWhenUp?: boolean; hint?: string }) {
  return (
    <div className="rounded-2xl border border-arena-200 bg-white p-4">
      <div className="text-[12px] text-gris">{label}</div>
      <div className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-oscuro tabular-nums">{value}</div>
      <div className="mt-1 min-h-[16px]">{delta !== undefined ? <Delta value={delta} goodWhenUp={goodWhenUp} /> : hint ? <span className="text-[11px] text-gris">{hint}</span> : null}</div>
    </div>
  );
}

/** Columnas verticales (una serie): ≤24 px, punta redondeada, tooltip por columna, eje con valores limpios. */
export function ColumnChart({
  data,
  format = compact,
  height = 180,
  everyNthLabel = 1,
  integer = false,
}: {
  data: { key: string; label: string; value: number; tip: string }[];
  format?: (n: number) => string;
  height?: number;
  everyNthLabel?: number;
  /** Conteos: el eje usa solo enteros (máximo par, para que la mitad también sea entera). */
  integer?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const top = integer ? Math.max(2, Math.ceil(max / 2) * 2) : niceMax(max);
  const ticks = [top, top / 2, 0];
  return (
    <div>
      <div className="flex gap-2">
        <div className="flex flex-col justify-between text-right text-[10px] text-gris tabular-nums" style={{ height }}>
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
              {format(t)}
            </span>
          ))}
        </div>
        <div className="relative flex-1" style={{ height }}>
          {ticks.map((t, i) => (
            <div key={t} className="absolute inset-x-0 border-t border-[#EFE8DB]" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end">
            {data.map((d) => (
              <div key={d.key} className="group relative flex h-full flex-1 items-end justify-center px-[1px]">
                <div
                  className="w-full max-w-[24px] rounded-t-[4px] transition-opacity group-hover:opacity-80"
                  style={{ height: `${top ? (d.value / top) * 100 : 0}%`, background: ACCENT, minHeight: d.value > 0 ? 2 : 0 }}
                />
                <div className="pointer-events-none absolute bottom-full z-20 mb-1 hidden whitespace-nowrap rounded-lg bg-oscuro px-2.5 py-1.5 text-[11px] text-white shadow-lg group-hover:block">
                  {d.tip}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-8 mt-1.5 flex text-[10px] text-gris">
        {data.map((d, i) => (
          <div key={d.key} className="flex-1 text-center">
            {i % everyNthLabel === 0 ? d.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Barras horizontales (una medida): etiqueta a la izquierda, valor en la punta. */
export function BarList({ rows }: { rows: { key: string; label: React.ReactNode; value: number; display: string; tip?: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.key} className="group relative grid grid-cols-[110px_1fr] items-center gap-3" title={r.tip}>
          <div className="truncate text-[12px] text-tinta">{r.label}</div>
          <div className="flex items-center gap-2">
            <div className="h-[14px] flex-1 rounded-[4px]" style={{ background: TRACK }}>
              <div className="h-full rounded-[4px]" style={{ width: `${max ? (r.value / max) * 100 : 0}%`, background: ACCENT, minWidth: r.value > 0 ? 4 : 0 }} />
            </div>
            <div className="w-[76px] shrink-0 text-right text-[12px] font-semibold text-oscuro tabular-nums">{r.display}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Mapa de calor de ocupación (tipo de habitación × día), rampa secuencial de un tono. */
export function OccupancyHeatmap({
  rows,
  dayLabel,
}: {
  rows: { code: string; name: string; inventory: number; cells: { date: string; sold: number; inventory: number; rate: number }[] }[];
  dayLabel: (iso: string, i: number) => string;
}) {
  const step = (rate: number) => (rate <= 0 ? -1 : rate < 0.25 ? 0 : rate < 0.5 ? 1 : rate < 0.75 ? 2 : rate < 1 ? 3 : 4);
  const cols = rows[0]?.cells.length ?? 0;
  return (
    <div>
      <div className="overflow-x-auto scroll-thin">
        <div className="min-w-[640px]">
          {rows.map((r) => (
            <div key={r.code} className="mb-[2px] grid items-center gap-[2px]" style={{ gridTemplateColumns: `150px repeat(${cols}, minmax(0,1fr))` }}>
              <div className="truncate pr-2 text-[12px] text-tinta">
                {r.name} <span className="text-gris">· {r.inventory}</span>
              </div>
              {r.cells.map((c) => {
                const s = step(c.rate);
                return (
                  <div key={c.date} className="group relative h-7 rounded-[3px]" style={{ background: s < 0 ? "#F7F2EA" : RAMP[s] }}>
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-oscuro px-2.5 py-1.5 text-[11px] text-white shadow-lg group-hover:block">
                      {c.date} · {r.name}: {c.sold}/{c.inventory} ({Math.round(c.rate * 100)}%)
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div className="grid gap-[2px] pt-1 text-[10px] text-gris" style={{ gridTemplateColumns: `150px repeat(${cols}, minmax(0,1fr))` }}>
            <div />
            {rows[0]?.cells.map((c, i) => (
              <div key={c.date} className="text-center">
                {dayLabel(c.date, i)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gris">
        <span>Ocupación:</span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-[3px]" style={{ background: "#F7F2EA" }} /> 0%
        </span>
        {["1–24%", "25–49%", "50–74%", "75–99%", "Lleno"].map((l, i) => (
          <span key={l} className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-[3px]" style={{ background: RAMP[i] }} /> {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Vista de tabla accesible bajo un gráfico. */
export function TableView({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-3 text-[12px]">
      <summary className="cursor-pointer select-none text-gris hover:text-oscuro">Ver como tabla</summary>
      <div className="mt-2 max-h-64 overflow-auto scroll-thin rounded-lg border border-arena-200">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-fondo text-[11px] text-gris">
            <tr>
              {head.map((h) => (
                <th key={h} className="px-3 py-1.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-arena-200/60">
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-1.5 tabular-nums text-tinta">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
