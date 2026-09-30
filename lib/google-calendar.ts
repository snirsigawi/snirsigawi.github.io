"use client";

/**
 * Google Calendar — OAuth 2.0 implicit flow via full-page redirect.
 *
 * Why not the GIS popup: Google Identity Services relays the token from the
 * consent popup back to the opener page using a third-party iframe/postMessage
 * handshake. Firefox (storage partitioning / tracking protection) and some
 * embedded/popup-blocked environments silently swallow that relay — the popup
 * closes after the `gsi/transform` page but no callback ever fires.
 *
 * A top-level redirect to a registered redirect URI is immune to all of that:
 * Google returns the access token in the URL fragment of this same page.
 */

const SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const STORE_KEY = "hebro.google.token";
const STATE_KEY = "hebro.google.state";

type StoredToken = { accessToken: string; expiresAt: number };

/** Error indicating the token is missing/expired/revoked — UI should prompt connect. */
export class GoogleAuthError extends Error {}

/** The calendar settings page is its own redirect target (trailingSlash → path ends with "/"). */
function currentRedirectUri(): string {
  const { origin, pathname } = window.location;
  return origin + (pathname.endsWith("/") ? pathname : `${pathname}/`);
}

/** Leave the app and show Google's consent screen. Google redirects back here. */
export function startGoogleConnect(): void {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID isn't configured");

  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes, (b) => b.toString(16).padStart(2, "0")).join("");
  sessionStorage.setItem(STATE_KEY, state);

  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", currentRedirectUri());
  url.searchParams.set("response_type", "token");
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "consent");

  window.location.assign(url.toString());
}

export type ConnectResult = { ok: true } | { ok: false; error: string };

/**
 * If the page was loaded as the redirect target (token/error in the fragment),
 * consume it, persist the token, and return the outcome. Returns null when this
 * is a normal page load without an OAuth response.
 */
export function handleConnectRedirect(): ConnectResult | null {
  const hash = window.location.hash;
  if (!hash || hash.length <= 1) return null;

  const params = new URLSearchParams(hash.slice(1));
  const savedState = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);

  const oauthError = params.get("error");
  if (oauthError) {
    const messages: Record<string, string> = {
      access_denied: "הגישה ליומן Google סורבה.",
      invalid_scope: "היקף ההרשאות המבוקש אינו תקין.",
    };
    return { ok: false, error: messages[oauthError] ?? `שגיאת Google: ${oauthError}` };
  }

  const accessToken = params.get("access_token");
  const state = params.get("state");
  if (!accessToken) {
    return { ok: false, error: "לא התקבל טוקן גישה מ-Google." };
  }
  if (!savedState || savedState !== state) {
    return { ok: false, error: "בדיקת האבטחה מול Google נכשלה (state mismatch). נסו שוב." };
  }

  const expiresIn = Number(params.get("expires_in") ?? 3600);
  const stored: StoredToken = {
    accessToken,
    expiresAt: Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000,
  };
  localStorage.setItem(STORE_KEY, JSON.stringify(stored));
  return { ok: true };
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
