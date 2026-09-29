"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listLessons, type Lesson } from "@/lib/db";
import { LessonCard } from "@/components/lessons/LessonCard";

export default function LessonsPage() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) {
      setMissing(true);
      return;
    }
    setStudentId(id);
    listLessons(id).then((rows) => {
      setLessons(rows);
    });
    // Student name is shown on each card link target; fetch minimal via db.
    import("@/lib/db").then(({ getStudentDetail }) =>
      getStudentDetail(id).then((s) => s && setStudentName(s.name)),
    );
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={studentId ? `/students/view/?id=${studentId}` : "/students/"}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← חזרה לכרטיס התלמיד
          </Link>
          <h1 className="mt-2 font-heading text-2xl font-bold">
            שיעורים{studentName ? `: ${studentName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{lessons.length} שיעורים</p>
        </div>
        {studentId && (
          <Link
            href={`/lessons/new/?id=${studentId}`}
            className="rounded-lg bg-brand px-4 py-2 font-heading text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90"
          >
            + שיעור חדש
          </Link>
        )}
      </div>

      {lessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <p className="text-muted-foreground">
            עדיין אין שיעורים. לחץ על „שיעור חדש" כדי להוסיף.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-4 border-s-2 border-border ps-6">
          {lessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </ol>
      )}
    </div>
  );
}
