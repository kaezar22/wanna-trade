"use client";

import Link from "next/link";
import { formatNumber, formatPercent } from "@/lib/format";
import { buildProfile } from "@/lib/sim/profile";
import { useGames } from "@/lib/sim/storage";
import { cn } from "@/lib/utils";

export function ProfileView() {
  const games = useGames();
  if (games === null) return <div aria-busy="true" className="h-96" />;
  const profile = buildProfile(games);

  return (
    <div className="space-y-10">
      <div className="max-w-2xl">
        <p className="text-sm">
          <Link href="/simular" className="text-cobalt underline-offset-4 hover:underline">
            Simular
          </Link>
        </p>
        <h1 className="display mt-2 text-4xl font-extrabold sm:text-5xl">Tu perfil de inversionista</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Los patrones de todas tus partidas terminadas. Una sola partida puede ser suerte; varias
          muestran cómo decides.
        </p>
      </div>

      {!profile ? (
        <div className="rounded-lg border border-grid bg-paper-raised p-6">
          <p className="font-semibold">Todavía no hay partidas terminadas.</p>
          <p className="mt-1 text-ink-soft">Juega y termina al menos una partida para ver tu perfil.</p>
          <Link href="/simular" className="mt-4 inline-block rounded-md bg-cobalt px-4 py-2 font-medium text-white hover:opacity-90">
            Empezar una partida
          </Link>
        </div>
      ) : (
        <>
          <dl className="grid gap-x-8 gap-y-6 border-y border-grid py-6 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Partidas terminadas" value={String(profile.games)} />
            <Stat
              label="Rentabilidad promedio"
              value={formatPercent(profile.avgReturn, true)}
              tone={profile.avgReturn >= 0 ? "up" : "down"}
            />
            <Stat
              label="Le ganaste al S&P 500"
              value={profile.vsSpy.of ? `${profile.vsSpy.beat} de ${profile.vsSpy.of}` : "—"}
            />
            <Stat
              label="Le ganaste a un CDT"
              value={profile.vsCdt.of ? `${profile.vsCdt.beat} de ${profile.vsCdt.of}` : "—"}
            />
            <Stat label="Operaciones al mes" value={formatNumber(profile.tradesPerMonth, 1)} />
            <Stat label="Costos por partida" value={formatPercent(profile.feesShare)} hint="del capital inicial" />
            <Stat
              label="Días con ganancias / con pérdidas"
              value={
                profile.avgHeldWinners === null || profile.avgHeldLosers === null
                  ? "—"
                  : `${Math.round(profile.avgHeldWinners)} / ${Math.round(profile.avgHeldLosers)}`
              }
              hint="antes de vender"
            />
            <Stat label="Partidas con CDT" value={formatPercent(profile.cdtUsage)} />
          </dl>

          <section aria-labelledby="patterns">
            <h2 id="patterns" className="text-lg font-semibold">
              Lo que dicen tus decisiones
            </h2>
            {profile.insights.length === 0 ? (
              <p className="mt-2 text-ink-soft">Aún no hay suficientes operaciones para ver patrones.</p>
            ) : (
              <ul className="mt-4 grid gap-4 md:grid-cols-2">
                {profile.insights.map((i) => (
                  <li
                    key={i.title}
                    className={cn("border-l-4 py-1 pl-4", i.tone === "good" ? "border-up" : "border-cut")}
                  >
                    <p className="font-semibold">{i.title}</p>
                    <p className="mt-1 leading-relaxed text-ink-soft">{i.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-sm text-ink-soft">
            Para profundizar en estos sesgos, revisa la lección{" "}
            <Link href="/aprender/psicologia" className="text-cobalt underline underline-offset-4">
              Tu peor enemigo eres tú
            </Link>
            . Las partidas que terminaste antes de esta versión no tienen guardada la comparación con
            el mercado: ábrelas una vez para que se calcule.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "up" | "down" }) {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className={cn("mt-1 text-2xl font-semibold", tone === "up" && "text-up", tone === "down" && "text-down")}>
        {value}
      </dd>
      {hint && <dd className="text-xs text-ink-soft">{hint}</dd>}
    </div>
  );
}
