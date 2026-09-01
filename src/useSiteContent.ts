import { useCallback, useEffect, useState } from 'react';
import { Announcement, EventPhoto, GalleryPhoto, LabLog, Mission, Resource, UserProfile } from './types';
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

export interface MemberJoinDetails {
  name: string;
  school: string;
  role?: string;
  parentName?: string;
  email?: string;
  studentEmail?: string;
  /** School grade as `K` or `1`–`12`. Lands in the Members tab's Grade column. */
  childGrade?: string;
  /** Guardian ticked the newsletter box. Absent/false means do not subscribe. */
  newsletterOptIn?: boolean;
  /** Minimum 8 characters, checked again server-side. */
  password: string;
  /** Fields replicated from the club's former standalone registration form. */
  parent1Phone: string;
  parent2Name?: string;
  parent2Email?: string;
  parent2Phone?: string;
  /** 'Agree' | 'Disagree' */
  videoConsent: string;
  /** 'Agree' | 'Disagree (Will Not Participate)' */
  waiverConsent: string;
}

export interface JoinResult {
  ok: boolean;
  error?: string;
  sessionToken?: string;
  needsVerification?: boolean;
  newsletterSubscribed?: boolean;
  profile?: UserProfile;
}

export interface LoginParams {
  identifier: string;
  password?: string;
  /** Only sent when the server has already reported `needsPasswordSetup` — claims a pre-password legacy account. */
  newPassword?: string;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  /** This identifier matched a member created before passwords existed; resubmit with `newPassword`. */
  needsPasswordSetup?: boolean;
  sessionToken?: string;
  profile?: UserProfile;
}

export interface SimpleResult {
  ok: boolean;
  error?: string;
}

export interface NewsletterResult {
  ok: boolean;
  error?: string;
  /** The address was already on the list — worth saying so rather than "welcome!". */
  alreadySubscribed?: boolean;
}

export interface SiteContent {
  missions: Mission[];
  announcements: Announcement[];
  labLogs: LabLog[];
  eventPhotos: EventPhoto[];
  photos: GalleryPhoto[];
  resources: Resource[];
  status: ContentStatus;
  publishedAt: string | null;
  error: string | null;
  /** Re-fetches from the Sheet, skipping the cache. */
  refresh: () => Promise<void>;
  submitSignup: (details: SignupDetails) => Promise<SignupResult>;
  submitMemberJoin: (details: MemberJoinDetails) => Promise<JoinResult>;
  loginMember: (params: LoginParams) => Promise<LoginResult>;
  syncProfile: (profile: UserProfile, sessionToken: string) => Promise<void>;
  logout: (sessionToken: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<SimpleResult>;
  requestPasswordReset: (identifier: string) => Promise<SimpleResult>;
  resetPassword: (token: string, newPassword: string) => Promise<SimpleResult>;
  /** Adds an address to the Newsletter tab, which mirrors it into Sender.net. */
  subscribeNewsletter: (email: string, source?: string) => Promise<NewsletterResult>;
}

interface SheetPayload {
  events?: unknown;
  announcements?: unknown;
  labLogs?: unknown;
  eventPhotos?: unknown;
  photos?: unknown;
  resources?: unknown;
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
const PHOTO_CATEGORIES: GalleryPhoto['category'][] = ['experiments', 'field-trips', 'lab-meetings'];

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

    if (row.done === true) return [];

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
        category: asString(row.category, 'general').toLowerCase(),
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
        category: asString(row.category, 'general').toLowerCase(),
        summary: asString(row.summary),
        content: asString(row.content),
        image: asString(row.image) || PLACEHOLDER_IMAGE,
        author: asString(row.author, 'Turtle Rock Science Club')
      }
    ];
  });
}

function toEventPhotos(raw: unknown): EventPhoto[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry, index): EventPhoto[] => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;

    const title = asString(row.title);
    const photosRaw = asString(row.albumEmbed || row.photos || row.albumUrl);
    if (!title || !photosRaw) return [];

    const isHtml = photosRaw.includes('<');

    return [
      {
        id: asString(row.id) || `sheet-photo-${index}`,
        title,
        date: asString(row.date, 'Date to be announced'),
        description: asString(row.description, `Photo album for ${title}`),
        albumUrl: isHtml ? asString(row.albumUrl) : photosRaw,
        albumEmbed: photosRaw,
        image: asString(row.image) || PLACEHOLDER_IMAGE
      }
    ];
  });
}

function toGalleryPhotos(raw: unknown): GalleryPhoto[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry, index): GalleryPhoto[] => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;

    const imageUrl = asString(row.imageUrl || row.image);
    if (!imageUrl) return [];

    return [
      {
        id: asString(row.id) || `sheet-direct-photo-${index}`,
        title: asString(row.title, 'Science Moment'),
        description: asString(row.caption || row.description),
        category: pickCategory(row.category, PHOTO_CATEGORIES, 'experiments'),
        imageUrl,
        submittedBy: asString(row.submittedBy, 'Turtle Rock Science Club'),
        date: asString(row.date, 'Club Moment')
      }
    ];
  });
}

const RESOURCE_CATEGORIES = ['chemistry', 'physics', 'astronomy', 'biology', 'robotics', 'general'];

const DEFAULT_RESOURCES: Resource[] = [
  {
    id: 'res-1',
    title: 'PhET Interactive Science Simulations',
    description: 'Explore interactive simulations for physics, chemistry, biology, earth science, and math created by UC Boulder.',
    category: 'chemistry',
    level: 'elementary',
    url: 'https://phet.colorado.edu/',
    type: 'tool'
  },
  {
    id: 'res-2',
    title: 'NASA Climate Kids & Space Place',
    description: 'Engaging games, hands-on activities, and articles exploring Earth’s climate, outer space, stars, and space exploration.',
    category: 'astronomy',
    level: 'elementary',
    url: 'https://spaceplace.nasa.gov/',
    type: 'website'
  },
  {
    id: 'res-3',
    title: 'Science News Explores',
    description: 'Topical STEM news articles, discoveries, and science explainers written specifically for young researchers and students.',
    category: 'general',
    level: 'middle school',
    url: 'https://www.snexplores.org/',
    type: 'article'
  },
  {
    id: 'res-4',
    title: 'Scratch Coding & Robotics Lab',
    description: 'Creative coding platform developed by MIT Media Lab to build interactive games, animations, and robot block scripts.',
    category: 'robotics',
    level: 'elementary',
    url: 'https://scratch.mit.edu/',
    type: 'tool'
  },
  {
    id: 'res-5',
    title: 'Khan Academy Science',
    description: 'Free comprehensive video lessons and practice problems covering force & motion, habitats, energy, and matter.',
    category: 'physics',
    level: 'middle school',
    url: 'https://www.khanacademy.org/science',
    type: 'video'
  },
  {
    id: 'res-6',
    title: 'National Geographic Kids Science',
    description: 'Fascinating videos, animal encyclopedias, and fun experiment guides to try at home or in class.',
    category: 'biology',
    level: 'elementary',
    url: 'https://kids.nationalgeographic.com/science',
    type: 'website'
  }
];

function toResources(raw: unknown): Resource[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry, index): Resource[] => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;

    const title = asString(row.title);
    let url = asString(row.url);
    if (!title || !url) return [];

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // The sheet's Level dropdown (RESOURCE_LEVELS in Code.gs) offers the operator
    // "All Levels" as its wildcard option, not "all" — normalize it to the "all"
    // sentinel the frontend filters on, or it leaks in as a second, non-matching
    // "All Levels" pill alongside the real one.
    const rawLevel = asString(row.level, 'all').toLowerCase();
    const level = rawLevel === 'all levels' ? 'all' : rawLevel;

    return [
      {
        id: asString(row.id) || `sheet-resource-${index}`,
        title,
        description: asString(row.description),
        category: asString(row.category, 'general').toLowerCase(),
        level,
        url,
        type: asString(row.type, 'website').toLowerCase()
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
 * A `login`/`join` response is trusted as-is once `ok` is true — this is the
 * boundary that actually checks the shape before that trust is extended, so a
 * malformed server response fails here instead of crashing later (e.g. inside
 * `handleUpdateXp`'s `[...prev.unlockedBadges]`).
 */
function isValidProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.name === 'string' &&
    typeof p.school === 'string' &&
    typeof p.role === 'string' &&
    typeof p.joinedDate === 'string' &&
    typeof p.level === 'number' &&
    typeof p.xp === 'number' &&
    Array.isArray(p.unlockedBadges) &&
    Array.isArray(p.reservedMissionIds) &&
    typeof p.newsletterSubscribed === 'boolean'
  );
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

  const submitMemberJoin = useCallback(async (details: MemberJoinDetails): Promise<JoinResult> => {
    if (!SHEET_API_URL) {
      return { ok: false, error: 'Spreadsheet connection not configured.' };
    }

    try {
      const response = await fetch(SHEET_API_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'join', ...details })
      });

      if (!response.ok) return { ok: false, error: `Server error HTTP ${response.status}` };

      const result = JSON.parse(await response.text()) as JoinResult;
      if (result.ok && !isValidProfile(result.profile)) {
        return { ok: false, error: 'Unexpected response from the server. Please try again.' };
      }
      return result;
    } catch {
      return { ok: false, error: 'Could not reach the club server. Please check your connection and try again.' };
    }
  }, []);

  const loginMember = useCallback(async (params: LoginParams): Promise<LoginResult> => {
    if (!SHEET_API_URL) {
      return { ok: false, error: 'Spreadsheet connection not configured.' };
    }

    try {
      const response = await fetch(SHEET_API_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'login', ...params })
      });

      if (!response.ok) return { ok: false, error: `Server error HTTP ${response.status}` };

      const result = JSON.parse(await response.text()) as LoginResult;
      if (result.ok && (!result.sessionToken || !isValidProfile(result.profile))) {
        return { ok: false, error: 'Unexpected response from the server. Please try again.' };
      }
      return result;
    } catch {
      return { ok: false, error: 'Could not connect to member database. Please try again.' };
    }
  }, []);

  const syncProfile = useCallback(async (profile: UserProfile, sessionToken: string): Promise<void> => {
    if (!SHEET_API_URL || profile.level <= 0 || !sessionToken) return;

    try {
      await fetch(SHEET_API_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'syncProfile',
          sessionToken,
          level: profile.level,
          xp: profile.xp,
          unlockedBadges: profile.unlockedBadges,
          reservedMissionIds: profile.reservedMissionIds
        })
      });
    } catch {
      // Ignore network failures on profile sync
    }
  }, []);

  const logout = useCallback(async (sessionToken: string): Promise<void> => {
    if (!SHEET_API_URL || !sessionToken) return;

    try {
      await fetch(SHEET_API_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'logout', sessionToken })
      });
    } catch {
      // The local session is cleared regardless; a stale server-side token
      // just expires on its own after SESSION_DURATION_MS.
    }
  }, []);

  const verifyEmail = useCallback(async (token: string): Promise<SimpleResult> => {
    if (!SHEET_API_URL) return { ok: false, error: 'Spreadsheet connection not configured.' };

    try {
      const response = await fetch(SHEET_API_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'verifyEmail', token })
      });
      if (!response.ok) return { ok: false, error: `Server error HTTP ${response.status}` };
      return JSON.parse(await response.text()) as SimpleResult;
    } catch {
      return { ok: false, error: 'Could not reach the club server. Please check your connection and try again.' };
    }
  }, []);

  const requestPasswordReset = useCallback(async (identifier: string): Promise<SimpleResult> => {
    if (!SHEET_API_URL) return { ok: false, error: 'Spreadsheet connection not configured.' };

    try {
      const response = await fetch(SHEET_API_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'requestPasswordReset', identifier })
      });
      if (!response.ok) return { ok: false, error: `Server error HTTP ${response.status}` };
      return JSON.parse(await response.text()) as SimpleResult;
    } catch {
      return { ok: false, error: 'Could not reach the club server. Please check your connection and try again.' };
    }
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string): Promise<SimpleResult> => {
    if (!SHEET_API_URL) return { ok: false, error: 'Spreadsheet connection not configured.' };

    try {
      const response = await fetch(SHEET_API_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'resetPassword', token, newPassword })
      });
      if (!response.ok) return { ok: false, error: `Server error HTTP ${response.status}` };
      return JSON.parse(await response.text()) as SimpleResult;
    } catch {
      return { ok: false, error: 'Could not reach the club server. Please check your connection and try again.' };
    }
  }, []);

  /**
   * The Sender.net API token lives in the Apps Script's properties, never in
   * this bundle, so the browser subscribes by asking the script to do it.
   */
  const subscribeNewsletter = useCallback(
    async (email: string, source?: string): Promise<NewsletterResult> => {
      const trimmed = email.trim();
      if (!trimmed) return { ok: false, error: 'Please enter your email address.' };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
        return { ok: false, error: 'That does not look like an email address.' };
      }
      if (!SHEET_API_URL) {
        return { ok: false, error: 'The newsletter is not connected yet. Please check back soon.' };
      }

      try {
        const response = await fetch(SHEET_API_URL, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'subscribe', email: trimmed, source: source ?? 'Website footer' })
        });

        if (!response.ok) return { ok: false, error: `The server returned HTTP ${response.status}.` };

        return JSON.parse(await response.text()) as NewsletterResult;
      } catch {
        return {
          ok: false,
          error: 'Could not reach the sign-up server. Check your connection and try again.'
        };
      }
    },
    []
  );

  const sheetMissions = toMissions(payload?.events);
  const sheetAnnouncements = toAnnouncements(payload?.announcements);
  const sheetLabLogs = toLabLogs(payload?.labLogs);
  const sheetEventPhotos = toEventPhotos(payload?.eventPhotos);
  const sheetPhotos = toGalleryPhotos(payload?.photos);
  const hasResourcesInPayload = payload !== null && typeof payload === 'object' && 'resources' in payload && Array.isArray(payload.resources);
  const parsedResources = hasResourcesInPayload ? toResources(payload.resources) : [];
  const finalResources = hasResourcesInPayload ? parsedResources : DEFAULT_RESOURCES;

  return {
    missions: payload ? sheetMissions : [],
    announcements: payload ? sheetAnnouncements : [],
    labLogs: payload && Array.isArray(payload.labLogs) ? sheetLabLogs : [],
    eventPhotos: payload && Array.isArray(payload.eventPhotos) ? sheetEventPhotos : [],
    photos: payload && Array.isArray(payload.photos) ? sheetPhotos : [],
    resources: finalResources,
    status,
    publishedAt: typeof payload?.publishedAt === 'string' ? payload.publishedAt : null,
    error,
    refresh,
    submitSignup,
    submitMemberJoin,
    loginMember,
    syncProfile,
    logout,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    subscribeNewsletter
  };
}
