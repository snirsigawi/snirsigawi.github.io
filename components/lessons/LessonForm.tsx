"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLesson, updateLesson } from "@/lib/db";
import { parseLessonForm, validateLesson } from "@/lib/lessons-form";

export type LessonInitial = {
  studentId: string;
  startsAt: { date: string; time: string };
  endsAt: { date: string; time: string } | null;
  plannedTopics: string | null;
  coveredTopics: string | null;
  usedPresentation: boolean;
  lastSlideNo: number | null;
  homeworkAssigned: string | null;
  promisedNext: string | null;
  homeworkChecked: boolean;
  notes: string | null;
};

export function LessonForm({
  mode,
  lessonId,
  initial,
}: {
  mode: "create" | "update";
  lessonId?: string;
  initial: LessonInitial;
}) {
  const router = useRouter();
  const [usedPresentation, setUsedPresentation] = useState(initial.usedPresentation);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const startsAt = initial.startsAt ?? { date: "", time: "" };
  const endsAt = initial.endsAt ?? { date: "", time: "" };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const result = validateLesson(parseLessonForm(new FormData(e.currentTarget)));
    if ("error" in result) {
      setError(result.error);
      return;
    }

    setPending(true);
    try {
      if (mode === "create") {
        await createLesson(initial.studentId, result.input);
      } else if (lessonId) {
        await updateLesson(lessonId, result.input);
      }
      router.push(`/lessons/?id=${initial.studentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירה נכשלה");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startsAtDate" className="block text-sm font-medium">
            תאריך <span className="text-red-600">*</span>
          </label>
          <input
            id="startsAtDate"
            name="startsAtDate"
            type="date"
            required
            defaultValue={startsAt.date}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
        </div>
        <div>
          <label htmlFor="startsAtTime" className="block text-sm font-medium">
            שעת התחלה <span className="text-red-600">*</span>
          </label>
          <input
            id="startsAtTime"
            name="startsAtTime"
            type="time"
            required
            defaultValue={startsAt.time}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
        </div>
        <div>
          <label htmlFor="endsAtDate" className="block text-sm font-medium">
            תאריך סיום
          </label>
          <input
            id="endsAtDate"
            name="endsAtDate"
            type="date"
            defaultValue={endsAt.date}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
        </div>
        <div>
          <label htmlFor="endsAtTime" className="block text-sm font-medium">
            שעת סיום
          </label>
          <input
            id="endsAtTime"
            name="endsAtTime"
            type="time"
            defaultValue={endsAt.time}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="usedPresentation"
            checked={usedPresentation}
            onChange={(e) => setUsedPresentation(e.target.checked)}
            className="size-4"
          />
          שומש מצגת
        </label>
        {usedPresentation && (
          <div>
            <label htmlFor="lastSlideNo" className="block text-sm font-medium">
              מספר השקופית האחרונה
            </label>
            <input
              id="lastSlideNo"
              name="lastSlideNo"
              type="number"
              min={1}
              defaultValue={initial.lastSlideNo ?? ""}
              className="mt-1 w-32 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="plannedTopics" className="block text-sm font-medium">
            נושאים מתוכננים
          </label>
          <textarea
            id="plannedTopics"
            name="plannedTopics"
            rows={2}
            defaultValue={initial.plannedTopics ?? ""}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
        </div>
        <div>
          <label htmlFor="coveredTopics" className="block text-sm font-medium">
            נושאים שכוסו
          </label>
          <textarea
            id="coveredTopics"
            name="coveredTopics"
            rows={2}
            defaultValue={initial.coveredTopics ?? ""}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            הפער בין מתוכנן למכוסה = עדיפות לשיעור הבא.
          </p>
        </div>

        <div>
          <label htmlFor="homeworkAssigned" className="block text-sm font-medium">
            שיעורי בית שהוקצו
          </label>
          <textarea
            id="homeworkAssigned"
            name="homeworkAssigned"
            rows={2}
            defaultValue={initial.homeworkAssigned ?? ""}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
        </div>
        <div>
          <label htmlFor="promisedNext" className="block text-sm font-medium">
            מה הובטח לשיעור הבא
          </label>
          <textarea
            id="promisedNext"
            name="promisedNext"
            rows={2}
            defaultValue={initial.promisedNext ?? ""}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium">
            הערות
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={initial.notes ?? ""}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="homeworkChecked"
            defaultChecked={initial.homeworkChecked}
            className="size-4"
          />
          שיעורי הבית נבדקו
        </label>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
        >
          ביטול
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-5 py-2 font-heading text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "שומר…" : "שמירה"}
        </button>
      </div>
    </form>
  );
}
