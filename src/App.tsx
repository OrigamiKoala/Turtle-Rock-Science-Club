import React, { useEffect, useState } from 'react';
import { UserProfile, GalleryPhoto, Mission } from './types';
import { useSiteContent, SignupResult } from './useSiteContent';
import { useTheme } from './useTheme';

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

import { Trophy, Star } from 'lucide-react';

const INITIAL_GALLERY_PHOTOS: GalleryPhoto[] = [
  {
    id: 'photo-1',
    title: 'The Glow-in-the-Dark Catalyst',
    description: 'Youth scientists staring in amazement at luminol chemiluminescent reactions in dark flasks.',
    category: 'experiments',
    imageUrl: 'https://images.unsplash.com/photo-1617155093730-a8bf47be792d?auto=format&fit=crop&q=80&w=800',
    submittedBy: 'Parent Mark T.',
    date: 'June 10, 2026'
  },
  {
    id: 'photo-2',
    title: 'Monthly Mission Briefing',
    description: 'Our core club members planning out their autonomous robot chassis designs on the whiteboard.',
    category: 'lab-meetings',
    imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800',
    submittedBy: 'Mentor Marcus Chen',
    date: 'June 15, 2026'
  },
  {
    id: 'photo-3',
    title: 'Stargazing Night at Turtle Rock Park',
    description: 'A crisp evening setting up the Newtonian reflector telescope on the grassy ridge.',
    category: 'field-trips',
    imageUrl: 'https://images.unsplash.com/photo-1539186607619-df476afe3ff1?auto=format&fit=crop&q=80&w=800',
    submittedBy: 'Stargazer Sarah Jenkins',
    date: 'June 22, 2026'
  },
  {
    id: 'photo-4',
    title: 'Turtle Rock Valley Geological Trek',
    description: 'Collecting mineral specimens and classifying basalt fragments along the creek bed.',
    category: 'field-trips',
    imageUrl: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&q=80&w=800',
    submittedBy: 'Parent Emily S.',
    date: 'June 29, 2026'
  },
  {
    id: 'photo-5',
    title: 'Micro-Biology Basics Session',
    description: 'Calibrating compound microscopes and discovering the tiny tardigrades swimming in local pond moss.',
    category: 'experiments',
    imageUrl: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&q=80&w=800',
    submittedBy: 'Dr. Elena Vance',
    date: 'July 2, 2026'
  },
  {
    id: 'photo-6',
    title: 'Robotics Workshop Calibration',
    description: 'Perfecting the weight distribution of the servo crawler chassis to prevent tipping.',
    category: 'experiments',
    imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&q=80&w=800',
    submittedBy: 'Youth Scientist Leo G. (Age 11)',
    date: 'July 5, 2026'
  }
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('missions');
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [showLevelUpAlert, setShowLevelUpAlert] = useState<boolean>(false);
  const [signupMission, setSignupMission] = useState<Mission | null>(null);
  const [signupNotice, setSignupNotice] = useState<{ mission: Mission; result: SignupResult } | null>(null);

  const content = useSiteContent();
  const { theme, toggleTheme } = useTheme();

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('tr_sc_user_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) { console.error('Failed reading user profile from storage', e); }
    return { name: '', school: '', role: '', joinedDate: '', level: 0, xp: 0, unlockedBadges: [], reservedMissionIds: [], newsletterSubscribed: false };
  });

  const [photos, setPhotos] = useState<GalleryPhoto[]>(() => {
    try {
      const saved = localStorage.getItem('tr_sc_gallery_photos');
      if (saved) return JSON.parse(saved);
    } catch (e) { console.error('Failed reading gallery photos from storage', e); }
    return INITIAL_GALLERY_PHOTOS;
  });

  const [signedUpIds, setSignedUpIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tr_sc_signed_up_ids');
      if (saved) return JSON.parse(saved);
    } catch (e) { console.error('Failed reading signups from storage', e); }
    return [];
  });

  useEffect(() => { localStorage.setItem('tr_sc_user_profile', JSON.stringify(userProfile)); }, [userProfile]);
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

  const handleJoinSuccess = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    setCurrentTab('dashboard');
  };

  const handleSignupSuccess = (missionId: string) => {
    setSignedUpIds((prev) => (prev.includes(missionId) ? prev : [...prev, missionId]));
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

  const handleSubscribeNewsletter = () => {
    setUserProfile((prev) => ({ ...prev, newsletterSubscribed: true }));
    handleUpdateXp(20);
  };

  const handleAddPhoto = (newPhoto: GalleryPhoto) => {
    setPhotos((prev) => [newPhoto, ...prev]);
    handleUpdateXp(25);
  };

  const handleUpdateProfileName = (newName: string) => {
    setUserProfile((prev) => ({ ...prev, name: newName }));
  };

  return (
    <div className="min-h-screen flex flex-col justify-between font-sans bg-[#FBF7EC] text-[#1F3A42] relative overflow-hidden bg-dot-pattern">

      <Header currentTab={currentTab} setCurrentTab={setCurrentTab} userProfile={userProfile} onOpenJoin={() => setShowJoinModal(true)} theme={theme} onToggleTheme={toggleTheme} />

      <main className="flex-1 pb-10">
        {currentTab === 'missions' && (
          <div className="space-y-4">
            <HeroSection userProfile={userProfile} onOpenJoin={() => setShowJoinModal(true)} setCurrentTab={setCurrentTab} />
            <UpcomingMissions missions={content.missions} contentStatus={content.status} signedUpIds={signedUpIds} onSignUp={handleSignUp} />
          </div>
        )}

        {currentTab === 'lab' && <VirtualLab userProfile={userProfile} onUpdateXp={handleUpdateXp} />}

        {currentTab === 'logs' && (
          <LabLogAnnouncements logs={content.labLogs} announcements={content.announcements} userProfile={userProfile} onSubscribeNewsletter={handleSubscribeNewsletter} />
        )}

        {currentTab === 'gallery' && (
          <PhotoGallery photos={photos} userProfile={userProfile} onAddPhoto={handleAddPhoto} onOpenJoin={() => setShowJoinModal(true)} />
        )}

        {currentTab === 'about' && <AboutUs />}

        {currentTab === 'dashboard' && (
          <Dashboard userProfile={userProfile} missions={content.missions} signedUpIds={signedUpIds} onUpdateProfileName={handleUpdateProfileName} setCurrentTab={setCurrentTab} />
        )}
      </main>

      <Footer setCurrentTab={setCurrentTab} />

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

      {showJoinModal && <JoinModal onClose={() => setShowJoinModal(false)} onJoinSuccess={handleJoinSuccess} />}

      {showLevelUpAlert && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1F3A42]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FBF7EC] border-2 border-[#F2C94C]/60 rounded-[28px] p-8 max-w-sm text-center relative shadow-2xl space-y-4 animate-fade-in">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 p-4 bg-[#F2C94C] text-[#4A3900] rounded-full shadow-lg ring-4 ring-[#F2C94C]/40">
              <Trophy className="w-10 h-10" />
            </div>

            <div className="pt-6 space-y-1">
              <h4 className="font-display font-bold text-2xl text-[#B8860B]">Scientist Level Up!</h4>
              <p className="text-[11px] text-[#9AA6A6] font-bold">Record updated at Basecamp</p>
            </div>

            <p className="text-xs text-[#4B6169] leading-relaxed">
              Congratulations, <strong className="text-[#1F3A42] font-bold">{userProfile.name}</strong>! You've reached{' '}
              <strong className="text-[#B8860B] font-bold">Level {userProfile.level}</strong>. Keep exploring to unlock
              ultimate Principal Investigator status!
            </p>

            <div className="py-2.5 px-4 bg-white rounded-xl border-2 border-[#1F3A42]/8 text-xs flex justify-center items-center gap-2">
              <Star className="w-4 h-4 text-[#F2C94C] fill-[#F2C94C]" />
              <span>{userProfile.xp} Total Discovery XP Earned</span>
            </div>

            <button id="close-levelup-btn" onClick={() => setShowLevelUpAlert(false)}
              className="w-full py-2.5 bg-[#6CC24A] text-[#14351F] font-display font-bold text-xs rounded-xl shadow-[0_3px_0_#4C9A3A] cursor-pointer transition">
              Continue Experimenting
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
