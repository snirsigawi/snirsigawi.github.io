"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listUpcomingEvents, type CalendarEvent } from "@/lib/google-calendar";
import CalendarSchedule from "@/components/CalendarSchedule";
import LinkToast from "@/components/LinkToast";
import { useCalendarLinking } from "@/components/useCalendarLinking";

export default function CalendarSettingsPage() {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    ready,
    links,
    students,
    toast,
    applyPrediction,
    linkEvent,
    undoLast,
    predictFuture,
    removeEvent,
    dismissToast,
  } = useCalendarLinking();

  useEffect(() => {
    let active = true;
    listUpcomingEvents(30)
      .then(async (ev) => {
        if (!active) return;
        setEvents(ev);
        await applyPrediction(ev);
      })
      .catch((e: unknown) => {
        if (active)
          setError(e instanceof Error ? e.message : "טעינת היומן נכשלה");
      });
    return () => {
      active = false;
    };
  }, [applyPrediction]);

  async function handlePredict() {
    if (!toast || toast.kind !== "linked") return;
    setBusy(true);
    try {
      await predictFuture(toast.event, toast.studentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "החיזוי נכשל");
    } finally {
      setBusy(false);
    }
  }

  const toastStudentName =
    toast && students.find((s) => s.id === toast.studentId)?.name;

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
          שייכו כל שיעור ביומן לתלמיד המתאים. אחרי השיוך אפשר לחזות גם את כל
          השיעורים העתידיים.
        </p>
      </div>

      {ready === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-semibold">שיוך תלמידים כבוי זמנית</p>
          <p className="mt-1">
            צריך ליצור פעם אחת את טבלאות השיוך ב־Supabase. הריצו את ה־SQL הזה
            ב־
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
create table if not exists calendar_series_links (
  recurring_event_id text primary key,
  student_id uuid not null references students(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table calendar_links enable row level security;
alter table calendar_series_links enable row level security;
drop policy if exists "authenticated full access" on calendar_links;
drop policy if exists "authenticated full access" on calendar_series_links;
create policy "authenticated full access" on calendar_links
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on calendar_series_links
  for all to authenticated using (true) with check (true);
grant all on calendar_links to authenticated;
grant all on calendar_series_links to authenticated;
notify pgrst, 'reload schema';`}
          </pre>
          <p className="mt-2">לאחר ההרצה, רעננו את הדף — הכפתורים יופיעו.</p>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {events === null && !error && (
        <p className="text-sm text-muted-foreground">טוען…</p>
      )}

      {events && (
        <CalendarSchedule
          events={events}
          links={links}
          students={students}
          onLink={linkEvent}
          onUnlink={removeEvent}
          editable={ready === true}
        />
      )}

      {toast && toastStudentName && (
        <LinkToast
          toast={toast}
          studentName={toastStudentName}
          busy={busy}
          onUndo={undoLast}
          onPredict={handlePredict}
          onDecline={dismissToast}
        />
      )}
    </div>
  );
}
