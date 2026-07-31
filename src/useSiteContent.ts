import { useCallback, useEffect, useState } from 'react';
import { Announcement, LabLog, Mission } from './types';
import { CONTENT_CACHE_KEY, CONTENT_CACHE_MS, SHEET_API_URL } from './config';

export type ContentStatus = 'bundled' | 'loading' | 'live' | 'error';

export interface SignupDetails {
  eventId: string;
  eventTitle: string;
  studentName: string;
  school: string;
}

export interface SignupResult {
  ok: boolean;
  error?: string;
  spotsReserved?: number;
  spotsTotal?: number;
  spotsLeft?: number;
}

export interface SiteContent {
  missions: Mission[];
  announcements: Announcement[];
  labLogs: LabLog[];
  status: ContentStatus;
  publishedAt: string | null;
  error: string | null;
  /** Re-fetches from the Sheet, skipping the cache. */
  refresh: () => Promise<void>;
  submitSignup: (details: SignupDetails) => Promise<SignupResult>;
}

interface SheetPayload {
  events?: unknown;
  announcements?: unknown;
  labLogs?: unknown;
  publishedAt?: string | null;
}

interface CacheEnvelope {
  fetchedAt: number;
  payload: SheetPayload;
}

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=800';

const ANNOUNCEMENT_CATEGORIES: Announcement['category'][] = [
  'expansion',
  'toolkit',
  'volunteer',
  'general'
];

const LABLOG_CATEGORIES: LabLog['category'][] = ['chemistry', 'robotics', 'astronomy', 'general'];

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

function pickCategory<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  const raw = asString(value).toLowerCase();
  return (allowed as string[]).includes(raw) ? (raw as T) : fallback;
}

/**
 * The Sheet is edited by hand, so treat every field as untrusted: a row with a
 * missing title or a swapped-in number is dropped rather than rendered broken.
 */
function toMissions(raw: unknown): Mission[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry, index): Mission[] => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;

    const title = asString(row.title);
    if (!title) return [];

    const spotsTotal = asCount(row.spotsTotal);
    const spotsReserved = Math.min(spotsTotal, asCount(row.spotsReserved));

    return [
      {
        id: asString(row.id) || `sheet-event-${index}`,
        title,
        date: asString(row.date, 'Date to be announced'),
        time: asString(row.time),
        location: asString(row.location),
        description: asString(row.description),
        spotsTotal,
        spotsReserved,
        image: asString(row.image) || PLACEHOLDER_IMAGE
      }
    ];
  });
}

function toAnnouncements(raw: unknown): Announcement[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry, index): Announcement[] => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;

    const title = asString(row.title);
    if (!title) return [];

    return [
      {
        id: asString(row.id) || `sheet-ann-${index}`,
        title,
        date: asString(row.date),
        category: pickCategory(row.category, ANNOUNCEMENT_CATEGORIES, 'general'),
        content: asString(row.content)
      }
    ];
  });
}

function toLabLogs(raw: unknown): LabLog[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry, index): LabLog[] => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;

    const title = asString(row.title);
    if (!title) return [];

    return [
      {
        id: asString(row.id) || `sheet-log-${index}`,
        title,
        date: asString(row.date),
        category: pickCategory(row.category, LABLOG_CATEGORIES, 'general'),
        summary: asString(row.summary),
        content: asString(row.content),
        image: asString(row.image) || PLACEHOLDER_IMAGE,
        author: asString(row.author, 'Turtle Rock Science Club')
      }
    ];
  });
}

function readCache(): CacheEnvelope | null {
  try {
    const raw = localStorage.getItem(CONTENT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope;
    if (!parsed || typeof parsed.fetchedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload: SheetPayload) {
  try {
    localStorage.setItem(
      CONTENT_CACHE_KEY,
      JSON.stringify({ fetchedAt: Date.now(), payload } satisfies CacheEnvelope)
    );
  } catch {
    // A full or disabled localStorage is not worth failing the render over.
  }
}

/**
 * Apps Script serves JSON over plain GET with permissive CORS, but a
 * misconfigured deployment answers with an HTML login page instead. Reading the
 * body as text first lets us fail with a useful message rather than a bare
 * "Unexpected token <".
 */
async function fetchPayload(signal?: AbortSignal): Promise<SheetPayload> {
  const url = `${SHEET_API_URL}${SHEET_API_URL.includes('?') ? '&' : '?'}t=${Date.now()}`;
  const response = await fetch(url, { signal, redirect: 'follow' });

  if (!response.ok) throw new Error(`The publish endpoint returned HTTP ${response.status}.`);

  const body = await response.text();
  try {
    return JSON.parse(body) as SheetPayload;
  } catch {
    throw new Error(
      'The publish endpoint did not return JSON. Check that the deployment’s ' +
        '"Who has access" is set to "Anyone".'
    );
  }
}

/**
 * Loads events, announcements and lab logs from the published Google Sheet.
 *
 * Falls back to empty lists whenever the Sheet is not configured,
 * unreachable, or has published nothing yet.
 */
export function useSiteContent(): SiteContent {
  const cached = readCache();

  const [payload, setPayload] = useState<SheetPayload | null>(cached?.payload ?? null);
  const [status, setStatus] = useState<ContentStatus>(() => {
    if (!SHEET_API_URL) return 'bundled';
    return cached ? 'live' : 'loading';
  });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const fresh = await fetchPayload(signal);
      setPayload(fresh);
      setStatus('live');
      setError(null);
      writeCache(fresh);
    } catch (err: unknown) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : 'Could not reach the publish endpoint.');
      // Keep showing whatever we already have; only the status changes.
      setStatus((prev) => (prev === 'live' ? 'live' : 'error'));
    }
  }, []);

  useEffect(() => {
    if (!SHEET_API_URL) return;

    // A cache younger than the TTL is good enough; skip the network entirely.
    if (cached && Date.now() - cached.fetchedAt < CONTENT_CACHE_MS) return;

    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
    // Runs once: the endpoint is a build-time constant, not reactive state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    if (!SHEET_API_URL) return;
    await load();
  }, [load]);

  /**
   * Sends a signup. `text/plain` is deliberate: it is a CORS-safelisted content
   * type, so the browser skips the preflight OPTIONS request that Apps Script
   * cannot answer.
   */
  const submitSignup = useCallback(
    async (details: SignupDetails): Promise<SignupResult> => {
      if (!SHEET_API_URL) {
        return { ok: false, error: 'Signups are not connected to the spreadsheet yet.' };
      }

      try {
        const response = await fetch(SHEET_API_URL, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'signup', ...details })
        });

        if (!response.ok) {
          return { ok: false, error: `The server returned HTTP ${response.status}.` };
        }

        const result = JSON.parse(await response.text()) as SignupResult;
        if (result.ok) void refresh();
        return result;
      } catch {
        return {
          ok: false,
          error: 'Could not reach the sign-up server. Check your connection and try again.'
        };
      }
    },
    [refresh]
  );

  const sheetMissions = toMissions(payload?.events);
  const sheetAnnouncements = toAnnouncements(payload?.announcements);
  const sheetLabLogs = toLabLogs(payload?.labLogs);

  return {
    missions: payload ? sheetMissions : [],
    announcements: payload ? sheetAnnouncements : [],
    labLogs: payload && Array.isArray(payload.labLogs) ? sheetLabLogs : [],
    status,
    publishedAt: typeof payload?.publishedAt === 'string' ? payload.publishedAt : null,
    error,
    refresh,
    submitSignup
  };
}
