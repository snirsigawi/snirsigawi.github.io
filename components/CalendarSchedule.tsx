"use client";

import { useState } from "react";
import type { CalendarEvent } from "@/lib/google-calendar";

/**
 * Agenda-style schedule: each day has a bold date block on the side, and events
 * appear as cards with a prominent time pill. Events can be linked to a student.
 */

type Day = {
  key: string;
  weekday: string;
  dayNum: string;
  month: string;
  relative: string | null;
  events: { event: CalendarEvent; timeLabel: string; allDay: boolean }[];
};

export type CalendarScheduleProps = {
  events: CalendarEvent[];
  /** eventId → studentId */
  links: Map<string, string>;
  students: { id: string; name: string }[];
  onLink: (eventId: string, studentId: string) => void;
  onUnlink: (eventId: string) => void;
  /** Show/hide the student linking controls (false for student view). */
  editable?: boolean;
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
  links,
  students,
  onLink,
  onUnlink,
  editable = true,
}: CalendarScheduleProps) {
  const days = groupByDay(events);
  const [openPicker, setOpenPicker] = useState<string | null>(null);

  if (days.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">אין אירועים קרובים ביומן.</p>
    );
  }

  const studentName = (id: string) =>
    students.find((s) => s.id === id)?.name ?? "תלמיד";

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
            {day.events.map(({ event, timeLabel, allDay }) => {
              const linkedStudentId = links.get(event.id);
              const isOpen = openPicker === event.id;

              return (
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

                  {/* Event title + link */}
                  <div className="min-w-0 flex-1">
                    <p className="pt-1 text-sm font-medium leading-tight">
                      {event.summary}
                    </p>

                    {editable && (
                      <div className="mt-2">
                        {linkedStudentId ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-200">
                            {studentName(linkedStudentId)}
                            <button
                              type="button"
                              onClick={() => onUnlink(event.id)}
                              className="ml-1 text-green-700 hover:text-green-900 dark:text-green-300 dark:hover:text-green-100"
                              title="ניתוק תלמיד"
                            >
                              ✕
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setOpenPicker(isOpen ? null : event.id)
                            }
                            className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-brand hover:text-brand"
                          >
                            + שיוך לתלמיד
                          </button>
                        )}

                        {isOpen && !linkedStudentId && (
                          <div className="mt-2 rounded-lg border border-border bg-muted/30 p-1.5">
                            {students.length === 0 ? (
                              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                                אין תלמידים ברשימה
                              </p>
                            ) : (
                              <ul className="max-h-44 overflow-y-auto">
                                {students.map((s) => (
                                  <li key={s.id}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onLink(event.id, s.id);
                                        setOpenPicker(null);
                                      }}
                                      className="block w-full rounded px-2 py-1.5 text-start text-sm hover:bg-background"
                                    >
                                      {s.name}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
