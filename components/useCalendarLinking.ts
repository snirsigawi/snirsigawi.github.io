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
      const current = linksRef.current;
      const series = seriesRef.current;
      const toInsert: { googleEventId: string; studentId: string }[] = [];

      for (const e of events) {
        if (current.has(e.id)) continue;
        if (e.recurringEventId) {
          const studentId = series.get(e.recurringEventId);
          if (studentId)
            toInsert.push({ googleEventId: e.id, studentId });
        }
      }

      if (toInsert.length === 0) return current;

      try {
        await bulkLinkCalendarEvents(toInsert);
        const next = new Map(current);
        for (const { googleEventId, studentId } of toInsert)
          next.set(googleEventId, studentId);
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
      setLinks((prev) => new Map(prev).set(event.id, studentId));
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
        unlinkSeries(current.seriesId).catch(() => {});
        setSeriesLinks((prev) => {
          const next = new Map(prev);
          next.delete(current.seriesId);
          return next;
        });
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
