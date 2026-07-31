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
  role: string;
  joinedDate: string;
  level: number;
  xp: number;
  unlockedBadges: string[];
  reservedMissionIds: string[];
  newsletterSubscribed: boolean;
}

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
