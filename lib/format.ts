export const TZ = "Asia/Colombo";

export function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, weekday: "short", day: "numeric", month: "short",
  }).format(d);
}

export function formatTime(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
}

export function formatRange(start: Date, end: Date) {
  return `${formatDate(start)}, ${formatTime(start)} – ${formatTime(end)}`;
}

/** Start/end of "today" in Sri Lanka time, as UTC Dates. */
export function todayBounds(now = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now); // YYYY-MM-DD
  const start = new Date(`${ymd}T00:00:00+05:30`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** YYYY-MM-DD for a Date, in Sri Lanka time. */
export function toYmd(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

/** Minutes since midnight, in Sri Lanka time. */
export function minutesOfDay(d: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")!.value) % 24;
  const m = Number(parts.find((p) => p.type === "minute")!.value);
  return h * 60 + m;
}