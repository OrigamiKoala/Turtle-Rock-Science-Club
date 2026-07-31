import React, { useEffect, useState } from 'react';
import { UserProfile, GalleryPhoto, Mission } from './types';
import { initialGalleryPhotos, faqItems, pressMentions } from './data';
import { useSiteContent } from './useSiteContent';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import HeroSection from './components/HeroSection';
import UpcomingMissions from './components/UpcomingMissions';
import VirtualLab from './components/VirtualLab';
import PhotoGallery from './components/PhotoGallery';
import AboutUs from './components/AboutUs';
import LabLogAnnouncements from './components/LabLogAnnouncements';
import Dashboard from './components/Dashboard';
import JoinModal from './components/JoinModal';
import SignupModal from './components/SignupModal';

// Lucide Icons
import { Trophy, Star } from 'lucide-react';

export default function App() {
  // Global States
  const [currentTab, setCurrentTab] = useState<string>('missions');
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [showLevelUpAlert, setShowLevelUpAlert] = useState<boolean>(false);
  const [signupMission, setSignupMission] = useState<Mission | null>(null);

  // Events and announcements published from the Google Sheet. Falls back to the
  // bundled content in data.ts when the Sheet is unreachable or unconfigured.
  const content = useSiteContent();

  // Load state from localStorage on mount
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('tr_sc_user_profile');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed reading user profile from storage', e);
    }
    // Default guest profile (level 0 means not joined)
    return {
      name: '',
      role: '',
      joinedDate: '',
      level: 0,
      xp: 0,
      unlockedBadges: [],
      reservedMissionIds: [],
      newsletterSubscribed: false
    };
  });

  const [photos, setPhotos] = useState<GalleryPhoto[]>(() => {
    try {
      const saved = localStorage.getItem('tr_sc_gallery_photos');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed reading gallery photos from storage', e);
    }
    return initialGalleryPhotos;
  });

  /**
   * Events this browser has signed up for. Only used to change the button to a
   * confirmation — the authoritative spot count lives in the Sheet, which the
   * script increments on every signup.
   */
  const [signedUpIds, setSignedUpIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tr_sc_signed_up_ids');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading signups from storage', e);
    }
    return [];
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('tr_sc_user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('tr_sc_gallery_photos', JSON.stringify(photos));
  }, [photos]);

  useEffect(() => {
    localStorage.setItem('tr_sc_signed_up_ids', JSON.stringify(signedUpIds));
  }, [signedUpIds]);

  // Handle XP Updates & level ups
  const handleUpdateXp = (xpToAdd: number, badgeToUnlock?: string) => {
    if (userProfile.level === 0) return; // Guests do not collect XP

    setUserProfile((prev) => {
      const newXp = prev.xp + xpToAdd;
      // 100 XP per level
      const newLevel = Math.floor(newXp / 100) + 1;

      let updatedBadges = [...prev.unlockedBadges];
      if (badgeToUnlock && !updatedBadges.includes(badgeToUnlock)) {
        updatedBadges.push(badgeToUnlock);
      }

      if (newLevel > prev.level) {
        setShowLevelUpAlert(true);
      }

      return {
        ...prev,
        xp: newXp,
        level: newLevel,
        unlockedBadges: updatedBadges
      };
    });
  };

  // Handle Joining the Club
  const handleJoinSuccess = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    setCurrentTab('dashboard'); // take them straight to dashboard to view their Scientist card
  };

  /** Called once the Sheet has confirmed and recorded a signup. */
  const handleSignupSuccess = (missionId: string) => {
    setSignedUpIds((prev) => (prev.includes(missionId) ? prev : [...prev, missionId]));
    // +15 XP for committing to a science event (members only)
    handleUpdateXp(15);
  };

  // Handle Newsletter Signups
  const handleSubscribeNewsletter = () => {
    setUserProfile((prev) => ({
      ...prev,
      newsletterSubscribed: true
    }));
    // Award 20 XP for joining the broadcast list
    handleUpdateXp(20);
  };

  // Handle Custom Photo additions
  const handleAddPhoto = (newPhoto: GalleryPhoto) => {
    setPhotos((prev) => [newPhoto, ...prev]);
    // Award 25 XP for contributing photographic evidence of discovery!
    handleUpdateXp(25);
  };

  // Handle Profile pseudonym name save
  const handleUpdateProfileName = (newName: string) => {
    setUserProfile((prev) => ({
      ...prev,
      name: newName
    }));
  };

  return (
    <div className="min-h-screen flex flex-col justify-between font-sans bg-[#0A0A0A] text-white selection:bg-blue-500/30 relative overflow-hidden bg-dot-pattern">

      {/* Ambient brand glow */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }}
      />

      {/* Header Layout */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        userProfile={userProfile}
        onOpenJoin={() => setShowJoinModal(true)}
      />

      {/* Main Content Router */}
      <main className="flex-1 pb-16">

        {/* Tab 1: Home / Events */}
        {currentTab === 'missions' && (
          <div className="space-y-4">
            <HeroSection
              userProfile={userProfile}
              onOpenJoin={() => setShowJoinModal(true)}
              setCurrentTab={setCurrentTab}
            />

            <UpcomingMissions
              missions={content.missions}
              contentStatus={content.status}
              signedUpIds={signedUpIds}
              onSignUp={setSignupMission}
            />
          </div>
        )}

        {/* Tab 2: Virtual Lab & Minigames */}
        {currentTab === 'lab' && (
          <VirtualLab
            userProfile={userProfile}
            onUpdateXp={handleUpdateXp}
          />
        )}

        {/* Tab 3: Announcements */}
        {currentTab === 'logs' && (
          <LabLogAnnouncements
            logs={content.labLogs}
            announcements={content.announcements}
            press={pressMentions}
            userProfile={userProfile}
            onSubscribeNewsletter={handleSubscribeNewsletter}
          />
        )}

        {/* Tab 4: Our Photo Gallery */}
        {currentTab === 'gallery' && (
          <PhotoGallery
            photos={photos}
            userProfile={userProfile}
            onAddPhoto={handleAddPhoto}
            onOpenJoin={() => setShowJoinModal(true)}
          />
        )}

        {/* Tab 5: About Us & FAQs */}
        {currentTab === 'about' && <AboutUs faqs={faqItems} />}

        {/* Tab 6: Scientist Profile Dashboard */}
        {currentTab === 'dashboard' && (
          <Dashboard
            userProfile={userProfile}
            missions={content.missions}
            signedUpIds={signedUpIds}
            onUpdateProfileName={handleUpdateProfileName}
            setCurrentTab={setCurrentTab}
          />
        )}

      </main>

      {/* Footer Layout */}
      <Footer setCurrentTab={setCurrentTab} />

      {/* EVENT SIGN-UP MODAL */}
      {signupMission && (
        <SignupModal
          mission={signupMission}
          onClose={() => setSignupMission(null)}
          onSubmit={content.submitSignup}
          onSuccess={handleSignupSuccess}
        />
      )}

      {/* JOIN / SIGN UP FORM MODAL */}
      {showJoinModal && (
        <JoinModal
          onClose={() => setShowJoinModal(false)}
          onJoinSuccess={handleJoinSuccess}
        />
      )}

      {/* CELEBRATORY LEVEL UP FLOATING ALERT */}
      {showLevelUpAlert && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-yellow-500/50 rounded-2xl p-8 max-w-sm text-center relative shadow-2xl space-y-4 text-white animate-fade-in">

            <div className="absolute -top-12 left-1/2 -translate-x-1/2 p-4 bg-yellow-500 text-stone-950 rounded-full shadow-lg ring-4 ring-yellow-300">
              <Trophy className="w-10 h-10 animate-bounce" />
            </div>

            <div className="pt-6 space-y-1">
              <h4 className="font-display font-bold text-2xl text-yellow-400">Scientist Level Up!</h4>
              <p className="text-[11px] font-mono text-stone-400">Record updated at Basecamp</p>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              Congratulations, <strong className="text-white font-bold">{userProfile.name}</strong>! You have reached <strong className="text-yellow-400 font-bold">Level {userProfile.level}</strong> of Scientific Discovery. Keep testing and exploring to unlock ultimate Principal Investigator status!
            </p>

            <div className="py-2.5 px-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono flex justify-center items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span>{userProfile.xp} Total Discovery XP Earned</span>
            </div>

            <button
              id="close-levelup-btn"
              onClick={() => setShowLevelUpAlert(false)}
              className="w-full py-2.5 bg-yellow-500 text-stone-950 hover:bg-yellow-400 font-bold text-xs rounded-xl shadow-md cursor-pointer transition"
            >
              Continue Experimenting
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
