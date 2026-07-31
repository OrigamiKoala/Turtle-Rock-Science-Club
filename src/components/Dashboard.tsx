import React, { useState } from 'react';
import { Mission, UserProfile } from '../types';
import { 
  Trophy, 
  Award, 
  Ticket, 
  Atom, 
  User, 
  Calendar, 
  Sparkles, 
  TrendingUp, 
  MailCheck, 
  Heart,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  Clock
} from 'lucide-react';

interface DashboardProps {
  userProfile: UserProfile;
  missions: Mission[];
  /** Events this browser has signed up for. */
  signedUpIds: string[];
  onUpdateProfileName: (newName: string) => void;
  setCurrentTab: (tab: string) => void;
}

export default function Dashboard({
  userProfile,
  missions,
  signedUpIds,
  onUpdateProfileName,
  setCurrentTab
}: DashboardProps) {

  const [editName, setEditName] = useState(userProfile.name);
  const [showEditMsg, setShowEditMsg] = useState(false);

  // Events this browser has signed up for
  const reservedMissions = missions.filter((m) => signedUpIds.includes(m.id));

  // Determine professional scientist title based on unlocked badges
  const getScientistTitle = () => {
    const count = userProfile.unlockedBadges.length;
    if (count >= 4) return 'Supreme Principal Researcher 🚀';
    if (count >= 3) return 'Master Lab Operator 🧪';
    if (count >= 2) return 'Senior Experimenter 🔬';
    return 'Novice Discovery Scholar 🎓';
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    onUpdateProfileName(editName);
    setShowEditMsg(true);
    setTimeout(() => {
      setShowEditMsg(false);
    }, 2500);
  };

  // Badges catalog
  const badgeCatalog = [
    { name: 'Foundation Member', desc: 'Successfully registered and joined the Turtle Rock science network.', icon: ShieldCheck, color: 'text-emerald-500 bg-emerald-100' },
    { name: 'Lava Lamp Alchemist', desc: 'Calibrated temperature and dropped 3 effervescent tablets in the Lava cylinder.', icon: Award, color: 'text-amber-500 bg-amber-100' },
    { name: 'Volcano Catalyst', desc: 'Triggered a high-intensity chemical reaction peak exceeding 80% eruption force.', icon: FlameIcon, color: 'text-red-500 bg-red-100' },
    { name: 'Stargazing Scout', desc: 'Successfully mapped constellation coordinates using the Schmidt-Cassegrain simulation.', icon: Sparkles, color: 'text-indigo-500 bg-indigo-100' }
  ];

  function FlameIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-5 h-5 text-red-500"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1A3.75 3.75 0 0 0 12 18Z"
        />
      </svg>
    );
  }

  // Calculate XP goal percentage (e.g. 100 XP per level)
  const xpInCurrentLevel = userProfile.xp % 100;
  const xpPercent = Math.min(100, xpInCurrentLevel);

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10 text-left relative z-10 font-sans">
      
      {/* Grid: Profile detail & XP Progress (Top) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Profile Card & Customization */}
        <div className="lg:col-span-4 rounded-[2rem] p-6 border border-white/10 bg-zinc-900/40 backdrop-blur-md flex flex-col justify-between space-y-6 shadow-2xl text-white">
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-950 text-white border border-white/10 flex items-center justify-center font-bold text-3xl shadow-lg font-mono">
                {userProfile.name[0].toUpperCase()}
              </div>
              <div className="text-left">
                <h4 className="font-display font-bold text-lg leading-tight text-white tracking-tighter">{userProfile.name}</h4>
                <p className="text-xs font-bold mt-1 font-mono uppercase tracking-widest text-emerald-400">{getScientistTitle()}</p>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Joined: {userProfile.joinedDate}</p>
              </div>
            </div>

            {/* Level & XP progression bar */}
            <div className="space-y-2 pt-4 border-t border-white/10">
              <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                <span className="flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Level {userProfile.level}
                </span>
                <span className="font-bold text-zinc-500">{xpInCurrentLevel}/100 XP</span>
              </div>
              <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full rounded-full transition-all duration-500 shadow-md bg-emerald-500 shadow-emerald-500/20"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Lifetime Accumulated: {userProfile.xp} XP</p>
            </div>
          </div>

          {/* Edit Name Inline Form */}
          <form onSubmit={handleSaveName} className="space-y-2 pt-4 border-t border-dashed border-white/10">
            <label className="text-[10px] font-bold font-mono tracking-widest uppercase text-zinc-500">Scientist Pseudonym</label>
            <div className="flex gap-2">
              <input
                id="profile-name-edit"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={20}
                className="flex-1 p-2 rounded-xl text-xs border border-white/10 bg-zinc-950/60 text-white focus:outline-none focus:border-white/20"
              />
              <button
                id="save-profile-name-btn"
                type="submit"
                className="px-4 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest transition cursor-pointer bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10"
              >
                Save
              </button>
            </div>
            {showEditMsg && (
              <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-1 uppercase tracking-wide">
                <CheckCircle className="w-3.5 h-3.5" />
                Scientist record updated!
              </p>
            )}
          </form>

        </div>

        {/* Badge & Achievements Grid */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5.5 h-5.5 text-yellow-500" />
            <h4 className="font-display font-bold text-lg tracking-tighter text-white">
              Scientist Achievements ({userProfile.unlockedBadges.length} of {badgeCatalog.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {badgeCatalog.map((badge, idx) => {
              const isUnlocked = userProfile.unlockedBadges.includes(badge.name);
              const Icon = badge.icon;

              const badgeColors: Record<string, string> = {
                'Foundation Member': 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/20',
                'Lava Lamp Alchemist': 'text-amber-400 bg-amber-950/40 border border-amber-500/20',
                'Volcano Catalyst': 'text-red-400 bg-red-950/40 border border-red-500/20',
                'Stargazing Scout': 'text-blue-400 bg-blue-950/40 border border-blue-500/20'
              };

              const activeStyle = badgeColors[badge.name] || 'text-zinc-400 bg-zinc-950 border border-white/10';

              return (
                <div
                  id={`badge-card-${idx}`}
                  key={badge.name}
                  className={`p-4 rounded-2xl border transition-all duration-300 flex items-start gap-4 ${
                    isUnlocked
                      ? 'border-white/10 bg-zinc-900/40 backdrop-blur-md text-white shadow-xl hover:border-white/20'
                      : 'opacity-35 grayscale border-dashed border-white/5 bg-zinc-950/10'
                  }`}
                >
                  <div className={`p-3 rounded-xl shrink-0 ${
                    isUnlocked ? activeStyle : 'bg-zinc-950/80 text-zinc-600 border border-white/5'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-left space-y-1">
                    <div className="flex items-center gap-1.5">
                      <h5 className="font-display font-bold text-xs text-white leading-none">{badge.name}</h5>
                      {isUnlocked && (
                        <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase tracking-wider">
                          UNLOCKED
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] leading-relaxed text-zinc-400 font-sans">
                      {badge.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Sign-ups list (Bottom) */}
      <div className="space-y-6 pt-6 border-t border-white/5">
        <div>
          <h4 className="font-display font-bold text-xl tracking-tighter flex items-center gap-2 text-white">
            <Ticket className="w-5.5 h-5.5 text-amber-500" />
            Your Event Sign-Ups
          </h4>
          <p className="text-xs text-zinc-400 mt-1">Events you have signed up for from this device.</p>
        </div>

        {reservedMissions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reservedMissions.map((mission) => (
              <div
                id={`reservation-card-${mission.id}`}
                key={mission.id}
                className="p-4 rounded-[2rem] border border-white/10 bg-zinc-900/40 backdrop-blur-md flex gap-4 justify-between items-center text-white hover:border-white/20 hover:shadow-xl transition"
              >
                <div className="flex gap-3 items-center min-w-0">
                  <img src={mission.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  <div className="text-left min-w-0">
                    <h5 className="font-display font-bold text-xs truncate leading-snug text-white">{mission.title}</h5>
                    <p className="text-[9px] text-zinc-500 font-mono mt-0.5 flex items-center gap-1 uppercase tracking-wider">
                      <Clock className="w-3 h-3 shrink-0" />
                      {mission.date} • {mission.time}
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 shrink-0 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Signed up
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center border border-dashed border-white/10 rounded-[2rem] bg-zinc-900/20 text-white">
            <Calendar className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="font-mono font-bold text-xs uppercase tracking-widest text-zinc-400">No sign-ups yet</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 leading-relaxed">
              Spots fill up fast! Explore upcoming events and sign your child up.
            </p>
            <button
              id="dashboard-explore-btn"
              onClick={() => setCurrentTab('missions')}
              className="px-5 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer mt-4 bg-emerald-500 hover:bg-emerald-400 text-stone-950"
            >
              Browse Upcoming Events
            </button>
          </div>
        )}
      </div>

    </section>
  );
}
