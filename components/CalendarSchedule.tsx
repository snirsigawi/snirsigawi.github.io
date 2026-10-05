"use client";

import type { CalendarEvent } from "@/lib/google-calendar";

/**
 * Day-grouped schedule of calendar events.
 *
 * Events are clustered under readable day headers ("היום" / "מחר" / weekday +
 * date); every row leads with its clock time, so the agenda reads like a real
 * timetable rather than a flat list of dates.
 */

type Day = {
  key: string;
  label: string;
  relative: string | null;
  events: { event: CalendarEvent; timeLabel: string; allDay: boolean }[];
};

const dateKeyFmt = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("he-IL", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function dayLabel(d: Date): string {
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(d);
}

function relativeBadge(key: string): string | null {
  const today = new Date();
  const todayKey = dateKeyFmt.format(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowKey = dateKeyFmt.format(tomorrow);

  if (key === todayKey) return "היום";
  if (key === tomorrowKey) return "מחר";
  return null;
}

/** "20:00" or "20:00–21:00"; all-day events render as "כל היום". */
function timeLabelFor(event: CalendarEvent): { label: string; allDay: boolean } {
  if (!event.start) return { label: "", allDay: false };
  const start = new Date(event.start);

  // A date-only start (no time component) is an all-day event.
  if (event.start.length === 10) return { label: "כל היום", allDay: true };

  const startLabel = timeFmt.format(start);
  if (event.end && event.end.length > 10) {
    const end = new Date(event.end);
    // Calendar all-day boundaries ending at 00:00 shouldn't show a trailing time.
    if (!(end.getHours() === 0 && end.getMinutes() === 0)) {
      return { label: `${startLabel}–${timeFmt.format(end)}`, allDay: false };
    }
  }
  return { label: startLabel, allDay: false };
}

function groupByDay(events: CalendarEvent[]): Day[] {
  const map = new Map<string, Day>();

  for (const event of events) {
    if (!event.start) continue;
    const start = new Date(event.start);
    const key = dateKeyFmt.format(start);

    let day = map.get(key);
    if (!day) {
      day = {
        key,
        label: dayLabel(start),
        relative: relativeBadge(key),
        events: [],
      };
      map.set(key, day);
    }
    const { label, allDay } = timeLabelFor(event);
    day.events.push({ event, timeLabel: label, allDay });
  }

  return Array.from(map.values());
}

export default function CalendarSchedule({
  events,
}: {
  events: CalendarEvent[];
}) {
  const days = groupByDay(events);

  if (days.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">אין אירועים קרובים ביומן.</p>
    );
  }

  return (
    <div className="space-y-4">
      {days.map((day) => (
        <section key={day.key}>
          {/* Day header */}
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-sm font-semibold">{day.label}</h3>
            {day.relative && (
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                {day.relative}
              </span>
            )}
          </div>

          {/* Event rows */}
          <ul className="mt-2 overflow-hidden rounded-xl border border-border bg-background">
            {day.events.map(({ event, timeLabel, allDay }, i) => (
              <li
                key={event.id}
                className={`flex items-center gap-3 p-3 ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                {/* Time — the anchor that makes the row scannable */}
                <span
                  dir="ltr"
                  style={{ unicodeBidi: "isolate" }}
                  className={`w-[96px] shrink-0 text-sm tabular-nums ${
                    allDay
                      ? "text-muted-foreground"
                      : "font-semibold text-foreground"
                  }`}
                >
                  {timeLabel}
                </span>

                <span className="min-w-0 flex-1 truncate text-sm">
                  {event.summary}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
