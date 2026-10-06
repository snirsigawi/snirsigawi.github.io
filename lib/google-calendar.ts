"use client";

/**
 * Google Calendar — public calendar read via an API key.
 *
 * No OAuth, no consent screen, no tokens: the teaching calendar itself is
 * shared publicly ("Make available to public" in its Google Calendar settings),
 * so its events can be read with a simple key-authenticated GET. The API key is
 * a public value (it ships to the browser) and should be restricted in the
 * Google Cloud Console to the GitHub Pages HTTP referrer.
 */

const API_KEY = "AIzaSyA2qVO1s5viC6n8M0PlCkpgf4jWTyf_ols";
const CALENDAR_ID =
  "4af8ca65cfc251c1efd5f6b1d56fd7f33d1fd57bc4cd92dfe5678e71543e8190@group.calendar.google.com";

export type CalendarEvent = {
  id: string;
  summary: string;
  start: string | null;
  end: string | null;
  /** Base recurring-event id when this is an instance of a recurring series. */
  recurringEventId: string | null;
};

/** Upcoming events from the public teaching calendar. */
export async function listUpcomingEvents(max = 5): Promise<CalendarEvent[]> {
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
  );
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("maxResults", String(max));
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", new Date().toISOString());

  const res = await fetch(url.toString());
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? "";
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(detail || `Google Calendar API error ${res.status}`);
  }

  const data = (await res.json()) as {
    items?: {
      id?: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      recurringEventId?: string;
    }[];
  };

  return (data.items ?? []).map((e) => ({
    id: e.id ?? "",
    summary: e.summary ?? "(ללא כותרת)",
    start: e.start?.dateTime ?? e.start?.date ?? null,
    end: e.end?.dateTime ?? e.end?.date ?? null,
    recurringEventId: e.recurringEventId ?? null,
  }));
}

/**
 * Future (and current) instances of a recurring series, starting now.
 * Used when the user asks to "predict" the rest of a student's lessons.
 */
export async function listSeriesEvents(
  recurringEventId: string,
  max = 50,
): Promise<CalendarEvent[]> {
  const all = await listUpcomingEvents(Math.max(max, 10));
  return all.filter((e) => e.recurringEventId === recurringEventId);
}
