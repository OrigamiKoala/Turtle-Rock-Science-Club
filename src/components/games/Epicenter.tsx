import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trophy, Lightbulb, RotateCcw, ChevronRight, Clock, AlertTriangle, Send } from 'lucide-react';
import { MathText } from '../Latex';

/**
 * Epicenter
 * ---------
 * You are the seismologist. An earthquake happened somewhere under a fictional
 * coastline. Buy station readings, drag a ruler onto each seismogram to read the
 * gap between the P-wave and S-wave arrivals, and let that gap tell you how far
 * away the quake was. Three distance circles pin the epicenter where they cross.
 *
 * Every level is generated from a hidden true epicenter + magnitude, seeded with
 * a small deterministic PRNG (mulberry32) so the puzzle is internally consistent
 * and reproducible — the exact same quake every time a given level loads.
 */

// --------------------------------------------------------------- real science

/** P-waves ~6.5 km/s, S-waves ~3.5 km/s — real approximate crustal velocities. */
const VP = 6.5;
const VS = 3.5;
/** Seconds of S-P delay per km of distance: Δt = d·(1/v_s − 1/v_p). */
const K = 1 / VS - 1 / VP;

function distanceFromDt(dtSeconds: number): number {
  return Math.max(0, dtSeconds) / K;
}
function dtFromDistance(distanceKm: number): number {
  return distanceKm * K;
}

/**
 * A simplified local-magnitude (Richter-style) formula:
 * ML = log10(A) + 2.56·log10(d) − 1.67, A in mm, d in km. Internally consistent —
 * amplitudeForMagnitude and this are exact inverses of each other, verified by
 * round-trip in development.
 */
function amplitudeForMagnitude(magnitude: number, distanceKm: number): number {
  const d = Math.max(distanceKm, 1);
  return Math.pow(10, magnitude - 2.56 * Math.log10(d) + 1.67);
}

function formatAmplitude(mm: number): string {
  if (mm < 10) return mm.toFixed(2);
  if (mm < 100) return mm.toFixed(1);
  return mm.toFixed(0);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ------------------------------------------------------------- seeded PRNG

/** Small deterministic PRNG — same seed always produces the same quake. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Quake {
  x: number;
  y: number;
  magnitude: number;
}

interface Bounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

function makeQuake(seed: number, bounds: Bounds, magRange: [number, number]): Quake {
  const rng = mulberry32(seed);
  const x = bounds.xMin + rng() * (bounds.xMax - bounds.xMin);
  const y = bounds.yMin + rng() * (bounds.yMax - bounds.yMin);
  const magnitude = magRange[0] + rng() * (magRange[1] - magRange[0]);
  return { x, y, magnitude };
}

// ------------------------------------------------------------------- levels

interface StationDef {
  id: string;
  name: string;
  x: number;
  y: number;
  /** Credits to buy this reading. Defaults to 1. */
  cost?: number;
  /** Beyond the S-wave shadow zone: only a P-wave ever arrives here. */
  shadowZone?: boolean;
  /** A miscalibrated station: its arrivals are built from (true distance + this), so
   *  even a perfectly-read Δt gives a circle that misses the real intersection. */
  liarOffsetKm?: number;
}

interface LevelDef {
  name: string;
  brief: string;
  hint: string;
  /** PRNG seeds, one per quake. Length > 1 = an aftershock sequence with a shared budget. */
  rounds: number[];
  magRange: [number, number];
  stations: StationDef[];
  budget: number;
  /** Stations already paid for, with their ruler pre-set exactly — level 1 only. */
  preboughtIds?: string[];
  requireMagnitude?: boolean;
}

const EPICENTER_BOUNDS: Bounds = { xMin: 60, xMax: 470, yMin: 40, yMax: 340 };

const NETWORK_A: StationDef[] = [
  { id: 'a', name: 'Cliffside', x: 70, y: 90 },
  { id: 'b', name: 'North Point', x: 300, y: 50 },
  { id: 'c', name: 'Southgate', x: 420, y: 300 },
  { id: 'd', name: 'River Delta', x: 170, y: 330 },
  { id: 'e', name: 'East Bluff', x: 470, y: 150 },
  { id: 'f', name: 'West Cove', x: 80, y: 250 }
];

const LEVELS: LevelDef[] = [
  {
    name: 'First Tremor',
    brief: 'An earthquake just happened. Your job is to figure out exactly where it struck.',
    hint: 'Each station gives you a distance (shown as a circle on the map) — not a direction. The epicenter is wherever all three circles overlap. Drag the yellow crosshair there, then press Submit.',
    rounds: [101],
    magRange: [4.5, 5.5],
    stations: NETWORK_A.slice(0, 3),
    budget: 0,
    preboughtIds: ['a', 'b', 'c']
  },
  {
    name: 'Buy Your Own',
    brief: 'You have 4 credits. Click stations on the map to buy their readings, then use the seismogram to measure the quake distance.',
    hint: 'Click a station dot on the map to buy its reading. Then, in the seismogram panel, drag the amber A marker onto the first wave burst (the P-wave) and the pink B marker onto the second, bigger burst (the S-wave). The gap between A and B is bigger when the quake was farther away — that gap gets converted into a distance circle on the map.',
    rounds: [202],
    magRange: [4.0, 5.0],
    stations: NETWORK_A,
    budget: 4
  },
  {
    name: 'How Big Was It?',
    brief: 'Find the epicenter and estimate the earthquake\'s Richter magnitude ($M_L$).',
    hint: 'Bigger quakes make bigger wave amplitudes, but farther-away quakes make smaller waves. The Richter magnitude formula is: $M_L \\approx \\log_{10}(A_{\\text{mm}}) + 2.56 \\log_{10}(d_{\\text{km}}) - 1.67$. Your estimate just needs to be within $\\pm 0.3$ to pass.',
    rounds: [303],
    magRange: [4.5, 6.0],
    stations: NETWORK_A,
    budget: 4,
    requireMagnitude: true
  },
  {
    name: 'Tight Budget',
    brief: 'Only 3 readings fit in your budget. Pick wisely — your station placement matters.',
    hint: 'The four Cluster stations are bunched up in one corner. Cheap, sure, but when stations are close together their circles all cross at almost the same angle — it\'s really hard to pin down where they actually meet. A pricier Far station on the opposite side of the map gives you a circle that cuts across from a completely different direction, making the intersection way sharper.',
    rounds: [404],
    magRange: [4.0, 5.5],
    budget: 5,
    requireMagnitude: true,
    stations: [
      { id: 'ca', name: 'Cluster A', x: 260, y: 50, cost: 1 },
      { id: 'cb', name: 'Cluster B', x: 300, y: 70, cost: 1 },
      { id: 'cc', name: 'Cluster C', x: 320, y: 40, cost: 1 },
      { id: 'cd', name: 'Cluster D', x: 270, y: 90, cost: 1 },
      { id: 'se', name: 'Far South', x: 70, y: 320, cost: 2 },
      { id: 'sf', name: 'Far East', x: 450, y: 300, cost: 2 },
      { id: 'sg', name: 'Far NE', x: 450, y: 80, cost: 2 },
      { id: 'sh', name: 'Far West', x: 90, y: 90, cost: 2 }
    ]
  },
  {
    name: 'The Broken Clock',
    brief: 'One of these 4 stations has a broken clock. Its reading will be wrong — find the liar.',
    hint: 'When you use three correct stations, their circles will meet neatly in one spot. The bad station\'s circle will always be off, no matter how carefully you line up the ruler. Process of elimination: find which one doesn\'t fit.',
    rounds: [505],
    magRange: [4.5, 6.0],
    budget: 4,
    requireMagnitude: true,
    stations: [
      { id: 'a', name: 'Station A', x: 80, y: 100 },
      { id: 'b', name: 'Station B', x: 280, y: 50, liarOffsetKm: 90 },
      { id: 'c', name: 'Station C', x: 450, y: 150 },
      { id: 'd', name: 'Station D', x: 420, y: 320 },
      { id: 'e', name: 'Station E', x: 150, y: 330 },
      { id: 'f', name: 'Station F', x: 60, y: 220 }
    ]
  },
  {
    name: 'Shadow Zone',
    brief: 'A big, distant quake. Two stations show no S-wave at all — what\'s going on?',
    hint: 'Two of these stations only ever show one wave burst, no matter how you drag the ruler. This isn\'t broken equipment — those stations sit in Earth\'s real S-wave shadow zone. S-waves can\'t travel through liquid, and the Earth\'s outer core is liquid, so it blocks them from reaching stations on the far side. Just skip those two stations and triangulate with the rest.',
    rounds: [606],
    magRange: [6.0, 7.2],
    budget: 5,
    requireMagnitude: true,
    stations: [
      { id: 'a', name: 'Station A', x: 70, y: 300 },
      { id: 'b', name: 'Station B', x: 450, y: 320 },
      { id: 'c', name: 'Station C', x: 300, y: 50 },
      { id: 'd', name: 'Station D', x: 470, y: 90, shadowZone: true },
      { id: 'e', name: 'Station E', x: 60, y: 90, shadowZone: true },
      { id: 'f', name: 'Station F', x: 250, y: 330 },
      { id: 'g', name: 'Station G', x: 420, y: 180 }
    ]
  },
  {
    name: 'Aftershock Sequence',
    brief: 'Three aftershocks, one shared budget, and the clock is ticking. Locate all three.',
    hint: 'All three quakes use the same station network, but each one gets its own seismogram and ruler. Your credit budget carries over between quakes, so don\'t blow it all on the first one. Once you locate a quake and hit Submit, you\'ll move on to the next.',
    rounds: [707, 708, 709],
    magRange: [4.5, 6.2],
    budget: 10,
    requireMagnitude: true,
    stations: [
      { id: 'a', name: 'Station A', x: 80, y: 90 },
      { id: 'b', name: 'Station B', x: 300, y: 40 },
      { id: 'c', name: 'Station C', x: 460, y: 130 },
      { id: 'd', name: 'Station D', x: 430, y: 310 },
      { id: 'e', name: 'Station E', x: 200, y: 330 },
      { id: 'f', name: 'Station F', x: 60, y: 220 }
    ]
  }
];

/** Read by `badges.ts` so the "solved everything" achievement tracks reality. */
export const EPICENTER_LEVEL_COUNT = LEVELS.length;

// -------------------------------------------------------------- station math

interface StationReading {
  trueDistanceKm: number;
  /** What the arrival times actually encode — equal to trueDistanceKm unless the
   *  station is miscalibrated (liarOffsetKm), in which case it's the "wrong" distance
   *  the waveform was built from. */
  reportedDistanceKm: number;
  tp: number;
  ts: number;
  hasS: boolean;
  amplitudeMm: number | null;
}

function computeReading(station: StationDef, quake: Quake): StationReading {
  const trueDistanceKm = distanceBetween(station, quake);
  const reportedDistanceKm = trueDistanceKm + (station.liarOffsetKm ?? 0);
  const hasS = !station.shadowZone;
  const tp = reportedDistanceKm / VP;
  const ts = hasS ? tp + dtFromDistance(reportedDistanceKm) : tp;
  const amplitudeMm = hasS ? amplitudeForMagnitude(quake.magnitude, trueDistanceKm) : null;
  return { trueDistanceKm, reportedDistanceKm, tp, ts, hasS, amplitudeMm };
}

function windowSecFor(reading: StationReading): number {
  const span = reading.hasS ? reading.ts : reading.tp;
  return Math.max(15, span * 1.35);
}

/** Deterministic synthetic drum trace: a noise floor plus a damped-sine burst per
 *  arrival, S larger than P. No Math.random — the same t always plots the same y. */
function waveformValue(t: number, reading: StationReading): number {
  let v = 0.5 * Math.sin(t * 2.7) + 0.3 * Math.sin(t * 5.3 + 1.1) + 0.2 * Math.sin(t * 9.1 + 2.4);

  if (t >= reading.tp) {
    const dt = t - reading.tp;
    v += 6 * Math.exp(-1.1 * dt) * Math.sin(dt * 9);
  }
  if (reading.hasS && t >= reading.ts) {
    const dt = t - reading.ts;
    const peak = clamp(8 + 13 * Math.log10((reading.amplitudeMm ?? 1) + 1), 5, 60);
    v += peak * Math.exp(-0.65 * dt) * Math.sin(dt * 6.5);
  }
  return v;
}

// ------------------------------------------------------------------ constants

const MAP_W = 520;
const MAP_H = 380;
const WAVE_W = 480;
const WAVE_H = 150;
const TOLERANCE_KM = 15;
const MAGNITUDE_TOLERANCE = 0.3;
const ROUND_TIME = 75;
const DEFAULT_RULER_FRAC = { a: 0.15, b: 0.4 };

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  reading: StationReading,
  windowSec: number,
  fracA: number,
  fracB: number
) {
  ctx.clearRect(0, 0, WAVE_W, WAVE_H);
  ctx.fillStyle = '#0a0c12';
  ctx.fillRect(0, 0, WAVE_W, WAVE_H);

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.font = '9px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  const gridStep = windowSec > 60 ? 15 : 10;
  for (let t = 0; t <= windowSec; t += gridStep) {
    const x = (t / windowSec) * WAVE_W;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WAVE_H);
    ctx.stroke();
    ctx.fillText(`${t}s`, x + 2, WAVE_H - 4);
  }

  const midY = WAVE_H / 2 + 10;
  ctx.beginPath();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  for (let x = 0; x <= WAVE_W; x++) {
    const t = (x / WAVE_W) * windowSec;
    const y = midY - waveformValue(t, reading);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const markers: Array<[number, string, string]> = [
    [fracA * WAVE_W, 'A', '#fbbf24'],
    [fracB * WAVE_W, 'B', '#f472b6']
  ];
  for (const [x, label, color] of markers) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WAVE_H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.fillRect(x - 6, 0, 12, 11);
    ctx.fillStyle = '#0a0c12';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(label, x - 3, 9);
  }

  const left = Math.min(fracA, fracB) * WAVE_W;
  const right = Math.max(fracA, fracB) * WAVE_W;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, 16);
  ctx.lineTo(right, 16);
  ctx.stroke();
  const dtSeconds = Math.abs(fracB - fracA) * windowSec;
  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(`Δt ${dtSeconds.toFixed(1)}s`, (left + right) / 2 - 22, 28);
}

// ---------------------------------------------------------------- component

interface EpicenterProps {
  /** Level indices already solved, owned and persisted by the app. */
  solvedLevels: number[];
  onSolve: (levelIndex: number) => void;
}

interface SubmitResult {
  distanceErrorKm: number;
  distanceOk: boolean;
  magnitudeErrorAbs: number | null;
  magnitudeOk: boolean;
}

export default function Epicenter({ solvedLevels, onSolve }: EpicenterProps) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundsSolved, setRoundsSolved] = useState<boolean[]>(() =>
    new Array(LEVELS[0].rounds.length).fill(false)
  );
  const [spentCredits, setSpentCredits] = useState(0);
  const [purchased, setPurchased] = useState<Set<string>>(() => new Set());
  const [rulerFrac, setRulerFrac] = useState<Record<string, { a: number; b: number }>>({});
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [guess, setGuess] = useState<{ x: number; y: number }>(() => ({ x: MAP_W / 2, y: MAP_H / 2 }));
  const [magnitudeGuess, setMagnitudeGuess] = useState('');
  const [submitted, setSubmitted] = useState<SubmitResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const mapSvgRef = useRef<SVGSVGElement | null>(null);
  const mapDragRef = useRef(false);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rulerDragRef = useRef<'a' | 'b' | null>(null);

  const level = LEVELS[levelIndex];
  const isLastLevel = levelIndex === LEVELS.length - 1;
  const isLastRound = roundIndex === level.rounds.length - 1;
  const isMultiRound = level.rounds.length > 1;

  const quake = useMemo(() => {
    const seed = level.rounds[roundIndex] ?? level.rounds[0];
    return makeQuake(seed, EPICENTER_BOUNDS, level.magRange);
  }, [level, roundIndex]);

  const remainingBudget = level.budget - spentCredits;

  // -------------------------------------------------------------- resets

  const resetRound = useCallback((lvl: LevelDef, q: Quake) => {
    const nextPurchased = new Set<string>(lvl.preboughtIds ?? []);
    const nextRuler: Record<string, { a: number; b: number }> = {};
    for (const id of nextPurchased) {
      const station = lvl.stations.find((s) => s.id === id);
      if (!station) continue;
      const reading = computeReading(station, q);
      const win = windowSecFor(reading);
      nextRuler[id] = { a: reading.tp / win, b: reading.hasS ? reading.ts / win : reading.tp / win };
    }
    setPurchased(nextPurchased);
    setRulerFrac(nextRuler);
    setSelectedStationId(nextPurchased.size > 0 ? (Array.from(nextPurchased)[0] as string) : null);
    setGuess({ x: MAP_W / 2, y: MAP_H / 2 });
    setMagnitudeGuess('');
    setSubmitted(null);
    setTimeLeft(ROUND_TIME);
  }, []);

  const resetLevel = useCallback(() => {
    setRoundIndex(0);
    setSpentCredits(0);
    setRoundsSolved(new Array(level.rounds.length).fill(false));
    setAttempts(0);
    resetRound(level, makeQuake(level.rounds[0], EPICENTER_BOUNDS, level.magRange));
  }, [level, resetRound]);

  // New level: wipe round progress and shared budget.
  useEffect(() => {
    setRoundIndex(0);
    setRoundsSolved(new Array(LEVELS[levelIndex].rounds.length).fill(false));
    setSpentCredits(0);
    setAttempts(0);
    setShowHint(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelIndex]);

  // New round (including the level's first): reset the puzzle, keep budget/progress.
  useEffect(() => {
    const lvl = LEVELS[levelIndex];
    const seed = lvl.rounds[roundIndex] ?? lvl.rounds[0];
    const q = makeQuake(seed, EPICENTER_BOUNDS, lvl.magRange);
    resetRound(lvl, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelIndex, roundIndex]);

  // Aftershock sequence: a soft countdown per quake — pressure, not a hard fail.
  const currentRoundSolved = roundsSolved[roundIndex] ?? false;
  useEffect(() => {
    if (!isMultiRound || currentRoundSolved) return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [isMultiRound, currentRoundSolved, roundIndex, levelIndex]);

  // -------------------------------------------------------------- solving

  const solvedNow =
    submitted !== null && submitted.distanceOk && (!level.requireMagnitude || submitted.magnitudeOk);

  useEffect(() => {
    if (solvedNow && !roundsSolved[roundIndex]) {
      setRoundsSolved((prev) => {
        const next = [...prev];
        next[roundIndex] = true;
        return next;
      });
    }
  }, [solvedNow, roundIndex, roundsSolved]);

  const levelSolved = roundsSolved.every(Boolean);
  useEffect(() => {
    if (levelSolved) onSolve(levelIndex);
  }, [levelSolved, levelIndex, onSolve]);

  const handleSubmit = () => {
    const distanceErrorKm = distanceBetween(guess, quake);
    const distanceOk = distanceErrorKm <= TOLERANCE_KM;
    let magnitudeOk = true;
    let magnitudeErrorAbs: number | null = null;
    if (level.requireMagnitude) {
      const parsed = parseFloat(magnitudeGuess);
      magnitudeErrorAbs = Number.isFinite(parsed) ? Math.abs(parsed - quake.magnitude) : null;
      magnitudeOk = magnitudeErrorAbs !== null && magnitudeErrorAbs <= MAGNITUDE_TOLERANCE;
    }
    setSubmitted({ distanceErrorKm, distanceOk, magnitudeErrorAbs, magnitudeOk });
    setAttempts((n) => n + 1);
  };

  // ----------------------------------------------------------- buying/map

  const handleBuyOrSelect = (station: StationDef) => {
    if (purchased.has(station.id)) {
      setSelectedStationId(station.id);
      return;
    }
    const cost = station.cost ?? 1;
    if (cost > remainingBudget) return;
    setPurchased((prev) => new Set(prev).add(station.id));
    setRulerFrac((prev) => ({ ...prev, [station.id]: DEFAULT_RULER_FRAC }));
    setSelectedStationId(station.id);
    setSpentCredits((c) => c + cost);
  };

  const toMap = (clientX: number, clientY: number) => {
    const svg = mapSvgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: clamp(((clientX - rect.left) / rect.width) * MAP_W, 0, MAP_W),
      y: clamp(((clientY - rect.top) / rect.height) * MAP_H, 0, MAP_H)
    };
  };

  const handleMapPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    mapDragRef.current = true;
    setGuess(toMap(e.clientX, e.clientY));
  };
  const handleMapPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!mapDragRef.current) return;
    setGuess(toMap(e.clientX, e.clientY));
  };
  const handleMapPointerUp = () => {
    mapDragRef.current = false;
  };

  // -------------------------------------------------------------- ruler

  const fracFromEvent = (e: React.PointerEvent<HTMLCanvasElement>): number => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    return clamp((e.clientX - rect.left) / rect.width, 0, 1);
  };

  const handleRulerPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!selectedStationId) return;
    const current = rulerFrac[selectedStationId] ?? DEFAULT_RULER_FRAC;
    const frac = fracFromEvent(e);
    const nearer: 'a' | 'b' = Math.abs(frac - current.a) <= Math.abs(frac - current.b) ? 'a' : 'b';
    rulerDragRef.current = nearer;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setRulerFrac((prev) => ({ ...prev, [selectedStationId]: { ...current, [nearer]: frac } }));
  };
  const handleRulerPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const marker = rulerDragRef.current;
    if (!marker || !selectedStationId) return;
    const frac = fracFromEvent(e);
    setRulerFrac((prev) => {
      const current = prev[selectedStationId] ?? DEFAULT_RULER_FRAC;
      return { ...prev, [selectedStationId]: { ...current, [marker]: frac } };
    });
  };
  const handleRulerPointerUp = () => {
    rulerDragRef.current = null;
  };

  // -------------------------------------------------------------- derived

  const selectedStation = selectedStationId
    ? level.stations.find((s) => s.id === selectedStationId) ?? null
    : null;
  const selectedReading = selectedStation ? computeReading(selectedStation, quake) : null;
  const selectedWindowSec = selectedReading ? windowSecFor(selectedReading) : 0;
  const selectedFrac = selectedStationId ? rulerFrac[selectedStationId] ?? DEFAULT_RULER_FRAC : DEFAULT_RULER_FRAC;
  const selectedDt = selectedReading ? Math.abs(selectedFrac.b - selectedFrac.a) * selectedWindowSec : 0;
  const selectedDistance = distanceFromDt(selectedDt);

  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if (!selectedReading) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    drawWaveform(ctx, selectedReading, selectedWindowSec, selectedFrac.a, selectedFrac.b);
  }, [selectedReading, selectedWindowSec, selectedFrac]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {LEVELS.map((lvl, i) => (
          <button
            key={lvl.name}
            onClick={() => setLevelIndex(i)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono border transition cursor-pointer flex items-center gap-1.5 ${i === levelIndex
              ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
              : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
          >
            {solvedLevels.includes(i) && <Trophy className="w-3 h-3 text-amber-400" />}
            {i + 1}. {lvl.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-display font-bold text-lg text-white">{level.name}</h4>
          <div className="text-xs text-zinc-400 leading-relaxed font-sans max-w-2xl">
            <MathText text={level.brief} />
          </div>
        </div>
        <button
          onClick={() => setShowHint((s) => !s)}
          className="text-[11px] font-mono text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-1 shrink-0"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          {showHint ? 'Hide hint' : 'Hint'}
        </button>
      </div>

      {showHint && (
        <div className="text-xs text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 font-sans leading-relaxed">
          <MathText text={level.hint} />
        </div>
      )}

      {isMultiRound && (
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Clock className={`w-3.5 h-3.5 ${timeLeft === 0 ? 'text-red-400' : 'text-sky-400'}`} />
            Quake {roundIndex + 1} of {level.rounds.length} — {formatTime(timeLeft)}
            {timeLeft === 0 && ' (over — keep going!)'}
          </span>
          <span>{roundsSolved.filter(Boolean).length}/{level.rounds.length} located</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#070911] relative">
          <svg
            ref={mapSvgRef}
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            className="w-full block touch-none select-none"
            onPointerDown={handleMapPointerDown}
            onPointerMove={handleMapPointerMove}
            onPointerUp={handleMapPointerUp}
            onPointerLeave={handleMapPointerUp}
          >
            <rect x={0} y={0} width={MAP_W} height={MAP_H} fill="#0b1524" />
            <path
              d="M210,0 C160,70 190,140 150,200 C110,260 170,320 140,380 L520,380 L520,0 Z"
              fill="#131c14"
              opacity={0.85}
            />

            {Array.from(purchased).map((id) => {
              const station = level.stations.find((s) => s.id === id);
              if (!station) return null;
              const reading = computeReading(station, quake);
              if (!reading.hasS) return null;
              const frac = rulerFrac[id] ?? DEFAULT_RULER_FRAC;
              const win = windowSecFor(reading);
              const measuredDt = Math.abs(frac.b - frac.a) * win;
              const measuredDistance = distanceFromDt(measuredDt);
              return (
                <circle
                  key={id}
                  cx={station.x}
                  cy={station.y}
                  r={measuredDistance}
                  className="transition-[r] duration-300 ease-out"
                  fill="rgba(56,189,248,0.07)"
                  stroke="rgba(56,189,248,0.5)"
                  strokeWidth={2.5}
                />
              );
            })}

            {level.stations.map((station) => {
              const isBought = purchased.has(station.id);
              const isSelected = selectedStationId === station.id;
              const cost = station.cost ?? 1;
              const affordable = cost <= remainingBudget;
              return (
                <g
                  key={station.id}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    handleBuyOrSelect(station);
                  }}
                  className={isBought || affordable ? 'cursor-pointer' : 'cursor-not-allowed'}
                >
                  <circle
                    cx={station.x}
                    cy={station.y}
                    r={9}
                    fill={isBought ? (isSelected ? '#38bdf8' : '#34d399') : '#3f3f46'}
                    stroke={isBought ? '#e5e7eb' : affordable ? '#a1a1aa' : '#52525b'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <text
                    x={station.x}
                    y={station.y - 14}
                    textAnchor="middle"
                    fontSize={9}
                    fontFamily="monospace"
                    fill={isBought ? '#e5e7eb' : '#a1a1aa'}
                  >
                    {station.name}
                    {!isBought ? ` (${cost}c)` : ''}
                  </text>
                </g>
              );
            })}

            {submitted && (
              <g style={{ pointerEvents: 'none' }}>
                <line
                  x1={guess.x}
                  y1={guess.y}
                  x2={quake.x}
                  y2={quake.y}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
                <circle cx={quake.x} cy={quake.y} r={7} fill="#ef4444" stroke="white" strokeWidth={1.5} />
              </g>
            )}

            <g style={{ pointerEvents: 'none' }}>
              <circle cx={guess.x} cy={guess.y} r={12} fill="none" stroke="#fbbf24" strokeWidth={2} />
              <line x1={guess.x - 16} y1={guess.y} x2={guess.x + 16} y2={guess.y} stroke="#fbbf24" strokeWidth={1.5} />
              <line x1={guess.x} y1={guess.y - 16} x2={guess.x} y2={guess.y + 16} stroke="#fbbf24" strokeWidth={1.5} />
            </g>
          </svg>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-[#0d0d12] p-3">
            {selectedStationId && selectedStation && selectedReading ? (
              <>
                <div className="text-xs font-bold text-white font-mono mb-1.5">{selectedStation.name}</div>
                <canvas
                  ref={waveformCanvasRef}
                  width={WAVE_W}
                  height={WAVE_H}
                  className="w-full block rounded-lg touch-none cursor-ew-resize"
                  onPointerDown={handleRulerPointerDown}
                  onPointerMove={handleRulerPointerMove}
                  onPointerUp={handleRulerPointerUp}
                  onPointerLeave={handleRulerPointerUp}
                />
                <div className="mt-2 text-[11px] font-mono text-zinc-400 space-y-0.5">
                  {selectedReading.hasS ? (
                    <>
                      <div>
                        Δt: <span className="text-white">{selectedDt.toFixed(1)}s</span>
                      </div>
                      <div>
                        ≈ distance: <span className="text-emerald-300">{selectedDistance.toFixed(0)} km</span>
                      </div>
                      {level.requireMagnitude && selectedReading.amplitudeMm !== null && (
                        <div>
                          Peak amplitude:{' '}
                          <span className="text-white">{formatAmplitude(selectedReading.amplitudeMm)} mm</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-red-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Only one wave burst arrives here — this station is in the S-wave shadow zone (the Earth's liquid core blocks S-waves from reaching it).
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-zinc-500 font-sans py-8 text-center">
                Click a station on the map to buy its reading — then its seismogram will show up here.
              </p>
            )}
          </div>

          {level.requireMagnitude && selectedStationId && selectedReading?.hasS && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d12] p-3 space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 block">Magnitude estimate</label>
              <input
                type="number"
                step="0.1"
                value={magnitudeGuess}
                onChange={(e) => setMagnitudeGuess(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono"
                placeholder="e.g. 5.4"
              />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0d0d12] px-4 py-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-zinc-400">
          <span className="flex items-center gap-3">
            {level.budget > 0 && (
              <span>
                Budget: <span className="text-white">{remainingBudget}</span> / {level.budget}
                {isMultiRound ? ' (shared)' : ''} readings left
              </span>
            )}
            <span>Attempts: {attempts}</span>
          </span>
          <button
            onClick={resetLevel}
            className="flex items-center gap-1.5 hover:text-white cursor-pointer transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset level
          </button>
        </div>

        {submitted && (
          <div
            className={`rounded-xl px-3 py-2 text-xs font-sans flex flex-wrap items-center justify-between gap-2 ${submitted.distanceOk && submitted.magnitudeOk
              ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-200'
              : 'bg-red-500/10 border border-red-500/25 text-red-200'
              }`}
          >
            <span>
              Off by {submitted.distanceErrorKm.toFixed(0)} km
              {level.requireMagnitude && submitted.magnitudeErrorAbs !== null &&
                ` · magnitude off by ${submitted.magnitudeErrorAbs.toFixed(1)}`}
              {level.requireMagnitude && submitted.magnitudeErrorAbs === null && ' · enter a magnitude estimate'}
            </span>
            {roundsSolved[roundIndex] && !isLastRound && (
              <button
                onClick={() => setRoundIndex((i) => i + 1)}
                className="px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[11px] font-bold text-stone-950 cursor-pointer transition flex items-center gap-1"
              >
                Next quake <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            {roundsSolved[roundIndex] && isLastRound && !isLastLevel && (
              <button
                onClick={() => setLevelIndex((i) => i + 1)}
                className="px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[11px] font-bold text-stone-950 cursor-pointer transition flex items-center gap-1"
              >
                Next level <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            {roundsSolved[roundIndex] && isLastRound && isLastLevel && (
              <span className="flex items-center gap-1 text-amber-300 font-bold">
                <Trophy className="w-3.5 h-3.5" /> Seismologist!
              </span>
            )}
          </div>
        )}

        {submitted && (
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            {submitted.distanceOk
              ? "Exactly right! The S-P gap tells you distance from each station; three circles overlapping is what nails down the direction too."
              : `S-waves travel slower than P-waves, so the gap between them grows the farther you are from the quake. You were off by ${submitted.distanceErrorKm.toFixed(0)} km — try re-dragging the markers to where the wave bursts actually start.`}
          </p>
        )}

        <button
          onClick={handleSubmit}
          className="w-full py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-xs font-bold text-stone-950 cursor-pointer transition flex items-center justify-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" /> Submit epicenter{level.requireMagnitude ? ' & magnitude' : ''}
        </button>
      </div>
    </div>
  );
}
