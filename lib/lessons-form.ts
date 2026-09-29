import type { LessonInput } from "@/lib/db";

function parseDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type ParsedLessonForm = {
  startsAt: Date | null;
  endsAt: Date | null;
  fields: Omit<
    LessonInput,
    "startsAt" | "endsAt"
  >;
};

/** Parse a submitted lesson form (client-side). */
export function parseLessonForm(formData: FormData): ParsedLessonForm {
  const get = (key: string) => (formData.get(key) as string | null)?.trim() ?? "";
  const lastSlideRaw = get("lastSlideNo");
  const usedPresentation = formData.get("usedPresentation") === "on";

  return {
    startsAt: parseDateTime(get("startsAtDate"), get("startsAtTime")),
    endsAt:
      get("endsAtDate") && get("endsAtTime")
        ? parseDateTime(get("endsAtDate"), get("endsAtTime"))
        : null,
    fields: {
      plannedTopics: get("plannedTopics") || null,
      coveredTopics: get("coveredTopics") || null,
      usedPresentation,
      lastSlideNo: lastSlideRaw ? Number(lastSlideRaw) : null,
      homeworkAssigned: get("homeworkAssigned") || null,
      promisedNext: get("promisedNext") || null,
      homeworkChecked: formData.get("homeworkChecked") === "on",
      notes: get("notes") || null,
    },
  };
}

/** Returns an error message or a fully-built LessonInput. */
export function validateLesson(
  parsed: ParsedLessonForm,
): { error: string } | { input: LessonInput } {
  if (!parsed.startsAt) return { error: "חובה למלא תאריך ושעת התחלה" };
  if (parsed.endsAt && parsed.endsAt < parsed.startsAt) {
    return { error: "שעת סיום לפני שעת התחלה" };
  }
  if (
    parsed.fields.lastSlideNo !== null &&
    (parsed.fields.lastSlideNo < 1 ||
      !Number.isInteger(parsed.fields.lastSlideNo))
  ) {
    return { error: "מספר שקופית לא תקין" };
  }
  return {
    input: {
      startsAt: parsed.startsAt.toISOString(),
      endsAt: parsed.endsAt ? parsed.endsAt.toISOString() : null,
      ...parsed.fields,
    },
  };
}
