"use client";

/**
 * Google Calendar — direct browser OAuth (Google Identity Services, token flow).
 * Access token is kept in localStorage; no server-side proxy exists in the
 * static GitHub Pages build. Calendar API calls go directly from the browser
 * (the VPN is always on when using the portal).
 */

const SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";
const STORE_KEY = "hebro.google.token";

type StoredToken = { accessToken: string; expiresAt: number };

/* ---- minimal GIS typings (avoid depending on @types/google.accounts) ---- */

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
};

type TokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type GoogleApi = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { type?: string; message?: string }) => void;
      }) => TokenClient;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleApi;
  }
}

/** Error indicating the token is missing/expired/revoked — UI should prompt connect. */
export class GoogleAuthError extends Error {}

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("טעינת Google Identity Services נכשלה (בדקו חיבור/VPN)"));
    document.head.appendChild(script);
  });
}

function readToken(): StoredToken | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as StoredToken) : null;
  } catch {
    return null;
  }
}

export function isGoogleConnected(): boolean {
  const t = readToken();
  return t !== null && t.expiresAt > Date.now() + 60 * 1000;
}

/** Open the Google consent popup and persist the access token. */
export async function connectGoogleCalendar(): Promise<void> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID isn't configured");
  await loadGis();

  await new Promise<void>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? "no access token"));
          return;
        }
        const expiresIn = response.expires_in ?? 3600;
        localStorage.setItem(
          STORE_KEY,
          JSON.stringify({
            accessToken: response.access_token,
            expiresAt: Date.now() + expiresIn * 1000,
          } satisfies StoredToken),
        );
        resolve();
      },
      error_callback: (error) => reject(new Error(error.message ?? error.type ?? "OAuth error")),
    });
    client.requestAccessToken();
  });
}

export function disconnectGoogleCalendar(): void {
  localStorage.removeItem(STORE_KEY);
}

export type CalendarEvent = {
  id: string;
  summary: string;
  start: string | null;
  end: string | null;
};

/** Upcoming events from the primary calendar. Throws GoogleAuthError on 401. */
export async function listUpcomingEvents(max = 5): Promise<CalendarEvent[]> {
  const token = readToken();
  if (!token || token.expiresAt <= Date.now()) {
    throw new GoogleAuthError("Google Calendar isn't connected");
  }

  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
  );
  url.searchParams.set("maxResults", String(max));
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", new Date().toISOString());

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });

  if (res.status === 401 || res.status === 403) {
    throw new GoogleAuthError("Google token expired or revoked");
  }
  if (!res.ok) throw new Error(`Google API error ${res.status}`);

  const data = (await res.json()) as {
    items?: {
      id?: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }[];
  };

  return (data.items ?? []).map((e) => ({
    id: e.id ?? "",
    summary: e.summary ?? "(ללא כותרת)",
    start: e.start?.dateTime ?? e.start?.date ?? null,
    end: e.end?.dateTime ?? e.end?.date ?? null,
  }));
}
