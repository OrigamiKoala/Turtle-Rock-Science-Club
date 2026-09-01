import React, { useState } from 'react';
import { motion, MotionValue, useMotionValue, useTransform } from 'motion/react';
import { UserProfile } from '../types';
import TurtleRockLogo from './TurtleRockLogo';
import { Trophy, Menu, X, LogOut, LayoutDashboard } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  userProfile: UserProfile;
  onOpenJoin: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  /** Only passed on the missions/home tab, where the pill fades in as the
   * user scrolls through the Hero intro (see useHeroScroll). Absent on every
   * other tab, where the pill is just always visible — there's no intro to
   * scroll through there. */
  revealProgress?: MotionValue<number>;
}

export default function Header({
  currentTab,
  setCurrentTab,
  userProfile,
  onOpenJoin,
  onOpenLogin,
  onLogout,
  revealProgress
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Replaces the old separate "exit" icon button next to the profile chip —
  // clicking the chip now opens a small dropdown (Dashboard + Log Out)
  // instead of navigating straight to the dashboard. No outside-click
  // dismissal, matching `menuOpen` above (the mobile drawer doesn't have one
  // either) — picking an item, or re-clicking the chip, closes it.
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Fully visible/interactive by default; only the home tab's revealProgress
  // ties these to scroll position, fading the pill in behind the Hero intro
  // — roughly alongside the Join button's own CTA_START/CTA_END window in
  // Hero.tsx (kept as a separately-tuned local range rather than an import,
  // like every other scroll-distance constant in this codebase, but it must
  // be re-checked whenever Hero.tsx's phase constants are rescaled — it
  // drifted out of sync once already when LOCK_DISTANCE grew and the whole
  // sequence's fractions shrank under it).
  const fallbackProgress = useMotionValue(1);
  const source = revealProgress ?? fallbackProgress;
  const revealOpacity = useTransform(source, [0.008, 0.021], [0, 1]);
  const revealY = useTransform(source, [0.008, 0.021], [-16, 0]);
  const revealPointerEvents = useTransform(revealOpacity, (o) => (o < 0.05 ? 'none' : 'auto'));

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'missions', label: 'Events' },
    { id: 'logs', label: 'Announcements' },
    { id: 'resources', label: 'Resources' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'lab', label: 'Games' },
    { id: 'about', label: 'About' }
  ];

  return (
    <motion.header
      style={{ opacity: revealOpacity, y: revealY, pointerEvents: revealPointerEvents }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-1.5rem)] rounded-full border border-[#E4F5DA]/12 bg-[#0B2A2E]/55 text-[#FBF7EC] backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
    >
      {/* overflow-x-auto + the w-max row below is a safety net, not the
          primary fix (that's the xl: breakpoint and tighter spacing) — on
          any viewport narrow enough that the bar's content still doesn't
          fit, it becomes horizontally scrollable inside the pill instead of
          silently extending past the viewport edge with no way to reach the
          buttons past it. That was the actual bug: a `fixed`, centered
          element has no scroll affordance of its own, so content wider than
          the viewport just clipped off-screen with Login/Join unreachable. */}
      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 sm:px-3.5">
        <div className="flex items-center gap-2.5 h-14 w-max">

          <button
            id="brand-logo-btn"
            onClick={() => setCurrentTab('home')}
            aria-label="Turtle Rock Science Club — Home"
            className="flex items-center gap-2 group cursor-pointer text-left shrink-0"
          >
            <TurtleRockLogo size={34} hideText={true} className="shrink-0" />
          </button>

          <nav className="hidden xl:flex items-center gap-1" id="desktop-nav">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  id={`nav-item-${item.id}`}
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`px-3 py-1.5 rounded-full text-[13px] font-hero font-bold tracking-wide transition-all duration-200 cursor-pointer whitespace-nowrap border ${isActive
                    ? 'bg-[#6CC24A]/20 text-[#8FE07A] border-transparent'
                    : 'text-[#CFE9DB] border-transparent hover:bg-white/10'
                    }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="hidden sm:flex items-center gap-2 pl-1">
            {userProfile.level > 0 ? (
              <button
                id="header-profile-btn"
                onClick={() => setProfileMenuOpen((open) => !open)}
                className="flex items-center gap-2 pl-1.5 pr-3.5 py-1 rounded-full text-xs font-hero font-bold transition-all cursor-pointer bg-white/10 border border-[#E4F5DA]/15 hover:border-[#E4F5DA]/30 text-[#FBF7EC] whitespace-nowrap"
              >
                <div className="w-6 h-6 rounded-full text-white flex items-center justify-center font-hero font-bold text-[11px] uppercase bg-[#6CC24A] shrink-0">
                  {userProfile.name[0].toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="font-bold leading-none text-[#FBF7EC] text-[11px]">{userProfile.name}</p>
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
                  className="px-3.5 py-1.5 rounded-full text-xs font-hero font-bold uppercase tracking-wide transition-all border border-[#E4F5DA]/25 text-[#FBF7EC] hover:bg-white/10 cursor-pointer whitespace-nowrap"
                >
                  Log In
                </button>
                {/* Same glowing-glass treatment as the intro panel's
                    "Join the Club" button (Hero.tsx, #hero-intro-join-btn) —
                    kept in sync by eye since there's no shared style token
                    for it yet. */}
                <button
                  id="header-join-btn"
                  onClick={onOpenJoin}
                  className="px-4 py-1.5 rounded-full font-hero font-bold uppercase tracking-wide text-xs transition-all duration-300 hover:scale-[1.03] active:scale-95 cursor-pointer bg-[#6CC24A]/90 backdrop-blur-md text-[#0B2A2E] border border-[#E4F5DA]/40 shadow-[0_4px_20px_rgba(108,194,74,0.35)] whitespace-nowrap"
                >
                  Join
                </button>
              </div>
            )}
          </div>

          <div className="xl:hidden flex items-center gap-1.5">
            {userProfile.level > 0 && (
              <button
                id="mobile-profile-quick-btn"
                onClick={() => setCurrentTab('dashboard')}
                className="w-8 h-8 rounded-full text-white flex items-center justify-center font-hero font-bold text-xs cursor-pointer bg-[#6CC24A] shrink-0"
              >
                {userProfile.name[0].toUpperCase()}
              </button>
            )}

            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-full cursor-pointer hover:bg-white/10 text-[#FBF7EC] shrink-0"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {profileMenuOpen && userProfile.level > 0 && (
        <div
          id="header-profile-menu"
          className="hidden sm:block absolute top-full right-3 mt-2 w-44 rounded-2xl border border-[#E4F5DA]/15 bg-[#0B2A2E]/95 backdrop-blur-xl p-1.5 space-y-0.5 animate-fade-in shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
        >
          <button
            id="header-profile-menu-dashboard-btn"
            onClick={() => {
              setCurrentTab('dashboard');
              setProfileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-xl text-xs font-hero font-bold flex items-center gap-2 cursor-pointer text-[#CFE9DB] hover:bg-white/10"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <button
            id="header-profile-menu-logout-btn"
            onClick={() => {
              onLogout();
              setProfileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-xl text-xs font-hero font-bold flex items-center gap-2 cursor-pointer text-[#CFE9DB] hover:bg-white/10"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log Out
          </button>
        </div>
      )}

      {menuOpen && (
        <div
          id="mobile-nav-drawer"
          className="xl:hidden absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 rounded-3xl border border-[#E4F5DA]/15 bg-[#0B2A2E]/95 backdrop-blur-xl px-4 py-3 space-y-2 animate-fade-in shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
        >
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                id={`mobile-nav-item-${item.id}`}
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-full text-[13px] font-hero font-bold tracking-wide cursor-pointer border ${isActive
                  ? 'bg-[#6CC24A]/20 text-[#8FE07A] border-transparent'
                  : 'text-[#CFE9DB] border-transparent hover:bg-white/10'
                  }`}
              >
                {item.label}
              </button>
            );
          })}

          {userProfile.level === 0 ? (
            <div className="pt-2 border-t border-[#E4F5DA]/15 mt-2 space-y-2">
              <button
                id="mobile-login-btn"
                onClick={() => {
                  onOpenLogin();
                  setMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-full text-center text-xs font-hero font-bold uppercase tracking-wide cursor-pointer border border-[#E4F5DA]/25 text-[#FBF7EC] hover:bg-white/10"
              >
                Log In
              </button>
              {/* Same glowing-glass treatment as the intro panel's
                  "Join the Club" button (Hero.tsx, #hero-intro-join-btn). */}
              <button
                id="mobile-join-btn"
                onClick={() => {
                  onOpenJoin();
                  setMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-full text-center text-xs font-hero font-bold uppercase tracking-wide transition-all duration-300 active:scale-95 cursor-pointer bg-[#6CC24A]/90 backdrop-blur-md text-[#0B2A2E] border border-[#E4F5DA]/40 shadow-[0_4px_20px_rgba(108,194,74,0.35)]"
              >
                Join the Club
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-[#E4F5DA]/15 mt-2">
              <button
                id="mobile-logout-btn"
                onClick={() => {
                  onLogout();
                  setMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-full text-center text-xs font-hero font-bold uppercase tracking-wide cursor-pointer border border-[#E4F5DA]/25 text-[#FBF7EC] hover:bg-white/10 flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log Out
              </button>
            </div>
          )}
        </div>
      )}
    </motion.header>
  );
}
