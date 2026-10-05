"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listUpcomingEvents, type CalendarEvent } from "@/lib/google-calendar";
import CalendarSchedule from "@/components/CalendarSchedule";
import {
  getCalendarLinks,
  linkCalendarEvent,
  unlinkCalendarEvent,
  listStudents,
} from "@/lib/db";

export default function CalendarSettingsPage() {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [links, setLinks] = useState<Map<string, string>>(new Map());
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      listUpcomingEvents(10),
      getCalendarLinks(),
      listStudents("active"),
    ])
      .then(([ev, lk, st]) => {
        setEvents(ev);
        setLinks(lk);
        setStudents(st.map((s) => ({ id: s.id, name: s.name })));
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "טעינת היומן נכשלה"),
      );
  }, []);

  async function handleLink(eventId: string, studentId: string) {
    try {
      await linkCalendarEvent(eventId, studentId);
      setLinks((prev) => new Map(prev).set(eventId, studentId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "שיתוך נכשל");
    }
  }

  async function handleUnlink(eventId: string) {
    try {
      await unlinkCalendarEvent(eventId);
      setLinks((prev) => {
        const next = new Map(prev);
        next.delete(eventId);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "ניתוק נכשל");
    }
  }

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
        <p className="mt-1 text-sm text-muted-foreground">
          שרפו כל שיעור ביומן לתלמיד המתאים כדי לוודא שהוא מופיע בדף התלמיד.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {!error && events === null && (
        <p className="text-sm text-muted-foreground">טוען…</p>
      )}

      {events && (
        <CalendarSchedule
          events={events}
          links={links}
          students={students}
          onLink={handleLink}
          onUnlink={handleUnlink}
        />
      )}
    </div>
  );
}
