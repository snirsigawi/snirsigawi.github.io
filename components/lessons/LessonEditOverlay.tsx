"use client";

import { useEffect, useState } from "react";
import { listLessons, type Lesson } from "@/lib/db";
import type { CalendarEvent } from "@/lib/google-calendar";
import { formatDateHe, splitDateTime } from "@/lib/datetime";
import { LessonForm, type LessonInitial } from "@/components/lessons/LessonForm";

/**
 * Modal editor for the lesson behind a linked calendar event. If a lesson row
 * already exists for the student at the event's start time it is edited;
 * otherwise saving creates one prefilled from the event.
 */
export function LessonEditOverlay({
  event,
  studentId,
  onClose,
}: {
  event: CalendarEvent;
  studentId: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | {
        status: "ready";
        mode: "create" | "update";
        lessonId?: string;
        initial: LessonInitial;
        previous: Lesson | null;
      }
  >({ status: "loading" });

  useEffect(() => {
    let active = true;
    listLessons(studentId)
      .then((rows) => {
        if (!active) return;
        const startMs = event.start ? new Date(event.start).getTime() : null;
        const match =
          startMs === null
            ? undefined
            : rows.find(
                (l) =>
                  Math.abs(new Date(l.startsAt).getTime() - startMs) < 60_000,
              );

        // The strict predecessor of this lesson — never an older one.
        const previous =
          startMs === null
            ? null
            : (rows
                .filter(
                  (l) => new Date(l.startsAt).getTime() < startMs - 60_000,
                )
                .sort(
                  (a, b) =>
                    new Date(b.startsAt).getTime() -
                    new Date(a.startsAt).getTime(),
                )[0] ?? null);

        if (match) {
          setState({
            status: "ready",
            mode: "update",
            lessonId: match.id,
            previous,
            initial: {
              studentId,
              startsAt: splitDateTime(new Date(match.startsAt)),
              endsAt: match.endsAt
                ? splitDateTime(new Date(match.endsAt))
                : null,
              plannedTopics: match.plannedTopics,
              coveredTopics: match.coveredTopics,
              usedPresentation: match.usedPresentation,
              lastSlideNo: match.lastSlideNo,
              homeworkAssigned: match.homeworkAssigned,
              promisedNext: match.promisedNext,
              homeworkChecked: match.homeworkChecked,
              notes: match.notes,
            },
          });
        } else {
          setState({
            status: "ready",
            mode: "create",
            previous,
            initial: {
              studentId,
              startsAt: event.start
                ? splitDateTime(new Date(event.start))
                : { date: "", time: "" },
              endsAt: event.end ? splitDateTime(new Date(event.end)) : null,
              plannedTopics: null,
              coveredTopics: null,
              usedPresentation: false,
              lastSlideNo: null,
              homeworkAssigned: null,
              promisedNext: null,
              homeworkChecked: false,
              notes: null,
            },
          });
        }
      })
      .catch((e: unknown) => {
        if (active)
          setState({
            status: "error",
            message: e instanceof Error ? e.message : "טעינה נכשלה",
          });
      });
    return () => {
      active = false;
    };
  }, [event, studentId]);

  // Escape closes the overlay.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="סגירה"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="font-heading text-lg font-bold">עריכת שיעור</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {event.summary}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:bg-muted"
            title="סגירה"
          >
            ✕
          </button>
        </div>

        {state.status === "loading" && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            <span className="animate-pulse">טוען…</span>
          </p>
        )}
        {state.status === "error" && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {state.message}
          </p>
        )}
        {state.status === "ready" && (
          <>
            <PreviousLessonGlance lesson={state.previous} />
            <LessonForm
              mode={state.mode}
              lessonId={state.lessonId}
              initial={state.initial}
              onDone={onClose}
            />
          </>
        )}
      </div>
    </div>
  );
}

/** Compact read-only recap of the lesson immediately preceding this one. */
function PreviousLessonGlance({ lesson }: { lesson: Lesson | null }) {
  if (!lesson) return null;

  const rows: { label: string; value: string }[] = [];
  if (lesson.plannedTopics)
    rows.push({ label: "תוכנן", value: lesson.plannedTopics });
  if (lesson.coveredTopics)
    rows.push({ label: "כוסה", value: lesson.coveredTopics });
  if (lesson.usedPresentation)
    rows.push({
      label: "מצגת",
      value:
        lesson.lastSlideNo === null
          ? "הייתה מצגת"
          : `עד שקופית ${lesson.lastSlideNo}`,
    });
  if (lesson.homeworkAssigned)
    rows.push({ label: "שיעורי בית", value: lesson.homeworkAssigned });
  if (lesson.promisedNext)
    rows.push({ label: "הובטח לבא", value: lesson.promisedNext });
  if (lesson.homeworkAssigned)
    rows.push({
      label: "נבדקו",
      value: lesson.homeworkChecked ? "כן" : "לא",
    });
  if (lesson.notes) rows.push({ label: "הערות", value: lesson.notes });

  if (rows.length === 0) return null;

  return (
    <section className="mb-4 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold text-muted-foreground">
          השיעור הקודם
        </h3>
        <span
          dir="ltr"
          style={{ unicodeBidi: "isolate" }}
          className="text-xs text-muted-foreground"
        >
          {formatDateHe(lesson.startsAt, {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </span>
      </div>
      <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex min-w-0 gap-1.5">
            <dt className="shrink-0 text-muted-foreground">{r.label}:</dt>
            <dd className="min-w-0 break-words">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
