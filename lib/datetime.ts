/** Split a Date into local {date:"YYYY-MM-DD", time:"HH:MM"} parts. */
export function splitDateTime(d: Date | null | undefined): {
  date: string;
  time: string;
} {
  if (!d) return { date: "", time: "" };
  const p = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

/** Format a Date as a Hebrew long date string. */
export function formatDateHe(
  d: Date | string,
  opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  },
): string {
  return new Intl.DateTimeFormat("he-IL", opts).format(
    typeof d === "string" ? new Date(d) : d,
  );
}
