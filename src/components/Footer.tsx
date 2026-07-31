import React from 'react';
import TurtleRockLogo from './TurtleRockLogo';
import { HelpCircle, Mail, Heart } from 'lucide-react';

interface FooterProps {
  setCurrentTab: (tab: string) => void;
}

export default function Footer({ setCurrentTab }: FooterProps) {
  return (
    <footer className="transition-all duration-300 border-t border-white/10 bg-[#070708] text-zinc-300 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Brand Pillar */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TurtleRockLogo size={36} hideText={true} className="shrink-0" />
              <span className="font-display font-bold text-base tracking-tight text-white">
                Turtle Rock Science Club
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Nurturing the next generation of naturalists and innovators through
              community-centered, hands-on scientific adventure.
            </p>
          </div>

          {/* Site Navigation Links */}
          <div>
            <h4 className="font-mono font-bold text-xs uppercase tracking-widest mb-4 text-zinc-500">Explore</h4>
            <ul className="space-y-2 text-xs font-sans">
              <li>
                <button onClick={() => setCurrentTab('missions')} className="hover:text-white transition cursor-pointer text-zinc-400">
                  Events
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('lab')} className="hover:text-white transition cursor-pointer text-zinc-400">
                  Games
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('logs')} className="hover:text-white transition cursor-pointer text-zinc-400">
                  Announcements
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('gallery')} className="hover:text-white transition cursor-pointer text-zinc-400">
                  Gallery
                </button>
              </li>
            </ul>
          </div>

          {/* Standard FAQ / Core Principles */}
          <div>
            <h4 className="font-mono font-bold text-xs uppercase tracking-widest mb-4 text-zinc-500">About</h4>
            <ul className="space-y-2 text-xs font-sans">
              <li>
                <button onClick={() => setCurrentTab('about')} className="hover:text-white transition cursor-pointer text-zinc-400">
                  Who We Are
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('about')} className="hover:text-white transition cursor-pointer text-zinc-400 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
                  Frequently Asked Questions
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Support */}
          <div className="space-y-4">
            <h4 className="font-mono font-bold text-xs uppercase tracking-widest text-zinc-500">Contact & Support</h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Have questions, materials to donate, or want to collaborate? Get in touch!
            </p>
            <div className="space-y-1.5 text-xs font-mono text-zinc-300">
              <p className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-500" />
                hello@turtlerockscience.org
              </p>
              <p className="opacity-60 text-[9px] uppercase tracking-wider">Response: Under 24 hours</p>
            </div>
          </div>

        </div>

        {/* Bottom Rights Bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
          <p>© 2026 Turtle Rock Science Club. All rights reserved.</p>
          <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider">
            <span>Crafted with</span>
            <Heart className="w-3 h-3 text-red-500 fill-red-500 animate-pulse animate-duration-1000" />
            <span>for discovery.</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
