import React from 'react';
import { Mission } from '../types';
import { ContentStatus } from '../useSiteContent';
import { Calendar, Clock, MapPin, Ticket, CalendarOff } from 'lucide-react';
import SafeHtml from './SafeHtml';

interface UpcomingMissionsProps {
  missions: Mission[];
  contentStatus: ContentStatus;
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
    <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h3 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-[#1F3A42]">
            Upcoming Events
          </h3>
          <p className="text-sm text-[#4B6169] mt-1 font-sans">Grab a spot before they fill up!</p>
        </div>

        {signedUpIds.length > 0 && (
          <div className="text-xs px-3.5 py-1.5 rounded-full border-2 border-[#1F3A42]/10 bg-white font-sans font-extrabold flex items-center gap-1.5 text-[#1F3A42]">
            <Ticket className="w-3.5 h-3.5 text-[#F2C94C]" />
            <span>Signed up for {signedUpIds.length} of {missions.length} events</span>
          </div>
        )}
      </div>

      {missions.length === 0 && (
        <div className="rounded-[2rem] border-2 border-[#1F3A42]/10 bg-white px-8 py-14 text-center space-y-3">
          <CalendarOff className="w-8 h-8 text-[#9AA6A6] mx-auto" />
          <p className="font-display font-bold text-lg text-[#1F3A42]">No events scheduled right now</p>
          <p className="text-xs text-[#4B6169] font-sans max-w-sm mx-auto leading-relaxed">
            {contentStatus === 'loading' ? 'Loading the latest schedule…' : 'Check back soon — new sessions are added regularly.'}
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
              className="rounded-[28px] overflow-hidden border-2 border-[#1F3A42]/8 bg-white transition-all duration-300 flex flex-col justify-between hover:border-[#1F3A42]/15 shadow-[0_8px_24px_rgba(31,58,66,0.06)]"
            >
              <div className="relative h-44 overflow-hidden border-b-2 border-[#1F3A42]/5">
                <img
                  src={mission.image}
                  alt={mission.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-display font-bold ${isSoldOut
                    ? 'bg-[#E4574B] text-white'
                    : spotsLeft < 5
                      ? 'bg-[#F2C94C] text-[#4A3900]'
                      : 'bg-[#6CC24A] text-[#14351F]'
                    }`}>
                    {isSoldOut ? 'Sold Out' : `${spotsLeft} spots left`}
                  </span>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-base leading-snug text-[#1F3A42]">
                    {mission.title}
                  </h4>
                  <SafeHtml content={mission.description} className="text-[13px] leading-relaxed text-[#4B6169] font-sans" />
                </div>

                <div className="space-y-1.5 pt-3.5 border-t-2 border-[#1F3A42]/8 text-[12px] font-sans font-bold text-[#4B6169]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#4B6169] shrink-0" />
                    <span>{mission.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#4B6169] shrink-0" />
                    <span>{mission.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#4B6169] shrink-0" />
                    <span className="truncate">{mission.location}</span>
                  </div>
                </div>

                <div className="pt-2">
                  {isReserved ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-1.5 py-1 text-[11px] font-display font-bold text-[#2E7D46]">
                        <span>You're signed up ✔</span>
                      </div>
                      <button
                        id={`mission-signup-again-btn-${mission.id}`}
                        onClick={() => onSignUp(mission)}
                        disabled={isSoldOut}
                        className="w-full py-1 text-center text-[11px] font-sans font-bold text-[#4B6169] hover:text-[#1F3A42] cursor-pointer hover:underline disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Sign up another student
                      </button>
                    </div>
                  ) : (
                    <button
                      id={`mission-reserve-btn-${mission.id}`}
                      onClick={() => onSignUp(mission)}
                      disabled={isSoldOut}
                      className="w-full py-2.5 px-4 rounded-full text-[12px] font-display font-bold transition-all duration-200 hover:scale-[1.01] active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-[#6CC24A] text-[#14351F] shadow-[0_3px_0_#4C9A3A] disabled:shadow-none"
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
