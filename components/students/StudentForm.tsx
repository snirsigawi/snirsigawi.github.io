"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SkillLevelField, type SkillLevelValue } from "./SkillLevelField";
import { SpecialDateField } from "./SpecialDateField";
import { SKILLS, type Skill } from "@/lib/tags";
import {
  createStudent,
  updateStudent,
  getStudentDetail,
  type StudentDetail,
} from "@/lib/db";
import { parseStudentForm, validateStudent, AGE_RANGES } from "@/lib/students-form";

export function StudentForm({
  mode,
  studentId,
}: {
  mode: "create" | "update";
  studentId?: string;
}) {
  const router = useRouter();
  const [initial, setInitial] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (mode === "update" && studentId) {
      getStudentDetailWrapper(studentId);
    }
    async function getStudentDetailWrapper(id: string) {
      const s = await getStudentDetail(id);
      setInitial(s);
    }
  }, [mode, studentId]);

  if (mode === "update" && !initial) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        <span className="animate-pulse">טוען…</span>
      </div>
    );
  }

  // Skill values keyed by skill.
  const skillValues = {} as Record<Skill, SkillLevelValue>;
  for (const skill of SKILLS) {
    const found = initial?.skillLevels.find((sl) => sl.skill === skill);
    skillValues[skill] = found
      ? { skill, level: found.level, note: found.note ?? "", tags: found.tags }
      : { skill, level: "", note: "", tags: [] };
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = parseStudentForm(new FormData(e.currentTarget));
    const validationError = validateStudent(data);
    if (validationError) {
      setError(validationError);
      return;
    }

    setPending(true);
    try {
      if (mode === "create") {
        const id = await createStudent(data);
        router.push(`/students/view/?id=${id}`);
      } else if (studentId) {
        await updateStudent(studentId, data);
        router.push(`/students/view/?id=${studentId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירה נכשלה");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">פרטים בסיסיים</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium">
              שם <span className="text-red-600">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={initial?.name ?? ""}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="age" className="block text-sm font-medium">
              גיל
            </label>
            <input
              id="age"
              name="age"
              type="number"
              min={0}
              max={120}
              defaultValue={initial?.age ?? ""}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="ageRange" className="block text-sm font-medium">
              קבוצת גיל
            </label>
            <select
              id="ageRange"
              name="ageRange"
              defaultValue={initial?.ageRange ?? ""}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            >
              <option value="">— לא נבחרה —</option>
              {AGE_RANGES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium">
              עיר <span className="text-red-600">*</span>
            </label>
            <input
              id="city"
              name="city"
              type="text"
              required
              defaultValue={initial?.city ?? ""}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium">
              מדינה <span className="text-red-600">*</span>
            </label>
            <input
              id="country"
              name="country"
              type="text"
              required
              defaultValue={initial?.country ?? ""}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="lessonsLocation" className="block text-sm font-medium">
              מקום לימוד
            </label>
            <input
              id="lessonsLocation"
              name="lessonsLocation"
              type="text"
              defaultValue={initial?.lessonsLocation ?? ""}
              placeholder="לדוגמה: זום / בבית התלמיד / אצלי"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="birthday" className="block text-sm font-medium">
              יום הולדת
            </label>
            <input
              id="birthday"
              name="birthday"
              type="date"
              defaultValue={initial?.birthday ?? ""}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">רקע ומטרות</h2>
        <div className="grid gap-4">
          <div>
            <label htmlFor="whyLearning" className="block text-sm font-medium">
              למה לומד עברית?
            </label>
            <textarea
              id="whyLearning"
              name="whyLearning"
              rows={2}
              defaultValue={initial?.whyLearning ?? ""}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </div>
          <div>
            <label htmlFor="whatFor" className="block text-sm font-medium">
              למה צריך את זה?
            </label>
            <textarea
              id="whatFor"
              name="whatFor"
              rows={2}
              defaultValue={initial?.whatFor ?? ""}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">מיומנויות</h2>
        <p className="text-sm text-muted-foreground">
          לכל מיומנות: רמה, תגיות והערה חופשית.
        </p>
        <SkillLevelField values={skillValues} />
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">תאריכים מיוחדים</h2>
        <SpecialDateField
          initialDates={
            initial?.specialDates.map((sd) => ({ date: sd.date, label: sd.label })) ??
            []
          }
        />
      </section>

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
