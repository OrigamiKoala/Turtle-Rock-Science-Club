import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Play, Flashlight, Trophy } from 'lucide-react';

/**
 * SF Cave
 * -------
 * A port of the original's actual logic, not just its vibe. The real game
 * (see e.g. github.com/yuzawa-san/sfcave2, a faithful HTML5 port) ticks at a
 * fixed 75ms — not 60fps — and every tick either does `velocity--` (holding)
 * or `velocity++` (not holding), clamped to ±8, position += velocity. That's
 * it: perfectly symmetric gravity and thrust, no separate "stronger thrust"
 * constant, and no sub-stepping. Only the cave's gap narrows over time
 * (checked every 10 ticks); scroll speed and turn sharpness never ramp.
 * Everything below is that same tick, scaled to our larger canvas.
 */

const WORLD_W = 800;
const WORLD_H = 460;
/** A dedicated HUD strip at the bottom, same as the original's separate score
 *  bar below the cave — score text needs guaranteed contrast, which reading it
 *  directly off the (color-shifting) playfield can't promise. */
const HUD_H = 30;
const PLAY_H = WORLD_H - HUD_H;

const SHIP_X = 160;
const SHIP_R = 8;

/** One game tick, matching the original's `window.setInterval(drawFrame, 75)`
 *  exactly — the coarse, deliberate cadence is a real part of the feel. */
const TICK_MS = 75;

/** World-px width of one generated cave column — also, deliberately, the
 *  velocity clamp below. The original enforces the same equality (its column
 *  width and velocity clamp are both exactly 8): it's what guarantees the
 *  ship can never cross an entire column — and so skip past a wall — in a
 *  single tick, without needing sub-step collision checks. */
const STEP_X = 12;
const VELOCITY_CLAMP = STEP_X;
/** The original's clamp is always 8x its per-tick accel (8 and 1) — same
 *  ratio here, so it still takes exactly 8 ticks (600ms) to reach top speed
 *  in either direction. */
const ACCEL = VELOCITY_CLAMP / 8;

const WALL_MARGIN = 16;
/** Gap the run starts at, and how much it loses every 10 ticks — both scaled
 *  from the original's 260-start/300-tall playfield to ours. There is no
 *  floor beyond a render-safety clamp: like the original, the cave truly can
 *  narrow past what's passable, so every run ends eventually. */
const CAVE_GAP_INITIAL = 370;
const CAVE_GAP_SHRINK_STEP = 1.5;
const CAVE_GAP_SHRINK_EVERY = 10;
const CAVE_GAP_FLOOR = 4;
/** Same 10% reroll chance as the original, so a turn holds for several
 *  columns in a row instead of zigzagging every single one. */
const CAVE_DELTA_REROLL_CHANCE = 0.1;
const CAVE_DELTA_SCALE = 1.4;

/** Free-floating obstacle blocks inside the open gap — the "mines" from the
 *  original PalmOS SF Cave, not just top/bottom walls. Sized from its 32px
 *  block in a 300-tall playfield. The original spawns one on the exact same
 *  every-10-tick beat as the gap shrink, but its 256px-wide canvas only ever
 *  shows ~3 columns' worth of blocks at once (32 visible columns / 10); at
 *  our much wider 800px canvas, the same 10-tick period would show roughly
 *  twice as many blocks on screen simultaneously as the original ever did.
 *  Spawning every other beat instead — still on-beat with the shrink, just
 *  half as often — keeps it visually at ~3 blocks per screen, matching what
 *  the original actually looked like rather than its literal tick count. */
const BLOCK_SPAWN_EVERY = CAVE_GAP_SHRINK_EVERY * 2;
const BLOCK_H = 45;
const BLOCK_COLOR = '#f97316';

const INITIAL_COLUMNS = Math.ceil(WORLD_W / STEP_X) + 4;
/** How many ticks the death ring animation plays before auto-returning to
 *  "ready" — matching the original's fixed 15-tick death screen. */
const DEATH_TICKS = 15;
const DEATH_RING_STEP = 9;

/** Distance thresholds that stand in for "levels" — crossing one in a single
 *  run unlocks its badge, same as solving a level does in every other game. */
const MILESTONES = [800, 2000, 4000, 7000, 12000];

type Phase = 'ready' | 'flying' | 'crashed';

interface Vec {
  x: number;
  y: number;
}

/** All state needed to keep generating cave columns forever. One column is
 *  appended per tick while flying — never precomputed to some fixed end. */
interface CaveGen {
  tops: number[];
  gaps: number[];
  /** Top y of a mid-gap obstacle block in this column, or -1 for none —
   *  the original's `gameMatrix[2][col]`. */
  blocks: number[];
  /** Current per-column drift; persists across many columns, like the
   *  original's `caveDelta`, instead of rerolling every single column. */
  delta: number;
  gapValue: number;
}

function freshCaveGen(): CaveGen {
  return { tops: [], gaps: [], blocks: [], delta: 0, gapValue: CAVE_GAP_INITIAL };
}

/** Appends exactly one more column, mutating `gen` in place. */
function genNextColumn(gen: CaveGen) {
  const columnsSoFar = gen.tops.length;
  const shrinkTick = columnsSoFar > 0 && columnsSoFar % CAVE_GAP_SHRINK_EVERY === 0;
  const blockTick = columnsSoFar > 0 && columnsSoFar % BLOCK_SPAWN_EVERY === 0;
  if (shrinkTick) {
    gen.gapValue = Math.max(CAVE_GAP_FLOOR, gen.gapValue - CAVE_GAP_SHRINK_STEP);
  }
  if (Math.random() < CAVE_DELTA_REROLL_CHANCE) {
    gen.delta = (Math.random() * 10 - 5) * CAVE_DELTA_SCALE;
  }

  const prevTop = gen.tops.length > 0 ? gen.tops[gen.tops.length - 1] : (PLAY_H - gen.gapValue) / 2;
  let nextTop = prevTop + gen.delta;
  const minTop = WALL_MARGIN;
  const maxTop = PLAY_H - WALL_MARGIN - gen.gapValue;
  // Bounce off the edges rather than clamp-and-stick — same as the original,
  // which flips caveDelta's sign on hitting a bound instead of freezing it
  // there while delta keeps pointing further into the wall.
  if (nextTop < minTop) {
    nextTop = minTop;
    gen.delta = Math.abs(gen.delta);
  } else if (nextTop > maxTop) {
    nextTop = maxTop;
    gen.delta = -Math.abs(gen.delta);
  }

  gen.tops.push(nextTop);
  gen.gaps.push(gen.gapValue);

  // Placed anywhere in the gap that leaves it fully inside — same
  // `Math.random() * (caveHeight - 32) + caveTop` formula as the original,
  // just guarded against a gap that's already narrower than the block
  // (the original doesn't guard this, so a late-game block could poke past
  // the wall it's next to).
  gen.blocks.push(blockTick && gen.gapValue > BLOCK_H ? nextTop + Math.random() * (gen.gapValue - BLOCK_H) : -1);
}

const BEST_KEY = 'tr_sc_cave_best';

const WALL_COLOR = '#2E7D46';
const BG_COLOR = '#FBF7EC';
const HUD_COLOR = '#1F3A42';
const HUD_TEXT = '#FBF7EC';
const SHIP_COLOR = '#fbbf24';
const CRASH_COLOR = '#ef4444';

interface SFCaveProps {
  /** Milestone indices already reached in some past run, owned by the app. */
  solvedLevels: number[];
  onSolve: (levelIndex: number) => void;
}

export default function SFCave({ solvedLevels, onSolve }: SFCaveProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [phase, setPhase] = useState<Phase>('ready');
  const [attempts, setAttempts] = useState(0);
  const [distance, setDistance] = useState(0);
  const [best, setBest] = useState(() => {
    const saved = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(saved) ? saved : 0;
  });
  const [note, setNote] = useState<string | null>(null);

  // Mutable simulation state lives in refs — a 13Hz interval still shouldn't
  // fight React's render cycle for it.
  const yRef = useRef(PLAY_H / 2);
  const vyRef = useRef(0);
  const scrollRef = useRef(0);
  /** Physical hold state, driven only by pointer/key events — polled once per
   *  tick, exactly like the original's global `down` boolean, rather than
   *  triggering a transition directly from the input handler. That polling
   *  is what lets a hold that's still down when a run ends (or begins) just
   *  keep working next tick with no extra click required. */
  const holdingRef = useRef(false);
  const phaseRef = useRef<Phase>('ready');
  const caveGenRef = useRef<CaveGen>(freshCaveGen());
  const trailRef = useRef<Vec[]>([]);
  const crossedRef = useRef<Set<number>>(new Set());
  const deathTickRef = useRef(0);

  const setPhaseSynced = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  /** Back to the idle screen. Explicitly zeroes `holdingRef` — the original
   *  does the same (`down = false`) the instant it returns to the start
   *  screen, so a mouse button held through the whole death animation does
   *  NOT auto-relaunch; a fresh press is always required. Deliberately does
   *  NOT clear `note` — the last crash's commentary should stay legible
   *  through the ready screen and into the next run, not flash by and
   *  vanish the instant the death animation ends; it's only replaced by the
   *  next crash or milestone. */
  const resetFlight = useCallback(() => {
    yRef.current = PLAY_H / 2;
    vyRef.current = 0;
    scrollRef.current = 0;
    holdingRef.current = false;
    trailRef.current = [];
    deathTickRef.current = 0;
    setDistance(0);
    setPhaseSynced('ready');
  }, [setPhaseSynced]);

  const beginRun = useCallback(() => {
    const gen = freshCaveGen();
    for (let i = 0; i < INITIAL_COLUMNS; i++) genNextColumn(gen);
    caveGenRef.current = gen;
    yRef.current = gen.tops[0] + gen.gaps[0] / 2;
    vyRef.current = 0;
    scrollRef.current = 0;
    trailRef.current = [];
    crossedRef.current = new Set();
    setDistance(0);
    setAttempts((n) => n + 1);
    setPhaseSynced('flying');
  }, [setPhaseSynced]);

  useEffect(() => {
    resetFlight();
  }, [resetFlight]);

  // ---------------------------------------------------------------- rendering

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, WORLD_W, PLAY_H);

    const gen = caveGenRef.current;
    const scroll = scrollRef.current;
    const firstCol = Math.max(0, Math.floor(scroll / STEP_X));
    const lastCol = Math.min(gen.tops.length - 1, Math.ceil((scroll + WORLD_W) / STEP_X));

    // Flat, blocky columns — the original's actual look (solid rects per
    // column, not a smooth path), just with the wall/passable colors swapped.
    for (let col = firstCol; col <= lastCol; col++) {
      const screenX = col * STEP_X - scroll;
      const top = gen.tops[col];
      const bottom = top + gen.gaps[col];
      ctx.fillStyle = WALL_COLOR;
      ctx.fillRect(screenX, 0, STEP_X + 1, top);
      ctx.fillRect(screenX, bottom, STEP_X + 1, PLAY_H - bottom);

      const block = gen.blocks[col];
      if (block !== -1) {
        ctx.fillStyle = BLOCK_COLOR;
        ctx.fillRect(screenX, block, STEP_X + 1, BLOCK_H);
      }
    }

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
      ctx.strokeStyle = 'rgba(31,58,66,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // The ship — a flat square, same as the original's blocky sprite.
    const shipY = yRef.current;
    ctx.fillStyle = phaseRef.current === 'crashed' ? CRASH_COLOR : SHIP_COLOR;
    ctx.fillRect(SHIP_X - SHIP_R, shipY - SHIP_R, SHIP_R * 2, SHIP_R * 2);

    // Death ring — the original's expanding stroked circle from the crash
    // point, playing out over its fixed 15-tick death screen.
    if (phaseRef.current === 'crashed' && deathTickRef.current > 0) {
      ctx.beginPath();
      ctx.arc(SHIP_X, shipY, deathTickRef.current * DEATH_RING_STEP, 0, Math.PI * 2);
      ctx.strokeStyle = CRASH_COLOR;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Dedicated HUD strip, same as the original's separate score bar.
    ctx.fillStyle = HUD_COLOR;
    ctx.fillRect(0, PLAY_H, WORLD_W, HUD_H);
    ctx.fillStyle = HUD_TEXT;
    ctx.font = '600 14px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(`score: ${Math.round(scrollRef.current)}`, 12, PLAY_H + HUD_H / 2);
    if (best > 0) {
      ctx.textAlign = 'right';
      ctx.fillText(`best: ${best}`, WORLD_W - 12, PLAY_H + HUD_H / 2);
      ctx.textAlign = 'left';
    }
  }, [best]);

  // --------------------------------------------------------------- simulation

  const stepFlying = useCallback(() => {
    const accel = holdingRef.current ? -ACCEL : ACCEL;
    vyRef.current = Math.max(-VELOCITY_CLAMP, Math.min(VELOCITY_CLAMP, vyRef.current + accel));
    yRef.current += vyRef.current;

    scrollRef.current += STEP_X;
    const gen = caveGenRef.current;
    genNextColumn(gen);

    const colIndex = Math.min(gen.tops.length - 1, Math.floor((scrollRef.current + SHIP_X) / STEP_X));
    const top = gen.tops[colIndex];
    const bottom = top + gen.gaps[colIndex];
    const block = gen.blocks[colIndex];
    const hitBlock = block !== -1 && yRef.current + SHIP_R > block && yRef.current - SHIP_R < block + BLOCK_H;

    if (yRef.current - SHIP_R < top || yRef.current + SHIP_R > bottom || hitBlock) {
      setBest((prevBest) => {
        const finalDistance = Math.round(scrollRef.current);
        if (finalDistance > prevBest) {
          localStorage.setItem(BEST_KEY, String(finalDistance));
          return finalDistance;
        }
        return prevBest;
      });
      setNote(
        hitBlock
          ? "That block was just floating in otherwise-open cave — the same gravity/thrust tug-of-war applies whether what you're dodging is a wall or something in between the walls. More obstacles doesn't change the physics, just how much room you have to work with."
          : "Gravity and thrust are perfectly symmetric here — every tick either adds or subtracts the exact same amount from your velocity. The wall you hit is just where that back-and-forth landed; there's no separate 'stronger' force doing the actual killing."
      );
      deathTickRef.current = 0;
      setPhaseSynced('crashed');
      return;
    }

    trailRef.current.push({ x: scrollRef.current + SHIP_X, y: yRef.current });
    if (trailRef.current.length > 240) trailRef.current.shift();

    MILESTONES.forEach((m, idx) => {
      if (scrollRef.current >= m && !crossedRef.current.has(idx)) {
        crossedRef.current.add(idx);
        onSolve(idx);
        setNote(
          "The cave only ever narrows here — scroll speed and how sharply it turns both stay constant the whole run. One shrinking number is enough to guarantee every run ends eventually, no matter how good you get."
        );
      }
    });

    setDistance(Math.round(scrollRef.current));
  }, [onSolve, setPhaseSynced]);

  const tick = useCallback(() => {
    if (phaseRef.current === 'ready') {
      // Polled, not event-triggered — a hold that was already down when we
      // returned to 'ready' launches on the very next tick with no fresh
      // press needed, same as the original's `if(down){setState(1);}` check.
      if (holdingRef.current) beginRun();
    } else if (phaseRef.current === 'flying') {
      stepFlying();
    } else {
      deathTickRef.current++;
      if (deathTickRef.current >= DEATH_TICKS) resetFlight();
    }
    draw();
  }, [beginRun, stepFlying, resetFlight, draw]);

  useEffect(() => {
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [tick]);

  // ------------------------------------------------------------------- input

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      holdingRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      holdingRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    holdingRef.current = true;
  };
  const releaseThrust = () => {
    holdingRef.current = false;
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
        Hold anywhere to thrust up, let go to fall — gravity and thrust are perfectly symmetric, so
        the game is never fighting you unevenly. The cave generates forever and its gap only ever
        narrows; there's no end to reach, only a distance to beat. Watch for orange blocks floating
        in the open gap — they aren't walls, but they kill just the same.
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
          <div className="absolute top-2 right-2 flex items-center gap-2">
            <button
              onClick={resetFlight}
              className="px-3 py-1.5 rounded-full bg-sky-500 hover:bg-sky-400 text-[11px] font-bold text-stone-950 cursor-pointer transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" /> Skip to ready
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
            <span>
              Crashed at {distance}px {distance >= best && distance > 0 ? '— new best!' : `(best ${best}px)`} —
              back to ready shortly
            </span>
          )}
        </span>
        <span>Attempts: {attempts}</span>
      </div>
    </div>
  );
}
