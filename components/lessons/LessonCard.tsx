"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLesson, setHomeworkChecked, type Lesson } from "@/lib/db";

const fmtDate = new Intl.DateTimeFormat("he-IL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const fmtTime = new Intl.DateTimeFormat("he-IL", {
  hour: "2-digit",
  minute: "2-digit",
});

function fmt(iso: string) {
  const d = new Date(iso);
  return `${fmtDate.format(d)} · ${fmtTime.format(d)}`;
}

export function LessonCard({ lesson }: { lesson: Lesson }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [checked, setChecked] = useState(lesson.homeworkChecked);

  return (
    <li className="relative rounded-2xl border border-border bg-background p-4">
      {/* Timeline dot */}
      <span
        className="absolute -start-[31px] top-6 size-3 rounded-full border-2 border-brand bg-background"
        aria-hidden
      />

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span
            dir="ltr"
            style={{ unicodeBidi: "isolate" }}
            className="font-heading font-semibold"
          >
            {fmt(lesson.startsAt)}
          </span>
          {lesson.endsAt && (
            <span
              dir="ltr"
              style={{ unicodeBidi: "isolate" }}
              className="ms-2 text-xs text-muted-foreground"
            >
              עד {fmtTime.format(new Date(lesson.endsAt))}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/lessons/edit/?id=${lesson.studentId}&lesson=${lesson.id}`}
            className="rounded-lg border border-border px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
          >
            עריכה
          </Link>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm("מחיקת שיעור?")) return;
              startTransition(async () => {
                await deleteLesson(lesson.id);
                router.refresh();
              });
            }}
            className="rounded-lg border border-red-300 px-2 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
          >
            מחיקה
          </button>
        </div>
      </div>

      <div className="mt-2 space-y-1.5 text-sm">
        {lesson.plannedTopics && (
          <p>
            <span className="text-muted-foreground">מתוכנן: </span>
            {lesson.plannedTopics}
          </p>
        )}
        {lesson.coveredTopics && (
          <p>
            <span className="text-muted-foreground">כוסה: </span>
            {lesson.coveredTopics}
          </p>
        )}
        {lesson.usedPresentation && (
          <p className="text-sm">
            <span className="text-muted-foreground">מצגת: </span>
            שקופית אחרונה {lesson.lastSlideNo ?? "—"}
          </p>
        )}
        {lesson.homeworkAssigned && (
          <p>
            <span className="text-muted-foreground">שיעורי בית: </span>
            {lesson.homeworkAssigned}
          </p>
        )}
        {lesson.promisedNext && (
          <p>
            <span className="text-muted-foreground">הובטח לבא: </span>
            {lesson.promisedNext}
          </p>
        )}
        {lesson.notes && <p className="text-muted-foreground">{lesson.notes}</p>}
      </div>

      {lesson.homeworkAssigned && (
        <label className="mt-3 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={checked}
            disabled={pending}
            onChange={(e) => {
              const v = e.target.checked;
              setChecked(v);
              startTransition(async () => {
                await setHomeworkChecked(lesson.id, v);
              });
            }}
            className="size-3.5"
          />
          שיעורי הבית נבדקו
        </label>
      )}
    </li>
  );
}
