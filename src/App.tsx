import React, { useEffect, useState } from 'react';
import { UserProfile, GalleryPhoto, Mission } from './types';
import { useSiteContent, SignupResult } from './useSiteContent';
import { useHeroScroll } from './useHeroScroll';

import Header from './components/Header';
import TitrationHeader from './components/TitrationHeader';
import Footer from './components/Footer';
import Hero from './components/Hero';
import UpcomingMissions from './components/UpcomingMissions';
import VirtualLab from './components/VirtualLab';
import PhotoGallery from './components/PhotoGallery';
import AboutUs from './components/AboutUs';
import LabLogAnnouncements from './components/LabLogAnnouncements';
import Dashboard from './components/Dashboard';
import CuratedResources from './components/CuratedResources';
import TitrationLab from './components/TitrationLab';
import JoinPage from './components/JoinPage';
import ConfirmEmailModal from './components/ConfirmEmailModal';
import LoginModal from './components/LoginModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import SignupModal from './components/SignupModal';

import { Trophy, Star, MailCheck, X } from 'lucide-react';

export default function App() {
  const [pathname, setPathname] = useState<string>(() => window.location.pathname);
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showLevelUpAlert, setShowLevelUpAlert] = useState<boolean>(false);
  const [signupMission, setSignupMission] = useState<Mission | null>(null);
  const [signupNotice, setSignupNotice] = useState<{ mission: Mission; result: SignupResult } | null>(null);

  // The newsletter confirmation email's button lands here with ?confirmed=1.
  // Without this the click just loads the homepage and looks like nothing
  // happened. The query string is stripped afterwards so a refresh or a shared
  // link doesn't show the banner again.
  const [showConfirmedBanner, setShowConfirmedBanner] = useState<boolean>(false);

  // Lives here rather than inside JoinPage: JoinPage is a full separate
  // screen (see isJoinPage below) that renders instead of this component's
  // main tree, so a modal mounted inside it would never actually show —
  // it only appears once the visitor navigates back to the main site.
  const [showConfirmEmailModal, setShowConfirmEmailModal] = useState<boolean>(false);

  // Set only when the URL is an emailed `?verify=`/`?reset=` link — neither
  // ever appears from normal browsing, so these change nothing about the
  // pages a visitor sees otherwise.
  const [emailVerifiedBanner, setEmailVerifiedBanner] = useState<'success' | 'error' | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string, tab?: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setPathname(path);
    }
    if (tab) {
      setCurrentTab(tab);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isTitrationPage = pathname === '/titration' || pathname === '/titration/' || pathname.startsWith('/titration');
  const isJoinPage = pathname === '/join' || pathname.startsWith('/join');
  const isHomeHero = currentTab === 'home' && !isTitrationPage && !isJoinPage;
  // Shared with Header so the floating nav pill fades in at the same intro
  // progress the Hero's title/Join button do — one source of truth. Only
  // active (listens for wheel/touch/key input, locks document scroll) while
  // isHomeHero is true.
  const { progress: heroProgress, locked: heroLocked } = useHeroScroll(isHomeHero);

  const handleTabChange = (tab: string) => {
    if (tab === 'titration') {
      navigateTo('/titration');
    } else {
      if (isTitrationPage) {
        navigateTo('/', tab);
      } else {
        setCurrentTab(tab);
      }
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('confirmed') !== '1') return;

    setShowConfirmedBanner(true);
    params.delete('confirmed');
    const query = params.toString();
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (query ? `?${query}` : '') + window.location.hash
    );
  }, []);

  const content = useSiteContent();

  // The verify/reset emails link back here with ?verify=<token> / ?reset=<token>.
  // Same strip-the-query-string treatment as ?confirmed=1 above, so a refresh
  // or a shared link doesn't replay the action.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyToken = params.get('verify');
    const reset = params.get('reset');
    if (!verifyToken && !reset) return;

    if (verifyToken) {
      void content.verifyEmail(verifyToken).then((result) => {
        setEmailVerifiedBanner(result.ok ? 'success' : 'error');
      });
      params.delete('verify');
    }
    if (reset) {
      setResetToken(reset);
      params.delete('reset');
    }

    const query = params.toString();
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (query ? `?${query}` : '') + window.location.hash
    );
    // Runs once: reacts to whatever the page loaded with, not to state that
    // changes afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('tr_sc_user_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) { console.error('Failed reading user profile from storage', e); }
    return { name: '', school: '', role: '', joinedDate: '', level: 0, xp: 0, unlockedBadges: [], reservedMissionIds: [], newsletterSubscribed: false };
  });

  const [sessionToken, setSessionToken] = useState<string>(() => {
    try {
      return localStorage.getItem('tr_sc_session_token') || '';
    } catch (e) { console.error('Failed reading session token from storage', e); return ''; }
  });

  const [photos, setPhotos] = useState<GalleryPhoto[]>(() => {
    try {
      const saved = localStorage.getItem('tr_sc_gallery_photos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p: GalleryPhoto) => p.id && !p.id.startsWith('photo-') && !p.id.startsWith('demo-'));
        }
      }
    } catch (e) { console.error('Failed reading gallery photos from storage', e); }
    return [];
  });

  const [signedUpIds, setSignedUpIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tr_sc_signed_up_ids');
      if (saved) return JSON.parse(saved);
    } catch (e) { console.error('Failed reading signups from storage', e); }
    return [];
  });

  const { syncProfile } = content;

  useEffect(() => {
    localStorage.setItem('tr_sc_user_profile', JSON.stringify(userProfile));
    if (userProfile.level > 0 && sessionToken) {
      void syncProfile(userProfile, sessionToken);
    }
    // `syncProfile` is a useCallback with an empty dep array, so it's stable
    // across renders — depending on it (not the whole `content` object, which
    // is a fresh object literal every render) is what keeps this effect from
    // re-firing on every unrelated App render while a member is logged in.
  }, [userProfile, sessionToken, syncProfile]);
  useEffect(() => {
    localStorage.setItem('tr_sc_session_token', sessionToken);
  }, [sessionToken]);
  useEffect(() => { localStorage.setItem('tr_sc_gallery_photos', JSON.stringify(photos)); }, [photos]);
  useEffect(() => { localStorage.setItem('tr_sc_signed_up_ids', JSON.stringify(signedUpIds)); }, [signedUpIds]);

  useEffect(() => {
    if (!signupNotice) return;
    const timer = setTimeout(() => setSignupNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [signupNotice]);

  const handleUpdateXp = (xpToAdd: number, badgeToUnlock?: string) => {
    if (userProfile.level === 0) return;

    setUserProfile((prev) => {
      const newXp = prev.xp + xpToAdd;
      const newLevel = Math.floor(newXp / 100) + 1;
      let updatedBadges = [...prev.unlockedBadges];
      if (badgeToUnlock && !updatedBadges.includes(badgeToUnlock)) updatedBadges.push(badgeToUnlock);
      if (newLevel > prev.level) setShowLevelUpAlert(true);
      return { ...prev, xp: newXp, level: newLevel, unlockedBadges: updatedBadges };
    });
  };

  const handleJoinSuccess = (newProfile: UserProfile, newSessionToken: string) => {
    setUserProfile(newProfile);
    setSessionToken(newSessionToken);
    setCurrentTab('dashboard');
  };

  const handleLoginSuccess = (profile: UserProfile, newSessionToken: string) => {
    setUserProfile(profile);
    setSessionToken(newSessionToken);
    if (Array.isArray(profile.reservedMissionIds)) {
      setSignedUpIds(profile.reservedMissionIds);
    }
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    if (sessionToken) void content.logout(sessionToken);
    setSessionToken('');
    setUserProfile({ name: '', school: '', role: '', joinedDate: '', level: 0, xp: 0, unlockedBadges: [], reservedMissionIds: [], newsletterSubscribed: false });
    setCurrentTab('home');
  };

  const handleSignupSuccess = (missionId: string) => {
    setSignedUpIds((prev) => {
      const updated = prev.includes(missionId) ? prev : [...prev, missionId];
      if (userProfile.level > 0) {
        // The profile-sync effect below picks this up as soon as userProfile
        // changes — no need for a second, redundant syncProfile call here.
        setUserProfile((current) => ({ ...current, reservedMissionIds: updated }));
      }
      return updated;
    });
    handleUpdateXp(15);
  };

  const isLoggedIn = userProfile.level > 0 && !!userProfile.name && !!userProfile.school;

  const handleSignUp = async (mission: Mission) => {
    const alreadyReserved = signedUpIds.includes(mission.id);
    if (!isLoggedIn || alreadyReserved) { setSignupMission(mission); return; }

    const result = await content.submitSignup({
      eventId: mission.id, eventTitle: mission.title, studentName: userProfile.name, school: userProfile.school
    });

    if (result.ok) handleSignupSuccess(mission.id);
    setSignupNotice({ mission, result });
  };


  const handleAddPhoto = (newPhoto: GalleryPhoto) => {
    setPhotos((prev) => [newPhoto, ...prev]);
    handleUpdateXp(25);
  };

  const handleUpdateProfileName = (newName: string) => {
    setUserProfile((prev) => ({ ...prev, name: newName }));
  };

  // A genuine separate screen, not a modal over the rest of the site — no
  // Header/Footer/other overlay chrome renders alongside it, same as how
  // /titration replaces the whole page rather than layering on top of it.
  if (isJoinPage) {
    return (
      <JoinPage
        // No explicit tab here on purpose: bailing out mid-wizard leaves
        // whatever tab was active before (home, same as the site's
        // default), but a successful join has already set currentTab to
        // 'dashboard' via handleJoinSuccess by the time this fires from the
        // done screen's "Go to the site" button — forcing 'home' here
        // would silently undo that and land a brand-new member on the
        // homepage instead of their own dashboard.
        onClose={() => navigateTo('/')}
        onJoinSuccess={handleJoinSuccess}
        onJoinSubmit={async (details) => {
          const result = await content.submitMemberJoin(details);
          // Only opt-ins are pushed to Sender, so only they get a confirmation
          // email to go looking for.
          if (result.ok && details.newsletterOptIn) setShowConfirmEmailModal(true);
          return result;
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between font-sans bg-[#FBF7EC] text-[#1F3A42] relative overflow-hidden bg-dot-pattern">

      {showConfirmedBanner && (
        <div className="relative z-20 bg-[#6CC24A] text-[#14351F]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
            <MailCheck className="w-6 h-6 shrink-0" strokeWidth={2} />
            <div className="flex-1 text-left">
              <p className="font-display font-bold text-sm sm:text-base leading-tight">
                You're confirmed — welcome aboard!
              </p>
              <p className="text-xs sm:text-sm leading-snug mt-0.5">
                You'll get session announcements and sign-up links from now on.
              </p>
            </div>
            <button
              id="dismiss-confirmed-banner"
              onClick={() => setShowConfirmedBanner(false)}
              aria-label="Dismiss"
              className="p-1.5 rounded-full hover:bg-[#14351F]/10 transition cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {isTitrationPage ? (
        <>
          <TitrationHeader
            onNavigateHome={() => navigateTo('/', 'home')}
            userProfile={userProfile}
            onOpenJoin={() => navigateTo('/join')}
            onOpenLogin={() => setShowLoginModal(true)}
          />

          <main className="flex-1 pb-10">
            <TitrationLab userProfile={userProfile} onUpdateXp={handleUpdateXp} />
          </main>
        </>
      ) : (
        <>
          <Header
            currentTab={currentTab}
            setCurrentTab={handleTabChange}
            userProfile={userProfile}
            onOpenJoin={() => navigateTo('/join')}
            onOpenLogin={() => setShowLoginModal(true)}
            onLogout={handleLogout}
            revealProgress={isHomeHero ? heroProgress : undefined}
          />

          {/* Every tab's content enters through the same fade-and-rise (see
              `.animate-tab-in` in index.css) — Resources used to be the only
              page with one. `key={currentTab}` is what makes it replay:
              React remounts the wrapper on a tab change, restarting the CSS
              animation, which simply re-rendering the same element would
              not do.

              Home is deliberately a *different* wrapper, and not just for
              want of tidiness: the hero panel is `position: fixed` while its
              scroll sequence is locked, and a `transform` on any ancestor
              would make it resolve against that ancestor rather than the
              viewport for the length of the animation. Its variant fades
              without the slide for exactly that reason — see the CSS. */}
          <main className={`flex-1 pb-10 ${isHomeHero ? '' : 'pt-24'}`}>
            {currentTab === 'home' ? (
              <div key="home" className="animate-tab-in-fade">
                <Hero
                  onOpenJoin={() => navigateTo('/join')}
                  progress={heroProgress}
                  locked={heroLocked}
                  photos={content.photos}
                />
              </div>
            ) : (
              <div key={currentTab} className="animate-tab-in">
                {currentTab === 'missions' && (
                  <UpcomingMissions missions={content.missions} contentStatus={content.status} signedUpIds={signedUpIds} onSignUp={handleSignUp} />
                )}

                {currentTab === 'lab' && <VirtualLab userProfile={userProfile} onUpdateXp={handleUpdateXp} />}

                {currentTab === 'resources' && <CuratedResources resources={content.resources} />}

                {currentTab === 'logs' && (
                  <LabLogAnnouncements logs={content.labLogs} announcements={content.announcements} contentStatus={content.status} />
                )}

                {currentTab === 'gallery' && (
                  <PhotoGallery photos={photos} sheetPhotos={content.photos} eventPhotos={content.eventPhotos} contentStatus={content.status} userProfile={userProfile} onAddPhoto={handleAddPhoto} onOpenJoin={() => navigateTo('/join')} />
                )}

                {currentTab === 'about' && <AboutUs />}

                {currentTab === 'dashboard' && (
                  <Dashboard userProfile={userProfile} missions={content.missions} signedUpIds={signedUpIds} onUpdateProfileName={handleUpdateProfileName} setCurrentTab={setCurrentTab} />
                )}
              </div>
            )}
          </main>
        </>
      )}

      <Footer setCurrentTab={handleTabChange} onSubscribe={content.subscribeNewsletter} />

      {signupMission && (
        <SignupModal mission={signupMission} onClose={() => setSignupMission(null)} onSubmit={content.submitSignup} onSuccess={handleSignupSuccess} />
      )}

      {signupNotice && (
        <div id="signup-toast" className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border-2 px-4 py-3.5 shadow-2xl animate-fade-in font-sans bg-[#FBF7EC] ${signupNotice.result.ok ? 'border-[#6CC24A]/50' : 'border-red-400/50'}`}>
          <p className={`text-xs font-bold ${signupNotice.result.ok ? 'text-[#2E7D46]' : 'text-red-500'}`}>
            {signupNotice.result.ok ? "You're signed up!" : 'Sign-up failed'}
          </p>
          <p className="text-[11px] text-[#4B6169] mt-0.5 leading-relaxed">
            {signupNotice.result.ok ? `${userProfile.name} is booked in for ${signupNotice.mission.title}.` : signupNotice.result.error ?? 'Something went wrong. Please try again.'}
          </p>
          <button id="close-signup-toast" onClick={() => setSignupNotice(null)} className="text-[11px] font-bold text-[#9AA6A6] hover:text-[#1F3A42] mt-2 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {showConfirmEmailModal && <ConfirmEmailModal onClose={() => setShowConfirmEmailModal(false)} />}

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSubmit={content.loginMember}
          onLoginSuccess={handleLoginSuccess}
          onRequestPasswordReset={content.requestPasswordReset}
          onOpenJoin={() => navigateTo('/join')}
        />
      )}

      {resetToken && (
        <ResetPasswordModal
          token={resetToken}
          onClose={() => setResetToken(null)}
          onResetPassword={content.resetPassword}
        />
      )}

      {emailVerifiedBanner && (
        <div className={`relative z-20 ${emailVerifiedBanner === 'success' ? 'bg-[#6CC24A] text-[#14351F]' : 'bg-red-100 text-red-700'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
            <MailCheck className="w-6 h-6 shrink-0" strokeWidth={2} />
            <div className="flex-1 text-left">
              <p className="font-display font-bold text-sm sm:text-base leading-tight">
                {emailVerifiedBanner === 'success' ? 'Email verified!' : 'That verification link is invalid or expired.'}
              </p>
            </div>
            <button
              id="dismiss-verified-banner"
              onClick={() => setEmailVerifiedBanner(null)}
              aria-label="Dismiss"
              className="p-1.5 rounded-full hover:bg-black/10 transition cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {showLevelUpAlert && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1F3A42]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FBF7EC] border-2 border-[#F2C94C]/60 rounded-[28px] p-8 max-w-sm text-center relative shadow-2xl space-y-4 animate-fade-in">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 p-4 bg-[#F2C94C] text-[#4A3900] rounded-full shadow-lg ring-4 ring-[#F2C94C]/40">
              <Trophy className="w-10 h-10" />
            </div>

            <div className="pt-6 space-y-1">
              <h4 className="font-display font-bold text-2xl text-[#B8860B]">Scientist Level Up!</h4>
            </div>

            <p className="text-xs text-[#4B6169] leading-relaxed">
              Congratulations, <strong className="text-[#1F3A42] font-bold">{userProfile.name}</strong>! You've reached{' '}
              <strong className="text-[#B8860B] font-bold">Level {userProfile.level}</strong>. Keep exploring!
            </p>

            <div className="py-2.5 px-4 bg-white rounded-xl border-2 border-[#1F3A42]/8 text-xs flex justify-center items-center gap-2">
              <Star className="w-4 h-4 text-[#F2C94C] fill-[#F2C94C]" />
              <span>{userProfile.xp} Total XP Earned</span>
            </div>

            <button id="close-levelup-btn" onClick={() => setShowLevelUpAlert(false)}
              className="w-full py-2.5 bg-[#6CC24A] text-[#14351F] font-display font-bold text-xs rounded-xl shadow-[0_3px_0_#4C9A3A] cursor-pointer transition">
              Continue experimenting!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
