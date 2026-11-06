"use client";

import { useMemo, useState } from "react";
import { countryName, flag, TOPICS, type Risk, type Tone, type Topic } from "@/lib/geo/classify";
import type { GeoItem, GeoNews } from "@/lib/geo/news";
import { cn } from "@/lib/utils";

type Data = Extract<GeoNews, { ok: true }>;

const TONE_LABEL: Record<Tone, string> = { positivo: "Positivo", neutral: "Neutral", negativo: "Negativo" };
const TONE_CLASS: Record<Tone, string> = { positivo: "text-up", neutral: "text-ink-soft", negativo: "text-down" };
const RISK_LABEL: Record<Risk, string> = { aumenta: "↑ Aumenta", neutral: "→ Neutral", disminuye: "↓ Disminuye" };
const RISK_CLASS: Record<Risk, string> = { aumenta: "text-down", neutral: "text-ink-soft", disminuye: "text-up" };

const timeFmt = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

function csvCell(v: string) {
  return /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadCsv(rows: GeoItem[]) {
  const header = ["fecha", "medio", "pais_medio", "tipo_medio", "titulo", "resumen", "personas", "paises", "tema", "subtema", "tono", "riesgo", "url"];
  const lines = rows.map((it) =>
    [
      it.date,
      it.outlet.name,
      it.outlet.country,
      it.outlet.ownership ?? "privado",
      it.title,
      it.summary,
      it.people.join(" | "),
      it.countries.join(" | "),
      TOPICS[it.topic],
      it.subtopic,
      it.tone,
      it.risk,
      it.url,
    ]
      .map(csvCell)
      .join(","),
  );
  // BOM para que Excel lea bien las tildes.
  const blob = new Blob(["\uFEFF" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `geopolitica-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function countBy<T>(list: T[], key: (x: T) => string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const x of list) for (const k of key(x)) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

type Filters = { topic: string; country: string; person: string; tone: string; risk: string; text: string };
const EMPTY: Filters = { topic: "", country: "", person: "", tone: "", risk: "", text: "" };

function matches(it: GeoItem, f: Filters) {
  if (f.topic && it.topic !== f.topic) return false;
  if (f.country && !it.countries.includes(f.country)) return false;
  if (f.person && !it.people.includes(f.person)) return false;
  if (f.tone && it.tone !== f.tone) return false;
  if (f.risk && it.risk !== f.risk) return false;
  if (f.text) {
    const q = f.text.toLowerCase();
    const hay = `${it.title} ${it.summary} ${it.subtopic} ${it.outlet.name}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function GeoView({ data }: { data: Data }) {
  const [f, setF] = useState<Filters>(EMPTY);
  const set = (k: keyof Filters) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const topics = useMemo(() => countBy(data.items, (i) => [i.topic]), [data.items]);
  const countries = useMemo(() => countBy(data.items, (i) => i.countries), [data.items]);
  const people = useMemo(() => countBy(data.items, (i) => i.people), [data.items]);
  const rows = data.items.filter((it) => matches(it, f));
  const active = Object.values(f).some(Boolean);

  const ok = data.outlets.filter((o) => !o.error);
  const failed = data.outlets.filter((o) => o.error);

  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <h1 className="display text-3xl font-extrabold">Geopolítica</h1>
        <p className="mt-2 text-ink-soft">
          Noticias internacionales de {ok.length} medios de distintos países. Un modelo de lenguaje (DeepSeek) resume
          cada noticia y la clasifica: quién aparece, qué países involucra, tema, tono y si aumenta o reduce la
          incertidumbre para los mercados.
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          {data.items.length} noticias de geopolítica de {data.candidates} revisadas en las últimas 48 horas · actualizado{" "}
          {timeFmt.format(new Date(data.generatedAt))} (hora de Colombia), se renueva cada hora.
        </p>
      </div>

      <section aria-label="Temas" className="flex flex-wrap gap-2">
        {topics.map(([t, n]) => (
          <button
            key={t}
            type="button"
            aria-pressed={f.topic === t}
            onClick={() => set("topic")(f.topic === t ? "" : t)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              f.topic === t ? "border-cobalt bg-cobalt text-paper" : "border-grid bg-paper-raised hover:border-cobalt",
            )}
          >
            {TOPICS[t as Topic]} <span className="opacity-70">{n}</span>
          </button>
        ))}
      </section>

      <section aria-label="Filtros" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Buscar">
          <input
            value={f.text}
            onChange={(e) => set("text")(e.target.value)}
            placeholder="Palabra, medio…"
            className="rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
          />
        </Field>
        <Select label="País involucrado" value={f.country} onChange={set("country")}>
          {countries.map(([c, n]) => (
            <option key={c} value={c}>
              {flag(c)} {countryName(c)} ({n})
            </option>
          ))}
        </Select>
        <Select label="Persona" value={f.person} onChange={set("person")}>
          {people.map(([p, n]) => (
            <option key={p} value={p}>
              {p} ({n})
            </option>
          ))}
        </Select>
        <Select label="Tono" value={f.tone} onChange={set("tone")}>
          {Object.entries(TONE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select label="Riesgo de mercado" value={f.risk} onChange={set("risk")}>
          {Object.entries(RISK_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </section>

      <div>
        <div className="mb-2 flex items-baseline justify-between gap-4 text-sm text-ink-soft">
          <span>
            {rows.length} de {data.items.length} noticias
          </span>
          <span className="flex gap-4">
            {active && (
              <button type="button" onClick={() => setF(EMPTY)} className="text-cobalt underline underline-offset-4">
                Quitar filtros
              </button>
            )}
            <button
              type="button"
              onClick={() => downloadCsv(rows)}
              disabled={!rows.length}
              className="text-cobalt underline underline-offset-4 disabled:opacity-50"
            >
              Descargar CSV
            </button>
            <a href="/api/geo" target="_blank" rel="noopener noreferrer" className="text-cobalt underline underline-offset-4">
              JSON
            </a>
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-grid bg-paper-raised">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-grid text-ink-soft">
              <tr>
                <th className="px-3 py-2 font-medium">Medio</th>
                <th className="px-3 py-2 font-medium">Noticia</th>
                <th className="px-3 py-2 font-medium">Personas</th>
                <th className="px-3 py-2 font-medium">Países</th>
                <th className="px-3 py-2 font-medium">Tema</th>
                <th className="px-3 py-2 font-medium">Tono</th>
                <th className="whitespace-nowrap px-3 py-2 font-medium">Riesgo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((it) => (
                <tr key={it.id} className="border-b border-grid align-top last:border-0">
                  <td className="w-44 px-3 py-3">
                    <div className="font-medium">{it.outlet.name}</div>
                    <div className="text-xs text-ink-soft">
                      {flag(it.outlet.country)} {countryName(it.outlet.country)}
                    </div>
                    {it.outlet.ownership && (
                      <div
                        className="mt-1 inline-block rounded border border-grid px-1.5 text-[11px] text-ink-soft"
                        title={
                          it.outlet.ownership === "estatal"
                            ? "Medio controlado o financiado por un Estado"
                            : "Medio público con independencia editorial"
                        }
                      >
                        {it.outlet.ownership === "estatal" ? "Estatal" : "Público"}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-ink-soft">{timeFmt.format(new Date(it.date))}</div>
                  </td>
                  <td className="max-w-md px-3 py-3">
                    <a
                      href={it.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-cobalt hover:underline"
                    >
                      {it.title}
                    </a>
                    <p className="mt-1 leading-relaxed text-ink-soft">{it.summary}</p>
                  </td>
                  <td className="w-40 px-3 py-3">
                    {it.people.length ? (
                      <ul className="space-y-0.5">
                        {it.people.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-ink-soft">—</span>
                    )}
                  </td>
                  <td className="w-40 px-3 py-3">
                    <ul className="space-y-0.5">
                      {it.countries.map((c) => (
                        <li key={c} className="whitespace-nowrap">
                          {flag(c)} {countryName(c)}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="w-44 px-3 py-3">
                    <div>{TOPICS[it.topic]}</div>
                    {it.subtopic && <div className="text-xs text-ink-soft">{it.subtopic}</div>}
                  </td>
                  <td className={cn("px-3 py-3 font-medium", TONE_CLASS[it.tone])}>{TONE_LABEL[it.tone]}</td>
                  <td className={cn("whitespace-nowrap px-3 py-3 font-medium", RISK_CLASS[it.risk])}>
                    {RISK_LABEL[it.risk]}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-ink-soft">
                    Ninguna noticia coincide con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <section className="max-w-3xl space-y-2 text-sm text-ink-soft">
        <h2 className="font-semibold text-ink">Cómo leer la tabla</h2>
        <p>
          <strong>Tono</strong> es el carácter de la noticia (un acuerdo es positivo, un ataque es negativo).{" "}
          <strong>Riesgo</strong> es si la noticia probablemente aumenta o reduce la incertidumbre que perciben los
          mercados. La clasificación es automática y puede equivocarse: abre la noticia original antes de sacar
          conclusiones. El país de cada medio está fijado a mano; los medios marcados como estatales están
          controlados o financiados por un Estado.
        </p>
        <p>
          Medios consultados:{" "}
          {data.outlets.map((o, k) => (
            <span key={o.id}>
              {k > 0 && ", "}
              {o.name} ({o.used})
            </span>
          ))}
          .
          {failed.length > 0 && <> Sin respuesta esta vez: {failed.map((o) => `${o.name} (${o.error})`).join(", ")}.</>}
        </p>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1 text-sm text-ink-soft">{label}{children}</label>;
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
      >
        <option value="">Todos</option>
        {children}
      </select>
    </Field>
  );
}
