import React from 'react';
import { Mission } from '../types';
import { ContentStatus } from '../useSiteContent';
import { Calendar, Clock, MapPin, Users, CheckCircle, Ticket, CalendarOff } from 'lucide-react';

interface UpcomingMissionsProps {
  missions: Mission[];
  /** Where the event list came from, so we can explain an empty page. */
  contentStatus: ContentStatus;
  /** Events this browser has already signed up for. */
  signedUpIds: string[];
  onSignUp: (mission: Mission) => void;
}

export default function UpcomingMissions({
  missions,
  contentStatus,
  signedUpIds,
  onSignUp
}: UpcomingMissionsProps) {

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h3 className="font-display font-bold text-2xl sm:text-3xl tracking-tighter text-white">
            Upcoming Events
          </h3>
          <p className="text-xs text-zinc-400 mt-1 font-sans">Join our local sessions!</p>
        </div>

        {/* Quick status badge */}
        {signedUpIds.length > 0 && (
          <div className="text-[10px] px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 font-mono font-bold tracking-widest uppercase flex items-center gap-1.5 text-zinc-300">
            <Ticket className="w-3.5 h-3.5 text-amber-500" />
            <span>Signed up for {signedUpIds.length} of {missions.length} events</span>
          </div>
        )}
      </div>

      {missions.length === 0 && (
        <div className="rounded-[2rem] border border-white/10 bg-zinc-900/40 px-8 py-14 text-center space-y-3">
          <CalendarOff className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="font-display font-bold text-lg text-white">No events scheduled right now</p>
          <p className="text-xs text-zinc-500 font-sans max-w-sm mx-auto leading-relaxed">
            {contentStatus === 'loading'
              ? 'Loading the latest schedule…'
              : 'Check back soon — new sessions are added regularly.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {missions.map((mission) => {
          const isReserved = signedUpIds.includes(mission.id);
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
                      : 'bg-emerald-500/90 text-stone-950'
                    }`}>
                    {isSoldOut ? 'Sold Out' : `${spotsLeft} spots left`}
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

                {/* Sign-up control */}
                <div className="pt-2">
                  {isReserved ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-1.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 fill-emerald-950" />
                        <span>You're signed up ✔</span>
                      </div>
                      <button
                        id={`mission-signup-again-btn-${mission.id}`}
                        onClick={() => onSignUp(mission)}
                        disabled={isSoldOut}
                        className="w-full py-1 text-center text-[10px] font-mono text-zinc-400 hover:text-white uppercase tracking-widest cursor-pointer hover:underline disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline"
                      >
                        Sign up another student
                      </button>
                    </div>
                  ) : (
                    <button
                      id={`mission-reserve-btn-${mission.id}`}
                      onClick={() => onSignUp(mission)}
                      disabled={isSoldOut}
                      className="w-full py-2 px-4 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-xs transition-all duration-200 hover:scale-[1.01] active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-emerald-500 text-stone-950 hover:bg-emerald-400"
                    >
                      {isSoldOut ? 'No Spots Remaining' : 'Sign Up for This Event'}
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
