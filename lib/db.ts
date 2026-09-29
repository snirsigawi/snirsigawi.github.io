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

export async function getStudentDetail(id: string): Promise<StudentDetail | null> {
  // Fetch the student row first — if this fails, nothing else matters.
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

export async function createStudent(input: StudentInput): Promise<string> {
  const { data, error } = await supabase
    .from("students")
    .insert({
      name: input.name,
      age: input.age,
      age_range: input.ageRange,
      city: input.city,
      country: input.country,
      lessons_location: input.lessonsLocation,
      why_learning: input.whyLearning,
      what_for: input.whatFor,
      birthday: input.birthday,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await writeSkillLevels(data.id, input.skillLevels);
  await replaceSpecialDates(data.id, input.specialDates);
  return data.id;
}

export async function updateStudent(id: string, input: StudentInput): Promise<void> {
  const { error } = await supabase
    .from("students")
    .update({
      name: input.name,
      age: input.age,
      age_range: input.ageRange,
      city: input.city,
      country: input.country,
      lessons_location: input.lessonsLocation,
      why_learning: input.whyLearning,
      what_for: input.whatFor,
      birthday: input.birthday,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
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
  };
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
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapLesson(data) : null;
}

export async function createLesson(
  studentId: string,
  input: LessonInput,
): Promise<string> {
  const { data, error } = await supabase
    .from("lessons")
    .insert({ student_id: studentId, ...lessonColumns(input) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateLesson(
  lessonId: string,
  input: LessonInput,
): Promise<void> {
  const { error } = await supabase
    .from("lessons")
    .update(lessonColumns(input))
    .eq("id", lessonId);
  if (error) throw new Error(error.message);
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
  const { data, error } = await supabase
    .from("lessons")
    .select("*, student:students(id, name)")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const student = Array.isArray(data.student)
    ? data.student[0]
    : data.student;
  return { ...mapLesson(data), student: { id: student.id, name: student.name } };
}

export async function getPreviousLesson(studentId: string): Promise<Lesson | null> {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("student_id", studentId)
    .lte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapLesson(data) : null;
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
