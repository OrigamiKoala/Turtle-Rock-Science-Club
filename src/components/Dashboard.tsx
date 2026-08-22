import React, { useState } from 'react';
import { Mission, UserProfile } from '../types';
import {
  Trophy,
  Award,
  Ticket,
  ShieldCheck,
  CheckCircle,
  Clock,
  Calendar,
  Orbit,
  FlaskConical,
  Bot,
  ScrollText,
  Eye,
  Zap,
  Activity,
  Dna,
  Leaf,
  Telescope,
  Factory,
  Flashlight,
  TestTube
} from 'lucide-react';

interface DashboardProps {
  userProfile: UserProfile;
  missions: Mission[];
  signedUpIds: string[];
  onUpdateProfileName: (newName: string) => void;
  setCurrentTab: (tab: string) => void;
}

export default function Dashboard({ userProfile, missions, signedUpIds, onUpdateProfileName, setCurrentTab }: DashboardProps) {
  const [editName, setEditName] = useState(userProfile.name);
  const [showEditMsg, setShowEditMsg] = useState(false);

  const reservedMissions = missions.filter((m) => signedUpIds.includes(m.id));

  const getScientistTitle = () => {
    const count = userProfile.unlockedBadges.length;
    if (count >= 4) return 'Principal Investigator';
    if (count >= 3) return 'Senior Researcher';
    if (count >= 2) return 'Field Scientist';
    return 'Rookie Researcher';
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    onUpdateProfileName(editName);
    setShowEditMsg(true);
    setTimeout(() => setShowEditMsg(false), 2500);
  };

  const badgeCatalog = [
    { name: 'Foundation Member', desc: 'Officially joined the Turtle Rock crew.', icon: ShieldCheck },
    { name: 'Navigator', desc: 'Slingshotted a probe around gravity to reach the beacon.', icon: Orbit },
    { name: 'Chemist', desc: 'Built every molecule in the Molecule Builder kit.', icon: FlaskConical },
    { name: 'Engineer', desc: "Programmed a robot through the Robot Programmer's mazes.", icon: Bot },
    { name: 'Adventurer', desc: 'Finished the Chemistry Text Adventure.', icon: ScrollText },
    { name: 'Optician', desc: 'Bent light through mirrors, lenses and prisms in Lightbender.', icon: Eye },
    { name: 'Sparky', desc: 'Wired a working circuit in Short Circuit.', icon: Zap },
    { name: 'Seismologist', desc: 'Triangulated an earthquake in Epicenter.', icon: Activity },
    { name: 'Geneticist', desc: 'Bred a customer order in Critter Ranch.', icon: Dna },
    { name: 'Ecologist', desc: "Kept an island's food web alive in Island Keeper.", icon: Leaf },
    { name: 'Astrophysicist', desc: "Decoded a star's spectrum in Starlight Decoder.", icon: Telescope },
    { name: 'Chemical Engineer', desc: 'Ran a balanced production line in Reactor Line.', icon: Factory },
    { name: 'Spelunker', desc: 'Threaded a narrow scrolling cave in SF Cave.', icon: Flashlight },
    { name: 'Analytical Chemist', desc: 'Identified a mystery solution by titration.', icon: TestTube }
  ];

  const xpInCurrentLevel = userProfile.xp % 100;
  const xpPercent = Math.min(100, xpInCurrentLevel);

  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10 text-left relative z-10 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 rounded-[28px] p-6 border-2 border-[#1F3A42]/8 bg-white flex flex-col justify-between space-y-6 shadow-[0_8px_24px_rgba(31,58,66,0.06)]">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#1F3A42] text-white flex items-center justify-center font-display font-bold text-3xl">
                {userProfile.name[0].toUpperCase()}
              </div>
              <div className="text-left">
                <h4 className="font-display font-bold text-lg leading-tight text-[#1F3A42]">{userProfile.name}</h4>
                <p className="text-xs font-bold mt-1 text-[#4C9A3A]">{getScientistTitle()}</p>
                <p className="text-[11px] text-[#9AA6A6] mt-0.5">Joined: {userProfile.joinedDate}</p>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t-2 border-[#1F3A42]/8">
              <div className="flex justify-between items-center text-[11px] font-bold text-[#4B6169]">
                <span className="flex items-center gap-1"><Trophy className="w-4 h-4 text-[#F2C94C]" />Level {userProfile.level}</span>
                <span>{xpInCurrentLevel}/100 XP</span>
              </div>
              <div className="w-full bg-[#E4F5DA] h-3 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-[#6CC24A] transition-all duration-500" style={{ width: `${xpPercent}%` }} />
              </div>
              <p className="text-[10px] text-[#9AA6A6]">Lifetime: {userProfile.xp} XP</p>
            </div>
          </div>

          <form onSubmit={handleSaveName} className="space-y-2 pt-4 border-t-2 border-dashed border-[#1F3A42]/10">
            <label className="text-[11px] font-extrabold text-[#4B6169]">Scientist Name</label>
            <div className="flex gap-2">
              <input id="profile-name-edit" type="text" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={20}
                className="flex-1 p-2 rounded-xl text-xs border-2 border-[#1F3A42]/12 bg-[#FBF7EC] text-[#1F3A42] focus:outline-none" />
              <button id="save-profile-name-btn" type="submit" className="px-4 py-1.5 rounded-full text-[11px] font-bold transition cursor-pointer bg-[#1F3A42]/5 hover:bg-[#1F3A42]/10 text-[#1F3A42]">
                Save
              </button>
            </div>
            {showEditMsg && <p className="text-[11px] text-[#2E7D46] font-bold flex items-center gap-1 mt-1"><CheckCircle className="w-3.5 h-3.5" />Saved!</p>}
          </form>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-[#F2C94C]" />
            <h4 className="font-display font-bold text-lg tracking-tight text-[#1F3A42]">
              Achievements ({userProfile.unlockedBadges.length} of {badgeCatalog.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {badgeCatalog.map((badge, idx) => {
              const isUnlocked = userProfile.unlockedBadges.includes(badge.name);
              const Icon = badge.icon;
              return (
                <div id={`badge-card-${idx}`} key={badge.name}
                  className={`p-4 rounded-2xl border-2 transition-all duration-300 flex items-start gap-4 ${isUnlocked ? 'border-[#1F3A42]/8 bg-white shadow-md hover:border-[#1F3A42]/15' : 'opacity-45 border-dashed border-[#1F3A42]/12 bg-white/40'}`}>
                  <div className={`p-3 rounded-xl shrink-0 ${isUnlocked ? 'bg-[#E4F5DA] text-[#2E7D46]' : 'bg-[#1F3A42]/5 text-[#9AA6A6]'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-left space-y-1">
                    <div className="flex items-center gap-1.5">
                      <h5 className="font-display font-bold text-xs text-[#1F3A42] leading-none">{badge.name}</h5>
                      {isUnlocked && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F2C94C]/25 text-[#4A3900]">UNLOCKED</span>}
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#4B6169]">{badge.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t-2 border-[#1F3A42]/8">
        <div>
          <h4 className="font-display font-bold text-xl tracking-tight flex items-center gap-2 text-[#1F3A42]">
            <Ticket className="w-5 h-5 text-[#F2C94C]" />Your Event Sign-Ups
          </h4>
          <p className="text-xs text-[#4B6169] mt-1">Events you've signed up for from this device.</p>
        </div>

        {reservedMissions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reservedMissions.map((mission) => (
              <div id={`reservation-card-${mission.id}`} key={mission.id} className="p-4 rounded-[28px] border-2 border-[#1F3A42]/8 bg-white flex gap-4 justify-between items-center hover:border-[#1F3A42]/15 transition">
                <div className="flex gap-3 items-center min-w-0">
                  <img src={mission.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  <div className="text-left min-w-0">
                    <h5 className="font-display font-bold text-xs truncate leading-snug text-[#1F3A42]">{mission.title}</h5>
                    <p className="text-[10px] text-[#9AA6A6] mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3 shrink-0" />{mission.date} • {mission.time}</p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-full text-[10px] font-bold text-[#2E7D46] bg-[#E4F5DA] shrink-0 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Signed up</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center border-2 border-dashed border-[#1F3A42]/12 rounded-[28px] bg-white">
            <Calendar className="w-10 h-10 text-[#9AA6A6] mx-auto mb-2" />
            <p className="font-bold text-xs text-[#4B6169]">No sign-ups yet</p>
            <p className="text-xs text-[#9AA6A6] max-w-sm mx-auto mt-1 leading-relaxed">Spots fill up fast! Explore upcoming events.</p>
            <button id="dashboard-explore-btn" onClick={() => setCurrentTab('missions')} className="px-5 py-2.5 text-[11px] font-display font-bold rounded-full shadow-[0_3px_0_#4C9A3A] transition-all hover:scale-105 active:scale-95 cursor-pointer mt-4 bg-[#6CC24A] text-[#14351F]">
              Browse Upcoming Events
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
