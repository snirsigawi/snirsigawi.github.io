export const SKILLS = ["reading", "speaking", "listening"] as const;
export type Skill = (typeof SKILLS)[number];

export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type Level = (typeof LEVELS)[number];

// Canonical Hebrew tag strings for skill levels (multi-select).
export const SKILL_TAGS: readonly string[] = [
  "מילות יחס",
  "בניינים",
  "ניקוד",
  "אוצר מילים",
  "ניתוח פעלים",
  "ביטויים",
  "הבנת הנשמע",
  "שטף",
] as const;

export const SKILL_LABELS_HE: Record<Skill, string> = {
  reading: "קריאה",
  speaking: "דיבור",
  listening: "הקשבה",
};

export const LEVEL_LABELS_HE: Record<Level, string> = {
  beginner: "מתחיל",
  intermediate: "בינוני",
  advanced: "מתקדם",
};

export const STUDENT_STATUSES = ["active", "archived"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export function isSkill(value: string): value is Skill {
  return (SKILLS as readonly string[]).includes(value);
}

export function isLevel(value: string): value is Level {
  return (LEVELS as readonly string[]).includes(value);
}
