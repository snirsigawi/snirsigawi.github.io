"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStudentDetail, type StudentDetail } from "@/lib/db";
import { StudentActions } from "@/components/students/StudentActions";

function formatDate(d: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${d}T00:00:00Z`));
}

function formatDateNoYear(d: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${d}T00:00:00Z`));
}

export default function ViewStudentPage() {
  const [id, setId] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    const sid = new URLSearchParams(window.location.search).get("id");
    if (!sid) {
      setMissing(true);
      return;
    }
    setId(sid);
    getStudentDetail(sid)
      .then((s) => {
        if (!s) setMissing(true);
        else setStudent(s);
      })
      .catch((e: unknown) => {
        setErrMsg(e instanceof Error ? e.message : String(e));
        setMissing(true);
      });
  }, []);

  if (missing || !id) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">תלמיד לא נמצא.</p>
        {errMsg && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
            {errMsg}
          </p>
        )}
        <Link href="/students/" className="text-sm text-brand hover:underline">
          ← חזרה לרשימה
        </Link>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        <span className="animate-pulse">טוען…</span>
      </div>
    );
  }

  const isArchived = student.status === "archived";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/students/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← חזרה לרשימה
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">{student.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {student.city}
              {student.country ? `, ${student.country}` : ""}
              {student.age !== null ? ` · גיל ${student.age}` : ""}
              {student.ageRange ? ` · ${student.ageRange}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/students/edit/?id=${id}`}
              className="rounded-lg border border-border px-3 py-2 font-heading text-sm font-medium transition-colors hover:bg-muted"
            >
              עריכה
            </Link>
            <StudentActions id={id} status={student.status} />
          </div>
        </div>
        {isArchived && (
          <span className="mt-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            תלמיד בארכיון
          </span>
        )}
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        {student.lessonsLocation && (
          <div className="rounded-xl border border-border bg-background p-4">
            <h3 className="text-xs font-medium uppercase text-muted-foreground">
              מקום לימוד
            </h3>
            <p className="mt-1">{student.lessonsLocation}</p>
          </div>
        )}
        {student.birthday && (
          <div className="rounded-xl border border-border bg-background p-4">
            <h3 className="text-xs font-medium uppercase text-muted-foreground">
              יום הולדת
            </h3>
            <p className="mt-1">
              <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
                {formatDateNoYear(student.birthday)}
              </span>
            </p>
          </div>
        )}
        {student.whyLearning && (
          <div className="rounded-xl border border-border bg-background p-4">
            <h3 className="text-xs font-medium uppercase text-muted-foreground">
              למה לומד עברית?
            </h3>
            <p className="mt-1 whitespace-pre-wrap">{student.whyLearning}</p>
          </div>
        )}
        {student.whatFor && (
          <div className="rounded-xl border border-border bg-background p-4">
            <h3 className="text-xs font-medium uppercase text-muted-foreground">
              למה צריך את זה?
            </h3>
            <p className="mt-1 whitespace-pre-wrap">{student.whatFor}</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-heading text-lg font-semibold">מיומנויות</h2>
        {student.skillLevels.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">טרם נקבעו מיומנויות.</p>
        ) : (
          <div className="mt-2 space-y-3">
            {student.skillLevels.map((sl) => (
              <div key={sl.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-heading text-base font-semibold">
                    {sl.skill === "reading" ? "קריאה" : sl.skill === "speaking" ? "דיבור" : "הקשבה"}
                  </h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {sl.level === "beginner" ? "מתחיל" : sl.level === "intermediate" ? "בינוני" : "מתקדם"}
                  </span>
                </div>
                {sl.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {sl.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-border px-2 py-0.5 text-xs"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {sl.note && (
                  <p className="mt-2 whitespace-pre-wrap text-sm">{sl.note}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {student.specialDates.length > 0 && (
        <section>
          <h2 className="font-heading text-lg font-semibold">תאריכים מיוחדים</h2>
          <div className="mt-2 space-y-2">
            {student.specialDates.map((sd) => (
              <div
                key={sd.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <span>{sd.label}</span>
                <span
                  dir="ltr"
                  style={{ unicodeBidi: "isolate" }}
                  className="text-muted-foreground"
                >
                  {formatDateNoYear(sd.date)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">שיעורים אחרונים</h2>
          <Link
            href={`/lessons/?id=${id}`}
            className="text-sm text-brand hover:underline"
          >
            כל השיעורים ←
          </Link>
        </div>
        {student.lessons.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">עדיין אין שיעורים.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {student.lessons.slice(0, 5).map((l) => (
              <div
                key={l.id}
                className="rounded-lg border border-border bg-background px-3 py-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    dir="ltr"
                    style={{ unicodeBidi: "isolate" }}
                    className="font-medium"
                  >
                    {formatDate(l.startsAt.slice(0, 10))}
                  </span>
                  {l.usedPresentation && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      שקופית אחרונה: {l.lastSlideNo ?? "—"}
                    </span>
                  )}
                </div>
                {l.coveredTopics && (
                  <p className="mt-1 text-muted-foreground line-clamp-2">{l.coveredTopics}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
