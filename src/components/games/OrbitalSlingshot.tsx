import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Play, ChevronRight, Rocket, Trophy } from 'lucide-react';

/**
 * Orbital Slingshot
 * -----------------
 * Aim a probe and let gravity do the steering. Every planet pulls on the probe
 * with an inverse-square force, so the winning shot is almost never a straight
 * line at the target — you learn to curve around a mass, or to fall into a
 * slingshot that whips you sideways.
 *
 * The physics is a real Newtonian integration, not a scripted animation.
 */

const WORLD_W = 800;
const WORLD_H = 500;

/** Tuned so a mid-sized planet visibly bends a mid-power shot. */
const GRAVITY_STRENGTH = 0.85;
/** Stops the 1/d² force exploding to infinity at the surface. */
const MIN_DISTANCE = 12;
const MAX_STEPS = 1400;
const MAX_LAUNCH_SPEED = 7;
/**
 * Below this the shot is a mis-click, not a launch. Firing it anyway strands the
 * probe crawling across the canvas for the full MAX_STEPS — about 23 seconds of
 * a game that will not accept input.
 */
const MIN_LAUNCH_SPEED = 0.6;

interface Planet {
  x: number;
  y: number;
  r: number;
  color: string;
  /** Purely cosmetic label shown on hover-free canvases. */
  name?: string;
}

interface Level {
  name: string;
  brief: string;
  start: { x: number; y: number };
  target: { x: number; y: number; r: number };
  planets: Planet[];
  /** Rings the probe must not touch — solar flares, debris fields. */
  hazards?: { x: number; y: number; r: number }[];
}

const LEVELS: Level[] = [
  {
    name: 'First Contact',
    brief:
      'Get a feel for the launcher. Drag from the probe toward the beacon and let go. The further you drag, the faster it flies.',
    start: { x: 90, y: 250 },
    target: { x: 690, y: 250, r: 26 },
    planets: []
  },
  {
    name: 'The Bend',
    brief:
      'A planet sits between you and the beacon. Aim off to one side and let its gravity pull you back in.',
    start: { x: 80, y: 400 },
    target: { x: 720, y: 120, r: 26 },
    planets: [{ x: 400, y: 260, r: 52, color: '#3b82f6', name: 'Kepler' }]
  },
  {
    name: 'Slingshot',
    brief:
      'Too far to reach on power alone. Skim the big planet to steal speed from it, then coast out.',
    start: { x: 70, y: 100 },
    target: { x: 740, y: 420, r: 24 },
    planets: [
      { x: 300, y: 300, r: 62, color: '#f59e0b', name: 'Hale' },
      { x: 600, y: 150, r: 34, color: '#a78bfa', name: 'Vance' }
    ]
  },
  {
    name: 'Threading the Needle',
    brief:
      'Two planets pull in opposite directions and a debris field guards the middle. Find the quiet lane.',
    start: { x: 80, y: 250 },
    target: { x: 730, y: 250, r: 22 },
    planets: [
      { x: 400, y: 90, r: 48, color: '#10b981', name: 'Turtle' },
      { x: 400, y: 410, r: 48, color: '#ef4444', name: 'Rock' }
    ],
    hazards: [{ x: 400, y: 250, r: 34 }]
  },
  {
    name: 'The Long Way Round',
    brief:
      'A giant planet blocks the way. There is no direct shot — you have to go the long way around.',
    start: { x: 100, y: 430 },
    target: { x: 640, y: 90, r: 22 },
    planets: [
      { x: 430, y: 250, r: 78, color: '#f97316', name: 'Goliath' },
      { x: 130, y: 140, r: 30, color: '#60a5fa', name: 'Pip' }
    ],
    hazards: [{ x: 660, y: 300, r: 40 }]
  }
];

/** Read by `badges.ts` so the "solved everything" achievement tracks reality. */
export const ORBIT_LEVEL_COUNT = LEVELS.length;

type Phase = 'aiming' | 'flying' | 'won' | 'crashed';

interface Vec {
  x: number;
  y: number;
}

/** Net gravitational acceleration on a probe at `p`. */
function accelerationAt(p: Vec, planets: Planet[]): Vec {
  let ax = 0;
  let ay = 0;

  for (const planet of planets) {
    const dx = planet.x - p.x;
    const dy = planet.y - p.y;
    const distSq = Math.max(dx * dx + dy * dy, MIN_DISTANCE * MIN_DISTANCE);
    const dist = Math.sqrt(distSq);

    // Mass scales with area, which is what makes the big planets feel heavy.
    const pull = (GRAVITY_STRENGTH * planet.r * planet.r) / distSq;
    ax += (dx / dist) * pull;
    ay += (dy / dist) * pull;
  }

  return { x: ax, y: ay };
}

interface OrbitalSlingshotProps {
  /** Level indices already solved, owned and persisted by the app. */
  solvedLevels: number[];
  onSolve: (levelIndex: number) => void;
}

export default function OrbitalSlingshot({ solvedLevels, onSolve }: OrbitalSlingshotProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);

  const [levelIndex, setLevelIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('aiming');
  const [attempts, setAttempts] = useState(0);
  const [nudge, setNudge] = useState(false);

  // Mutable simulation state lives in refs — React state at 60fps would thrash.
  const probeRef = useRef<Vec>({ x: 0, y: 0 });
  const velocityRef = useRef<Vec>({ x: 0, y: 0 });
  const trailRef = useRef<Vec[]>([]);
  const dragRef = useRef<Vec | null>(null);
  const phaseRef = useRef<Phase>('aiming');

  const level = LEVELS[levelIndex];

  const setPhaseSynced = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const resetProbe = useCallback(() => {
    probeRef.current = { x: level.start.x, y: level.start.y };
    velocityRef.current = { x: 0, y: 0 };
    trailRef.current = [];
    dragRef.current = null;
    setPhaseSynced('aiming');
  }, [level, setPhaseSynced]);

  useEffect(() => {
    resetProbe();
    setAttempts(0);
  }, [levelIndex, resetProbe]);

  /** Canvas pixel position → world coordinates. */
  const toWorld = useCallback((clientX: number, clientY: number): Vec => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * WORLD_W,
      y: ((clientY - rect.top) / rect.height) * WORLD_H
    };
  }, []);

  // ---------------------------------------------------------------- rendering

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, WORLD_W, WORLD_H);

    // Starfield — deterministic so it doesn't shimmer between frames.
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    for (let i = 0; i < 90; i++) {
      const sx = (i * 9973) % WORLD_W;
      const sy = (i * 7919) % WORLD_H;
      const size = (i % 3) * 0.5 + 0.4;
      ctx.fillStyle = `rgba(255,255,255,${0.12 + (i % 5) * 0.06})`;
      ctx.fillRect(sx, sy, size, size);
    }

    // Hazard rings.
    for (const hazard of level.hazards ?? []) {
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239,68,68,0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(239,68,68,0.55)';
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Planets, with a soft gravity halo so the pull is visible before launch.
    for (const planet of level.planets) {
      const halo = ctx.createRadialGradient(
        planet.x,
        planet.y,
        planet.r,
        planet.x,
        planet.y,
        planet.r * 3
      );
      halo.addColorStop(0, `${planet.color}55`);
      halo.addColorStop(1, 'transparent');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, planet.r * 3, 0, Math.PI * 2);
      ctx.fill();

      const body = ctx.createRadialGradient(
        planet.x - planet.r * 0.35,
        planet.y - planet.r * 0.35,
        planet.r * 0.1,
        planet.x,
        planet.y,
        planet.r
      );
      body.addColorStop(0, '#ffffff44');
      body.addColorStop(0.35, planet.color);
      body.addColorStop(1, '#00000088');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, planet.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Target beacon.
    const pulse = 1 + Math.sin(Date.now() / 320) * 0.12;
    ctx.beginPath();
    ctx.arc(level.target.x, level.target.y, level.target.r * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(level.target.x, level.target.y, level.target.r * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = '#34d399';
    ctx.fill();

    // Flight trail.
    const trail = trailRef.current;
    if (trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
      ctx.strokeStyle = 'rgba(56,189,248,0.75)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Aiming guide: a short preview of the opening arc. Deliberately short —
    // a full prediction would remove the puzzle.
    const drag = dragRef.current;
    if (phaseRef.current === 'aiming' && drag) {
      const launch = computeLaunchVelocity(level.start, drag);
      const ghostPos: Vec = { ...level.start };
      const ghostVel: Vec = { ...launch };

      ctx.beginPath();
      ctx.moveTo(ghostPos.x, ghostPos.y);
      for (let i = 0; i < 26; i++) {
        const a = accelerationAt(ghostPos, level.planets);
        ghostVel.x += a.x;
        ghostVel.y += a.y;
        ghostPos.x += ghostVel.x;
        ghostPos.y += ghostVel.y;
        ctx.lineTo(ghostPos.x, ghostPos.y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      // Power band from the launcher to the cursor.
      ctx.beginPath();
      ctx.moveTo(level.start.x, level.start.y);
      ctx.lineTo(drag.x, drag.y);
      ctx.strokeStyle = 'rgba(251,191,36,0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // The probe itself.
    const probe = probeRef.current;
    ctx.beginPath();
    ctx.arc(probe.x, probe.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = phaseRef.current === 'crashed' ? '#ef4444' : '#fbbf24';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Launch pad marker.
    ctx.beginPath();
    ctx.arc(level.start.x, level.start.y, 12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [level]);

  // --------------------------------------------------------------- simulation

  const step = useCallback(() => {
    if (phaseRef.current !== 'flying') return;

    const probe = probeRef.current;
    const velocity = velocityRef.current;

    // Several physics steps per rendered frame keeps fast passes accurate
    // without making the probe crawl across the screen.
    for (let i = 0; i < 2; i++) {
      const a = accelerationAt(probe, level.planets);
      velocity.x += a.x;
      velocity.y += a.y;
      probe.x += velocity.x;
      probe.y += velocity.y;

      for (const planet of level.planets) {
        const dx = probe.x - planet.x;
        const dy = probe.y - planet.y;
        if (Math.hypot(dx, dy) < planet.r + 4) {
          setPhaseSynced('crashed');
          return;
        }
      }

      for (const hazard of level.hazards ?? []) {
        if (Math.hypot(probe.x - hazard.x, probe.y - hazard.y) < hazard.r) {
          setPhaseSynced('crashed');
          return;
        }
      }

      if (Math.hypot(probe.x - level.target.x, probe.y - level.target.y) < level.target.r) {
        // `setPhaseSynced` updates phaseRef synchronously, so the next frame
        // bails out at the top and this fires exactly once per winning flight.
        setPhaseSynced('won');
        onSolve(levelIndex);
        return;
      }

      // Generous margin so a wide slingshot can loop back into frame.
      const off =
        probe.x < -400 || probe.x > WORLD_W + 400 || probe.y < -400 || probe.y > WORLD_H + 400;
      if (off || trailRef.current.length > MAX_STEPS) {
        setPhaseSynced('crashed');
        return;
      }
    }

    trailRef.current.push({ x: probe.x, y: probe.y });
  }, [level, levelIndex, onSolve, setPhaseSynced]);

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

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'aiming') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = toWorld(e.clientX, e.clientY);
    setNudge(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'aiming' || !dragRef.current) return;
    dragRef.current = toWorld(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    if (phaseRef.current !== 'aiming' || !dragRef.current) return;

    const launch = computeLaunchVelocity(level.start, dragRef.current);
    dragRef.current = null;

    // A tap is an aiming mistake, not a shot. Launching it would lock the
    // canvas while a motionless probe times out.
    if (Math.hypot(launch.x, launch.y) < MIN_LAUNCH_SPEED) {
      setNudge(true);
      return;
    }

    velocityRef.current = launch;
    trailRef.current = [{ ...probeRef.current }];
    setAttempts((n) => n + 1);
    setPhaseSynced('flying');
  };

  const isLast = levelIndex === LEVELS.length - 1;

  return (
    <div className="space-y-4">
      {/* Level strip */}
      <div className="flex flex-wrap items-center gap-2">
        {LEVELS.map((lvl, i) => (
          <button
            key={lvl.name}
            onClick={() => setLevelIndex(i)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono border transition cursor-pointer flex items-center gap-1.5 ${i === levelIndex
              ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
              : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
          >
            {solvedLevels.includes(i) && <Trophy className="w-3 h-3 text-amber-400" />}
            {i + 1}. {lvl.name}
          </button>
        ))}
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed font-sans">{level.brief}</p>

      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black">
        <canvas
          ref={canvasRef}
          width={WORLD_W}
          height={WORLD_H}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`w-full block touch-none ${phase === 'aiming' ? 'cursor-crosshair' : 'cursor-default'
            }`}
        />

        {phase === 'won' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-center px-6">
            <Trophy className="w-10 h-10 text-amber-400" />
            <h4 className="font-display font-bold text-xl text-emerald-400">Beacon reached!</h4>
            <p className="text-xs text-zinc-300 font-mono">
              {attempts} attempt{attempts === 1 ? '' : 's'}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={resetProbe}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer transition"
              >
                Fly it again
              </button>
              {!isLast && (
                <button
                  onClick={() => setLevelIndex((i) => i + 1)}
                  className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-stone-950 cursor-pointer transition flex items-center gap-1"
                >
                  Next level <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {phase === 'crashed' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-center px-6">
            <h4 className="font-display font-bold text-xl text-red-400">Probe lost</h4>
            <p className="text-xs text-zinc-400 font-sans max-w-xs">
              It hit something, or drifted out of range. Try a shallower angle or less power.
            </p>
            <button
              onClick={resetProbe}
              className="px-5 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-xs font-bold text-stone-950 cursor-pointer transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Try again
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-zinc-400">
        <span className="flex items-center gap-1.5">
          {phase === 'aiming' ? (
            <>
              <Rocket className="w-3.5 h-3.5 text-amber-400" />
              {nudge ? (
                <span className="text-amber-300">
                  That was barely a nudge — drag further from the probe to build up speed.
                </span>
              ) : (
                'Drag from the probe and release to launch'
              )}
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-sky-400" />
              In flight — gravity is steering now
            </>
          )}
        </span>

        <span className="flex items-center gap-3">
          {phase === 'flying' && (
            <button
              onClick={resetProbe}
              className="flex items-center gap-1.5 hover:text-white cursor-pointer transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Recall probe
            </button>
          )}
          <span>Attempts: {attempts}</span>
        </span>
      </div>
    </div>
  );
}

/**
 * Aiming control: the probe fires *toward* the point you drag to, with speed
 * proportional to how far you drag. Longer drag, faster launch.
 */
function computeLaunchVelocity(start: Vec, drag: Vec): Vec {
  const dx = drag.x - start.x;
  const dy = drag.y - start.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return { x: 0, y: 0 };

  const speed = Math.min(dist / 22, MAX_LAUNCH_SPEED);
  return { x: (dx / dist) * speed, y: (dy / dist) * speed };
}
