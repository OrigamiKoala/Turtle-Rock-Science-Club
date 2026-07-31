import React, { useCallback, useEffect, useState } from 'react';
import { UserProfile, GameId, GameProgress, EMPTY_GAME_PROGRESS } from '../types';
import OrbitalSlingshot from './games/OrbitalSlingshot';
import MoleculeBuilder from './games/MoleculeBuilder';
import RobotProgrammer from './games/RobotProgrammer';
import { Orbit, FlaskConical, Bot, Lock } from 'lucide-react';

interface VirtualLabProps {
  userProfile: UserProfile;
  onUpdateXp: (xpToAdd: number, badgeToUnlock?: string) => void;
}

const GAMES: {
  id: GameId;
  title: string;
  tagline: string;
  field: string;
  icon: typeof Orbit;
  accent: string;
  badge: string;
}[] = [
  {
    id: 'orbit',
    title: 'Orbital Slingshot',
    tagline:
      'Launch a probe and let gravity steer it. Real Newtonian physics — curve around planets, steal speed from a slingshot, reach the beacon.',
    field: 'Astronomy · Physics',
    icon: Orbit,
    accent: 'sky',
    badge: 'Navigator'
  },
  {
    id: 'molecule',
    title: 'Molecule Builder',
    tagline:
      'A modelling kit with real valences. Every atom must get exactly the bonds it wants — which is why CO₂ refuses to work with single bonds.',
    field: 'Chemistry',
    icon: FlaskConical,
    accent: 'red',
    badge: 'Chemist'
  },
  {
    id: 'robot',
    title: 'Robot Programmer',
    tagline:
      'Write the program first, then watch it run. The later mazes are too long for the main program — you will need a subroutine that calls itself.',
    field: 'Robotics · Computer Science',
    icon: Bot,
    accent: 'violet',
    badge: 'Engineer'
  }
];

const ACCENT_CLASSES: Record<string, { active: string; idle: string; text: string }> = {
  sky: {
    active: 'bg-sky-500/15 border-sky-500/40',
    idle: 'bg-white/[0.03] border-white/10 hover:border-sky-500/30',
    text: 'text-sky-400'
  },
  red: {
    active: 'bg-red-500/15 border-red-500/40',
    idle: 'bg-white/[0.03] border-white/10 hover:border-red-500/30',
    text: 'text-red-400'
  },
  violet: {
    active: 'bg-violet-500/15 border-violet-500/40',
    idle: 'bg-white/[0.03] border-white/10 hover:border-violet-500/30',
    text: 'text-violet-400'
  }
};

export default function VirtualLab({ userProfile, onUpdateXp }: VirtualLabProps) {
  const [activeGame, setActiveGame] = useState<GameId>('orbit');

  // Which levels of each game have been solved — drives both the level strip's
  // trophies and the once-per-level XP payout. Persisted so switching tabs
  // (which unmounts this component) doesn't forget any of it.
  const [gameProgress, setGameProgress] = useState<GameProgress>(() => {
    try {
      const saved = localStorage.getItem('tr_sc_game_progress');
      if (saved) return { ...EMPTY_GAME_PROGRESS, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Failed reading game progress from storage', e);
    }
    return EMPTY_GAME_PROGRESS;
  });

  useEffect(() => {
    localStorage.setItem('tr_sc_game_progress', JSON.stringify(gameProgress));
  }, [gameProgress]);

  const makeSolveHandler = useCallback(
    (gameId: GameId, badge: string) => (levelIndex: number) => {
      setGameProgress((prev) => {
        if (prev[gameId].includes(levelIndex)) return prev;
        // Later levels are harder, so they are worth more.
        onUpdateXp(10 + levelIndex * 5, badge);
        return { ...prev, [gameId]: [...prev[gameId], levelIndex] };
      });
    },
    [onUpdateXp]
  );

  const active = GAMES.find((g) => g.id === activeGame) as (typeof GAMES)[number];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-500">
          Virtual Lab
        </p>
        <h2 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight">
          Science Minigames
        </h2>
        <p className="text-sm text-zinc-400 font-sans max-w-2xl leading-relaxed">
          Three real puzzle games built on actual science — orbital mechanics, chemical bonding and
          programming logic. Each one has levels that get genuinely harder.
        </p>
      </div>

      {/* Game picker */}
      <div className="grid sm:grid-cols-3 gap-3">
        {GAMES.map((game) => {
          const Icon = game.icon;
          const isActive = game.id === activeGame;
          const accent = ACCENT_CLASSES[game.accent];

          return (
            <button
              key={game.id}
              id={`game-tab-${game.id}`}
              onClick={() => setActiveGame(game.id)}
              className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                isActive ? accent.active : accent.idle
              }`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <Icon className={`w-5 h-5 ${accent.text}`} />
                <h3 className="font-display font-bold text-sm text-white">{game.title}</h3>
              </div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">
                {game.field}
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">{game.tagline}</p>
            </button>
          );
        })}
      </div>

      {/* Active game */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
        {activeGame === 'orbit' && (
          <OrbitalSlingshot
            solvedLevels={gameProgress.orbit}
            onSolve={makeSolveHandler('orbit', 'Navigator')}
          />
        )}
        {activeGame === 'molecule' && (
          <MoleculeBuilder
            solvedLevels={gameProgress.molecule}
            onSolve={makeSolveHandler('molecule', 'Chemist')}
          />
        )}
        {activeGame === 'robot' && (
          <RobotProgrammer
            solvedLevels={gameProgress.robot}
            onSolve={makeSolveHandler('robot', 'Engineer')}
          />
        )}
      </div>

      {userProfile.level === 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
          <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            You can play everything as a guest. Join the club to bank Discovery XP for each level you
            solve and unlock the <strong className="text-white">{active.badge}</strong> badge.
          </p>
        </div>
      )}
    </section>
  );
}
