import { supabase } from "@/lib/supabase";
import type { Skill, Level } from "@/lib/tags";

/* ------------------------------------------------------------------ */
/* Domain types (camelCase; dates as ISO/YYYY-MM-DD strings)           */
/* ------------------------------------------------------------------ */

export type Student = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  age: number | null;
  ageRange: string | null;
  city: string;
  country: string;
  status: string;
  lessonsLocation: string | null;
  whyLearning: string | null;
  whatFor: string | null;
  birthday: string | null; // YYYY-MM-DD
  lessonDuration: number; // minutes, default 50
  generalNotes: string | null;
  requiresFollowup: boolean;
  followupDoneAt: string | null;
};

export type SkillLevel = {
  id: string;
  studentId: string;
  skill: Skill;
  level: Level;
  note: string | null;
  tags: string[];
};

export type SpecialDate = {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  label: string;
};

export type Lesson = {
  id: string;
  studentId: string;
  startsAt: string;
  endsAt: string | null;
  plannedTopics: string | null;
  coveredTopics: string | null;
  usedPresentation: boolean;
  lastSlideNo: number | null;
  homeworkAssigned: string | null;
  promisedNext: string | null;
  homeworkChecked: boolean;
  notes: string | null;
  /** Tutor marked this lesson as cancelled (counts as done/past). */
  cancelled: boolean;
};

export type Holiday = { id: string; date: string; name: string };

export type StudentListItem = Student & { skillLevels: SkillLevel[] };
export type StudentDetail = Student & {
  skillLevels: SkillLevel[];
  specialDates: SpecialDate[];
  lessons: Lesson[];
  lessonsCount: number;
};

export type SkillLevelInput = {
  skill: Skill;
  level: Level | null;
  note: string;
  tags: string[];
};

export type StudentInput = {
  name: string;
  age: number | null;
  ageRange: string | null;
  city: string;
  country: string;
  lessonsLocation: string | null;
  whyLearning: string | null;
  whatFor: string | null;
  birthday: string | null;
  lessonDuration: number;
  generalNotes: string | null;
  requiresFollowup: boolean;
  skillLevels: SkillLevelInput[];
  specialDates: { date: string; label: string }[];
};

export type LessonInput = Omit<
  Lesson,
  "id" | "studentId"
>;

export type NextLesson = Lesson & { student: { id: string; name: string } };
export type StudentSummary = { id: string; name: string; lessonsCount: number };

/* ------------------------------------------------------------------ */
/* Row mapping                                                         */
/* ------------------------------------------------------------------ */

type SkillLevelRow = {
  id: string;
  student_id: string;
  skill: Skill;
  level: Level;
  note: string | null;
  skill_tags?: { tag: string }[] | null;
};

type SpecialDateRow = {
  id: string;
  student_id: string;
  date: string;
  label: string;
};

function mapLevel(row: SkillLevelRow): SkillLevel {
  return {
    id: row.id,
    studentId: row.student_id,
    skill: row.skill,
    level: row.level,
    note: row.note,
    tags: (row.skill_tags ?? []).map((t) => t.tag),
  };
}

function mapStudent(row: Record<string, unknown>): Student {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    name: row.name as string,
    age: (row.age as number | null) ?? null,
    ageRange: (row.age_range as string | null) ?? null,
    city: row.city as string,
    country: row.country as string,
    status: row.status as string,
    lessonsLocation: (row.lessons_location as string | null) ?? null,
    whyLearning: (row.why_learning as string | null) ?? null,
    whatFor: (row.what_for as string | null) ?? null,
    birthday: (row.birthday as string | null) ?? null,
    lessonDuration: ((row.lesson_duration as number | null) ?? 50),
    generalNotes: (row.general_notes as string | null) ?? null,
    requiresFollowup: Boolean(row.requires_followup),
    followupDoneAt: (row.followup_done_at as string | null) ?? null,
  };
}

function mapLesson(row: Record<string, unknown>): Lesson {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    startsAt: row.starts_at as string,
    endsAt: (row.ends_at as string | null) ?? null,
    plannedTopics: (row.planned_topics as string | null) ?? null,
    coveredTopics: (row.covered_topics as string | null) ?? null,
    usedPresentation: Boolean(row.used_presentation),
    lastSlideNo: (row.last_slide_no as number | null) ?? null,
    homeworkAssigned: (row.homework_assigned as string | null) ?? null,
    promisedNext: (row.promised_next as string | null) ?? null,
    homeworkChecked: Boolean(row.homework_checked),
    notes: (row.notes as string | null) ?? null,
    cancelled: Boolean(row.cancelled),
  };
}

/* ------------------------------------------------------------------ */
/* Students                                                            */
/* ------------------------------------------------------------------ */

const STUDENT_WITH_LEVELS = "*, skill_levels(*, skill_tags(*))";

export async function listStudents(status: string): Promise<StudentListItem[]> {
  const { data, error } = await supabase
    .from("students")
    .select(STUDENT_WITH_LEVELS)
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...mapStudent(row),
    skillLevels: ((row.skill_levels as SkillLevelRow[] | null) ?? []).map((sl) =>
      mapLevel(sl),
    ),
  }));
}

export async function countStudents(status: string): Promise<number> {
  const { count, error } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("status", status);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getStudentName(
  id: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("students")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { name: string } | null)?.name ?? null;
}

export async function getStudentDetail(id: string): Promise<StudentDetail | null> {
  const { data: studentRow, error: studentErr } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (studentErr) throw new Error(studentErr.message);
  if (!studentRow) return null;

  const row = studentRow as Record<string, unknown>;

  // Fetch related data in parallel — each is independent.
  const [skillLevels, specialDates, lessons] = await Promise.all([
    fetchSkillLevels(id),
    fetchSpecialDates(id),
    fetchLessons(id),
  ]);

  return {
    ...mapStudent(row),
    skillLevels,
    specialDates,
    lessons,
    lessonsCount: lessons.length,
  };
}

async function fetchSkillLevels(studentId: string): Promise<SkillLevel[]> {
  const { data, error } = await supabase
    .from("skill_levels")
    .select("*, skill_tags(*)")
    .eq("student_id", studentId);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as SkillLevelRow[];
  return rows.map((sl) => mapLevel(sl));
}

async function fetchSpecialDates(studentId: string) {
  const { data, error } = await supabase
    .from("special_dates")
    .select("*")
    .eq("student_id", studentId)
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((sd: SpecialDateRow) => ({
    id: sd.id,
    studentId: sd.student_id,
    date: sd.date,
    label: sd.label,
  }));
}

async function fetchLessons(studentId: string) {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("student_id", studentId)
    .order("starts_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((l: Record<string, unknown>) => mapLesson(l));
}

async function writeSkillLevels(studentId: string, levels: SkillLevelInput[]) {
  for (const sl of levels) {
    if (!sl.level && !sl.note && sl.tags.length === 0) continue;
    const { data: created, error } = await supabase
      .from("skill_levels")
      .insert({
        student_id: studentId,
        skill: sl.skill,
        level: sl.level ?? "beginner",
        note: sl.note || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (sl.tags.length > 0) {
      const { error: tagErr } = await supabase.from("skill_tags").insert(
        sl.tags.map((tag) => ({ level_id: created.id, tag })),
      );
      if (tagErr) throw new Error(tagErr.message);
    }
  }
}

async function replaceSkillLevels(studentId: string, levels: SkillLevelInput[]) {
  const { data: existing } = await supabase
    .from("skill_levels")
    .select("id")
    .eq("student_id", studentId);
  const ids = (existing ?? []).map((e) => e.id);
  if (ids.length > 0) {
    await supabase.from("skill_tags").delete().in("level_id", ids);
    await supabase.from("skill_levels").delete().eq("student_id", studentId);
  }
  await writeSkillLevels(studentId, levels);
}

async function replaceSpecialDates(
  studentId: string,
  dates: { date: string; label: string }[],
) {
  await supabase.from("special_dates").delete().eq("student_id", studentId);
  if (dates.length === 0) return;
  const { error } = await supabase.from("special_dates").insert(
    dates.map((d) => ({ student_id: studentId, date: d.date, label: d.label })),
  );
  if (error) throw new Error(error.message);
}

// Always try with the two newer student columns first. If Supabase hasn't
// gotten the ALTER TABLE yet it will reject with "column … does not exist";
// in that case we retry without them. The fallback path is only hit before
// the one-time migration runs, so once the columns exist every save goes
// straight through with no retries — and there's no module-level flag that
// can get stuck in the wrong state.
function baseStudentPayload(input: StudentInput) {
  return {
    name: input.name,
    age: input.age,
    age_range: input.ageRange,
    city: input.city,
    country: input.country,
    lessons_location: input.lessonsLocation,
    why_learning: input.whyLearning,
    what_for: input.whatFor,
    birthday: input.birthday,
  };
}

function fullStudentPayload(input: StudentInput) {
  return {
    ...baseStudentPayload(input),
    lesson_duration: input.lessonDuration,
    general_notes: input.generalNotes,
    requires_followup: input.requiresFollowup,
  };
}

function looksLikeMissingColumn(err: unknown): boolean {
  const msg = (err as { message?: string } | null)?.message ?? "";
  return msg.includes("does not exist");
}

export async function createStudent(input: StudentInput): Promise<string> {
  const full = fullStudentPayload(input);
  const res = await supabase
    .from("students")
    .insert(full)
    .select("id")
    .single();

  let data: { id: string };
  if (res.error && looksLikeMissingColumn(res.error)) {
    // Schema not migrated yet — retry without the new columns.
    const fallback = await supabase
      .from("students")
      .insert(baseStudentPayload(input))
      .select("id")
      .single();
    if (fallback.error) throw new Error(fallback.error.message);
    data = fallback.data!;
  } else if (res.error) {
    throw new Error(res.error.message);
  } else {
    data = res.data!;
  }

  await writeSkillLevels(data.id, input.skillLevels);
  await replaceSpecialDates(data.id, input.specialDates);
  return data.id;
}

export async function updateStudent(id: string, input: StudentInput): Promise<void> {
  const full = fullStudentPayload(input);
  const res = await supabase.from("students").update(full).eq("id", id);

  if (res.error && looksLikeMissingColumn(res.error)) {
    await supabase
      .from("students")
      .update(baseStudentPayload(input))
      .eq("id", id);
  } else if (res.error) {
    throw new Error(res.error.message);
  }
  await replaceSkillLevels(id, input.skillLevels);
  await replaceSpecialDates(id, input.specialDates);
}

export async function setStudentStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("students")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Lessons                                                             */
/* ------------------------------------------------------------------ */

function lessonColumns(input: LessonInput) {
  return {
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    planned_topics: input.plannedTopics,
    covered_topics: input.coveredTopics,
    used_presentation: input.usedPresentation,
    last_slide_no: input.usedPresentation ? input.lastSlideNo : null,
    homework_assigned: input.homeworkAssigned,
    promised_next: input.promisedNext,
    homework_checked: input.homeworkChecked,
    notes: input.notes,
    cancelled: input.cancelled,
  };
}

/** True when the DB still lacks the `cancelled` column (migration not run yet). */
function isMissingCancelled(message: string | undefined): boolean {
  return Boolean(message && message.includes("cancelled"));
}

export async function listLessons(studentId: string): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("student_id", studentId)
    .order("starts_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => mapLesson(l));
}

export async function getLesson(
  studentId: string,
  lessonId: string,
): Promise<Lesson | null> {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapLesson(data) : null;
}

export async function getLastLesson(studentId: string): Promise<Lesson | null> {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("student_id", studentId)
    .order("starts_at", { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);
  const row = (data ?? []).find((r) => !r.cancelled);
  return row ? mapLesson(row) : null;
}

export async function createLesson(
  studentId: string,
  input: LessonInput,
): Promise<string> {
  const payload = { student_id: studentId, ...lessonColumns(input) };
  let res = await supabase.from("lessons").insert(payload).select("id").single();
  if (res.error && isMissingCancelled(res.error.message)) {
    const rest: Partial<typeof payload> = { ...payload };
    delete rest.cancelled;
    res = await supabase.from("lessons").insert(rest).select("id").single();
  }
  if (res.error) throw new Error(res.error.message);
  return res.data.id as string;
}

export async function updateLesson(
  lessonId: string,
  input: LessonInput,
): Promise<void> {
  const columns = lessonColumns(input);
  let res = await supabase.from("lessons").update(columns).eq("id", lessonId);
  if (res.error && isMissingCancelled(res.error.message)) {
    const rest: Partial<typeof columns> = { ...columns };
    delete rest.cancelled;
    res = await supabase.from("lessons").update(rest).eq("id", lessonId);
  }
  if (res.error) throw new Error(res.error.message);
}

/**
 * Carries a cancelled lesson's content forward to the next lesson of the same
 * student. Uses the next existing lesson row when there is one; otherwise
 * creates a row at the next calendar event's start time (when known).
 * Existing content on the target is never overwritten.
 */
export async function carryLessonContentForward(
  studentId: string,
  afterIso: string,
  nextEventIso: string | null,
  source: LessonInput,
): Promise<void> {
  const content = {
    planned_topics: source.plannedTopics,
    covered_topics: source.coveredTopics,
    used_presentation: source.usedPresentation,
    last_slide_no: source.usedPresentation ? source.lastSlideNo : null,
    homework_assigned: source.homeworkAssigned,
    promised_next: source.promisedNext,
    homework_checked: source.homeworkChecked,
    notes: source.notes,
  };

  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("student_id", studentId)
    .gt("starts_at", afterIso)
    .order("starts_at", { ascending: true })
    .limit(5);
  if (error) throw new Error(error.message);

  const target = (data ?? []).find((row) => !row.cancelled);

  if (target) {
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(content)) {
      if (value === null || value === undefined || value === "" || value === false)
        continue;
      const existing = target[key];
      if (
        existing === null ||
        existing === undefined ||
        existing === "" ||
        existing === false
      ) {
        patch[key] = value;
      }
    }
    if (Object.keys(patch).length === 0) return;

    const res = await supabase
      .from("lessons")
      .update(patch)
      .eq("id", target.id as string);
    if (res.error) throw new Error(res.error.message);
    return;
  }

  // No lesson row yet — anchor the carried content on the next calendar event.
  if (!nextEventIso) return;
  const anchorMs = Date.parse(nextEventIso);
  const alreadyAnchored = (data ?? []).some(
    (row) => Math.abs(Date.parse(row.starts_at as string) - anchorMs) < 60_000,
  );
  if (alreadyAnchored) return;

  const res = await supabase.from("lessons").insert({
    student_id: studentId,
    starts_at: nextEventIso,
    ...content,
  });
  if (res.error) throw new Error(res.error.message);
}

/** Start times of lessons marked cancelled (used to skip them in the calendar). */
export async function listCancelledLessonStarts(): Promise<string[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("lessons")
    .select("starts_at, cancelled")
    .gte("starts_at", since);
  if (error) return [];
  return (data ?? [])
    .filter((row) => row.cancelled)
    .map((row) => row.starts_at as string);
}

export async function setHomeworkChecked(
  lessonId: string,
  checked: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("lessons")
    .update({ homework_checked: checked })
    .eq("id", lessonId);
  if (error) throw new Error(error.message);
}

export async function deleteLesson(lessonId: string): Promise<void> {
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Dashboard aggregates                                                */
/* ------------------------------------------------------------------ */

export async function getNextLesson(): Promise<NextLesson | null> {
  const { data: rows, error } = await supabase
    .from("lessons")
    .select("*, student:students(id, name)")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(20);
  if (error) throw new Error(error.message);

  // Cancelled lessons are treated as done/past, so they never become "next".
  const row = (rows ?? []).find((r) => !r.cancelled);
  if (!row) return null;
  const student = Array.isArray(row.student) ? row.student[0] : row.student;
  return { ...mapLesson(row), student: { id: student.id, name: student.name } };
}

export async function getPreviousLesson(studentId: string): Promise<Lesson | null> {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("student_id", studentId)
    .lte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  const row = (data ?? []).find((r) => !r.cancelled);
  return row ? mapLesson(row) : null;
}

export async function getStudentsSummary(): Promise<StudentSummary[]> {
  const { data, error } = await supabase
    .from("students")
    .select("id, name, lessons(count)")
    .eq("status", "active")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    lessonsCount: (row.lessons?.[0]?.count as number) ?? 0,
  }));
}

/* ------------------------------------------------------------------ */
/* Homework follow-ups                                                 */
/* ------------------------------------------------------------------ */

export type FollowupCandidate = {
  studentId: string;
  name: string;
  /** When the last documented lesson actually ended (ISO). */
  lastLessonEndedAt: string;
  daysSinceLastLesson: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const FOLLOWUP_AFTER_DAYS = 3;

/**
 * Students the tutor opted into follow-ups (`requires_followup`) whose last
 * *documented* lesson ended at least 3 days ago and who haven't been marked
 * as handled since that lesson.
 */
export async function getFollowupCandidates(): Promise<FollowupCandidate[]> {
  const now = Date.now();
  const { data, error } = await supabase
    .from("students")
    .select("id, name, lesson_duration, followup_done_at, lessons(starts_at, ends_at)")
    .eq("status", "active")
    .eq("requires_followup", true);
  if (error) throw new Error(error.message);

  const out: FollowupCandidate[] = [];

  for (const s of data ?? []) {
    const duration = ((s.lesson_duration as number | null) ?? 50) * 60_000;
    const rows = (s.lessons ?? []) as {
      starts_at: string;
      ends_at: string | null;
    }[];

    let lastEnd: number | null = null;
    for (const l of rows) {
      const start = Date.parse(l.starts_at);
      if (Number.isNaN(start) || start > now) continue;
      const rawEnd = l.ends_at ? Date.parse(l.ends_at) : start + duration;
      const end = Number.isNaN(rawEnd) ? start + duration : rawEnd;
      if (lastEnd === null || end > lastEnd) lastEnd = end;
    }

    if (lastEnd === null) continue;
    const days = Math.floor((now - lastEnd) / DAY_MS);
    if (days < FOLLOWUP_AFTER_DAYS) continue;

    const doneAt = s.followup_done_at ? Date.parse(s.followup_done_at) : NaN;
    if (!Number.isNaN(doneAt) && doneAt >= lastEnd) continue;

    out.push({
      studentId: s.id as string,
      name: s.name as string,
      lastLessonEndedAt: new Date(lastEnd).toISOString(),
      daysSinceLastLesson: days,
    });
  }

  return out.sort((a, b) => b.daysSinceLastLesson - a.daysSinceLastLesson);
}

/** Mark a student's follow-up as handled (hides the box until the next lesson). */
export async function markFollowupDone(studentId: string): Promise<void> {
  const { error } = await supabase
    .from("students")
    .update({ followup_done_at: new Date().toISOString() })
    .eq("id", studentId);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Holidays                                                            */
/* ------------------------------------------------------------------ */

export async function listHolidays(): Promise<Holiday[]> {
  const { data, error } = await supabase
    .from("holidays")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((h) => ({ id: h.id, date: h.date, name: h.name }));
}

export async function createHoliday(name: string, date: string): Promise<void> {
  const { error } = await supabase
    .from("holidays")
    .insert({ name, date });
  if (error) throw new Error(error.message);
}

export async function deleteHoliday(id: string): Promise<void> {
  const { error } = await supabase.from("holidays").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- Calendar links ---------------- */

export type CalendarLink = { googleEventId: string; studentId: string };

/** All event→student links, keyed by Google event ID. */
export async function getCalendarLinks(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("calendar_links")
    .select("google_event_id, student_id");
  if (error) throw new Error(error.message);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.google_event_id, row.student_id);
  }
  return map;
}

/** Link (or re-link) a Google Calendar event to a student. */
export async function linkCalendarEvent(
  googleEventId: string,
  studentId: string,
): Promise<void> {
  const { error } = await supabase.from("calendar_links").upsert(
    { google_event_id: googleEventId, student_id: studentId },
    { onConflict: "google_event_id" },
  );
  if (error) throw new Error(error.message);
}

/** Remove the link for a Google Calendar event. */
export async function unlinkCalendarEvent(googleEventId: string): Promise<void> {
  const { error } = await supabase
    .from("calendar_links")
    .delete()
    .eq("google_event_id", googleEventId);
  if (error) throw new Error(error.message);
}

/** Remove many event links at once. */
export async function bulkUnlinkCalendarEvents(
  googleEventIds: string[],
): Promise<void> {
  if (googleEventIds.length === 0) return;
  const { error } = await supabase
    .from("calendar_links")
    .delete()
    .in("google_event_id", googleEventIds);
  if (error) throw new Error(error.message);
}

/** Link many events to students in one call. */
export async function bulkLinkCalendarEvents(
  entries: { googleEventId: string; studentId: string }[],
): Promise<void> {
  if (entries.length === 0) return;
  const { error } = await supabase.from("calendar_links").upsert(
    entries.map((e) => ({
      google_event_id: e.googleEventId,
      student_id: e.studentId,
    })),
    { onConflict: "google_event_id" },
  );
  if (error) throw new Error(error.message);
}

/* ---------------- Recurring series links ---------------- */

/** All series→student links, keyed by recurring event id. */
export async function getSeriesLinks(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("calendar_series_links")
    .select("recurring_event_id, student_id");
  if (error) throw new Error(error.message);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.recurring_event_id, row.student_id);
  }
  return map;
}

export async function linkSeries(
  recurringEventId: string,
  studentId: string,
): Promise<void> {
  const { error } = await supabase.from("calendar_series_links").upsert(
    { recurring_event_id: recurringEventId, student_id: studentId },
    { onConflict: "recurring_event_id" },
  );
  if (error) throw new Error(error.message);
}

export async function unlinkSeries(recurringEventId: string): Promise<void> {
  const { error } = await supabase
    .from("calendar_series_links")
    .delete()
    .eq("recurring_event_id", recurringEventId);
  if (error) throw new Error(error.message);
}
