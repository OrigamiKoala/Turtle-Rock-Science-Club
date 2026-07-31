import React, { useState } from 'react';
import { ClubIdentity, LabLog, Announcement, PressMention, UserProfile } from '../types';
import { BookOpen, Newspaper, Send, CheckCircle, Mail, Quote, Clock, User, X, MessageSquare, AlertCircle } from 'lucide-react';

interface LabLogAnnouncementsProps {
  identity: ClubIdentity;
  logs: LabLog[];
  announcements: Announcement[];
  press: PressMention[];
  userProfile: UserProfile;
  onSubscribeNewsletter: () => void;
}

export default function LabLogAnnouncements({
  identity,
  logs,
  announcements,
  press,
  userProfile,
  onSubscribeNewsletter
}: LabLogAnnouncementsProps) {
  const isTurtle = identity === 'turtlerock';

  // Modal / overlay detail state
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Comment state inside logs
  const [comments, setComments] = useState<Record<string, Array<{ name: string; text: string; date: string }>>>({
    'log-1': [
      { name: 'Parent David L.', text: 'My daughter can not stop talking about the Volcano eruption! The colorful pigments were a huge hit.', date: 'June 19, 2026' }
    ]
  });
  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  const activeLog = logs.find((l) => l.id === activeLogId);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setEmailError('');
    onSubscribeNewsletter();
    setEmailSuccess(true);
    setNewsletterEmail('');

    setTimeout(() => {
      setEmailSuccess(false);
    }, 4000);
  };

  const handleAddComment = (e: React.FormEvent, logId: string) => {
    e.preventDefault();
    if (!newCommentName || !newCommentText) return;

    const added = {
      name: newCommentName,
      text: newCommentText,
      date: 'Today'
    };

    setComments((prev) => ({
      ...prev,
      [logId]: [...(prev[logId] || []), added]
    }));

    setNewCommentName('');
    setNewCommentText('');
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16 text-left relative z-10 font-sans">
      
      {/* SECTION 1: LAB LOGS (Featured journals) */}
      <div className="space-y-8">
        <div>
          <h3 className="font-display font-bold text-2xl sm:text-3xl tracking-tighter text-white">
            Latest From the Lab Log
          </h3>
          <p className="text-xs mt-1 text-zinc-400 font-sans max-w-2xl">
            Journal entries and research documentation published by our lead mentors and junior experimenters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {logs.map((log) => (
            <div
              id={`log-card-${log.id}`}
              key={log.id}
              className="rounded-[2rem] border border-white/10 bg-zinc-900/40 backdrop-blur-md overflow-hidden flex flex-col justify-between transition hover:border-white/20 hover:shadow-2xl cursor-pointer"
              onClick={() => setActiveLogId(log.id)}
            >
              <div className="relative h-44 overflow-hidden border-b border-white/5">
                <img src={log.image} alt={log.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" referrerPolicy="no-referrer" />
                <span className="absolute top-3 right-3 bg-zinc-950/80 text-white border border-white/10 font-mono text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md">
                  {log.category}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                    <Clock className="w-3.5 h-3.5 text-zinc-600" />
                    <span>{log.date}</span>
                  </div>
                  <h4 className="font-display font-bold text-base leading-snug tracking-tight text-white hover:text-zinc-200">
                    {log.title}
                  </h4>
                  <p className="text-xs leading-relaxed line-clamp-2 text-zinc-400">
                    {log.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono uppercase tracking-wide text-zinc-400">
                  <span>By: {log.author}</span>
                  <span className={`font-bold font-mono text-[9px] uppercase tracking-widest ${
                    isTurtle ? 'text-emerald-400 hover:text-emerald-300' : 'text-blue-400 hover:text-blue-300'
                  }`}>Read Entry →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: ANNOUNCEMENTS & NEWSLETTER SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-6 border-t border-white/5">
        
        {/* Left Column: Club Announcements */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-1">
            <h4 className="font-display font-bold text-xl sm:text-2xl tracking-tighter text-white">
              Club Announcements
            </h4>
            <p className="text-xs text-zinc-400">
              Stay updated with club expansion project schedules, material check-ins, and safety notifications.
            </p>
          </div>

          <div className="space-y-4">
            {announcements.map((ann) => (
              <div
                id={`announcement-${ann.id}`}
                key={ann.id}
                className="p-5 rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-md space-y-2.5 text-white hover:border-white/20 transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest bg-zinc-950/80 border border-white/10 ${
                    ann.category === 'expansion' 
                      ? 'text-purple-400' 
                      : ann.category === 'toolkit'
                        ? 'text-blue-400'
                        : 'text-amber-400'
                  }`}>
                    {ann.category}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">{ann.date}</span>
                </div>
                <h5 className="font-display font-bold text-sm tracking-tight leading-snug text-white">
                  {ann.title}
                </h5>
                <p className="text-xs leading-relaxed text-zinc-400">
                  {ann.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Press & Newsletter Signup */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          
          {/* Newsletter Box */}
          <div className="p-6 rounded-[2rem] border border-white/10 bg-zinc-900/40 backdrop-blur-md flex flex-col justify-between space-y-4 text-white shadow-2xl">
            <div className="space-y-2">
              <div className={`p-2 rounded-xl inline-block ${isTurtle ? 'bg-emerald-500 text-stone-950 animate-pulse' : 'bg-blue-500 text-stone-950'}`}>
                <Mail className="w-5 h-5" />
              </div>
              <h5 className="font-display font-bold text-lg leading-tight text-zinc-100 tracking-tighter">
                Broadcasting Discovery to the Neighborhood
              </h5>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Subscribe to our bi-weekly dispatch. Get illustrated science experiments, stargazing coordinates, and RSVP notifications sent straight to your family inbox!
              </p>
            </div>

            {userProfile.newsletterSubscribed ? (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
                <span>Subscribed! Check inbox for Science Toolkit. (+20 XP)</span>
              </div>
            ) : emailSuccess ? (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
                <span>Subscription Success! Welcome package sent.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    id="newsletter-email-input"
                    type="email"
                    placeholder="parent-scientist@domain.com"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl text-xs border border-white/10 bg-zinc-950/60 text-white focus:outline-none focus:border-white/20"
                    required
                  />
                  <button
                    id="newsletter-submit-btn"
                    type="submit"
                    className={`px-4 py-2.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isTurtle
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
                        : 'bg-blue-500 hover:bg-blue-400 text-stone-950'
                    }`}
                  >
                    <span>Join</span>
                    <Send className="w-3 h-3" />
                  </button>
                </div>
                {emailError && (
                  <p className="text-[10px] text-red-400 font-mono flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {emailError}
                  </p>
                )}
                <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">We never spam. Unsubscribe with one click.</p>
              </form>
            )}
          </div>

          {/* Press Clips */}
          <div className="space-y-4">
            <h5 className="font-mono font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 text-zinc-400">
              <Newspaper className="w-4 h-4 text-zinc-500" />
              In the News
            </h5>

            <div className="space-y-4">
              {press.map((pr) => (
                <div key={pr.id} className="space-y-1.5 pl-4 border-l border-white/10">
                  <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span>{pr.source}</span>
                    <span>•</span>
                    <span>{pr.date}</span>
                  </p>
                  <h6 className="font-semibold text-xs leading-snug text-white">
                    {pr.title}
                  </h6>
                  <p className="text-xs leading-relaxed italic text-zinc-400">
                    "{pr.snippet}"
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* OVERLAY / DRILL DOWN LOG DETAIL MODAL */}
      {activeLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div 
            id="log-detail-modal"
            className="w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl text-white flex flex-col justify-between max-h-[90vh]"
          >
            {/* Header image & close button */}
            <div className="relative h-60">
              <img src={activeLog.image} alt={activeLog.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <button
                id="close-log-modal-btn"
                onClick={() => setActiveLogId(null)}
                className="absolute top-4 right-4 p-2 bg-zinc-950/80 border border-white/10 hover:bg-zinc-950 text-white rounded-full transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent flex items-end p-6">
                <div className="text-white space-y-1">
                  <span className="bg-zinc-950/90 text-white border border-white/10 text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md">
                    {activeLog.category}
                  </span>
                  <h3 className="font-display font-bold text-lg sm:text-2xl tracking-tighter leading-tight text-white">
                    {activeLog.title}
                  </h3>
                </div>
              </div>
            </div>

            {/* Scrollable content body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Author & date metadata bar */}
              <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-400 uppercase tracking-wide border-b border-white/10 pb-4">
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{activeLog.author}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{activeLog.date}</span>
                </div>
              </div>

              {/* Main Log paragraphs */}
              <p className="text-xs leading-relaxed font-sans text-zinc-300 font-medium">
                {activeLog.content}
              </p>

              {/* Comments Board inside Log */}
              <div className="space-y-4 pt-6 border-t border-white/10">
                <h5 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-zinc-500" />
                  Discussion ({comments[activeLog.id]?.length || 0})
                </h5>

                <div className="space-y-3">
                  {(comments[activeLog.id] || []).map((comm, index) => (
                    <div 
                      key={index} 
                      className="p-3.5 rounded-xl border border-white/5 bg-zinc-950/60 text-xs space-y-1 text-white"
                    >
                      <div className="flex items-center justify-between font-mono text-[9px] text-zinc-400 uppercase tracking-wide">
                        <span className="font-bold text-white">{comm.name}</span>
                        <span>{comm.date}</span>
                      </div>
                      <p className="leading-relaxed text-zinc-300">{comm.text}</p>
                    </div>
                  ))}
                </div>

                {/* Comment Submission Form */}
                <form onSubmit={(e) => handleAddComment(e, activeLog.id)} className="space-y-2 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      id="comment-name-input"
                      type="text"
                      placeholder="Your Name / Title"
                      value={newCommentName}
                      onChange={(e) => setNewCommentName(e.target.value)}
                      className="p-2 rounded-xl text-xs border border-white/10 bg-zinc-950/60 text-white focus:outline-none focus:border-white/20"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      id="comment-text-input"
                      type="text"
                      placeholder="Add to the discovery discussion..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 p-2 rounded-xl text-xs border border-white/10 bg-zinc-950/60 text-white focus:outline-none focus:border-white/20"
                      required
                    />
                    <button
                      id="comment-submit-btn"
                      type="submit"
                      className={`px-4 py-2 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest cursor-pointer ${
                        isTurtle ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950' : 'bg-blue-500 hover:bg-blue-400 text-stone-950'
                      }`}
                    >
                      Comment
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Bottom action panel */}
            <div className="p-4 border-t border-white/10 bg-zinc-950/40 flex justify-end">
              <button
                id="close-log-footer-btn"
                onClick={() => setActiveLogId(null)}
                className="px-4 py-2 border border-white/10 bg-zinc-900 text-zinc-300 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full hover:bg-white/5 hover:text-white transition cursor-pointer"
              >
                Close Journal
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
