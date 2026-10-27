"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getNextLesson,
  getPreviousLesson,
  getStudentsSummary,
  countStudents,
  getFollowupCandidates,
  markFollowupDone,
  type FollowupCandidate,
  type NextLesson,
  type Lesson,
  type StudentSummary,
} from "@/lib/db";
import { getReminders, type ReminderItem } from "@/lib/reminders";
import {
  listUpcomingEvents,
  listEventsInDays,
  listTodayEvents,
  type CalendarEvent,
} from "@/lib/google-calendar";
import { formatDateHe } from "@/lib/datetime";
import CalendarSchedule from "@/components/CalendarSchedule";
import LinkToast from "@/components/LinkToast";
import { useCalendarLinking } from "@/components/useCalendarLinking";

const REMINDER_LABELS: Record<string, string> = {
  birthday: "יום הולדת",
  specialDate: "תאריך מיוחד",
  holiday: "חג",
};

export default function DashboardPage() {
  const [nextLesson, setNextLesson] = useState<NextLesson | null>(null);
  const [prevLesson, setPrevLesson] = useState<Lesson | null>(null);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [followups, setFollowups] = useState<FollowupCandidate[]>([]);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<CalendarEvent[] | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [showPastToday, setShowPastToday] = useState(false);

  const {
    ready,
    links,
    students: studentList,
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

    (async () => {
      const next = await getNextLesson();
      if (!active) return;
      setNextLesson(next);
      if (next) setPreviousLessonWrapper(next.studentId);
    })();

    async function setPreviousLessonWrapper(studentId: string) {
      setPrevLesson(await getPreviousLesson(studentId));
    }

    getStudentsSummary().then((s) => active && setStudents(s));
    countStudents("archived").then((c) => active && setArchivedCount(c));
    getReminders().then((r) => active && setReminders(r));
    getFollowupCandidates()
      .then((f) => active && setFollowups(f))
      .catch(() => active && setFollowups([]));
    // Needed to suppress a follow-up box when the student has a lesson today.
    listTodayEvents()
      .then((e) => active && setTodayEvents(e))
      .catch(() => active && setTodayEvents([]));

    listUpcomingEvents(5)
      .then(async (e) => {
        if (!active) return;
        setGoogleEvents(e);
        await applyPrediction(e);
      })
      .catch(() => active && setGoogleEvents(null));

    return () => {
      active = false;
    };
  }, [applyPrediction]);

  async function handlePredict() {
    if (!toast || toast.kind !== "linked") return;
    setBusy(true);
    try {
      await predictFuture(toast.event, toast.studentId);
    } finally {
      setBusy(false);
    }
  }

  /** Expand: show every lesson in the coming 3 days instead of the next 5. */
  async function toggleExpandSchedule() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (expandedEvents !== null) return;
    try {
      const ev = await listEventsInDays(3, 25);
      setExpandedEvents(ev);
      await applyPrediction(ev);
    } catch {
      setExpanded(false);
    }
  }

  const shownEvents = expanded ? (expandedEvents ?? googleEvents) : googleEvents;

  // Lessons from earlier today that already ended — shown dimmed on demand.
  const shownIds = new Set((shownEvents ?? []).map((e) => e.id));
  const nowMs = Date.now();
  const pastToday = showPastToday
    ? todayEvents.filter(
        (e) =>
          !!e.start &&
          e.start.length > 10 &&
          !shownIds.has(e.id) &&
          Date.parse(e.start) < nowMs,
      )
    : [];
  const mutedIds = new Set(pastToday.map((e) => e.id));
  const scheduleEvents = [...pastToday, ...(shownEvents ?? [])].sort(
    (a, b) => Date.parse(a.start ?? "") - Date.parse(b.start ?? ""),
  );

  // Next lesson: a DB-planned lesson wins; otherwise fall back to the next
  // Google Calendar event that is linked to a student.
  const nextLinkedEvent = nextLesson
    ? null
    : (googleEvents?.find((e) => links.get(e.id)) ?? null);
  const nextLinkedStudent = nextLinkedEvent
    ? studentList.find((s) => s.id === links.get(nextLinkedEvent.id))
    : undefined;
  const nextLinkedDateLabel = nextLinkedEvent?.start
    ? formatDateHe(
        nextLinkedEvent.start,
        nextLinkedEvent.start.length === 10
          ? { weekday: "short", day: "numeric", month: "short", year: "numeric" }
          : {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            },
      )
    : "";

  const toastStudentName =
    toast && studentList.find((s) => s.id === toast.studentId)?.name;

  // A follow-up box is suppressed while the student has a lesson scheduled today.
  const visibleFollowups = followups.filter(
    (f) => !todayEvents.some((e) => links.get(e.id) === f.studentId),
  );

  async function handleFollowupDone(studentId: string) {
    setFollowups((prev) => prev.filter((f) => f.studentId !== studentId));
    try {
      await markFollowupDone(studentId);
    } catch {
      // Keep the UI truthful if the write fails (e.g. migration not run yet).
      getFollowupCandidates().then(setFollowups).catch(() => {});
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">ראשי</h1>
        <p className="mt-1 text-sm text-muted-foreground">ברוכים הבאים ל־He:Bro</p>
      </div>

      {/* Next lesson prep card */}
      <section>
        <h2 className="font-heading text-lg font-semibold">השיעור הבא</h2>
        {nextLesson ? (
          <div className="mt-3 rounded-2xl border border-border bg-background p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link
                  href={`/students/view/?id=${nextLesson.studentId}`}
                  className="font-heading text-lg font-semibold text-brand hover:underline"
                >
                  {nextLesson.student.name}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
                    {formatDateHe(nextLesson.startsAt)}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/lessons/edit/?id=${nextLesson.studentId}&lesson=${nextLesson.id}`}
                  className="rounded-lg border border-border px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  עריכה
                </Link>
                <Link
                  href={`/lessons/new/?id=${nextLesson.studentId}`}
                  className="rounded-lg border border-border px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  + שיעור חדש לתלמיד
                </Link>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              {nextLesson.plannedTopics && (
                <div>
                  <dt className="text-muted-foreground">מתוכנן לשיעור:</dt>
                  <dd>{nextLesson.plannedTopics}</dd>
                </div>
              )}
              {prevLesson?.promisedNext && (
                <div>
                  <dt className="text-muted-foreground">הובטח בשיעור הקודם:</dt>
                  <dd>{prevLesson.promisedNext}</dd>
                </div>
              )}
              {prevLesson?.plannedTopics &&
                prevLesson.coveredTopics !== null &&
                prevLesson.coveredTopics !== prevLesson.plannedTopics && (
                  <div>
                    <dt className="text-muted-foreground">
                      פער מהשיעור הקודם (מתוכנן: {prevLesson.plannedTopics} · כוסה:{" "}
                      {prevLesson.coveredTopics || "—"}):
                    </dt>
                    <dd>השלימו את הנושאים שלא כוסו</dd>
                  </div>
                )}
            </dl>
          </div>
        ) : nextLinkedEvent && nextLinkedStudent ? (
          <div className="mt-3 rounded-2xl border border-border bg-background p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link
                  href={`/students/view/?id=${nextLinkedStudent.id}`}
                  className="font-heading text-lg font-semibold text-brand hover:underline"
                >
                  {nextLinkedStudent.name}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
                    {nextLinkedDateLabel}
                  </span>
                </p>
              </div>
              <Link
                href={`/lessons/new/?id=${nextLinkedStudent.id}`}
                className="rounded-lg border border-border px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
              >
                + שיעור חדש לתלמיד
              </Link>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">מתוך יומן Google:</dt>
                <dd>{nextLinkedEvent.summary}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            אין שיעורים מתוכננים. הוסיפו שיעור דרך כרטיס תלמיד.
          </div>
        )}
      </section>

      {/* Homework follow-ups — per student, opt-in */}
      <section>
        <h2 className="font-heading text-lg font-semibold">
          מעקב אחרי שיעורי בית
        </h2>
        {visibleFollowups.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            אין תלמידים שממתינים למעקב.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {visibleFollowups.map((f) => (
              <li
                key={f.studentId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/students/view/?id=${f.studentId}`}
                    className="font-medium hover:underline"
                  >
                    {f.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    השיעור האחרון תועד לפני {f.daysSinceLastLesson} ימים
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleFollowupDone(f.studentId)}
                  className="rounded-lg border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand transition-colors hover:bg-brand/20"
                >
                  סיימתי מעקב
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Upcoming dates */}
      {reminders.length > 0 && (
        <section>
          <h2 className="font-heading text-lg font-semibold">תאריכים קרובים</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {reminders.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-xl border border-border bg-background p-3 text-sm"
              >
                <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {REMINDER_LABELS[r.kind] ?? r.kind}
                </span>
                <span>
                  {r.studentId ? (
                    <Link
                      href={`/students/view/?id=${r.studentId}`}
                      className="font-medium hover:underline"
                    >
                      {r.studentName}:{" "}
                    </Link>
                  ) : null}
                  {r.text}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Google Calendar events */}
      {googleEvents && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-lg font-semibold">לוח השיעורים</h2>
            <div className="flex items-center gap-1 divide-s divide-border">
              <button
                type="button"
                onClick={() => setShowPastToday((v) => !v)}
                className="px-2 text-sm text-brand hover:underline"
              >
                {showPastToday
                  ? "הסתר שיעורים מהיום"
                  : "ראה עוד שיעורים מהיום"}
              </button>
              <Link
                href="/calendar/"
                className="px-2 text-sm text-brand hover:underline"
              >
                כל השיעורים ←
              </Link>
            </div>
          </div>
          <div className="mt-3">
            <CalendarSchedule
              events={scheduleEvents}
              links={links}
              students={studentList}
              onLink={linkEvent}
              onUnlink={removeEvent}
              editable={ready === true}
              mutedIds={mutedIds}
            />
          </div>
          <button
            type="button"
            onClick={toggleExpandSchedule}
            className="mt-3 text-sm text-brand hover:underline"
          >
            {expanded ? "כיווץ" : "הרחבה — 3 ימים"}
          </button>
        </section>
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

      {/* Students */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">התלמידים</h2>
          <div className="flex items-center gap-2">
            <Link
              href="/students/new/"
              className="rounded-lg border border-border px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
            >
              + תלמיד חדש
            </Link>
            <Link href="/students/" className="text-sm text-brand hover:underline">
              כל התלמידים ←
            </Link>
          </div>
        </div>
        {students.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            עדיין אין תלמידים פעילים.{" "}
            <Link href="/students/new/" className="text-brand hover:underline">
              הוספת תלמיד
            </Link>
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/students/view/?id=${s.id}`}
                  className="block rounded-xl border border-border bg-background p-3 transition-colors hover:bg-muted/50"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="ms-2 text-xs text-muted-foreground">
                    {s.lessonsCount} שיעורים
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {archivedCount > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            <Link href="/students/?tab=archived" className="hover:underline">
              {archivedCount} תלמידים בארכיון →
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
