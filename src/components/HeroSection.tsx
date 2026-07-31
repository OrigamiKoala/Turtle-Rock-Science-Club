import React from 'react';
import { UserProfile } from '../types';
import TurtleRockLogo from './TurtleRockLogo';
import { ArrowRight, Atom } from 'lucide-react';

interface HeroSectionProps {
  userProfile: UserProfile;
  onOpenJoin: () => void;
  setCurrentTab: (tab: string) => void;
}

export default function HeroSection({
  userProfile,
  onOpenJoin,
  setCurrentTab
}: HeroSectionProps) {

  return (
    <div className="relative overflow-hidden pt-14 pb-10 bg-transparent text-[#1F3A42]">
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#E4F5DA] pointer-events-none" />
      <div className="absolute -bottom-10 -left-20 w-52 h-52 rounded-full bg-[#CFF2E0] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-6 flex flex-col items-center">

          <div className="mb-2 hover:scale-105 transition-transform duration-500 cursor-pointer">
            <TurtleRockLogo size={150} />
          </div>

          <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05] text-[#1F3A42]">
            Curiosity is welcome here.<br />
            <span className="text-[#4C9A3A]">Come explore science with us.</span>
          </h2>

          <p className="text-sm sm:text-base max-w-xl mx-auto leading-relaxed text-[#4B6169] font-sans">
            Turtle Rock Science Club (TRSC) is a group of students, parents, and mentors, all exploring science. We strive to help young students find passion in STEM, and show the world that science is a lot more than just memorizing textbooks.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {userProfile.level === 0 ? (
              <button
                id="hero-join-cta-btn"
                onClick={onOpenJoin}
                className="w-full sm:w-auto px-6 py-3 rounded-full font-display font-bold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-2 bg-[#6CC24A] text-[#14351F] shadow-[0_4px_0_#4C9A3A]"
              >
                <span>Join</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                id="hero-lab-cta-btn"
                onClick={() => setCurrentTab('lab')}
                className="w-full sm:w-auto px-6 py-3 rounded-full font-display font-bold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-2 bg-[#6CC24A] text-[#14351F] shadow-[0_4px_0_#4C9A3A]"
              >
                <span>Play Minigames</span>
                <Atom className="w-4 h-4" />
              </button>
            )}

            <button
              id="hero-learn-more-btn"
              onClick={() => setCurrentTab('about')}
              className="w-full sm:w-auto px-6 py-3 rounded-full font-display font-bold text-sm transition-all cursor-pointer bg-white hover:bg-[#1F3A42]/5 text-[#1F3A42] border-2 border-[#1F3A42]/15"
            >
              About Us
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
