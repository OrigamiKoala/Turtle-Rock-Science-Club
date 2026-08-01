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
  childAge?: string;
  /** Guardian ticked the newsletter box. Absent/false means do not subscribe. */
  newsletterOptIn?: boolean;
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
  submitMemberJoin: (details: MemberJoinDetails) => Promise<void>;
  loginMember: (identifier: string) => Promise<{ ok: boolean; profile?: UserProfile; error?: string }>;
  syncProfile: (profile: UserProfile) => Promise<void>;
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
    const url = asString(row.url);
    if (!title || !url) return [];

    return [
      {
        id: asString(row.id) || `sheet-resource-${index}`,
        title,
        description: asString(row.description),
        category: asString(row.category, 'general').toLowerCase(),
        level: asString(row.level, 'all').toLowerCase(),
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

  const submitMemberJoin = useCallback(async (details: MemberJoinDetails): Promise<void> => {
    if (!SHEET_API_URL) return;

    try {
      await fetch(SHEET_API_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'join', ...details })
      });
    } catch {
      // Silently swallow errors logging join details so user onboarding flow never blocks
    }
  }, []);

  const loginMember = useCallback(
    async (identifier: string): Promise<{ ok: boolean; profile?: UserProfile; error?: string }> => {
      if (!SHEET_API_URL) {
        return { ok: false, error: 'Spreadsheet connection not configured.' };
      }

      try {
        const response = await fetch(SHEET_API_URL, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'login', identifier })
        });

        if (!response.ok) return { ok: false, error: `Server error HTTP ${response.status}` };

        const result = JSON.parse(await response.text()) as { ok: boolean; profile?: UserProfile; error?: string };
        return result;
      } catch {
        return { ok: false, error: 'Could not connect to member database. Please try again.' };
      }
    },
    []
  );

  const syncProfile = useCallback(async (profile: UserProfile): Promise<void> => {
    if (!SHEET_API_URL || profile.level <= 0) return;

    try {
      await fetch(SHEET_API_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'syncProfile',
          name: profile.name,
          school: profile.school,
          role: profile.role,
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
  const parsedResources = payload && Array.isArray(payload.resources) ? toResources(payload.resources) : [];
  const finalResources = parsedResources.length > 0 ? parsedResources : DEFAULT_RESOURCES;

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
    subscribeNewsletter
  };
}
