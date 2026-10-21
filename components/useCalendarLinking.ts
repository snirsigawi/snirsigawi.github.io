"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  bulkLinkCalendarEvents,
  bulkUnlinkCalendarEvents,
  getCalendarLinks,
  getSeriesLinks,
  linkCalendarEvent,
  linkSeries,
  listStudents,
  unlinkCalendarEvent,
  unlinkSeries,
} from "@/lib/db";
import {
  listSeriesEvents,
  type CalendarEvent,
} from "@/lib/google-calendar";

/**
 * All state + actions for linking Google Calendar events (and recurring
 * series) to students: individual links, whole-series prediction, an Undo
 * window after each action, and removal from the student profile.
 */

export type LinkToastState =
  | {
      kind: "linked";
      event: CalendarEvent;
      studentId: string;
      canPredict: boolean;
      createdAt: number;
    }
  | {
      kind: "predicted";
      studentId: string;
      seriesId: string;
      count: number;
      eventIds: string[];
      createdAt: number;
    };

/** How long the Undo option stays available after an action. */
export const LINK_TOAST_MS = 8000;

/** Linked lessons with one title that trigger auto-linking the rest. */
const AUTO_LINK_MIN = 3;

/**
 * Once a student has AUTO_LINK_MIN linked events sharing one title, every
 * remaining visible event with that title is treated as theirs. Mutates
 * `links` with the additions and returns the new rows to persist.
 */
function summaryAutoLinks(
  events: CalendarEvent[],
  links: Map<string, string>,
): { googleEventId: string; studentId: string }[] {
  // Count linked events per (title, student).
  const counts = new Map<string, Map<string, number>>();
  for (const e of events) {
    const sid = links.get(e.id);
    if (!sid) continue;
    let m = counts.get(e.summary);
    if (!m) {
      m = new Map();
      counts.set(e.summary, m);
    }
    m.set(sid, (m.get(sid) ?? 0) + 1);
  }

  const out: { googleEventId: string; studentId: string }[] = [];
  for (const e of events) {
    if (links.has(e.id)) continue;
    const m = counts.get(e.summary);
    if (!m) continue;
    let best: { sid: string; n: number } | null = null;
    for (const [sid, n] of m) {
      if (n >= AUTO_LINK_MIN && (!best || n > best.n)) best = { sid, n };
    }
    if (best) {
      out.push({ googleEventId: e.id, studentId: best.sid });
      links.set(e.id, best.sid);
    }
  }
  return out;
}

export function useCalendarLinking() {
  // null = initial state still loading; true/false = links tables usable.
  const [ready, setReady] = useState<boolean | null>(null);
  const [links, setLinks] = useState<Map<string, string>>(new Map());
  const [seriesLinks, setSeriesLinks] = useState<Map<string, string>>(new Map());
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [toast, setToast] = useState<LinkToastState | null>(null);

  // Refs so async callbacks always see fresh maps without re-binding.
  const linksRef = useRef(links);
  const seriesRef = useRef(seriesLinks);
  linksRef.current = links;
  seriesRef.current = seriesLinks;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Last event list seen by applyPrediction — basis for title auto-linking. */
  const eventsRef = useRef<CalendarEvent[]>([]);

  const showToast = useCallback((t: LinkToastState) => {
    setToast(t);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), LINK_TOAST_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Initial load — students and both link maps.
  useEffect(() => {
    let active = true;

    listStudents("active")
      .then((st) => {
        if (active)
          setStudents(st.map((s) => ({ id: s.id, name: s.name })));
      })
      .catch(() => {});

    Promise.all([getCalendarLinks(), getSeriesLinks()])
      .then(([lk, sl]) => {
        if (!active) return;
        setLinks(lk);
        setSeriesLinks(sl);
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(false);
      });

    return () => {
      active = false;
    };
  }, []);

  /**
   * Auto-link visible instances of a linked recurring series that don't have
   * an individual row yet ("prediction" on load). Returns the effective map,
   * which callers can use immediately for filtering.
   */
  const applyPrediction = useCallback(
    async (events: CalendarEvent[]): Promise<Map<string, string>> => {
      eventsRef.current = events;
      const current = linksRef.current;
      const series = seriesRef.current;
      const next = new Map(current);
      const toInsert: { googleEventId: string; studentId: string }[] = [];

      for (const e of events) {
        if (next.has(e.id)) continue;
        if (e.recurringEventId) {
          const studentId = series.get(e.recurringEventId);
          if (studentId) {
            toInsert.push({ googleEventId: e.id, studentId });
            next.set(e.id, studentId);
          }
        }
      }

      // 3+ linked lessons with one title → the rest of that title is theirs.
      toInsert.push(...summaryAutoLinks(events, next));

      if (toInsert.length === 0) return current;

      try {
        await bulkLinkCalendarEvents(toInsert);
        setLinks(next);
        return next;
      } catch {
        return current;
      }
    },
    [],
  );

  /** Link one event and open the Undo/predict window. */
  const linkEvent = useCallback(
    async (event: CalendarEvent, studentId: string): Promise<void> => {
      await linkCalendarEvent(event.id, studentId);
      const next = new Map(linksRef.current).set(event.id, studentId);
      setLinks(next);

      // 3rd lesson with this title for the student → auto-link the rest.
      const extra = summaryAutoLinks(eventsRef.current, next);
      if (extra.length > 0) {
        bulkLinkCalendarEvents(extra).catch(() => {});
        setLinks(new Map(next));
        showToast({
          kind: "predicted",
          studentId,
          seriesId: "",
          count: extra.length,
          eventIds: [event.id, ...extra.map((x) => x.googleEventId)],
          createdAt: Date.now(),
        });
        return;
      }

      showToast({
        kind: "linked",
        event,
        studentId,
        canPredict: Boolean(event.recurringEventId),
        createdAt: Date.now(),
      });
    },
    [showToast],
  );

  /** Reverse whichever action the current toast represents. */
  const undoLast = useCallback(async () => {
    setToast((current) => {
      if (!current) return current;

      if (current.kind === "linked") {
        unlinkCalendarEvent(current.event.id).catch(() => {});
        setLinks((prev) => {
          const next = new Map(prev);
          next.delete(current.event.id);
          return next;
        });
      } else {
        bulkUnlinkCalendarEvents(current.eventIds).catch(() => {});
        if (current.seriesId) {
          unlinkSeries(current.seriesId).catch(() => {});
          setSeriesLinks((prev) => {
            const next = new Map(prev);
            next.delete(current.seriesId);
            return next;
          });
        }
        setLinks((prev) => {
          const next = new Map(prev);
          for (const id of current.eventIds) next.delete(id);
          return next;
        });
      }
      return null;
    });
  }, []);

  /** Link the whole recurring series: all current/future instances. */
  const predictFuture = useCallback(
    async (event: CalendarEvent, studentId: string): Promise<void> => {
      const seriesId = event.recurringEventId;
      if (!seriesId) return;

      const instances = await listSeriesEvents(seriesId, 50);
      if (instances.length === 0) {
        setToast(null);
        return;
      }
      const entries = instances.map((i) => ({
        googleEventId: i.id,
        studentId,
      }));

      await Promise.all([
        linkSeries(seriesId, studentId),
        bulkLinkCalendarEvents(entries),
      ]);

      setSeriesLinks((prev) => new Map(prev).set(seriesId, studentId));
      setLinks((prev) => {
        const next = new Map(prev);
        for (const e of entries) next.set(e.googleEventId, studentId);
        return next;
      });

      showToast({
        kind: "predicted",
        studentId,
        seriesId,
        count: entries.length,
        eventIds: entries.map((e) => e.googleEventId),
        createdAt: Date.now(),
      });
    },
    [showToast],
  );

  /**
   * Remove one event link. If it belongs to a predicted series the series
   * prediction is dropped too, so the lesson never silently reappears.
   * Already-persisted other instances are untouched.
   */
  const removeEvent = useCallback(
    async (event: CalendarEvent): Promise<void> => {
      await unlinkCalendarEvent(event.id);
      const seriesId = event.recurringEventId;

      if (seriesId && seriesRef.current.get(seriesId)) {
        await unlinkSeries(seriesId);
        setSeriesLinks((prev) => {
          const next = new Map(prev);
          next.delete(seriesId);
          return next;
        });
      }

      setLinks((prev) => {
        const next = new Map(prev);
        next.delete(event.id);
        return next;
      });
    },
    [],
  );

  /** Unlink every listed future lesson of one student (+ its series links). */
  const removeFutureForStudent = useCallback(
    async (studentId: string, events: CalendarEvent[]): Promise<void> => {
      const ids: string[] = [];
      const seriesIds = new Set<string>();

      for (const e of events) {
        if (linksRef.current.get(e.id) !== studentId) continue;
        ids.push(e.id);
        if (e.recurringEventId && seriesRef.current.has(e.recurringEventId))
          seriesIds.add(e.recurringEventId);
      }

      await Promise.all([
        bulkUnlinkCalendarEvents(ids),
        ...Array.from(seriesIds).map((s) => unlinkSeries(s)),
      ]);

      setLinks((prev) => {
        const next = new Map(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      setSeriesLinks((prev) => {
        const next = new Map(prev);
        for (const s of seriesIds) next.delete(s);
        return next;
      });
    },
    [],
  );

  const dismissToast = useCallback(() => setToast(null), []);

  return {
    ready,
    links,
    seriesLinks,
    students,
    toast,
    applyPrediction,
    linkEvent,
    undoLast,
    predictFuture,
    removeEvent,
    removeFutureForStudent,
    dismissToast,
  };
}
