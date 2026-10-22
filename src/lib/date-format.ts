function parseDisplayDate(value: unknown) {
  if (!(value instanceof Date) && typeof value !== "string" && typeof value !== "number") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value: unknown) {
  return parseDisplayDate(value)?.toLocaleString() ?? "Date unavailable";
}

export function formatDate(value: unknown) {
  return parseDisplayDate(value)?.toLocaleDateString() ?? "Date unavailable";
}
