import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Theme } from '../useTheme';
import TurtleRockLogo from './TurtleRockLogo';
import {
  Trophy,
  FlaskConical,
  Menu,
  X,
  HelpCircle,
  Calendar,
  BookOpen,
  Image as ImageIcon,
  Moon,
  Sun,
  BookMarked,
  TestTube
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  userProfile: UserProfile;
  onOpenJoin: () => void;
  onOpenLogin: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export default function Header({
  currentTab,
  setCurrentTab,
  userProfile,
  onOpenJoin,
  onOpenLogin,
  theme,
  onToggleTheme
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { id: 'missions', label: 'Events', icon: Calendar },
    { id: 'lab', label: 'Games', icon: FlaskConical },
    { id: 'titration', label: 'Titration', icon: TestTube },
    { id: 'resources', label: 'Resources', icon: BookMarked },
    { id: 'logs', label: 'Announcements', icon: BookOpen },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    { id: 'about', label: 'About', icon: HelpCircle }
  ];

  return (
    <header className="sticky top-0 z-40 border-b-2 border-[#1F3A42]/10 bg-[#FBF7EC]/90 text-[#1F3A42] backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          <button
            id="brand-logo-btn"
            onClick={() => setCurrentTab('missions')}
            className="flex items-center gap-2.5 group cursor-pointer text-left"
          >
            <TurtleRockLogo size={44} hideText={true} className="shrink-0 -my-1" />
            <div>
              <h1 className="font-display font-bold text-base leading-tight tracking-tight text-[#1F3A42]">
                Turtle Rock
              </h1>
              <p className="text-[11px] font-display font-bold tracking-wide text-[#4C9A3A]">
                Science Club
              </p>
            </div>
          </button>

          <nav className="hidden lg:flex items-center gap-1.5" id="desktop-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  id={`nav-item-${item.id}`}
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`px-3.5 py-2 rounded-full text-[13px] font-sans font-extrabold transition-all duration-200 flex items-center gap-1.5 cursor-pointer border-2 ${isActive
                    ? 'bg-[#E4F5DA] text-[#2E7D46] border-transparent'
                    : 'text-[#4B6169] border-transparent hover:bg-[#1F3A42]/5'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="hidden sm:flex items-center gap-2.5">
            <button
              id="theme-toggle-btn"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-[#1F3A42]/10 text-[#1F3A42] hover:bg-[#1F3A42]/5 cursor-pointer transition-colors shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {userProfile.level > 0 ? (
              <button
                id="header-profile-btn"
                onClick={() => setCurrentTab('dashboard')}
                className="flex items-center gap-2.5 pl-2 pr-4 py-1 rounded-full text-xs font-sans font-bold transition-all cursor-pointer bg-white border-2 border-[#1F3A42]/10 hover:border-[#1F3A42]/20 text-[#1F3A42]"
              >
                <div className="w-7 h-7 rounded-full text-white flex items-center justify-center font-display font-bold text-[12px] uppercase bg-[#6CC24A]">
                  {userProfile.name[0].toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="font-bold leading-none text-[#1F3A42] text-[11px]">{userProfile.name}</p>
                  <p className="text-[10px] opacity-75 flex items-center gap-1 mt-0.5">
                    <Trophy className="w-2.5 h-2.5 text-[#F2C94C]" />
                    Lvl {userProfile.level}
                  </p>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="header-login-btn"
                  onClick={onOpenLogin}
                  className="px-3.5 py-1.5 rounded-full text-xs font-display font-bold transition-all border-2 border-[#1F3A42]/15 text-[#1F3A42] hover:bg-[#1F3A42]/5 cursor-pointer"
                >
                  Log In
                </button>
                <button
                  id="header-join-btn"
                  onClick={onOpenJoin}
                  className="px-4 py-2 rounded-full text-xs font-display font-bold transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer bg-[#6CC24A] text-[#14351F] hover:brightness-105 shadow-[0_3px_0_#4C9A3A]"
                >
                  Join
                </button>
              </div>
            )}
          </div>

          <div className="lg:hidden flex items-center gap-2">
            <button
              id="theme-toggle-btn-mobile"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-[#1F3A42]/10 text-[#1F3A42] hover:bg-[#1F3A42]/5 cursor-pointer transition-colors shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {userProfile.level > 0 && (
              <button
                id="mobile-profile-quick-btn"
                onClick={() => setCurrentTab('dashboard')}
                className="w-8 h-8 rounded-full text-white flex items-center justify-center font-display font-bold text-xs cursor-pointer bg-[#6CC24A]"
              >
                {userProfile.name[0].toUpperCase()}
              </button>
            )}

            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg cursor-pointer hover:bg-[#1F3A42]/5 text-[#1F3A42]"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {menuOpen && (
        <div id="mobile-nav-drawer" className="lg:hidden border-t-2 border-[#1F3A42]/10 px-4 py-3 space-y-2 animate-fade-in bg-[#FBF7EC]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                id={`mobile-nav-item-${item.id}`}
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-full text-[13px] font-sans font-extrabold flex items-center gap-3 cursor-pointer border-2 ${isActive
                  ? 'bg-[#E4F5DA] text-[#2E7D46] border-transparent'
                  : 'text-[#4B6169] border-transparent hover:bg-[#1F3A42]/5'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}

          {userProfile.level === 0 && (
            <div className="pt-2 border-t-2 border-[#1F3A42]/10 mt-2 space-y-2">
              <button
                id="mobile-login-btn"
                onClick={() => {
                  onOpenLogin();
                  setMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-full text-center text-xs font-display font-bold cursor-pointer border-2 border-[#1F3A42]/15 text-[#1F3A42] hover:bg-[#1F3A42]/5"
              >
                Log In
              </button>
              <button
                id="mobile-join-btn"
                onClick={() => {
                  onOpenJoin();
                  setMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-full text-center text-xs font-display font-bold cursor-pointer bg-[#6CC24A] text-[#14351F]"
              >
                Join the Club
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
