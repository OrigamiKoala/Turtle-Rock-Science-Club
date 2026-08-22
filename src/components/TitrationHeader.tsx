import React from 'react';
import { UserProfile } from '../types';
import { Theme } from '../useTheme';
import TurtleRockLogo from './TurtleRockLogo';
import { Trophy, Moon, Sun, ArrowLeft, FlaskConical } from 'lucide-react';

interface TitrationHeaderProps {
  onNavigateHome: () => void;
  userProfile: UserProfile;
  onOpenJoin: () => void;
  onOpenLogin: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export default function TitrationHeader({
  onNavigateHome,
  userProfile,
  onOpenJoin,
  onOpenLogin,
  theme,
  onToggleTheme
}: TitrationHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-[#1F3A42]/10 bg-[#FBF7EC]/90 text-[#1F3A42] backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Left: Brand + Back to Site Link */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              id="titration-logo-btn"
              onClick={onNavigateHome}
              className="flex items-center gap-2.5 group cursor-pointer text-left"
              title="Return to Turtle Rock Science Club Home"
            >
              <TurtleRockLogo size={40} hideText={true} className="shrink-0 -my-1" />
              <div>
                <h1 className="font-display font-bold text-base leading-tight tracking-tight text-[#1F3A42]">
                  Turtle Rock
                </h1>
                <p className="text-[11px] font-display font-bold tracking-wide text-[#4C9A3A]">
                  Science Club
                </p>
              </div>
            </button>

            <span className="hidden sm:inline-block h-6 w-px bg-[#1F3A42]/15" />

            <button
              id="back-to-site-btn"
              onClick={onNavigateHome}
              className="px-3 py-1.5 rounded-full text-xs font-display font-bold transition-all border-2 border-[#1F3A42]/15 text-[#1F3A42] hover:bg-[#1F3A42]/5 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Club Website</span>
            </button>
          </div>

          {/* Right: Theme Toggle & Auth / Profile */}
          <div className="flex items-center gap-2.5">
            <button
              id="titration-theme-toggle-btn"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-[#1F3A42]/10 text-[#1F3A42] hover:bg-[#1F3A42]/5 cursor-pointer transition-colors shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {userProfile.level > 0 ? (
              <div
                id="titration-header-profile"
                className="flex items-center gap-2.5 pl-2 pr-4 py-1 rounded-full text-xs font-sans font-bold bg-white border-2 border-[#1F3A42]/10 text-[#1F3A42]"
              >
                <div className="w-7 h-7 rounded-full text-white flex items-center justify-center font-display font-bold text-[12px] uppercase bg-[#6CC24A]">
                  {userProfile.name[0].toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="font-bold leading-none text-[#1F3A42] text-[11px]">{userProfile.name}</p>
                  <p className="text-[10px] opacity-75 flex items-center gap-1 mt-0.5">
                    <Trophy className="w-2.5 h-2.5 text-[#F2C94C]" />
                    Lvl {userProfile.level}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="titration-login-btn"
                  onClick={onOpenLogin}
                  className="px-3.5 py-1.5 rounded-full text-xs font-display font-bold transition-all border-2 border-[#1F3A42]/15 text-[#1F3A42] hover:bg-[#1F3A42]/5 cursor-pointer"
                >
                  Log In
                </button>
                <button
                  id="titration-join-btn"
                  onClick={onOpenJoin}
                  className="px-4 py-2 rounded-full text-xs font-display font-bold transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer bg-[#6CC24A] text-[#14351F] hover:brightness-105 shadow-[0_3px_0_#4C9A3A]"
                >
                  Join
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
