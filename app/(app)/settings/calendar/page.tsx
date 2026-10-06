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
  const [linkingEnabled, setLinkingEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    // Events load independently — a missing links table must never break the
    // calendar itself.
    listUpcomingEvents(10)
      .then(setEvents)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "טעינת היומן נכשלה"),
      );

    listStudents("active")
      .then((st) => setStudents(st.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => setStudents([]));

    getCalendarLinks()
      .then(setLinks)
      .catch(() => {
        // The calendar_links table hasn't been created yet. The calendar still
        // works; linking is hidden until the one-time SQL is run.
        setLinkingEnabled(false);
        setLinks(new Map());
      });
  }, []);

  async function handleLink(eventId: string, studentId: string) {
    setLinkError(null);
    try {
      await linkCalendarEvent(eventId, studentId);
      setLinks((prev) => new Map(prev).set(eventId, studentId));
    } catch (e) {
      setLinkingEnabled(false);
      setLinkError(
        e instanceof Error
          ? `השיוך נכשל: ${e.message}`
          : "השיוך נכשל — הזינו את הרשאות הגישה ב־Supabase.",
      );
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
      setLinkingEnabled(false);
      setLinkError(
        e instanceof Error ? `הניתוק נכשל: ${e.message}` : "הניתוק נכשל.",
      );
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
          שייכו כל שיעור ביומן לתלמיד המתאים כדי לוודא שהוא מופיע בדף התלמיד.
        </p>
      </div>

      {!linkingEnabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-semibold">שיוך תלמידים כבוי זמנית</p>
          <p className="mt-1">
            צריך ליצור פעם אחת את טבלת השיוך ב־Supabase. הריצו את ה־SQL הזה ב־
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              SQL Editor
            </a>
            :
          </p>
          <pre
            dir="ltr"
            className="mt-2 overflow-x-auto rounded-lg bg-black/10 p-3 text-xs dark:bg-white/10"
          >
{`create table if not exists calendar_links (
  google_event_id text primary key,
  student_id uuid not null references students(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table calendar_links enable row level security;
drop policy if exists "authenticated full access" on calendar_links;
create policy "authenticated full access" on calendar_links
  for all to authenticated using (true) with check (true);
grant all on calendar_links to authenticated;
notify pgrst, 'reload schema';`}
          </pre>
          <p className="mt-2">לאחר ההרצה, רעננו את הדף — הכפתורים יופיעו.</p>
        </div>
      )}

      {linkError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {linkError}
        </p>
      )}

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
          editable={linkingEnabled}
        />
      )}
    </div>
  );
}
