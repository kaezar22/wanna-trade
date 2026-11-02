import { connection } from "next/server";

// Ruta temporal (fase 1): prueba qué proveedores de precios responden desde
// los servidores de Vercel. Se borra cuando elijamos proveedor.

type ProbeResult = {
  provider: string;
  ok: boolean;
  status?: number;
  points?: number;
  lastClose?: number;
  ms: number;
  error?: string;
};

async function timed(
  provider: string,
  fn: () => Promise<Omit<ProbeResult, "provider" | "ms">>,
): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const r = await fn();
    return { provider, ms: Date.now() - start, ...r };
  } catch (e) {
    return {
      provider,
      ok: false,
      ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

async function probeYahoo(symbol: string) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`,
    { headers: { "User-Agent": UA }, cache: "no-store" },
  );
  if (!res.ok) return { ok: false, status: res.status, error: (await res.text()).slice(0, 200) };
  const data = await res.json();
  const closes: (number | null)[] =
    data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
  const valid = closes.filter((c): c is number => c != null);
  return { ok: valid.length > 0, status: res.status, points: valid.length, lastClose: valid.at(-1) };
}

async function probeStooq(symbol: string) {
  const res = await fetch(`https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`, {
    headers: { "User-Agent": UA },
    cache: "no-store",
  });
  const text = await res.text();
  const rows = text.trim().split("\n").slice(1).filter((r) => r.includes(","));
  const last = rows.at(-1)?.split(",");
  return {
    ok: res.ok && rows.length > 0,
    status: res.status,
    points: rows.length,
    lastClose: last ? Number(last[4]) : undefined,
    ...(rows.length === 0 ? { error: text.slice(0, 200) } : {}),
  };
}

export async function GET() {
  await connection();

  const results = await Promise.all([
    timed("yahoo AAPL", () => probeYahoo("AAPL")),
    timed("yahoo SPY (ETF)", () => probeYahoo("SPY")),
    timed("yahoo ICOLCAP.CL (ETF Colombia)", () => probeYahoo("ICOLCAP.CL")),
    timed("yahoo COP=X (USD/COP)", () => probeYahoo("COP=X")),
    timed("stooq aapl.us", () => probeStooq("aapl.us")),
  ]);

  return Response.json({ region: process.env.VERCEL_REGION ?? "local", results });
}
