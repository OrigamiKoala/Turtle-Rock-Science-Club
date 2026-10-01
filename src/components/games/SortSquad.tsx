import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import { PUZZLES } from './sortsquad/logic';
import { Pill, READOUT } from './sortsquad/ui';
import { AfterPassPanel, CountPanel, IdentifyPanel, MovesPanel, RacePanel, WorstPanel } from './sortsquad/puzzles';
import { HandSortPanel, WatchPanel } from './sortsquad/FreePlay';

interface SortSquadProps {
  solvedLevels: number[];
  onSolve: (levelIndex: number) => void;
}

type Mode = 'puzzles' | 'hand' | 'watch';

/**
 * Sort Squad. Page chrome (pills, hints, buttons) is ordinary React in the same style
 * as the sibling games; the only canvas is the row of bars (`sortsquad/stage.ts`).
 *
 * The ten Robot Puzzles are the only thing that pays XP, through the shell's usual
 * `onSolve(levelIndex)` → 10 + 5·index. Levels 0-4 are the original five and must
 * never be reordered (saved progress is stored by index); new levels are appended.
 */
export default function SortSquad({ solvedLevels, onSolve }: SortSquadProps) {
  const [mode, setMode] = useState<Mode>('puzzles');
  const [level, setLevel] = useState(() => {
    const next = PUZZLES.findIndex((_, i) => !solvedLevels.includes(i));   // land on the next unsolved puzzle
    return next === -1 ? 0 : next;
  });

  const solvedCount = PUZZLES.filter((_, i) => solvedLevels.includes(i)).length;
  const isLast = level === PUZZLES.length - 1;
  const goNext = () => setLevel((l) => Math.min(PUZZLES.length - 1, l + 1));

  const puzzle = PUZZLES[level];
  const common = { index: level, isLast, onSolve, onNext: goNext };
  let panel: React.ReactNode = null;
  if (mode === 'hand') panel = <HandSortPanel />;
  else if (mode === 'watch') panel = <WatchPanel />;
  else {
    /* `key` re-mounts the panel on a level change, so no state leaks between questions. */
    switch (puzzle.kind) {
      case 'identify':  panel = <IdentifyPanel key={level} puzzle={puzzle} {...common} />; break;
      case 'race':      panel = <RacePanel key={level} puzzle={puzzle} {...common} />; break;
      case 'afterPass': panel = <AfterPassPanel key={level} puzzle={puzzle} {...common} />; break;
      case 'count':     panel = <CountPanel key={level} puzzle={puzzle} {...common} />; break;
      case 'flip':
      case 'swapAny':   panel = <MovesPanel key={level} puzzle={puzzle} {...common} />; break;
      case 'worst':     panel = <WorstPanel key={level} puzzle={puzzle} {...common} />; break;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill active={mode === 'puzzles'} onClick={() => setMode('puzzles')}>
          Robot puzzles <span className="text-zinc-500">{solvedCount}/{PUZZLES.length}</span>
        </Pill>
        <Pill active={mode === 'hand'} onClick={() => setMode('hand')}>Sort by hand</Pill>
        <Pill active={mode === 'watch'} onClick={() => setMode('watch')}>Watch a robot</Pill>
        {mode !== 'puzzles' && <span className={READOUT}>Free play. Only the puzzles earn XP.</span>}
      </div>

      {mode === 'puzzles' && (
        <div className="flex flex-wrap items-center gap-2">
          {PUZZLES.map((p, i) => (
            <Pill key={p.title} active={i === level} onClick={() => setLevel(i)}>
              {solvedLevels.includes(i) && <Trophy className="w-3 h-3 text-amber-400" />}
              {i + 1}. {p.title}
            </Pill>
          ))}
        </div>
      )}

      {panel}
    </div>
  );
}
