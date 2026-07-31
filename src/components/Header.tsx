import React, { useState } from 'react';
import { UserProfile } from '../types';
import TurtleRockLogo from './TurtleRockLogo';
import {
  Trophy,
  FlaskConical,
  Menu,
  X,
  HelpCircle,
  Calendar,
  BookOpen,
  Image as ImageIcon
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  userProfile: UserProfile;
  onOpenJoin: () => void;
}

export default function Header({
  currentTab,
  setCurrentTab,
  userProfile,
  onOpenJoin
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { id: 'missions', label: 'Events', icon: Calendar },
    { id: 'lab', label: 'Games', icon: FlaskConical },
    { id: 'logs', label: 'Announcements', icon: BookOpen },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    { id: 'about', label: 'About', icon: HelpCircle }
  ];

  return (
    <header className="sticky top-0 z-40 transition-all duration-300 border-b border-white/10 bg-[#0A0A0B]/85 text-white backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Brand/Logo */}
          <button
            id="brand-logo-btn"
            onClick={() => setCurrentTab('missions')}
            className="flex items-center gap-2.5 group cursor-pointer text-left"
          >
            <TurtleRockLogo size={44} hideText={true} className="shrink-0 -my-1" />
            <div>
              <h1 className="font-display font-bold text-base leading-tight tracking-tight text-white">
                Turtle Rock
              </h1>
              <p className="text-[9px] font-mono tracking-widest uppercase font-bold text-emerald-500">
                Science Club
              </p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2" id="desktop-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  id={`nav-item-${item.id}`}
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer border ${isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'text-zinc-400 border-transparent hover:text-white hover:bg-white/5'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User Profile / Join CTA */}
          <div className="hidden sm:flex items-center gap-3">
            {userProfile.level > 0 ? (
              <button
                id="header-profile-btn"
                onClick={() => setCurrentTab('dashboard')}
                className="flex items-center gap-2.5 pl-2 pr-4 py-1 rounded-full text-xs font-mono font-medium transition-all cursor-pointer bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-200"
              >
                <div className="w-5 h-5 rounded-full text-white flex items-center justify-center font-bold text-[10px] uppercase bg-emerald-600">
                  {userProfile.name[0].toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="font-semibold leading-none text-white text-[11px]">{userProfile.name}</p>
                  <p className="text-[9px] opacity-75 flex items-center gap-1 mt-0.5">
                    <Trophy className="w-2.5 h-2.5 text-amber-500" />
                    Lvl {userProfile.level}
                  </p>
                </div>
              </button>
            ) : (
              <button
                id="header-join-btn"
                onClick={onOpenJoin}
                className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer bg-emerald-500 text-stone-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/10"
              >
                Join
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="lg:hidden flex items-center gap-2">
            {/* Quick dashboard profile link on mobile */}
            {userProfile.level > 0 && (
              <button
                id="mobile-profile-quick-btn"
                onClick={() => setCurrentTab('dashboard')}
                className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs cursor-pointer bg-emerald-600"
              >
                {userProfile.name[0].toUpperCase()}
              </button>
            )}

            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg cursor-pointer hover:bg-white/5 text-zinc-300"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <div id="mobile-nav-drawer" className="lg:hidden border-t border-white/10 px-4 py-3 space-y-2 animate-fade-in bg-[#0A0A0B] text-white">
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
                className={`w-full text-left px-4 py-2 rounded-full text-xs font-mono font-medium flex items-center gap-3 cursor-pointer border ${isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'text-zinc-400 border-transparent hover:text-white hover:bg-white/5'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}

          {userProfile.level === 0 && (
            <div className="pt-2 border-t border-white/10 mt-2">
              <button
                id="mobile-join-btn"
                onClick={() => {
                  onOpenJoin();
                  setMenuOpen(false);
                }}
                className="w-full py-2 rounded-full text-center text-xs font-bold uppercase tracking-widest cursor-pointer bg-emerald-500 text-stone-900 hover:bg-emerald-400"
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
