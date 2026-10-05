"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listUpcomingEvents, type CalendarEvent } from "@/lib/google-calendar";
import CalendarSchedule from "@/components/CalendarSchedule";

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

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {!error && events === null && (
        <p className="text-sm text-muted-foreground">טוען…</p>
      )}

      {events && <CalendarSchedule events={events} />}
    </div>
  );
}
