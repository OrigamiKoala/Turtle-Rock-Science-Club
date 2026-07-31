import React, { useState, useEffect } from 'react';
import { ClubIdentity, UserProfile, GalleryPhoto, Mission } from './types';
import {
  initialLabLogs,
  missionsData,
  initialGalleryPhotos,
  faqItems,
  announcements,
  pressMentions
} from './data';

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

// Lucide Icons
import { Trophy, Sparkles, X, ArrowRight, Star } from 'lucide-react';

export default function App() {
  // Global States
  const [identity, setIdentity] = useState<ClubIdentity>('turtlerock');
  const [currentTab, setCurrentTab] = useState<string>('missions');
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [showLevelUpAlert, setShowLevelUpAlert] = useState<boolean>(false);
  const [prevLevel, setPrevLevel] = useState<number>(0);

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

  const [activeMissions, setActiveMissions] = useState<Record<ClubIdentity, Mission[]>>(() => {
    try {
      const saved = localStorage.getItem('tr_sc_active_missions');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed reading missions from storage', e);
    }
    return missionsData;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('tr_sc_user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('tr_sc_gallery_photos', JSON.stringify(photos));
  }, [photos]);

  useEffect(() => {
    localStorage.setItem('tr_sc_active_missions', JSON.stringify(activeMissions));
  }, [activeMissions]);

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
        setPrevLevel(prev.level);
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

  // Handle Mission Booking Reservation
  const handleReserveMission = (missionId: string) => {
    if (userProfile.level === 0) {
      setShowJoinModal(true);
      return;
    }

    if (userProfile.reservedMissionIds.includes(missionId)) return;

    // Update active missions count
    setActiveMissions((prev) => {
      const updatedList = prev[identity].map((m) => {
        if (m.id === missionId) {
          return { ...m, spotsReserved: Math.min(m.spotsTotal, m.spotsReserved + 1) };
        }
        return m;
      });
      return {
        ...prev,
        [identity]: updatedList
      };
    });

    // Update user reserved IDs and award XP (+15 XP for committing to a science event!)
    setUserProfile((prev) => ({
      ...prev,
      reservedMissionIds: [...prev.reservedMissionIds, missionId]
    }));

    handleUpdateXp(15);
  };

  // Handle Canceling a reservation
  const handleCancelReservation = (missionId: string) => {
    if (!userProfile.reservedMissionIds.includes(missionId)) return;

    // Determine which identity owns this mission
    const missionIdentity: ClubIdentity = missionId.endsWith('-k') ? 'kinetic' : 'turtlerock';

    setActiveMissions((prev) => {
      const updatedList = prev[missionIdentity].map((m) => {
        if (m.id === missionId) {
          return { ...m, spotsReserved: Math.max(0, m.spotsReserved - 1) };
        }
        return m;
      });
      return {
        ...prev,
        [missionIdentity]: updatedList
      };
    });

    setUserProfile((prev) => ({
      ...prev,
      reservedMissionIds: prev.reservedMissionIds.filter((id) => id !== missionId)
    }));
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

  const isTurtle = identity === 'turtlerock';

  return (
    <div className="min-h-screen flex flex-col justify-between font-sans bg-[#0A0A0A] text-white selection:bg-blue-500/30 relative overflow-hidden bg-dot-pattern">

      {/* Dynamic Background Glow corresponding to the active club identity */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 pointer-events-none transition-all duration-700"
        style={{
          background: isTurtle
            ? 'radial-gradient(circle, #10b981 0%, transparent 70%)'
            : 'radial-gradient(circle, #3b82f6 0%, transparent 70%)'
        }}
      />

      {/* Header Layout */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        identity={identity}
        setIdentity={setIdentity}
        userProfile={userProfile}
        onOpenJoin={() => setShowJoinModal(true)}
      />

      {/* Main Content Router */}
      <main className="flex-1 pb-16">

        {/* Tab 1: Home / Missions (default landing page layout) */}
        {currentTab === 'missions' && (
          <div className="space-y-4">
            <HeroSection
              identity={identity}
              userProfile={userProfile}
              onOpenJoin={() => setShowJoinModal(true)}
              setCurrentTab={setCurrentTab}
            />

            <UpcomingMissions
              identity={identity}
              missions={activeMissions[identity]}
              userProfile={userProfile}
              onReserve={handleReserveMission}
              onCancelReserve={handleCancelReservation}
              onOpenJoin={() => setShowJoinModal(true)}
            />
          </div>
        )}

        {/* Tab 2: Virtual Labs & Simulators */}
        {currentTab === 'lab' && (
          <VirtualLab
            identity={identity}
            userProfile={userProfile}
            onUpdateXp={handleUpdateXp}
          />
        )}

        {/* Tab 3: Announcements */}
        {currentTab === 'logs' && (
          <LabLogAnnouncements
            identity={identity}
            logs={initialLabLogs}
            announcements={announcements}
            press={pressMentions}
            userProfile={userProfile}
            onSubscribeNewsletter={handleSubscribeNewsletter}
          />
        )}

        {/* Tab 4: Our Photo Gallery */}
        {currentTab === 'gallery' && (
          <PhotoGallery
            identity={identity}
            photos={photos}
            userProfile={userProfile}
            onAddPhoto={handleAddPhoto}
            onOpenJoin={() => setShowJoinModal(true)}
          />
        )}

        {/* Tab 5: About Us & FAQs */}
        {currentTab === 'about' && (
          <AboutUs
            identity={identity}
            faqs={faqItems}
          />
        )}

        {/* Tab 6: Scientist Profile Dashboard */}
        {currentTab === 'dashboard' && (
          <Dashboard
            identity={identity}
            userProfile={userProfile}
            missions={[...activeMissions.turtlerock, ...activeMissions.kinetic]}
            onCancelReserve={handleCancelReservation}
            onUpdateProfileName={handleUpdateProfileName}
            setCurrentTab={setCurrentTab}
          />
        )}

      </main>

      {/* Footer Layout */}
      <Footer
        identity={identity}
        setCurrentTab={setCurrentTab}
      />

      {/* JOIN / SIGN UP FORM MODAL */}
      {showJoinModal && (
        <JoinModal
          identity={identity}
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
