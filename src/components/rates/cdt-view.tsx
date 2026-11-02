"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { addDays } from "@/lib/market/as-of";
import type { CdtSnapshot } from "@/lib/rates/cdt";
import { cdtReturn, termByKey, type CdtTermKey } from "@/lib/rates/cdt-math";
import { cn } from "@/lib/utils";
import { LineChart } from "../charts/line-chart";
import { useApi } from "../use-api";

type Props = {
  snapshot: CdtSnapshot;
  term: CdtTermKey;
  dataStart: string;
  sourceUrl: string;
};

export function CdtView({ snapshot, term, dataStart, sourceUrl }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const selected = snapshot.terms.find((t) => t.term === term)!;
  const best = selected.quotes[0];
  const today = new Date().toISOString().slice(0, 10);

  const go = (params: { fecha?: string | null; plazo?: string }) => {
    const sp = new URLSearchParams();
    const fecha = params.fecha === undefined ? snapshot.asOf : params.fecha;
    if (fecha) sp.set("fecha", fecha);
    sp.set("plazo", params.plazo ?? term);
    router.push(`${pathname}?${sp}`, { scroll: false });
  };

  const [date, setDate] = useState(snapshot.asOf ?? "");
  const [rateOverride, setRateOverride] = useState<{ term: CdtTermKey; rate: number } | null>(null);
  const calcRate = rateOverride?.term === term ? rateOverride.rate : (best?.rate ?? selected.average ?? 0.1);

  const historyEnd = snapshot.asOf ?? today;
  const { data: history, error: historyError, loading: historyLoading } = useApi<{
    months: { month: string; rate: number }[];
  }>(
    `/api/cdt/history?${new URLSearchParams({
      plazo: term,
      desde: addDays(historyEnd, -5 * 365) < dataStart ? dataStart : addDays(historyEnd, -5 * 365),
      hasta: historyEnd,
    })}`,
  );
  const historyLines = useMemo(
    () =>
      history
        ? [
            {
              name: `Promedio a ${selected.label}`,
              color: "var(--cobalt)",
              data: history.months.map((m) => ({ time: `${m.month}-01`, value: m.rate })),
            },
          ]
        : [],
    [history, selected.label],
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="display text-3xl font-extrabold">Tasas de CDT</h1>
          <p className="mt-2 text-ink-soft">
            Tasas efectivas anuales que bancos, compañías de financiamiento y cooperativas reportaron a
            la Superintendencia Financiera. Para cada entidad se muestra su dato más reciente hasta el{" "}
            {formatDate(snapshot.latestDate ?? historyEnd)}.
          </p>
        </div>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            go({ fecha: date || null });
          }}
        >
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Ver tasas de una fecha pasada
            <input
              type="date"
              value={date}
              min={dataStart}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
            />
          </label>
          <button type="submit" className="rounded-md bg-cobalt px-4 py-2 font-medium text-white hover:opacity-90">
            Ver
          </button>
          {snapshot.asOf && (
            <button
              type="button"
              onClick={() => {
                setDate("");
                go({ fecha: null });
              }}
              className="rounded-md border border-grid px-3 py-2 text-sm text-ink-soft hover:text-ink"
            >
              Volver a hoy
            </button>
          )}
        </form>
      </div>

      <section aria-labelledby="curve">
        <h2 id="curve" className="text-sm text-ink-soft">
          Promedio ponderado por plazo. Elige uno para ver el detalle por entidad.
        </h2>
        <div role="tablist" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {snapshot.terms.map((t) => (
            <button
              key={t.term}
              role="tab"
              aria-selected={t.term === term}
              onClick={() => go({ plazo: t.term })}
              className={cn(
                "rounded-md border px-3 py-2 text-left transition-colors",
                t.term === term ? "border-ink bg-ink text-paper" : "border-grid hover:border-ink-soft",
              )}
            >
              <span className={cn("block text-xs", t.term === term ? "text-paper/80" : "text-ink-soft")}>
                {t.label}
              </span>
              <span className="text-lg font-semibold">
                {t.average === null ? "—" : formatPercent(t.average)}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="ranking" className="min-w-0">
          <h2 id="ranking" className="text-lg font-semibold">
            {selected.quotes.length} entidades a {selected.label}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Toca una fila para usar esa tasa en la calculadora. Son tasas reportadas; la que te ofrezcan
            puede variar según el monto y la negociación.
          </p>
          {selected.quotes.length === 0 ? (
            <p className="mt-4 rounded-lg border border-grid bg-paper-raised p-4 text-ink-soft">
              Ninguna entidad reportó CDT a este plazo en los 10 días anteriores.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-grid text-ink-soft">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Entidad</th>
                    <th className="py-2 pr-3 font-medium">Tipo</th>
                    <th className="whitespace-nowrap py-2 pr-3 text-right font-medium">Tasa E.A.</th>
                    <th className="whitespace-nowrap py-2 text-right font-medium">Dato del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grid">
                  {selected.quotes.map((q) => {
                    const active = Math.abs(q.rate - calcRate) < 1e-9;
                    return (
                      <tr
                        key={q.entity}
                        onClick={() => setRateOverride({ term, rate: q.rate })}
                        className={cn("cursor-pointer hover:bg-paper-raised", active && "bg-paper-raised")}
                      >
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            className="text-left font-medium hover:text-cobalt"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRateOverride({ term, rate: q.rate });
                            }}
                          >
                            {q.entity}
                          </button>
                        </td>
                        <td className="py-2 pr-3 text-ink-soft">{q.entityType}</td>
                        <td className="py-2 pr-3 text-right font-semibold">{formatPercent(q.rate)}</td>
                        <td className="whitespace-nowrap py-2 text-right text-ink-soft">{formatDate(q.date)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Calculator key={`${term}-${calcRate}`} rate={calcRate} days={termByKey(term).days} />
      </div>

      <section aria-labelledby="history">
        <h2 id="history" className="text-lg font-semibold">
          Cómo ha cambiado la tasa a {selected.label}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Promedio mensual ponderado por monto, últimos 5 años. Las tasas de CDT siguen de cerca a la
          tasa del Banco de la República.
        </p>
        <div className="mt-4">
          {historyError ? (
            <p role="alert" className="rounded-lg border border-down/40 bg-paper-raised p-4">
              {historyError}
            </p>
          ) : historyLoading || !history ? (
            <div className="h-[320px] rounded-lg border border-grid bg-paper-raised" aria-busy="true" />
          ) : (
            <LineChart lines={historyLines} format="percent" label={`Tasa promedio de CDT a ${selected.label}`} />
          )}
        </div>
      </section>

      <p className="text-sm text-ink-soft">
        Fuente:{" "}
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-cobalt underline underline-offset-4">
          Superintendencia Financiera, Formato 441, en datos.gov.co
        </a>
        . Datos diarios desde {formatDate(dataStart)}.
      </p>
    </div>
  );
}

function Calculator({ rate, days }: { rate: number; days: number }) {
  const [capital, setCapital] = useState(10_000_000);
  const [termDays, setTermDays] = useState(days);
  const [ratePct, setRatePct] = useState(Number((rate * 100).toFixed(2)));
  const [retentionPct, setRetentionPct] = useState(4);
  const [inflationPct, setInflationPct] = useState<string>("");

  const inflation = inflationPct.trim() === "" ? null : Number(inflationPct) / 100;
  const valid = capital > 0 && termDays > 0 && ratePct > 0;
  const r = valid
    ? cdtReturn(capital, ratePct / 100, termDays, retentionPct / 100, Number.isFinite(inflation) ? inflation : null)
    : null;
  const money = (v: number) => `$${formatNumber(v, 0)}`;

  return (
    <section aria-labelledby="calc" className="h-fit min-w-0 rounded-lg border border-grid bg-paper-raised p-5 lg:sticky lg:top-6">
      <h2 id="calc" className="text-lg font-semibold">
        Calculadora
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label="Monto (pesos)" className="col-span-2">
          <input
            inputMode="numeric"
            value={formatNumber(capital, 0)}
            onChange={(e) => setCapital(Number(e.target.value.replace(/\D/g, "")) || 0)}
            className="w-full rounded-md border border-grid bg-paper px-3 py-2 text-ink"
          />
        </Field>
        <Field label="Plazo (días)">
          <input
            type="number"
            min={1}
            max={1800}
            value={termDays}
            onChange={(e) => setTermDays(Number(e.target.value))}
            className="w-full rounded-md border border-grid bg-paper px-3 py-2 text-ink"
          />
        </Field>
        <Field label="Tasa E.A. (%)">
          <input
            type="number"
            step="0.01"
            min={0}
            value={ratePct}
            onChange={(e) => setRatePct(Number(e.target.value))}
            className="w-full rounded-md border border-grid bg-paper px-3 py-2 text-ink"
          />
        </Field>
        <Field label="Retención (%)">
          <input
            type="number"
            step="0.1"
            min={0}
            max={50}
            value={retentionPct}
            onChange={(e) => setRetentionPct(Number(e.target.value))}
            className="w-full rounded-md border border-grid bg-paper px-3 py-2 text-ink"
          />
        </Field>
        <Field label="Inflación anual (%)">
          <input
            type="number"
            step="0.1"
            placeholder="Opcional"
            value={inflationPct}
            onChange={(e) => setInflationPct(e.target.value)}
            className="w-full rounded-md border border-grid bg-paper px-3 py-2 text-ink"
          />
        </Field>
      </div>

      {r && (
        <dl className="mt-5 space-y-2 border-t border-grid pt-4 text-sm">
          <Row label="Intereses antes de impuestos" value={money(r.gross)} />
          <Row label="Retención en la fuente" value={`−${money(r.retention)}`} />
          <Row label="Intereses netos" value={money(r.net)} strong />
          <Row label="Recibes al vencer" value={money(capital + r.net)} strong />
          <Row label="Rentabilidad neta anual" value={formatPercent(r.netAnnual)} />
          {r.realAnnual !== null && (
            <Row
              label="Rentabilidad real (sobre la inflación)"
              value={formatPercent(r.realAnnual, true)}
              tone={r.realAnnual >= 0 ? "up" : "down"}
            />
          )}
        </dl>
      )}
      <p className="mt-4 text-xs text-ink-soft">
        Cálculo aproximado con interés compuesto sobre 365 días. La retención del 4 % es la tarifa
        habitual sobre rendimientos financieros; confirma con tu entidad cómo liquida y si te aplica
        otra tarifa.
      </p>
    </section>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1 text-sm text-ink-soft", className)}>
      {label}
      {children}
    </label>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "up" | "down";
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={cn(strong && "font-semibold", tone === "up" && "text-up", tone === "down" && "text-down")}>
        {value}
      </dd>
    </div>
  );
}
