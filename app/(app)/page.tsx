"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getNextLesson,
  getPreviousLesson,
  getStudentsSummary,
  countStudents,
  type NextLesson,
  type Lesson,
  type StudentSummary,
} from "@/lib/db";
import { getReminders, type ReminderItem } from "@/lib/reminders";
import {
  listUpcomingEvents,
  type CalendarEvent,
} from "@/lib/google-calendar";
import { formatDateHe } from "@/lib/datetime";

const REMINDER_LABELS: Record<string, string> = {
  uncheckedHomework: "שיעורי בית",
  promisedNext: "הבטחה",
  topicGap: "פער נושאים",
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
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[] | null>(null);

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

    listUpcomingEvents(5)
      .then((e) => active && setGoogleEvents(e))
      .catch(() => active && setGoogleEvents(null));

    return () => {
      active = false;
    };
  }, []);

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
              <Link
                href={`/lessons/new/?id=${nextLesson.studentId}`}
                className="rounded-lg border border-border px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
              >
                + שיעור חדש לתלמיד
              </Link>
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
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            אין שיעורים מתוכננים. הוסיפו שיעור דרך כרטיס תלמיד.
          </div>
        )}
      </section>

      {/* Reminders */}
      <section>
        <h2 className="font-heading text-lg font-semibold">תזכורות</h2>
        {reminders.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">אין תזכורות</p>
        ) : (
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
        )}
      </section>

      {/* Google Calendar events */}
      {googleEvents && (
        <section>
          <h2 className="font-heading text-lg font-semibold">מהיומן</h2>
          {googleEvents.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">אין אירועים קרובים ביומן.</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {googleEvents.map((e) => (
                <li
                  key={e.id}
                  className="rounded-xl border border-border bg-background p-3 text-sm"
                >
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
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Students */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">התלמידים</h2>
          <Link href="/students/" className="text-sm text-brand hover:underline">
            כל התלמידים →
          </Link>
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
