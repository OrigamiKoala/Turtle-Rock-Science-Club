import React from 'react';
import { UserProfile } from '../types';
import TurtleRockLogo from './TurtleRockLogo';
import { Sparkles, ArrowRight, Shield, Award, Users, GraduationCap, Zap, Atom } from 'lucide-react';

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
    <div className="relative overflow-hidden pt-12 pb-16 transition-all duration-300 bg-transparent text-white">

      {/* Background Decorative Accents */}
      <div className="absolute inset-0 bg-dot-pattern opacity-25 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-6 flex flex-col items-center">

          <div className="mb-4 hover:scale-105 transition-transform duration-500 cursor-pointer drop-shadow-[0_10px_15px_rgba(16,185,129,0.15)] animate-fade-in">
            <TurtleRockLogo size={165} />
          </div>

          {/* Core Captivating Heading */}
          <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tighter leading-[1.05] text-white">
            Discover the <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Magic of Science</span> Together
          </h2>

          {/* Descriptive Subtitle */}
          <p className="text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed text-zinc-400 font-sans">
            Founded by local parents, we make advanced chemistry, astronomy, and robotics
            collaborative and accessible for inquisitive minds. Where friendships and lifelong
            discoveries are born!
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            {userProfile.level === 0 ? (
              <button
                id="hero-join-cta-btn"
                onClick={onOpenJoin}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-lg bg-emerald-500 text-stone-950 hover:bg-emerald-400 hover:shadow-emerald-500/10"
              >
                <span>Join This Mission</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                id="hero-lab-cta-btn"
                onClick={() => setCurrentTab('lab')}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-lg bg-emerald-500 text-stone-950 hover:bg-emerald-400"
              >
                <span>Minigames</span>
                <Atom className="w-3.5 h-3.5 animate-spin-slow" />
              </button>
            )}

            <button
              id="hero-learn-more-btn"
              onClick={() => setCurrentTab('about')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all border cursor-pointer bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10"
            >
              About Us
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
