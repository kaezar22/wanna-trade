"use client";

import { useEffect, useState } from "react";

/**
 * Pide `url` cuando cambia y expone carga, datos y error. Con url = null no
 * hace nada. La respuesta de error debe traer { error: string }.
 */
export function useApi<T>(url: string | null) {
  const [result, setResult] = useState<{ url: string; data?: T; error?: string } | null>(null);

  useEffect(() => {
    if (!url) return;
    const ctrl = new AbortController();
    fetch(url, { signal: ctrl.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
        setResult({ url, data: body as T });
      })
      .catch((e) => {
        if (e.name !== "AbortError") setResult({ url, error: e.message });
      });
    return () => ctrl.abort();
  }, [url]);

  const loading = url !== null && result?.url !== url;
  return {
    loading,
    data: loading ? null : (result?.data ?? null),
    error: loading ? null : (result?.error ?? null),
  };
}
