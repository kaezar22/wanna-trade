"use client";

// Partidas guardadas en el navegador (localStorage). Solo viven en este
// navegador: para llevarlas a otro equipo se exportan como archivo JSON.

import { useMemo, useSyncExternalStore } from "react";
import type { Game } from "./engine";

const KEY = "wanna-trade.games.v1";
const EVENT = "wanna-trade:games";

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

function parse(raw: string): Record<string, Game> {
  try {
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? (data as Record<string, Game>) : {};
  } catch {
    return {};
  }
}

function write(games: Record<string, Game>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(games));
  } catch {
    // Sin almacenamiento (modo privado o lleno): la partida sigue en memoria.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

/** Todas las partidas, de la más reciente a la más antigua. null mientras carga. */
export function useGames(): Game[] | null {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  return useMemo(
    () =>
      raw === null
        ? null
        : Object.values(parse(raw)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [raw],
  );
}

/** Una partida por id. undefined mientras carga, null si no existe. */
export function useGame(id: string): Game | null | undefined {
  const games = useGames();
  return games === null ? undefined : (games.find((g) => g.id === id) ?? null);
}

export function saveGame(game: Game) {
  const all = parse(read());
  all[game.id] = game;
  write(all);
}

export function deleteGame(id: string) {
  const all = parse(read());
  delete all[id];
  write(all);
}

export function exportGame(game: Game) {
  const blob = new Blob([JSON.stringify(game, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `partida-${game.name.replace(/[^\w-]+/g, "_")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Importa una partida exportada. Devuelve el error en palabras si el archivo no sirve. */
export async function importGame(file: File): Promise<string | null> {
  try {
    const g = JSON.parse(await file.text()) as Game;
    if (!g.id || !g.startDate || !Array.isArray(g.positions) || !Array.isArray(g.trades)) {
      return "El archivo no parece una partida de wanna-trade.";
    }
    saveGame(g);
    return null;
  } catch {
    return "No se pudo leer el archivo. Debe ser un JSON exportado desde el simulador.";
  }
}
