import React from 'react';
import { Announcement } from '../types';
import { ContentStatus } from '../useSiteContent';
import { Clock, ArrowRight } from 'lucide-react';
import SafeHtml from './SafeHtml';

interface HomeAnnouncementsProps {
  announcements: Announcement[];
  contentStatus: ContentStatus;
  onViewAll: () => void;
}

export default function HomeAnnouncements({
  announcements,
  contentStatus,
  onViewAll
}: HomeAnnouncementsProps) {
  const latestAnnouncements = announcements.slice(0, 3);

  return (
    <section
      id="home-announcements-section"
      className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-left relative z-10 font-sans"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-hero font-bold tracking-wider text-[#4C9A3A] uppercase">
            Club Updates
          </span>
          <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl tracking-tight text-[#1F3A42] mt-1">
            Latest Announcements
          </h2>
        </div>
        <button
          id="home-view-all-announcements-btn"
          onClick={onViewAll}
          className="inline-flex items-center gap-1.5 text-xs font-hero font-bold text-[#2E7D46] hover:text-[#1F3A42] transition-colors cursor-pointer group shrink-0"
        >
          <span>View all announcements</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {latestAnnouncements.length === 0 ? (
        <div className="p-8 rounded-2xl border-2 border-[#1F3A42]/8 bg-white text-center space-y-2">
          <p className="font-display font-bold text-base text-[#1F3A42]">
            {contentStatus === 'loading' ? 'Loading announcements…' : 'No announcements yet…'}
          </p>
          {contentStatus !== 'loading' && (
            <p className="text-xs text-[#4B6169] font-sans">Check back soon for updates!</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {latestAnnouncements.map((ann) => (
            <div
              id={`home-announcement-${ann.id}`}
              key={ann.id}
              className="rounded-2xl border-2 border-[#1F3A42]/8 bg-white p-5 sm:p-6 space-y-3 hover:border-[#1F3A42]/15 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-display font-bold bg-[#E4F5DA] text-[#2E7D46] uppercase tracking-wide">
                    {ann.category}
                  </span>
                  {ann.date && (
                    <span className="text-[11px] text-[#9AA6A6] font-bold flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {ann.date}
                    </span>
                  )}
                </div>
                <SafeHtml as="h3" content={ann.title} className="font-display font-bold text-base sm:text-lg tracking-tight leading-snug text-[#1F3A42]" />
                <SafeHtml content={ann.content} className="text-xs sm:text-sm leading-relaxed text-[#4B6169] line-clamp-4" />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
