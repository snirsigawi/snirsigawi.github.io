"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listUpcomingEvents, type CalendarEvent } from "@/lib/google-calendar";
import { formatDateHe } from "@/lib/datetime";

export default function CalendarSettingsPage() {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listUpcomingEvents(10)
      .then(setEvents)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "טעינת היומן נכשלה"),
      );
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← חזרה להגדרות
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold">יומן Google</h1>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <h2 className="font-heading text-base font-semibold">האירועים הקרובים</h2>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        {!error && events === null && (
          <p className="mt-3 text-sm text-muted-foreground">טוען…</p>
        )}

        {events && events.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">אין אירועים קרובים.</p>
        )}

        {events && events.length > 0 && (
          <div className="mt-3 space-y-2 text-sm">
            {events.map((e) => (
              <div key={e.id} className="rounded-xl border border-border p-3">
                <span className="font-medium">{e.summary}</span>
                {e.start && (
                  <span
                    dir="ltr"
                    style={{ unicodeBidi: "isolate" }}
                    className="ms-2 text-muted-foreground"
                  >
                    {formatDateHe(e.start)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
