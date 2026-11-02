"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { ETFS } from "@/lib/etfs";
import { formatDate, formatNumber } from "@/lib/format";
import { addDays } from "@/lib/market/as-of";
import { createGame, dayNumber } from "@/lib/sim/engine";
import { deleteGame, importGame, saveGame, useGames } from "@/lib/sim/storage";
import { cn } from "@/lib/utils";

const DATA_START = "2018-02-01";

const STOCKS = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "NVDA", name: "Nvidia" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "EC", name: "Ecopetrol (ADR en NYSE)" },
  { symbol: "CIB", name: "Bancolombia (ADR en NYSE)" },
];

const DEFAULT_UNIVERSE = ["ICOLCAP.CL", "SPY", "QQQ", "TLT", "GLD", "EEM"];

const DURATIONS = [
  { key: "6m", label: "6 meses", days: 182 },
  { key: "1a", label: "1 año", days: 365 },
  { key: "2a", label: "2 años", days: 730 },
  { key: "hoy", label: "Hasta hoy", days: Infinity },
];

export function SimHome() {
  const games = useGames();
  const router = useRouter();
  const params = useSearchParams();
  const today = new Date().toISOString().slice(0, 10);
  const maxStart = addDays(today, -90);

  // Las misiones de Aprender abren el simulador con la partida preconfigurada:
  // ?inicio=2020-02-03&duracion=1a&activos=SPY,TLT&ciegas=1&nombre=...
  const preset = {
    start: params.get("inicio"),
    duration: params.get("duracion"),
    assets: params.get("activos")?.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
    blind: params.get("ciegas") === "1",
    name: params.get("nombre"),
  };
  const fromMission = Boolean(preset.start || preset.assets || preset.name);

  const [name, setName] = useState(preset.name ?? "");
  const [start, setStart] = useState(preset.start ?? addDays(today, -730));
  const [duration, setDuration] = useState(
    DURATIONS.some((d) => d.key === preset.duration) ? preset.duration! : "1a",
  );
  const [capital, setCapital] = useState(10_000_000);
  const [universe, setUniverse] = useState<string[]>(preset.assets?.length ? preset.assets : DEFAULT_UNIVERSE);
  const [custom, setCustom] = useState("");
  const [blind, setBlind] = useState(preset.blind);
  const [commission, setCommission] = useState(0.5);
  const [spread, setSpread] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const presets = [
    { label: "Hace 1 año", date: addDays(today, -365) },
    { label: "Hace 2 años", date: addDays(today, -730) },
    { label: "Hace 3 años", date: addDays(today, -1095) },
    { label: "Febrero 2020 (antes de la pandemia)", date: "2020-02-03" },
    { label: "Enero 2022 (subida de tasas)", date: "2022-01-03" },
  ];

  const toggle = (s: string) =>
    setUniverse((u) => (u.includes(s) ? u.filter((x) => x !== s) : [...u, s]));

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const extra = custom
      .split(/[\s,;]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const all = [...new Set([...universe, ...extra])];
    if (all.length === 0) return setError("Elige al menos un activo para la partida.");
    if (all.length > 15) return setError("Máximo 15 activos por partida.");
    if (start < DATA_START || start > maxStart) {
      return setError(`La fecha de inicio debe estar entre ${formatDate(DATA_START)} y ${formatDate(maxStart)}.`);
    }
    if (!(capital >= 100_000)) return setError("El capital mínimo es $100.000.");

    const dur = DURATIONS.find((d) => d.key === duration)!;
    const end = dur.days === Infinity ? addDays(today, -1) : addDays(start, dur.days);
    const game = createGame({
      name: name.trim() || `Partida ${(games?.length ?? 0) + 1}`,
      startDate: start,
      endDate: end > addDays(today, -1) ? addDays(today, -1) : end,
      initialCash: capital,
      universe: all,
      blind,
      settings: { commission: commission / 100, fxSpread: spread / 100 },
    });
    saveGame(game);
    router.push(`/simular/${game.id}`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-6 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="display text-4xl font-extrabold sm:text-5xl">Simular</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Vuelve a una fecha del pasado con un capital en pesos. Solo verás precios y tasas de CDT
          hasta ese día. Decide, avanza el reloj y al final compara contra el S&P 500, el COLCAP y
          un CDT.
        </p>
      </div>

      {games && games.length > 0 && (
        <section aria-labelledby="games">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="games" className="text-lg font-semibold">
              Tus partidas
            </h2>
            <Link href="/simular/perfil" className="text-sm text-cobalt underline-offset-4 hover:underline">
              Ver tu perfil de inversionista
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-grid border-y border-grid">
            {games.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <Link href={`/simular/${g.id}`} className="font-semibold text-cobalt hover:underline">
                    {g.name}
                  </Link>
                  <p className="text-sm text-ink-soft">
                    {g.finished
                      ? `Terminada. Del ${formatDate(g.startDate)} al ${formatDate(g.currentDate)}.`
                      : g.blind
                        ? `A ciegas, día ${dayNumber(g)}.`
                        : `Vas en el ${formatDate(g.currentDate)}.`}{" "}
                    Capital inicial ${formatNumber(g.initialCash, 0)}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`¿Borrar "${g.name}"? No se puede deshacer.`)) deleteGame(g.id);
                  }}
                  className="text-sm text-ink-soft hover:text-down"
                >
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="new" className="space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="new" className="display text-2xl font-extrabold">
            Nueva partida
          </h2>
          <div className="text-sm">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-cobalt underline-offset-4 hover:underline"
            >
              Importar una partida guardada
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setError(await importGame(f));
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {fromMission && (
          <p className="rounded-lg border border-cobalt/40 bg-paper-raised p-4 text-sm">
            Partida preparada para la misión
            {preset.name ? ` "${preset.name}"` : ""}. Revisa las opciones y empieza cuando quieras.
          </p>
        )}

        <form onSubmit={create} className="space-y-8">
          <fieldset className="space-y-3">
            <legend className="font-medium">¿Desde cuándo?</legend>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setStart(p.date)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm",
                    start === p.date ? "border-ink bg-ink text-paper" : "border-grid text-ink-soft hover:text-ink",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                Fecha de inicio
                <input
                  type="date"
                  value={start}
                  min={DATA_START}
                  max={maxStart}
                  onChange={(e) => setStart(e.target.value)}
                  className="rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                Duración
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
                >
                  {DURATIONS.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                Capital inicial (pesos)
                <input
                  inputMode="numeric"
                  value={formatNumber(capital, 0)}
                  onChange={(e) => setCapital(Number(e.target.value.replace(/\D/g, "")) || 0)}
                  className="w-44 rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                Nombre (opcional)
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  placeholder={`Partida ${(games?.length ?? 0) + 1}`}
                  className="w-56 rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-medium">¿En qué puedes invertir?</legend>
            <p className="text-sm text-ink-soft">
              Además de estos activos, siempre puedes abrir CDT con las tasas reales de esa fecha.
            </p>
            <div className="flex flex-wrap gap-2">
              {[...ETFS.map((e) => ({ symbol: e.symbol, name: e.name })), ...STOCKS].map((a) => {
                const on = universe.includes(a.symbol);
                return (
                  <button
                    key={a.symbol}
                    type="button"
                    aria-pressed={on}
                    title={a.name}
                    onClick={() => toggle(a.symbol)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-sm",
                      on ? "border-ink bg-ink text-paper" : "border-grid text-ink-soft hover:text-ink",
                    )}
                  >
                    {a.symbol}
                  </button>
                );
              })}
            </div>
            <label className="flex max-w-md flex-col gap-1 text-sm text-ink-soft">
              Otros símbolos de Yahoo Finance, separados por comas
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Por ejemplo: META, BTC-USD"
                spellCheck={false}
                className="rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
              />
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-medium">Reglas</legend>
            <label className="flex max-w-xl items-start gap-3">
              <input
                type="checkbox"
                checked={blind}
                onChange={(e) => setBlind(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--cobalt)]"
              />
              <span>
                <span className="font-medium">Modo a ciegas.</span>{" "}
                <span className="text-ink-soft">
                  Los activos se llaman &quot;Activo A&quot;, &quot;Activo B&quot;… y las fechas se
                  cuentan como días. Así decides con el gráfico y no con tu memoria de lo que pasó.
                  Se revela al terminar.
                </span>
              </span>
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                Comisión por operación (%)
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={5}
                  value={commission}
                  onChange={(e) => setCommission(Number(e.target.value))}
                  className="w-32 rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                Diferencial al cambiar dólares (%)
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={5}
                  value={spread}
                  onChange={(e) => setSpread(Number(e.target.value))}
                  className="w-32 rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
                />
              </label>
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="rounded-lg border border-down/40 bg-paper-raised p-4">
              {error}
            </p>
          )}

          <button type="submit" className="rounded-md bg-cobalt px-5 py-2.5 font-medium text-white hover:opacity-90">
            Empezar partida
          </button>
          <p className="text-sm text-ink-soft">
            Las partidas se guardan en este navegador. Para llevarlas a otro equipo, expórtalas desde la
            partida.
          </p>
        </form>
      </section>
    </div>
  );
}
