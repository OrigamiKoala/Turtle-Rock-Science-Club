import React from 'react';
import TurtleRockLogo from './TurtleRockLogo';
import { HelpCircle, Mail, Heart } from 'lucide-react';

interface FooterProps {
  setCurrentTab: (tab: string) => void;
}

export default function Footer({ setCurrentTab }: FooterProps) {
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
                  <HelpCircle className="w-3.5 h-3.5 text-[#4B6169]" />
                  Frequently Asked Questions
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
              Have questions, materials to donate, or want to collaborate? Get in touch!
            </p>
            <div className="space-y-1.5 text-xs font-sans font-bold text-[#1F3A42]">
              <p className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#F2C94C]" />
                contact@trscienceclub.org
              </p>
            </div>
          </div>

        </div>

        <div className="mt-12 pt-6 border-t-2 border-[#1F3A42]/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#4B6169]">
          <p>© 2026 Turtle Rock Science Club. All rights reserved.</p>
          <div className="flex items-center gap-1 font-sans font-bold text-[11px]">
            <span>Crafted with</span>
            <Heart className="w-3 h-3 text-red-400 fill-red-400" />
            <span>for discovery.</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
