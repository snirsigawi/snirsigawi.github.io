import { supabase } from "@/lib/supabase";
import { listHolidays } from "@/lib/db";

export type ReminderItem = {
  kind:
    | "uncheckedHomework"
    | "promisedNext"
    | "topicGap"
    | "birthday"
    | "specialDate"
    | "holiday";
  studentId?: string;
  studentName?: string;
  text: string;
  date?: string; // ISO date string when relevant
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(date: Date, now: Date): number {
  const a = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const b = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((a - b) / DAY_MS);
}

function sameDayNextYear(d: Date, now: Date): Date {
  let anniversary = new Date(
    Date.UTC(now.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  if (daysUntil(anniversary, now) < 0) {
    anniversary = new Date(
      Date.UTC(now.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate()),
    );
  }
  return anniversary;
}

type LessonRow = {
  starts_at: string;
  planned_topics: string | null;
  covered_topics: string | null;
  homework_assigned: string | null;
  promised_next: string | null;
  homework_checked: boolean;
};

/**
 * Tutor-facing reminder list (no notifications — just a nudge list):
 * unchecked homework, promises, planned-vs-covered gaps,
 * birthdays/special dates within 14 days, upcoming holidays (30 days).
 */
export async function getReminders(): Promise<ReminderItem[]> {
  const now = new Date();
  const items: ReminderItem[] = [];

  const { data: students, error } = await supabase
    .from("students")
    .select("id, name, special_dates(*), lessons(*)")
    .eq("status", "active");
  if (error) throw new Error(error.message);

  for (const s of students ?? []) {
    const lessons = (s.lessons ?? []) as LessonRow[];
    lessons.sort((a, b) => (a.starts_at < b.starts_at ? 1 : -1));
    const last = lessons[0];

    if (last) {
      if (last.homework_assigned && !last.homework_checked) {
        items.push({
          kind: "uncheckedHomework",
          studentId: s.id,
          studentName: s.name,
          text: `לא נבדקו שיעורי בית: ${last.homework_assigned}`,
        });
      }
      if (last.promised_next) {
        items.push({
          kind: "promisedNext",
          studentId: s.id,
          studentName: s.name,
          text: `הובטח לשיעור הבא: ${last.promised_next}`,
        });
      }
      if (
        last.planned_topics &&
        last.covered_topics !== null &&
        last.covered_topics !== last.planned_topics
      ) {
        items.push({
          kind: "topicGap",
          studentId: s.id,
          studentName: s.name,
          text: `פער נושאים (מתוכנן: ${last.planned_topics} · כוסה: ${last.covered_topics || "—"})`,
        });
      }
    }

    for (const sd of s.special_dates ?? []) {
      const d = new Date(`${sd.date}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) continue;
      const anniv = sameDayNextYear(d, now);
      const days = daysUntil(anniv, now);
      if (days >= 0 && days <= 14) {
        items.push({
          kind: sd.label.includes("הולדת") ? "birthday" : "specialDate",
          studentId: s.id,
          studentName: s.name,
          text: `${sd.label} בעוד ${days} ימים`,
          date: anniv.toISOString(),
        });
      }
    }
  }

  for (const h of await listHolidays()) {
    const d = new Date(`${h.date}T00:00:00Z`);
    const days = daysUntil(d, now);
    if (days >= 0 && days <= 30) {
      items.push({
        kind: "holiday",
        text: `חג: ${h.name} בעוד ${days} ימים`,
        date: d.toISOString(),
      });
    }
  }

  return items;
}
