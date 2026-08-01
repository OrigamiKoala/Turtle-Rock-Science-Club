import React, { useState } from 'react';
import TurtleRockLogo from './TurtleRockLogo';
import { HelpCircle, Mail, Heart, Send, CheckCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { NewsletterResult } from '../useSiteContent';

interface FooterProps {
  setCurrentTab: (tab: string) => void;
  onSubscribe: (email: string, source?: string) => Promise<NewsletterResult>;
}

type SubscribeState = 'idle' | 'sending' | 'done' | 'already' | 'error';

export default function Footer({ setCurrentTab, onSubscribe }: FooterProps) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<SubscribeState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;

    setState('sending');
    setErrorMsg('');

    const result = await onSubscribe(email, 'Website footer');

    if (!result.ok) {
      setErrorMsg(result.error ?? 'Something went wrong. Please try again.');
      setState('error');
      return;
    }

    setEmail('');
    setState(result.alreadySubscribed ? 'already' : 'done');
  };

  return (
    <footer className="border-t-2 border-[#1F3A42]/10 bg-[#F3F0E4] text-[#4B6169] relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TurtleRockLogo size={36} hideText={true} className="shrink-0" />
              <span className="font-display font-bold text-base tracking-tight text-[#1F3A42]">
                Turtle Rock Science Club
              </span>
            </div>
            <p className="text-xs text-[#4B6169] leading-relaxed font-sans">
              Fostering passion in STEM for elementary school students.
            </p>
          </div>

          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-widest mb-4 text-[#1F3A42]">Explore</h4>
            <ul className="space-y-2 text-xs font-sans font-bold">
              <li><button onClick={() => setCurrentTab('missions')} className="hover:text-[#1F3A42] transition cursor-pointer text-[#4B6169]">Events</button></li>
              <li><button onClick={() => setCurrentTab('lab')} className="hover:text-[#1F3A42] transition cursor-pointer text-[#4B6169]">Games</button></li>
              <li><button onClick={() => setCurrentTab('resources')} className="hover:text-[#1F3A42] transition cursor-pointer text-[#4B6169]">Resources</button></li>
              <li><button onClick={() => setCurrentTab('logs')} className="hover:text-[#1F3A42] transition cursor-pointer text-[#4B6169]">Announcements</button></li>
              <li><button onClick={() => setCurrentTab('gallery')} className="hover:text-[#1F3A42] transition cursor-pointer text-[#4B6169]">Gallery</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-widest mb-4 text-[#1F3A42]">About</h4>
            <ul className="space-y-2 text-xs font-sans font-bold">
              <li><button onClick={() => setCurrentTab('about')} className="hover:text-[#1F3A42] transition cursor-pointer text-[#4B6169]">Who We Are</button></li>
              <li>
                <button onClick={() => setCurrentTab('about')} className="hover:text-[#1F3A42] transition cursor-pointer text-[#4B6169] flex items-center gap-1">
                  Frequently Asked Questions
                  <HelpCircle className="w-3.5 h-3.5 text-[#4B6169]" />
                </button>
              </li>
              <li>
                <a
                  href="https://docs.google.com/document/d/1ev0rV0iSfNzGwVkLtUcggu7fINd0rD7nv4nyroO3u9c/edit?tab=t.0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#1F3A42] transition text-[#4B6169] flex items-center gap-1"
                >
                  <span>Official Document ↗</span>
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-display font-bold text-xs uppercase tracking-widest text-[#1F3A42]">Contact & Support</h4>
            <p className="text-xs text-[#4B6169] leading-relaxed font-sans">
              Questions? Get in touch!
            </p>
            <div className="space-y-1.5 text-xs font-sans font-bold text-[#1F3A42]">
              <p className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#F2C94C]" />
                <a href="mailto:contact@trscienceclub.org">contact@trscienceclub.org</a>
              </p>
            </div>
          </div>

        </div>

        <div className="mt-10 rounded-[24px] border-2 border-[#1F3A42]/10 bg-white p-6 sm:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
            <div className="lg:flex-1 space-y-1.5">
              <h4 className="font-display font-bold text-base text-[#1F3A42]">
                Get the Club Newsletter
              </h4>
              <p className="text-xs text-[#4B6169] leading-relaxed font-sans max-w-md">
                Upcoming events, club information, and more, sent to your inbox. Unsubscribe at any time.
              </p>
            </div>

            <div className="lg:w-[380px] shrink-0">
              {state === 'done' || state === 'already' ? (
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-5 h-5 shrink-0 text-[#6CC24A] mt-0.5" />
                  <div className="text-left">
                    <p className="font-display font-bold text-sm text-[#2E7D46]">
                      {state === 'already' ? "You're already on the list!" : "You're on the list!"}
                    </p>
                    <p className="text-[11px] text-[#4B6169] font-sans mt-0.5">
                      {state === 'already'
                        ? 'That address is already subscribed — no need to sign up twice.'
                        : 'Watch your inbox for the next issue.'}
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-2 font-sans">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      id="newsletter-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (state === 'error') setState('idle');
                      }}
                      placeholder="parent@example.com"
                      autoComplete="email"
                      aria-label="Email address for the newsletter"
                      className="flex-1 min-w-0 p-2.5 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white text-[#1F3A42] focus:outline-none"
                      required
                    />
                    <button
                      id="newsletter-subscribe"
                      type="submit"
                      disabled={state === 'sending'}
                      className="px-5 py-2.5 rounded-full font-display font-bold text-sm transition flex items-center justify-center gap-1.5 cursor-pointer bg-[#6CC24A] text-[#14351F] shadow-[0_4px_0_#4C9A3A] disabled:opacity-60 disabled:cursor-wait"
                    >
                      {state === 'sending' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>{state === 'sending' ? 'Signing up…' : 'Subscribe'}</span>
                    </button>
                  </div>

                  {state === 'error' && (
                    <p className="text-[11px] text-red-500 font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      {errorMsg}
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t-2 border-[#1F3A42]/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#4B6169]">
          <p>© 2026 Turtle Rock Science Club. All rights reserved.</p>
        </div>

      </div>
    </footer>
  );
}
