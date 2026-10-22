import { supabase } from "@/lib/supabase";
import { listHolidays } from "@/lib/db";

export type ReminderItem = {
  kind: "birthday" | "specialDate" | "holiday";
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

/**
 * Date-based nudges only: birthdays/special dates within 14 days and upcoming
 * holidays (30 days). Homework follow-ups are handled separately (per student
 * opt-in) — see `getFollowupCandidates`.
 */
export async function getReminders(): Promise<ReminderItem[]> {
  const now = new Date();
  const items: ReminderItem[] = [];

  const { data: students, error } = await supabase
    .from("students")
    .select("id, name, special_dates(*)")
    .eq("status", "active");
  if (error) throw new Error(error.message);

  for (const s of students ?? []) {
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
