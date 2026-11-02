"use client";

import { useState } from "react";
import { formatDate, formatNumber, formatPercent, formatPrice } from "@/lib/format";
import { addDays } from "@/lib/market/as-of";
import type { CdtSnapshot } from "@/lib/rates/cdt";
import { cdtReturn } from "@/lib/rates/cdt-math";
import { buy, displayName, openCdt, sell, type Game, type Quote } from "@/lib/sim/engine";
import { saveGame } from "@/lib/sim/storage";
import { cn } from "@/lib/utils";
import { useApi } from "../use-api";

const money = (v: number) => `$${formatNumber(v, 0)}`;

type Tab = "buy" | "sell" | "cdt";

export function Tickets({
  game,
  symbol,
  quote,
  fx,
}: {
  game: Game;
  symbol: string;
  quote: Quote | null;
  fx: number | null;
}) {
  const [tab, setTab] = useState<Tab>("buy");
  const position = game.positions.find((p) => p.symbol === symbol);

  return (
    <section aria-label="Operar" className="rounded-lg border border-grid bg-paper-raised">
      <div role="tablist" className="grid grid-cols-3 border-b border-grid text-sm font-medium">
        {(
          [
            ["buy", "Comprar"],
            ["sell", "Vender"],
            ["cdt", "Abrir CDT"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "border-b-2 py-2.5",
              tab === key ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="p-5">
        {tab === "buy" && <BuyTicket key={symbol} game={game} symbol={symbol} quote={quote} fx={fx} />}
        {tab === "sell" &&
          (position ? (
            <SellTicket key={symbol} game={game} symbol={symbol} quote={quote} fx={fx} />
          ) : (
            <p className="text-sm text-ink-soft">
              No tienes {displayName(game, symbol)}. Compra primero o elige otro activo.
            </p>
          ))}
        {tab === "cdt" && <CdtTicket game={game} />}
      </div>
    </section>
  );
}

function needsFx(quote: Quote | null, fx: number | null) {
  return quote?.currency === "USD" && fx === null;
}

function BuyTicket({ game, symbol, quote, fx }: { game: Game; symbol: string; quote: Quote | null; fx: number | null }) {
  const [amount, setAmount] = useState(Math.min(1_000_000, Math.floor(game.cash)));
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const name = displayName(game, symbol);

  if (!quote) return <p className="text-sm text-ink-soft">Sin precio para {name} en esta fecha.</p>;
  if (needsFx(quote, fx)) return <p className="text-sm text-ink-soft">Falta la tasa de cambio de esta fecha.</p>;

  const rate = quote.currency === "COP" ? 1 : fx! * (1 + game.settings.fxSpread);
  const fee = amount * game.settings.commission;
  const units = amount > 0 ? (amount - fee) / (quote.adj * rate) : 0;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const r = buy(game, quote, amount, fx ?? 1);
        if (!r.ok) return setError(r.error);
        saveGame(r.game);
        setError(null);
        setDone(`Compraste ${money(amount)} de ${name}.`);
      }}
    >
      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        Monto a invertir (pesos)
        <input
          inputMode="numeric"
          value={formatNumber(amount, 0)}
          onChange={(e) => {
            setAmount(Number(e.target.value.replace(/\D/g, "")) || 0);
            setDone(null);
          }}
          className="rounded-md border border-grid bg-paper px-3 py-2 text-ink"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {[0.1, 0.25, 0.5, 1].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setAmount(Math.floor(game.cash * f))}
            className="rounded border border-grid px-2 py-0.5 text-sm text-ink-soft hover:text-ink"
          >
            {f === 1 ? "Todo" : formatPercent(f).replace(",0", "")}
          </button>
        ))}
      </div>
      <dl className="space-y-1 text-sm">
        <Row label="Precio de cierre" value={formatPrice(quote.close, quote.currency)} />
        {quote.currency === "USD" && <Row label="Dólar (con diferencial)" value={money(rate)} />}
        <Row label="Comisión" value={money(fee)} />
        <Row label="Unidades aprox." value={formatNumber(units, units < 10 ? 4 : 2)} />
      </dl>
      {error && <p role="alert" className="text-sm text-down">{error}</p>}
      {done && <p role="status" className="text-sm text-up">{done}</p>}
      <button type="submit" className="w-full rounded-md bg-cobalt py-2 font-medium text-white hover:opacity-90">
        Comprar {name}
      </button>
    </form>
  );
}

function SellTicket({ game, symbol, quote, fx }: { game: Game; symbol: string; quote: Quote | null; fx: number | null }) {
  const [fraction, setFraction] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const name = displayName(game, symbol);
  const pos = game.positions.find((p) => p.symbol === symbol)!;

  if (!quote) return <p className="text-sm text-ink-soft">Sin precio para {name} en esta fecha.</p>;
  if (needsFx(quote, fx)) return <p className="text-sm text-ink-soft">Falta la tasa de cambio de esta fecha.</p>;

  const rate = quote.currency === "COP" ? 1 : fx! * (1 - game.settings.fxSpread);
  const gross = pos.units * fraction * quote.adj * rate;
  const fee = gross * game.settings.commission;
  const cost = pos.costCop * fraction;
  const result = gross - fee - cost;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const r = sell(game, quote, fraction, fx ?? 1);
        if (!r.ok) return setError(r.error);
        saveGame(r.game);
      }}
    >
      <fieldset>
        <legend className="text-sm text-ink-soft">¿Cuánto de tu posición?</legend>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={fraction === f}
              onClick={() => setFraction(f)}
              className={cn(
                "rounded-md border py-1.5 text-sm",
                fraction === f ? "border-ink bg-ink text-paper" : "border-grid text-ink-soft hover:text-ink",
              )}
            >
              {f === 1 ? "Todo" : `${f * 100} %`}
            </button>
          ))}
        </div>
      </fieldset>
      <dl className="space-y-1 text-sm">
        <Row label="Recibes (neto)" value={money(gross - fee)} />
        <Row label="Comisión" value={money(fee)} />
        <Row
          label="Resultado"
          value={`${result >= 0 ? "+" : "−"}${money(Math.abs(result))}`}
          tone={result >= 0 ? "up" : "down"}
        />
      </dl>
      {error && <p role="alert" className="text-sm text-down">{error}</p>}
      <button type="submit" className="w-full rounded-md bg-ink py-2 font-medium text-paper hover:opacity-90">
        Vender {name}
      </button>
    </form>
  );
}

const CDT_TERMS = [
  { key: "90", days: 90, label: "90 días" },
  { key: "180", days: 180, label: "180 días" },
  { key: "360", days: 360, label: "360 días" },
];

function CdtTicket({ game }: { game: Game }) {
  const [termKey, setTermKey] = useState("90");
  const [amount, setAmount] = useState(Math.min(1_000_000, Math.floor(game.cash)));
  const [pick, setPick] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, error: loadError, loading } = useApi<CdtSnapshot>(
    `/api/cdt?${new URLSearchParams({ fecha: game.currentDate })}`,
  );

  const term = CDT_TERMS.find((t) => t.key === termKey)!;
  const quotes = data?.terms.find((t) => t.term === termKey)?.quotes.slice(0, 6) ?? [];
  const chosen = quotes.find((q) => q.entity === pick) ?? quotes[0];

  if (loadError) return <p role="alert" className="text-sm text-down">{loadError}</p>;
  if (loading || !data) return <p className="text-sm text-ink-soft">Cargando tasas de esta fecha…</p>;

  const r = chosen ? cdtReturn(amount, chosen.rate, term.days, game.settings.cdtRetention) : null;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!chosen) return;
        const res = openCdt(game, { entity: chosen.entity, amount, rate: chosen.rate, termDays: term.days });
        if (!res.ok) return setError(res.error);
        saveGame(res.game);
        setError(null);
      }}
    >
      <div className="grid grid-cols-3 gap-2">
        {CDT_TERMS.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={termKey === t.key}
            onClick={() => {
              setTermKey(t.key);
              setPick(null);
            }}
            className={cn(
              "rounded-md border py-1.5 text-sm",
              termKey === t.key ? "border-ink bg-ink text-paper" : "border-grid text-ink-soft hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {quotes.length === 0 ? (
        <p className="text-sm text-ink-soft">Ninguna entidad reportó CDT a este plazo en esos días.</p>
      ) : (
        <fieldset>
          <legend className="text-sm text-ink-soft">Mejores tasas en esta fecha</legend>
          <ul className="mt-2 space-y-1">
            {quotes.map((q) => (
              <li key={q.entity}>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1 text-sm hover:bg-paper">
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="cdt-entity"
                      checked={chosen?.entity === q.entity}
                      onChange={() => setPick(q.entity)}
                      className="accent-[var(--cobalt)]"
                    />
                    {q.entity}
                  </span>
                  <span className="font-semibold">{formatPercent(q.rate)}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        Monto (pesos)
        <input
          inputMode="numeric"
          value={formatNumber(amount, 0)}
          onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, "")) || 0)}
          className="rounded-md border border-grid bg-paper px-3 py-2 text-ink"
        />
      </label>
      {r && (
        <dl className="space-y-1 text-sm">
          <Row label="Intereses netos al vencer" value={money(r.net)} />
          <Row label="Vence" value={game.blind ? `en ${term.days} días` : formatDate(addDays(game.currentDate, term.days))} />
        </dl>
      )}
      <p className="text-xs text-ink-soft">El dinero queda bloqueado hasta el vencimiento.</p>
      {error && <p role="alert" className="text-sm text-down">{error}</p>}
      <button
        type="submit"
        disabled={!chosen}
        className="w-full rounded-md bg-cut py-2 font-medium text-ink hover:opacity-90 disabled:opacity-50"
      >
        Abrir CDT
      </button>
    </form>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={cn("font-medium", tone === "up" && "text-up", tone === "down" && "text-down")}>{value}</dd>
    </div>
  );
}
