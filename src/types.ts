export interface LabLog {
  id: string;
  title: string;
  date: string;
  category: 'chemistry' | 'robotics' | 'astronomy' | 'general';
  summary: string;
  content: string;
  image: string;
  author: string;
}

export interface Mission {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  spotsTotal: number;
  spotsReserved: number;
  image: string;
  badgeRequired?: string;
}

export interface GalleryPhoto {
  id: string;
  title: string;
  description: string;
  category: 'experiments' | 'field-trips' | 'lab-meetings';
  imageUrl: string;
  submittedBy: string;
  date: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface UserProfile {
  name: string;
  school: string;
  role: string;
  joinedDate: string;
  level: number;
  xp: number;
  /** Badge ids from `badges.ts`. Legacy display names are migrated on load. */
  unlockedBadges: string[];
  reservedMissionIds: string[];
  newsletterSubscribed: boolean;
}

export type GameId = 'orbit' | 'molecule' | 'robot' | 'adventure';

/**
 * Which level indices of each minigame have been solved. Persisted, because an
 * unmounting Virtual Lab used to forget everything — which both lost the level
 * strip's trophies and let the same level be farmed for XP over and over.
 */
export type GameProgress = Record<GameId, number[]>;

export const EMPTY_GAME_PROGRESS: GameProgress = { orbit: [], molecule: [], robot: [], adventure: [] };

export interface Announcement {
  id: string;
  title: string;
  date: string;
  category: 'expansion' | 'toolkit' | 'volunteer' | 'general';
  content: string;
  image?: string;
}

export interface PressMention {
  id: string;
  source: string;
  title: string;
  date: string;
  snippet: string;
  url?: string;
}
