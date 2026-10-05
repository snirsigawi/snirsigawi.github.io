"use client";

import type { CalendarEvent } from "@/lib/google-calendar";

/**
 * Agenda-style schedule: each day has a bold date block on the side, and events
 * appear as cards with a prominent time pill. Times always visible, day
 * grouping makes the timeline immediately scannable.
 */

type Day = {
  key: string;
  weekday: string;
  dayNum: string;
  month: string;
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
const weekdayFmt = new Intl.DateTimeFormat("he-IL", { weekday: "short" });
const monthFmt = new Intl.DateTimeFormat("he-IL", { month: "short" });
const dayNumFmt = new Intl.DateTimeFormat("en-CA", { day: "numeric" });

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

  if (event.start.length === 10) return { label: "כל היום", allDay: true };

  const startLabel = timeFmt.format(start);
  if (event.end && event.end.length > 10) {
    const end = new Date(event.end);
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
        weekday: weekdayFmt.format(start),
        dayNum: dayNumFmt.format(start),
        month: monthFmt.format(start),
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
    <div className="space-y-5">
      {days.map((day) => (
        <section key={day.key} className="flex gap-4">
          {/* Date block — the visual anchor for the day */}
          <div className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-border bg-muted/40 p-2">
            <span className="font-heading text-2xl font-bold leading-none text-brand">
              {day.dayNum}
            </span>
            <span className="mt-1 text-[11px] text-muted-foreground">
              {day.month}
            </span>
            <span className="mt-0.5 text-[11px] font-medium text-foreground/70">
              {day.weekday}
            </span>
          </div>

          {/* Events */}
          <div className="min-w-0 flex-1 space-y-2">
            {day.relative && (
              <span className="inline-block rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                {day.relative}
              </span>
            )}
            {day.events.map(({ event, timeLabel, allDay }) => (
              <div
                key={event.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-background p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Time pill */}
                <span
                  dir="ltr"
                  style={{ unicodeBidi: "isolate" }}
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ${
                    allDay
                      ? "bg-muted text-muted-foreground"
                      : "bg-brand/10 text-brand"
                  }`}
                >
                  {timeLabel}
                </span>

                {/* Event title */}
                <span className="min-w-0 flex-1 pt-1 text-sm font-medium leading-tight">
                  {event.summary}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
