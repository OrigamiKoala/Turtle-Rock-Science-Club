import React from 'react';
import { ClubIdentity, Mission, UserProfile } from '../types';
import { Calendar, Clock, MapPin, Users, CheckCircle, Ticket, LogIn } from 'lucide-react';

interface UpcomingMissionsProps {
  identity: ClubIdentity;
  missions: Mission[];
  userProfile: UserProfile;
  onReserve: (missionId: string) => void;
  onCancelReserve: (missionId: string) => void;
  onOpenJoin: () => void;
}

export default function UpcomingMissions({
  identity,
  missions,
  userProfile,
  onReserve,
  onCancelReserve,
  onOpenJoin
}: UpcomingMissionsProps) {
  const isTurtle = identity === 'turtlerock';

  const isJoined = userProfile.level > 0;

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h3 className="font-display font-bold text-2xl sm:text-3xl tracking-tighter text-white">
            Upcoming Missions
          </h3>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            {isTurtle
              ? 'Join our local sessions!'
              : 'Secure a spot.'}
          </p>
        </div>

        {/* Quick status badge */}
        {isJoined && (
          <div className="text-[10px] px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 font-mono font-bold tracking-widest uppercase flex items-center gap-1.5 text-zinc-300">
            <Ticket className="w-3.5 h-3.5 text-amber-500" />
            <span>Reserved {userProfile.reservedMissionIds.length} of {missions.length} events</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {missions.map((mission) => {
          const isReserved = userProfile.reservedMissionIds.includes(mission.id);
          const spotsLeft = mission.spotsTotal - mission.spotsReserved;
          const isSoldOut = spotsLeft <= 0;

          return (
            <div
              id={`mission-card-${mission.id}`}
              key={mission.id}
              className="rounded-[2rem] overflow-hidden border border-white/10 bg-zinc-900/40 backdrop-blur-md transition-all duration-300 flex flex-col justify-between hover:border-white/20 shadow-xl"
            >
              {/* Image Section with overlays */}
              <div className="relative h-44 overflow-hidden border-b border-white/5">
                <img
                  src={mission.image}
                  alt={mission.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  referrerPolicy="no-referrer"
                />

                {/* Spot left counts overlay */}
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-widest uppercase shadow-xs ${isSoldOut
                    ? 'bg-red-500 text-white'
                    : spotsLeft < 5
                      ? 'bg-amber-500 text-stone-900'
                      : isTurtle
                        ? 'bg-emerald-500/90 text-stone-950'
                        : 'bg-blue-500/90 text-stone-950'
                    }`}>
                    {isSoldOut ? 'Sold Out' : `${spotsLeft} benches left`}
                  </span>
                </div>
              </div>

              {/* Body Section */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-base leading-snug tracking-tight text-white">
                    {mission.title}
                  </h4>
                  <p className="text-xs leading-relaxed text-zinc-400 font-sans">
                    {mission.description}
                  </p>
                </div>

                {/* Logistics */}
                <div className="space-y-1.5 pt-3.5 border-t border-white/10 text-[10px] font-mono text-zinc-400 tracking-wide">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span>{mission.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span>{mission.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{mission.location}</span>
                  </div>
                </div>

                {/* RSVP Controls */}
                <div className="pt-2">
                  {!isJoined ? (
                    <button
                      id={`mission-join-btn-${mission.id}`}
                      onClick={onOpenJoin}
                      className="w-full py-2 px-4 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5 text-amber-500" />
                      <span>Join club to Reserve Spot</span>
                    </button>
                  ) : isReserved ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-1.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 fill-emerald-950" />
                        <span>Registered Scientist ✔</span>
                      </div>
                      <button
                        id={`mission-cancel-btn-${mission.id}`}
                        onClick={() => onCancelReserve(mission.id)}
                        className="w-full py-1 text-center text-[10px] font-mono text-red-400 hover:text-red-300 uppercase tracking-widest cursor-pointer hover:underline"
                      >
                        Cancel Reservation
                      </button>
                    </div>
                  ) : (
                    <button
                      id={`mission-reserve-btn-${mission.id}`}
                      onClick={() => onReserve(mission.id)}
                      disabled={isSoldOut}
                      className={`w-full py-2 px-4 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-xs transition-all duration-200 hover:scale-[1.01] active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${isTurtle
                        ? 'bg-emerald-500 text-stone-950 hover:bg-emerald-400'
                        : 'bg-blue-500 text-stone-950 hover:bg-blue-400'
                        }`}
                    >
                      {isSoldOut ? 'No Stations Remaining' : isTurtle ? 'Join This Mission' : 'Reserve Bench'}
                    </button>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
