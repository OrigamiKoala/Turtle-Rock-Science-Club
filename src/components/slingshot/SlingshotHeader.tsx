import React from 'react';
import { UserProfile } from '../../types';
import TurtleRockLogo from '../TurtleRockLogo';
import { Trophy, ArrowLeft, RotateCcw } from 'lucide-react';
import { STAGES } from './stages';

interface SlingshotHeaderProps {
  onNavigateHome: () => void;
  userProfile: UserProfile;
  onOpenJoin: () => void;
  onOpenLogin: () => void;
  activeStageIndex: number;
  onSelectStage: (index: number) => void;
  completedStages: string[];
  onResetStage: () => void;
}

export default function SlingshotHeader({
  onNavigateHome,
  userProfile,
  onOpenJoin,
  onOpenLogin,
  activeStageIndex,
  onSelectStage,
  completedStages,
  onResetStage
}: SlingshotHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0d0d12]/90 text-zinc-100 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">

          {/* Left: Brand + Back to Site Link */}
          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <button
              id="slingshot-logo-btn"
              onClick={onNavigateHome}
              className="flex items-center gap-2.5 group cursor-pointer text-left"
              title="Return to Turtle Rock Science Club Home"
            >
              <TurtleRockLogo size={38} hideText={true} className="shrink-0 -my-1" />
              <div className="hidden xs:block">
                <h1 className="font-display font-bold text-sm sm:text-base leading-tight tracking-tight text-zinc-100">
                  Turtle Rock
                </h1>
                <p className="text-[10px] sm:text-[11px] font-display font-bold tracking-wide text-[#6CC24A]">
                  Gravity Slingshot
                </p>
              </div>
            </button>

            <span className="hidden sm:inline-block h-5 w-px bg-white/15" />

            <button
              id="slingshot-back-btn"
              onClick={onNavigateHome}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-display font-bold transition-all border border-white/15 text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Back to Club Website</span>
              <span className="md:hidden">Back</span>
            </button>
          </div>

          {/* Center: Stage Pills */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 max-w-[50vw]">
            {STAGES.map((stage, idx) => {
              const isActive = idx === activeStageIndex;
              const isCompleted = completedStages.includes(stage.id);

              return (
                <button
                  key={stage.id}
                  onClick={() => onSelectStage(idx)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1 ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : isCompleted
                      ? 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 border border-emerald-500/20'
                      : 'bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800/60 border border-white/5'
                  }`}
                >
                  <span>{stage.number === 5 ? 'Sandbox' : `S${stage.number}`}</span>
                  {isCompleted && stage.number !== 5 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              );
            })}

            <button
              onClick={onResetStage}
              title="Reset current stage"
              className="p-1 sm:p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition border border-white/10 shrink-0 cursor-pointer ml-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: User Profile / Auth */}
          <div className="flex items-center gap-2 shrink-0">
            {userProfile.level > 0 ? (
              <div className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full text-xs font-mono bg-zinc-900 border border-white/10 text-zinc-200">
                <div className="w-6 h-6 rounded-full text-[#14351F] flex items-center justify-center font-display font-bold text-[11px] uppercase bg-[#6CC24A]">
                  {userProfile.name[0].toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="font-bold leading-none text-zinc-100 text-[11px]">{userProfile.name}</p>
                  <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                    <Trophy className="w-2.5 h-2.5 text-[#F2C94C]" />
                    Lvl {userProfile.level}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenLogin}
                  className="px-2.5 py-1 rounded-full text-xs font-display font-bold border border-white/15 text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  Log In
                </button>
                <button
                  onClick={onOpenJoin}
                  className="px-3 py-1.5 rounded-full text-xs font-display font-bold bg-[#6CC24A] text-[#14351F] hover:brightness-105 shadow-[0_2px_0_#4C9A3A] cursor-pointer"
                >
                  Join
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
