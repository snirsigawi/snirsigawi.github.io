import { SKILLS, SKILL_TAGS, isSkill, isLevel } from "@/lib/tags";
import type { Skill, Level } from "@/lib/tags";
import type { StudentInput } from "@/lib/db";

export const AGE_RANGES = ["יסודי", "חטיבה", "תיכון", "מבוגר"] as const;

function parseSkillLevels(formData: FormData) {
  const out: StudentInput["skillLevels"] = [];
  for (const skill of SKILLS) {
    const levelRaw = formData.get(`level.${skill}`);
    const noteRaw = formData.get(`note.${skill}`);
    const tagsRaw = formData.getAll(`tags.${skill}`);
    const level =
      typeof levelRaw === "string" && isLevel(levelRaw) ? (levelRaw as Level) : null;
    const note = typeof noteRaw === "string" ? noteRaw.trim() : "";
    const tags = Array.from(
      new Set(tagsRaw.filter((t): t is string => typeof t === "string")),
    ).filter((t) => (SKILL_TAGS as readonly string[]).includes(t));
    out.push({ skill, level, note, tags });
  }
  return out;
}

function parseSpecialDates(formData: FormData) {
  const dates = formData.getAll("specialDate.date");
  const labels = formData.getAll("specialDate.label");
  const out: { date: string; label: string }[] = [];
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const label = labels[i];
    if (typeof date !== "string" || typeof label !== "string") continue;
    const d = date.trim();
    const l = label.trim();
    if (!d || !l) continue;
    const md = toMonthDay(d);
    if (!md) continue;
    out.push({ date: md, label: l });
  }
  return out;
}

/** Convert MM-DD to 2000-MM-DD for storage (year is irrelevant). */
function toMonthDay(raw: string): string | null {
  const d = raw.trim();
  // Already full date? Strip the year.
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return `2000-${d.slice(5)}`;
  // MM-DD format.
  if (/^\d{2}-\d{2}$/.test(d)) return `2000-${d}`;
  return null;
}

/** Parse a submitted student form into a StudentInput (client-side). */
export function parseStudentForm(formData: FormData): StudentInput {
  const get = (key: string) => (formData.get(key) as string | null)?.trim() ?? "";
  const ageRaw = get("age");
  const ageRange = get("ageRange");
  const birthdayRaw = get("birthday");

  return {
    name: get("name"),
    age: ageRaw && !Number.isNaN(Number(ageRaw)) ? Number(ageRaw) : null,
    ageRange:
      ageRange && (AGE_RANGES as readonly string[]).includes(ageRange)
        ? ageRange
        : null,
    city: get("city"),
    country: get("country"),
    lessonsLocation: get("lessonsLocation") || null,
    whyLearning: get("whyLearning") || null,
    whatFor: get("whatFor") || null,
    birthday: birthdayRaw ? toMonthDay(birthdayRaw) : null,
    skillLevels: parseSkillLevels(formData),
    specialDates: parseSpecialDates(formData),
  };
}

export function validateStudent(data: StudentInput): string | null {
  if (!data.name) return "חובה למלא שם";
  if (!data.city) return "חובה למלא עיר";
  if (!data.country) return "חובה למלא מדינה";
  if (data.age !== null && (data.age < 0 || data.age > 120)) return "גיל לא תקין";
  for (const sl of data.skillLevels) {
    if (!isSkill(sl.skill)) return "מיומנות לא תקינה";
  }
  return null;
}
