import React, { useEffect, useRef } from 'react';
import { Trophy } from 'lucide-react';
import { createSortSquad } from './sortsquad/engine';
import { PUZZLES } from './sortsquad/logic';

interface SortSquadProps {
  solvedLevels: number[];
  onSolve: (levelIndex: number) => void;
}

/**
 * Thin React shell around the canvas engine in `./sortsquad/engine.ts` (which
 * owns all the game state — see the note at the top of that file).
 *
 * The engine is created once and outlives every render, so it must not close
 * over `onSolve` or `solvedLevels` directly: `VirtualLab` rebuilds `onSolve`
 * on every render, and re-running the effect on that would restart the game
 * the moment the XP update re-rendered the parent — right after a win. It
 * reads the latest values through refs instead.
 */
export default function SortSquad({ solvedLevels, onSolve }: SortSquadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onSolveRef = useRef(onSolve);
  const solvedRef = useRef(solvedLevels);
  useEffect(() => {
    onSolveRef.current = onSolve;
    solvedRef.current = solvedLevels;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createSortSquad(canvas, {
      onSolve: (levelIndex) => onSolveRef.current(levelIndex),
      getSolved: () => solvedRef.current
    });
    return () => engine.destroy();
  }, []);

  return (
    <div className="space-y-4">
      {/* Puzzles solved across any past visit. Informational, not selectable. */}
      <div className="flex flex-wrap items-center gap-2">
        {PUZZLES.map((p, i) => (
          <span
            key={p.title}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono border flex items-center gap-1.5 ${solvedLevels.includes(i)
              ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
              : 'bg-white/5 border-white/10 text-zinc-500'
              }`}
          >
            {solvedLevels.includes(i) && <Trophy className="w-3 h-3 text-amber-400" />}
            {i + 1}. {p.title}
          </span>
        ))}
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed font-sans">
        The Robot Puzzles are the thinking part: work out which hidden robot is sorting from nothing
        but what it does, or predict which one finishes fastest on a tricky list. They earn XP.
        Sorting by hand and watching a robot are free play.
      </p>

      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d12]">
        <canvas
          ref={canvasRef}
          width={1000}
          height={650}
          tabIndex={0}
          aria-label="Sort Squad, a sorting-algorithm game drawn on a canvas. Use a mouse or touch."
          style={{ aspectRatio: '1000 / 650' }}
          className="w-full block touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/60"
        />
      </div>

      <p className="text-[11px] font-mono text-zinc-500">
        Tip: click the game once, then press Esc to go back a screen.
        <span className="sm:hidden"> On a phone, turn it sideways for a bigger board.</span>
      </p>
    </div>
  );
}
