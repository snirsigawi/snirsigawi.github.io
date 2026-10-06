"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  LINK_TOAST_MS,
  type LinkToastState,
} from "@/components/useCalendarLinking";

/**
 * Floating confirmation shown after linking: Undo for a few seconds, and —
 * when the linked event repeats — a prompt to predict the whole series.
 */

type Props = {
  toast: LinkToastState;
  studentName: string;
  busy: boolean;
  onUndo: () => void;
  onPredict: () => void;
  onDecline: () => void;
};

export default function LinkToast({
  toast,
  studentName,
  busy,
  onUndo,
  onPredict,
  onDecline,
}: Props) {
  // Countdown bar: full → empty over the toast lifetime.
  const [barWidth, setBarWidth] = useState("100%");
  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setBarWidth("0%")),
    );
    return () => cancelAnimationFrame(raf);
  }, [toast]);

  const barStyle: CSSProperties = {
    width: barWidth,
    transition: `width ${LINK_TOAST_MS}ms linear`,
  };

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-xl"
    >
      <div className="p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            ✓
          </span>
          <p className="text-sm font-medium">
            {toast.kind === "linked"
              ? `השיעור קושר אל ${studentName}`
              : `נוספו ${toast.count} שיעורים עתידיים אל ${studentName}`}
          </p>
        </div>

        {toast.kind === "linked" && toast.canPredict && (
          <div className="mt-3 rounded-xl bg-muted/50 p-3">
            <p className="text-sm">
              גם השיעורים העתידיים של תלמיד זה?
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={onPredict}
                disabled={busy}
                className="flex-1 rounded-lg bg-brand px-3 py-1.5 font-heading text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "מחשב…" : "כן, נבא"}
              </button>
              <button
                type="button"
                onClick={onDecline}
                className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                לא, רק זה
              </button>
            </div>
          </div>
        )}

        <div className="mt-3 flex justify-start">
          <button
            type="button"
            onClick={onUndo}
            className="rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            ↩ ביטול
          </button>
        </div>
      </div>

      {/* Countdown */}
      <div className="h-0.5 bg-muted">
        <div className="h-full bg-brand/60" style={barStyle} />
      </div>
    </div>
  );
}
