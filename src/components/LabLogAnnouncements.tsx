import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LabLog, Announcement } from '../types';
import { ContentStatus } from '../useSiteContent';
import { Clock, User, X, MessageSquare } from 'lucide-react';
import SafeHtml from './SafeHtml';

interface LabLogAnnouncementsProps {
  logs: LabLog[];
  announcements: Announcement[];
  contentStatus: ContentStatus;
}

export default function LabLogAnnouncements({ logs, announcements, contentStatus }: LabLogAnnouncementsProps) {
  const [activeLogId, setActiveLogId] = useState<string | null>(null);

  const [comments, setComments] = useState<Record<string, Array<{ name: string; text: string; date: string }>>>({
    'log-1': [{ name: 'Sarah Chen', text: 'Loved watching the slime react to the magnets!', date: 'Yesterday' }]
  });
  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  useEffect(() => {
    if (activeLogId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeLogId]);

  const activeLog = logs.find((l) => l.id === activeLogId);

  const handleAddComment = (e: React.FormEvent, logId: string) => {
    e.preventDefault();
    if (!newCommentName || !newCommentText) return;
    const added = { name: newCommentName, text: newCommentText, date: 'Today' };
    setComments((prev) => ({ ...prev, [logId]: [...(prev[logId] || []), added] }));
    setNewCommentName(''); setNewCommentText('');
  };

  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-14 text-left relative z-10 font-sans">
      <div className="space-y-8">
        <div>
          <h3 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-[#1F3A42]">Latest From the Lab Log</h3>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 rounded-[28px] border-2 border-[#1F3A42]/8 bg-white text-center space-y-2">
            <p className="font-display font-bold text-base text-[#1F3A42]">
              {contentStatus === 'loading' ? 'Loading...' : 'No lab entries yet...'}
            </p>
            {contentStatus !== 'loading' && (
              <p className="text-xs text-[#4B6169] font-sans">Check back later!</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {logs.map((log) => (
              <div id={`log-card-${log.id}`} key={log.id} className="rounded-[28px] border-2 border-[#1F3A42]/8 bg-white overflow-hidden flex flex-col justify-between transition hover:border-[#1F3A42]/15 hover:shadow-lg cursor-pointer" onClick={() => setActiveLogId(log.id)}>
                <div className="relative h-44 overflow-hidden border-b-2 border-[#1F3A42]/5">
                  <img src={log.image} alt={log.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" referrerPolicy="no-referrer" />
                  <span className="absolute top-3 right-3 bg-[#1F3A42] text-white dark:bg-[#6CC24A] dark:text-[#14351F] text-[10px] font-display font-bold px-2.5 py-1 rounded-full shadow-md capitalize">{log.category}</span>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-[#9AA6A6]"><Clock className="w-3.5 h-3.5" /><span>{log.date}</span></div>
                    <SafeHtml as="h4" content={log.title} className="font-display font-bold text-base leading-snug text-[#1F3A42]" />
                    <SafeHtml content={log.summary} className="text-xs leading-relaxed line-clamp-2 text-[#4B6169]" />
                  </div>
                  <div className="pt-3 border-t-2 border-[#1F3A42]/8 flex items-center justify-between text-[11px] font-bold text-[#4B6169]">
                    <span>By: {log.author}</span>
                    <span className="font-bold text-[#4C9A3A]">Read Entry →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 pt-6 border-t-2 border-[#1F3A42]/8">
        <div className="space-y-1">
          <h4 className="font-display font-bold text-xl sm:text-2xl tracking-tight text-[#1F3A42]">Club Announcements</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.length === 0 ? (
            <div className="col-span-full p-6 rounded-2xl border-2 border-[#1F3A42]/8 bg-white text-center space-y-1">
              <p className="font-display font-bold text-sm text-[#1F3A42]">
                {contentStatus === 'loading' ? 'Loading...' : 'No announcements yet...'}
              </p>
              {contentStatus !== 'loading' && (
                <p className="text-xs text-[#4B6169] font-sans">Check back later!</p>
              )}
            </div>
          ) : (
            announcements.map((ann) => (
              <div id={`announcement-${ann.id}`} key={ann.id} className="p-5 rounded-2xl border-2 border-[#1F3A42]/8 bg-white space-y-2.5 hover:border-[#1F3A42]/15 transition-all">
                <div className="flex items-center justify-between gap-4">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-display font-bold bg-[#E4F5DA] text-[#2E7D46]">{ann.category}</span>
                  <span className="text-[10px] text-[#9AA6A6] font-bold">{ann.date}</span>
                </div>
                <SafeHtml as="h5" content={ann.title} className="font-display font-bold text-sm tracking-tight leading-snug text-[#1F3A42]" />
                <SafeHtml content={ann.content} className="text-xs leading-relaxed text-[#4B6169]" />
              </div>
            ))
          )}
        </div>
      </div>

      {activeLog && createPortal(
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-[#1F3A42]/75 will-change-transform flex items-center justify-center p-4 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveLogId(null);
          }}
        >
          <div id="log-detail-modal" className="w-full max-w-4xl lg:max-w-5xl rounded-[28px] overflow-hidden shadow-2xl bg-[#FBF7EC] dark:bg-[#12181A] dark:text-white max-h-[92vh] flex flex-col relative">
            {/* Sticky top-right close button */}
            <div className="sticky top-0 z-30 flex justify-end p-4 pointer-events-none -mb-14">
              <button
                id="close-log-modal-btn"
                onClick={() => setActiveLogId(null)}
                className="pointer-events-auto w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-lg border border-white/20"
                aria-label="Close newsletter"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Entire modal content in one unified scroll container */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {/* Hero Banner (scrolls away as you read!) */}
              <div className="relative h-60 sm:h-80 w-full bg-[#1F3A42]">
                <img src={activeLog.image} alt={activeLog.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-end p-6 sm:p-8">
                  <div className="text-white space-y-2 max-w-3xl">
                    <span className="bg-[#6CC24A] text-[#14351F] text-[11px] font-display font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">{activeLog.category}</span>
                    <SafeHtml as="h2" content={activeLog.title} className="font-display font-bold text-xl sm:text-3xl lg:text-4xl tracking-tight leading-tight text-white drop-shadow-sm" />
                  </div>
                </div>
              </div>

              {/* Newsletter Body */}
              <div className="p-6 sm:p-10 space-y-8 max-w-4xl mx-auto">
                <div className="flex items-center justify-between gap-4 text-xs font-bold text-[#4B6169] dark:text-[#93A6A0] border-b-2 border-[#1F3A42]/8 dark:border-white/10 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5"><User className="w-4 h-4 text-[#4C9A3A]" /><span>{activeLog.author}</span></div>
                    <span>•</span>
                    <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-[#4C9A3A]" /><span>{activeLog.date}</span></div>
                  </div>
                  <span className="text-[11px] font-medium text-[#4C9A3A] bg-[#E4F5DA] dark:bg-[#1B2E24] px-2.5 py-1 rounded-full">
                    Issue No. 1
                  </span>
                </div>

                <div className="trsc-newsletter-wrapper">
                  <SafeHtml content={activeLog.content} className="text-sm sm:text-base leading-relaxed font-sans text-[#1F3A42] dark:text-[#E2E8F0]" />
                </div>

                {/* Discussion Section */}
                <div className="space-y-4 pt-8 border-t-2 border-[#1F3A42]/8 dark:border-white/10">
                  <h5 className="font-display font-bold text-sm text-[#1F3A42] dark:text-white flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[#4C9A3A]" />Discussion ({comments[activeLog.id]?.length || 0})
                  </h5>

                  <div className="space-y-3">
                    {(comments[activeLog.id] || []).map((comm, index) => (
                      <div key={index} className="p-3.5 rounded-xl border-2 border-[#1F3A42]/8 dark:border-white/10 bg-white dark:bg-[#1B2426] text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-[#4B6169] dark:text-[#93A6A0]">
                          <span className="text-[#1F3A42] dark:text-white">{comm.name}</span>
                          <span>{comm.date}</span>
                        </div>
                        <p className="leading-relaxed text-[#4B6169] dark:text-[#A3B5AE]">{comm.text}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={(e) => handleAddComment(e, activeLog.id)} className="space-y-2 pt-2">
                    <input id="comment-name-input" type="text" placeholder="Your Name" value={newCommentName} onChange={(e) => setNewCommentName(e.target.value)}
                      className="w-full p-2 rounded-xl text-xs border-2 border-[#1F3A42]/12 dark:border-white/10 bg-white dark:bg-[#1B2426] text-[#1F3A42] dark:text-white focus:outline-none" required />
                    <div className="flex gap-2">
                      <input id="comment-text-input" type="text" placeholder="Add to the discussion..." value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)}
                        className="flex-1 p-2 rounded-xl text-xs border-2 border-[#1F3A42]/12 dark:border-white/10 bg-white dark:bg-[#1B2426] text-[#1F3A42] dark:text-white focus:outline-none" required />
                      <button id="comment-submit-btn" type="submit" className="px-4 py-2 rounded-full text-[11px] font-display font-bold cursor-pointer bg-[#6CC24A] text-[#14351F]">Comment</button>
                    </div>
                  </form>
                </div>

                {/* Bottom Close Action */}
                <div className="pt-6 pb-4 flex justify-center">
                  <button
                    id="close-log-footer-btn"
                    onClick={() => setActiveLogId(null)}
                    className="px-8 py-3 rounded-full text-xs sm:text-sm font-display font-bold bg-[#1F3A42] text-white hover:bg-[#2A4C56] dark:bg-[#6CC24A] dark:text-[#14351F] dark:hover:bg-[#5bb33b] transition-all cursor-pointer shadow-md"
                  >
                    Close Newsletter
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
