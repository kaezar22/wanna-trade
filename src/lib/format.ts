// Formatos en español de Colombia.

export function formatPrice(value: number, currency: string | null) {
  const digits = Math.abs(value) >= 1000 ? 0 : 2;
  const n = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  return currency ? `${n} ${currency}` : n;
}

export function formatPercent(value: number, signed = false) {
  if (!Number.isFinite(value)) return "—";
  const s = new Intl.NumberFormat("es-CO", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
  return signed && value > 0 ? `+${s}` : s;
}

export function formatNumber(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

const dateFmt = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(iso: string) {
  return dateFmt.format(new Date(`${iso}T00:00:00Z`));
}
