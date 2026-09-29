"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getLastLesson, type Lesson } from "@/lib/db";
import { LessonForm, type LessonInitial } from "@/components/lessons/LessonForm";

export default function NewLessonPage() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [lastLesson, setLastLesson] = useState<Lesson | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
      setMissing(true);
      return;
    }
    setStudentId(id);
    getLastLesson(id).then(setLastLesson);
  }, []);

  if (missing) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">לא נבחר תלמיד.</p>
        <Link href="/students/" className="text-sm text-brand hover:underline">
          ← חזרה לרשימה
        </Link>
      </div>
    );
  }

  const initial: LessonInitial = {
    studentId: studentId ?? "",
    startsAt: { date: "", time: "" },
    endsAt: null,
    plannedTopics:
      [lastLesson?.promisedNext, lastLesson?.coveredTopics]
        .filter(Boolean)
        .join(" · ") || null,
    coveredTopics: null,
    usedPresentation: lastLesson?.usedPresentation ?? false,
    lastSlideNo: lastLesson?.lastSlideNo ?? null,
    homeworkAssigned: null,
    promisedNext: null,
    homeworkChecked: false,
    notes: null,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={studentId ? `/lessons/?id=${studentId}` : "/students/"}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← חזרה לציר השיעורים
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold">שיעור חדש</h1>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        {studentId && <LessonForm mode="create" initial={initial} />}
      </div>
    </div>
  );
}
