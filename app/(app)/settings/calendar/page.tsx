"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  startGoogleConnect,
  handleConnectRedirect,
  disconnectGoogleCalendar,
  isGoogleConnected,
  listUpcomingEvents,
  type CalendarEvent,
} from "@/lib/google-calendar";
import { formatDateHe } from "@/lib/datetime";

export default function CalendarSettingsPage() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refreshEvents() {
    try {
      setEvents(await listUpcomingEvents(5));
    } catch {
      setConnected(false);
    }
  }

  useEffect(() => {
    // Redirect back from Google consent? Consume the token from the fragment.
    const result = handleConnectRedirect();
    if (result) {
      // Strip the OAuth fragment so it doesn't linger in the address bar/history.
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      if (result.ok) {
        setConnected(true);
        void refreshEvents();
      } else {
        setError(result.error);
      }
      return;
    }

    // Normal visit: restore state from a previously stored token.
    if (isGoogleConnected()) {
      setConnected(true);
      void refreshEvents();
    }
  }, []);

  function connect() {
    try {
      // Full-page navigation to Google; returns here after consent.
      startGoogleConnect();
    } catch (e) {
      setError(e instanceof Error ? e.message : "החיבור נכשל");
    }
  }

  function disconnect() {
    disconnectGoogleCalendar();
    setConnected(false);
    setEvents([]);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← חזרה להגדרות
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold">יומן Google</h1>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-border bg-background p-6">
        {!connected ? (
          <>
            <p className="text-sm">יומן Google אינו מחובר.</p>
            <button
              type="button"
              onClick={connect}
              className="mt-4 rounded-lg bg-brand px-4 py-2 font-heading text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90"
            >
              חיבור יומן Google
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                ✓ יומן Google מחובר
              </p>
              <button
                type="button"
                onClick={disconnect}
                className="rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
              >
                ניתוק
              </button>
            </div>

            <h2 className="mt-4 font-heading text-base font-semibold">
              האירועים הקרובים
            </h2>
            {events.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">אין אירועים קרובים.</p>
            ) : (
              <div className="mt-2 space-y-2 text-sm">
                {events.map((e) => (
                  <div key={e.id} className="rounded-xl border border-border p-3">
                    <span className="font-medium">{e.summary}</span>
                    {e.start && (
                      <span
                        dir="ltr"
                        style={{ unicodeBidi: "isolate" }}
                        className="ms-2 text-muted-foreground"
                      >
                        {formatDateHe(e.start)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
