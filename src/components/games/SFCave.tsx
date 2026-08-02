import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Play, Flashlight, Trophy } from 'lucide-react';

/**
 * SF Cave
 * -------
 * A faithful clone of the classic: hold to fire a thruster, let go to fall.
 * Two constant accelerations — gravity down, thrust up harder — are the
 * entire game, no steering. The cave is generated on the fly, forever, and
 * gets narrower and faster the further you get, so unlike the site's other
 * puzzle games there is no "solved" state, only how far you got. Distance
 * milestones stand in for levels so it can still hook into the same XP/badge
 * plumbing every other game uses.
 */

const WORLD_W = 800;
const WORLD_H = 460;

const SHIP_X = 160;
/** Half-extent of the flat square ship, matching the original's blocky look. */
const SHIP_R = 6;

/** Constant downward pull, every frame, whether or not the player is holding. */
const GRAVITY = 0.26;
/** Added upward accel while held. Bigger than GRAVITY so holding wins the tug-of-war. */
const THRUST = 0.58;
const MAX_VSPEED = 6.2;
/** Sub-steps per rendered frame so a fast fall can't tunnel through a thin wall. */
const SUBSTEPS = 4;

/** World-space spacing between random-walk cave samples. */
const STEP_X = 20;
/** Kept off the very top/bottom of the canvas so a wall never touches the edge. */
const WALL_MARGIN = 24;
/** How far past the ship the cave must already exist before it's extended. */
const GEN_LOOKAHEAD = WORLD_W + 200;

/** Distance thresholds that stand in for "levels" — crossing one in a single
 *  run unlocks its badge, same as solving a level does in every other game. */
const MILESTONES = [800, 2000, 4000, 7000, 12000];

/** Gap, turniness and scroll speed all ramp with distance and then plateau —
 *  the cave never actually ends, it just stops getting harder. */
function gapForDistance(d: number): number {
  return Math.max(92, 190 - d / 45);
}
function turnForDistance(d: number): number {
  return Math.min(24, 8 + d / 260);
}
function speedForDistance(d: number): number {
  return Math.min(4.8, 2.2 + d / 2600);
}

type Phase = 'ready' | 'flying' | 'crashed';

interface Vec {
  x: number;
  y: number;
}

/** Extends the cave centerline in place, up to (at least) `uptoX`. Called every
 *  frame — the array only ever grows, so generation has no fixed end. */
function extendCave(centers: number[], rng: () => number, uptoX: number) {
  let idx = centers.length - 1;
  while (idx * STEP_X < uptoX) {
    idx++;
    const d = idx * STEP_X;
    const halfGap = gapForDistance(d) / 2;
    const minCenter = halfGap + WALL_MARGIN;
    const maxCenter = WORLD_H - halfGap - WALL_MARGIN;
    const delta = (rng() - 0.5) * 2 * turnForDistance(d);
    const next = Math.min(maxCenter, Math.max(minCenter, centers[idx - 1] + delta));
    centers.push(next);
  }
}

/** Cave centerline at an arbitrary world x, linearly interpolated between samples. */
function centerAt(worldX: number, centers: number[]): number {
  const idx = Math.max(0, Math.floor(worldX / STEP_X));
  const frac = (worldX - idx * STEP_X) / STEP_X;
  const a = centers[Math.min(idx, centers.length - 1)];
  const b = centers[Math.min(idx + 1, centers.length - 1)];
  return a + (b - a) * frac;
}

const BEST_KEY = 'tr_sc_cave_best';

interface SFCaveProps {
  /** Milestone indices already reached in some past run, owned by the app. */
  solvedLevels: number[];
  onSolve: (levelIndex: number) => void;
}

export default function SFCave({ solvedLevels, onSolve }: SFCaveProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>('ready');
  const [attempts, setAttempts] = useState(0);
  const [distance, setDistance] = useState(0);
  const [best, setBest] = useState(() => {
    const saved = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(saved) ? saved : 0;
  });
  const [note, setNote] = useState<string | null>(null);

  // Mutable simulation state lives in refs — React state at 60fps would thrash.
  const yRef = useRef(WORLD_H / 2);
  const vyRef = useRef(0);
  const scrollRef = useRef(0);
  const holdingRef = useRef(false);
  const phaseRef = useRef<Phase>('ready');
  const centersRef = useRef<number[]>([WORLD_H / 2]);
  const rngRef = useRef<() => number>(Math.random);
  const trailRef = useRef<Vec[]>([]);
  const crossedRef = useRef<Set<number>>(new Set());

  const setPhaseSynced = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const resetFlight = useCallback(() => {
    yRef.current = WORLD_H / 2;
    vyRef.current = 0;
    scrollRef.current = 0;
    holdingRef.current = false;
    centersRef.current = [WORLD_H / 2];
    rngRef.current = Math.random;
    extendCave(centersRef.current, rngRef.current, GEN_LOOKAHEAD);
    trailRef.current = [];
    crossedRef.current = new Set();
    setDistance(0);
    setNote(null);
    setPhaseSynced('ready');
  }, [setPhaseSynced]);

  // Only on mount — resetFlight is a stable useCallback and is called again
  // directly (not through this effect) on every subsequent restart.
  useEffect(() => {
    resetFlight();
  }, [resetFlight]);

  // ---------------------------------------------------------------- rendering

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const centers = centersRef.current;
    if (!canvas || !ctx || centers.length === 0) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    const scroll = scrollRef.current;
    const sampleStep = 6;

    // Flat, unshaded walls — the classic look, just recoloured to the site's
    // palette. The boundary drawn is exactly the boundary that kills you.
    ctx.fillStyle = '#e7e5e4';

    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let sx = 0; sx <= WORLD_W; sx += sampleStep) {
      const c = centerAt(scroll + sx, centers);
      ctx.lineTo(sx, c - gapForDistance(scroll + sx) / 2);
    }
    ctx.lineTo(WORLD_W, 0);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, WORLD_H);
    for (let sx = 0; sx <= WORLD_W; sx += sampleStep) {
      const c = centerAt(scroll + sx, centers);
      ctx.lineTo(sx, c + gapForDistance(scroll + sx) / 2);
    }
    ctx.lineTo(WORLD_W, WORLD_H);
    ctx.closePath();
    ctx.fill();

    // Motion trail — a faint line of where the ship has actually been.
    const trail = trailRef.current;
    if (trail.length > 1) {
      ctx.beginPath();
      let started = false;
      for (const p of trail) {
        const sx = p.x - scroll;
        if (sx < -20 || sx > WORLD_W + 20) continue;
        if (!started) {
          ctx.moveTo(sx, p.y);
          started = true;
        } else {
          ctx.lineTo(sx, p.y);
        }
      }
      ctx.strokeStyle = 'rgba(251,191,36,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // The ship itself — a flat square, same as the original.
    const shipY = yRef.current;
    ctx.fillStyle = phaseRef.current === 'crashed' ? '#ef4444' : '#fbbf24';
    ctx.fillRect(SHIP_X - SHIP_R, shipY - SHIP_R, SHIP_R * 2, SHIP_R * 2);

    // Score, drawn directly on the playfield like the original's HUD.
    ctx.fillStyle = '#e7e5e4';
    ctx.font = '600 20px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(`${Math.round(scrollRef.current)}`, 16, 14);
    if (best > 0) {
      ctx.font = '600 12px monospace';
      ctx.fillStyle = 'rgba(231,229,228,0.55)';
      ctx.fillText(`best ${best}`, 16, 40);
    }
  }, [best]);

  // --------------------------------------------------------------- simulation

  const step = useCallback(() => {
    if (phaseRef.current !== 'flying') return;
    const centers = centersRef.current;

    for (let i = 0; i < SUBSTEPS; i++) {
      const accel = holdingRef.current ? GRAVITY - THRUST : GRAVITY;
      vyRef.current = Math.max(-MAX_VSPEED, Math.min(MAX_VSPEED, vyRef.current + accel));
      yRef.current += vyRef.current;

      const speed = speedForDistance(scrollRef.current);
      scrollRef.current += speed / SUBSTEPS;
      extendCave(centers, rngRef.current, scrollRef.current + GEN_LOOKAHEAD);

      const worldX = scrollRef.current + SHIP_X;
      const c = centerAt(worldX, centers);
      const gap = gapForDistance(worldX);
      const top = c - gap / 2;
      const bottom = c + gap / 2;

      if (yRef.current - SHIP_R < top || yRef.current + SHIP_R > bottom) {
        setBest((prevBest) => {
          const finalDistance = Math.round(scrollRef.current);
          if (finalDistance > prevBest) {
            localStorage.setItem(BEST_KEY, String(finalDistance));
            return finalDistance;
          }
          return prevBest;
        });
        setNote(
          "Gravity never paused while you were deciding — the wall you hit is just where the tug-of-war between it and your thruster landed. Letting go doesn't hold your altitude, it hands the acceleration straight back to gravity."
        );
        setPhaseSynced('crashed');
        return;
      }

      trailRef.current.push({ x: worldX, y: yRef.current });
      if (trailRef.current.length > 240) trailRef.current.shift();

      MILESTONES.forEach((m, idx) => {
        if (scrollRef.current >= m && !crossedRef.current.has(idx)) {
          crossedRef.current.add(idx);
          onSolve(idx);
          setNote(
            'The cave keeps narrowing and the scroll keeps speeding up as you go — the same two accelerations are just doing more work in less space, which is why later stretches feel so much twitchier than this one did.'
          );
        }
      });
    }

    setDistance(Math.round(scrollRef.current));
  }, [onSolve, setPhaseSynced]);

  useEffect(() => {
    const loop = () => {
      step();
      draw();
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [step, draw]);

  // ------------------------------------------------------------------- input

  // Launching and thrusting are the same gesture, but only from 'ready' — a
  // 'crashed' ship must go through the "Try again" button first. Otherwise a
  // click on that button (down+up on the button, never on the canvas) would
  // set holdingRef true with no matching release, leaving the ship thrusting
  // forever with nothing held down.
  const startOrThrust = useCallback(() => {
    if (phaseRef.current === 'crashed') return;
    if (phaseRef.current === 'ready') {
      setAttempts((n) => n + 1);
      setPhaseSynced('flying');
    }
    holdingRef.current = true;
  }, [setPhaseSynced]);

  const releaseThrust = useCallback(() => {
    holdingRef.current = false;
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      startOrThrust();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      releaseThrust();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [startOrThrust, releaseThrust]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startOrThrust();
  };

  return (
    <div className="space-y-4">
      {/* Milestones reached across any past run — informational, not selectable. */}
      <div className="flex flex-wrap items-center gap-2">
        {MILESTONES.map((m, i) => (
          <span
            key={m}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono border flex items-center gap-1.5 ${solvedLevels.includes(i)
              ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
              : 'bg-white/5 border-white/10 text-zinc-500'
              }`}
          >
            {solvedLevels.includes(i) && <Trophy className="w-3 h-3 text-amber-400" />}
            {m}px
          </span>
        ))}
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed font-sans">
        Hold anywhere to thrust up, let go to fall. Gravity never stops pulling — you are always
        accelerating one way or the other, never just coasting level. The cave generates forever
        and gets narrower and faster the further you get; there's no end to reach, only a
        distance to beat.
      </p>
      {note && <p className="text-xs text-zinc-400 leading-relaxed font-sans">{note}</p>}

      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black">
        <canvas
          ref={canvasRef}
          width={WORLD_W}
          height={WORLD_H}
          onPointerDown={handlePointerDown}
          onPointerUp={releaseThrust}
          onPointerCancel={releaseThrust}
          onPointerLeave={releaseThrust}
          className="w-full block touch-none cursor-pointer"
        />

        {phase === 'crashed' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-center px-6">
            <h4 className="font-display font-bold text-xl text-red-400">Ship lost</h4>
            <p className="text-xs text-zinc-300 font-mono">
              Distance: {distance}px {distance >= best && distance > 0 ? '— new best!' : `(best ${best}px)`}
            </p>
            <button
              onClick={resetFlight}
              className="px-5 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-xs font-bold text-stone-950 cursor-pointer transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Try again
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-zinc-400">
        <span className="flex items-center gap-1.5">
          {phase === 'ready' ? (
            <>
              <Flashlight className="w-3.5 h-3.5 text-amber-400" />
              Hold (or press Space) to launch and thrust
            </>
          ) : phase === 'flying' ? (
            <>
              <Play className="w-3.5 h-3.5 text-sky-400" />
              Distance: {distance}px
            </>
          ) : (
            <span>&nbsp;</span>
          )}
        </span>
        <span>Attempts: {attempts}</span>
      </div>
    </div>
  );
}
