"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getLesson, type Lesson } from "@/lib/db";
import { LessonForm, type LessonInitial } from "@/components/lessons/LessonForm";
import { splitDateTime } from "@/lib/datetime";

export default function EditLessonPage() {
  const [ids, setIds] = useState<{ studentId: string; lessonId: string } | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const studentId = params.get("id");
    const lessonId = params.get("lesson");
    if (!studentId || !lessonId) {
      setMissing(true);
      return;
    }
    setIds({ studentId, lessonId });
    getLesson(studentId, lessonId).then((l) => {
      if (!l) setMissing(true);
      else setLesson(l);
    });
  }, []);

  if (missing) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">שיעור לא נמצא.</p>
        <Link href="/students/" className="text-sm text-brand hover:underline">
          ← חזרה לרשימה
        </Link>
      </div>
    );
  }

  if (!ids || !lesson) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        <span className="animate-pulse">טוען…</span>
      </div>
    );
  }

  const initial: LessonInitial = {
    studentId: ids.studentId,
    startsAt: splitDateTime(new Date(lesson.startsAt)),
    endsAt: lesson.endsAt ? splitDateTime(new Date(lesson.endsAt)) : null,
    plannedTopics: lesson.plannedTopics,
    coveredTopics: lesson.coveredTopics,
    usedPresentation: lesson.usedPresentation,
    lastSlideNo: lesson.lastSlideNo,
    homeworkAssigned: lesson.homeworkAssigned,
    promisedNext: lesson.promisedNext,
    homeworkChecked: lesson.homeworkChecked,
    notes: lesson.notes,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/lessons/?id=${ids.studentId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← חזרה לציר השיעורים
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold">עריכת שיעור</h1>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <LessonForm mode="update" lessonId={ids.lessonId} initial={initial} />
      </div>
    </div>
  );
}
