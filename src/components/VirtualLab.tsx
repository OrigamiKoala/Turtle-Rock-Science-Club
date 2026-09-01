import React, { useCallback, useEffect, useState } from 'react';
import { UserProfile, GameId, GameProgress, EMPTY_GAME_PROGRESS } from '../types';
import OrbitalSlingshot from './games/OrbitalSlingshot';
import MoleculeBuilder from './games/MoleculeBuilder';
import RobotProgrammer from './games/RobotProgrammer';
import ChemTextAdventure from './games/ChemTextAdventure';
import Lightbender from './games/Lightbender';
import ShortCircuit from './games/ShortCircuit';
import Epicenter from './games/Epicenter';
import CritterRanch from './games/CritterRanch';
import IslandKeeper from './games/IslandKeeper';
import StarlightDecoder from './games/StarlightDecoder';
import ReactorLine from './games/ReactorLine';
import SFCave from './games/SFCave';
import { Orbit, FlaskConical, Bot, ScrollText, Lock, Eye, Zap, Activity, Dna, Leaf, Telescope, Factory, Flashlight } from 'lucide-react';

interface VirtualLabProps {
  userProfile: UserProfile;
  onUpdateXp: (xpToAdd: number, badgeToUnlock?: string) => void;
}

const GAMES: { id: GameId; title: string; tagline: string; field: string; icon: typeof Orbit; badge: string }[] = [
  { id: 'orbit', title: 'Orbital Slingshot', tagline: 'Launch a probe and let gravity steer it around planets to reach the beacon.', field: 'Astronomy · Physics', icon: Orbit, badge: 'Navigator' },
  { id: 'molecule', title: 'Molecule Builder', tagline: 'A modelling kit with real valences — every atom needs exactly the right bonds.', field: 'Chemistry', icon: FlaskConical, badge: 'Chemist' },
  { id: 'robot', title: 'Robot Programmer', tagline: 'Write the program first, then watch it run the maze — subroutines needed for the hardest levels.', field: 'Robotics · CS', icon: Bot, badge: 'Engineer' },
  { id: 'optics', title: 'Lightbender', tagline: 'Ray-trace mirrors, lenses and prisms on a grid to steer a laser into its target.', field: 'Physics · Optics', icon: Eye, badge: 'Optician' },
  { id: 'circuit', title: 'Short Circuit', tagline: 'Wire a breadboard that solves for real — any topology you build, including a Wheatstone bridge.', field: 'Physics · Electronics', icon: Zap, badge: 'Sparky' },
  { id: 'seismo', title: 'Epicenter', tagline: 'Buy seismograph readings, trilaterate the epicenter, and estimate the magnitude.', field: 'Earth Science · Geophysics', icon: Activity, badge: 'Seismologist' },
  { id: 'genetics', title: 'Critter Ranch', tagline: 'Breed critters to fill genetic orders — Punnett squares, test crosses, and epistasis.', field: 'Biology · Genetics', icon: Dna, badge: 'Geneticist' },
  { id: 'ecology', title: 'Island Keeper', tagline: 'Keep a coupled predator-prey food web alive for 100 years without silencing your instincts.', field: 'Biology · Ecology', icon: Leaf, badge: 'Ecologist' },
  { id: 'spectra', title: 'Starlight Decoder', tagline: "Read a star's absorption lines to find its composition, temperature, and motion.", field: 'Astronomy · Spectroscopy', icon: Telescope, badge: 'Astrophysicist' },
  { id: 'reactor', title: 'Reactor Line', tagline: 'Balance equations and pipe reagents through a factory that obeys conservation of mass.', field: 'Chemistry · Math', icon: Factory, badge: 'Chemical Engineer' },
  { id: 'cave', title: 'SFCave', tagline: 'The original Flappy Bird, on Windows 3.1.', field: 'Physics · Reflexes', icon: Flashlight, badge: 'Spelunker' },
  { id: 'adventure', title: 'Chemistry Text Adventure', tagline: 'A choose-your-own-path chemistry story hosted on its own site.', field: 'Chemistry · Storytelling', icon: ScrollText, badge: 'Adventurer' }
];

export default function VirtualLab({ userProfile, onUpdateXp }: VirtualLabProps) {
  const [activeGame, setActiveGame] = useState<GameId>('orbit');

  const [gameProgress, setGameProgress] = useState<GameProgress>(() => {
    try {
      const saved = localStorage.getItem('tr_sc_game_progress');
      if (saved) return { ...EMPTY_GAME_PROGRESS, ...JSON.parse(saved) };
    } catch (e) { console.error('Failed reading game progress from storage', e); }
    return EMPTY_GAME_PROGRESS;
  });

  useEffect(() => { localStorage.setItem('tr_sc_game_progress', JSON.stringify(gameProgress)); }, [gameProgress]);

  const makeSolveHandler = useCallback(
    (gameId: GameId, badge: string) => (levelIndex: number) => {
      // The dedupe check now runs before the side effect, not inside the
      // setGameProgress updater — an updater function must stay pure, and
      // StrictMode's dev-mode double-invocation of updaters was double-firing
      // onUpdateXp (and the level-up/badge effects it triggers) the first
      // time a level was solved.
      if (gameProgress[gameId].includes(levelIndex)) return;
      onUpdateXp(10 + levelIndex * 5, badge);
      setGameProgress((prev) => {
        if (prev[gameId].includes(levelIndex)) return prev;
        return { ...prev, [gameId]: [...prev[gameId], levelIndex] };
      });
    },
    [onUpdateXp, gameProgress]
  );

  const active = GAMES.find((g) => g.id === activeGame) as (typeof GAMES)[number];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2">
        <p className="text-[11px] font-display font-bold text-[#4C9A3A]">Virtual Lab</p>
        <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#1F3A42] tracking-tight">Science Minigames</h2>
        <p className="text-sm text-[#4B6169] max-w-2xl leading-relaxed">
          A dozen mini-games based on science. Enjoy!
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {GAMES.map((game) => {
          const Icon = game.icon;
          const isActive = game.id === activeGame;
          return (
            <button key={game.id} id={`game-tab-${game.id}`} onClick={() => setActiveGame(game.id)}
              className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${isActive ? 'bg-[#E4F5DA] border-[#6CC24A]' : 'bg-white border-[#1F3A42]/8 hover:border-[#1F3A42]/15'}`}>
              <div className="flex items-center gap-2.5 mb-2">
                <Icon className="w-5 h-5 text-[#2E7D46]" />
                <h3 className="font-display font-bold text-sm text-[#1F3A42]">{game.title}</h3>
              </div>
              <p className="text-[10px] font-bold text-[#9AA6A6] mb-2">{game.field}</p>
              <p className="text-xs text-[#4B6169] leading-relaxed">{game.tagline}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-[28px] border-2 border-[#1F3A42]/8 bg-white p-5 sm:p-7">
        {activeGame === 'orbit' && <OrbitalSlingshot solvedLevels={gameProgress.orbit} onSolve={makeSolveHandler('orbit', 'Navigator')} />}
        {activeGame === 'molecule' && <MoleculeBuilder solvedLevels={gameProgress.molecule} onSolve={makeSolveHandler('molecule', 'Chemist')} />}
        {activeGame === 'robot' && <RobotProgrammer solvedLevels={gameProgress.robot} onSolve={makeSolveHandler('robot', 'Engineer')} />}
        {activeGame === 'optics' && <Lightbender solvedLevels={gameProgress.optics} onSolve={makeSolveHandler('optics', 'Optician')} />}
        {activeGame === 'circuit' && <ShortCircuit solvedLevels={gameProgress.circuit} onSolve={makeSolveHandler('circuit', 'Sparky')} />}
        {activeGame === 'seismo' && <Epicenter solvedLevels={gameProgress.seismo} onSolve={makeSolveHandler('seismo', 'Seismologist')} />}
        {activeGame === 'genetics' && <CritterRanch solvedLevels={gameProgress.genetics} onSolve={makeSolveHandler('genetics', 'Geneticist')} />}
        {activeGame === 'ecology' && <IslandKeeper solvedLevels={gameProgress.ecology} onSolve={makeSolveHandler('ecology', 'Ecologist')} />}
        {activeGame === 'spectra' && <StarlightDecoder solvedLevels={gameProgress.spectra} onSolve={makeSolveHandler('spectra', 'Astrophysicist')} />}
        {activeGame === 'reactor' && <ReactorLine solvedLevels={gameProgress.reactor} onSolve={makeSolveHandler('reactor', 'Chemical Engineer')} />}
        {activeGame === 'cave' && <SFCave solvedLevels={gameProgress.cave} onSolve={makeSolveHandler('cave', 'Spelunker')} />}
        {activeGame === 'adventure' && <ChemTextAdventure solvedLevels={gameProgress.adventure} onSolve={makeSolveHandler('adventure', 'Adventurer')} />}
      </div>

      {userProfile.level === 0 && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-[#1F3A42]/8 bg-white px-5 py-4">
          <Lock className="w-4 h-4 text-[#F2C94C] shrink-0 mt-0.5" />
          <p className="text-xs text-[#4B6169] leading-relaxed">
            You can play everything as a guest. Join the club to bank Discovery XP for each level you
            solve and unlock the <strong className="text-[#1F3A42]">{active.badge}</strong> badge.
          </p>
        </div>
      )}
    </section>
  );
}
