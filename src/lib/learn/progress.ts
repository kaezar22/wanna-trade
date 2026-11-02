"use client";

// Progreso de la ruta de aprendizaje, guardado en este navegador.

import { useMemo, useSyncExternalStore } from "react";

const KEY = "wanna-trade.learn.v1";
const EVENT = "wanna-trade:learn";

export type LessonProgress = {
  /** Mejor puntaje del quiz (aciertos). */
  quizBest?: number;
  quizTotal?: number;
  missionDone?: boolean;
  completedAt?: string;
};

type Progress = Record<string, LessonProgress>;

function read() {
  try {
    return localStorage.getItem(KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

function parse(raw: string): Progress {
  try {
    const d = JSON.parse(raw);
    return d && typeof d === "object" ? d : {};
  } catch {
    return {};
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

export function useProgress(): Progress | null {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  return useMemo(() => (raw === null ? null : parse(raw)), [raw]);
}

export function updateProgress(slug: string, patch: Partial<LessonProgress>) {
  const all = parse(read());
  const prev = all[slug] ?? {};
  const next = { ...prev, ...patch };
  if (patch.quizBest !== undefined && prev.quizBest !== undefined) {
    next.quizBest = Math.max(prev.quizBest, patch.quizBest);
  }
  if (!next.completedAt && next.missionDone && next.quizBest !== undefined) {
    next.completedAt = new Date().toISOString();
  }
  all[slug] = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // sin almacenamiento disponible
  }
  window.dispatchEvent(new Event(EVENT));
}

export function isComplete(p: LessonProgress | undefined) {
  return Boolean(p?.missionDone && p.quizBest !== undefined);
}
