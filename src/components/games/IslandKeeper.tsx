import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RotateCcw,
  ChevronRight,
  Trophy,
  Lightbulb,
  Play,
  Pause,
  FastForward,
  Skull,
  AlertTriangle,
  Sprout,
  Rabbit,
  Dog,
  Squirrel,
  Bird,
  Bug,
  Scissors,
  PlusCircle,
  Flower2,
  Fence
} from 'lucide-react';

/**
 * Island Keeper
 * -------------
 * A discrete-step Lotka-Volterra food web with logistic self-limiting growth:
 *
 *   dN_i/dt = N_i * ( r_i - damp_i*(N_i/K_i) + sum_j a_ij * N_j )
 *
 * Producers (grass) use the classic form (damp_i = r_i, recovering the textbook
 * dN/dt = rN(1-N/K)). Consumers get a *negative* baseline r_i (they starve
 * without food) plus a small positive damp_i that always pushes back on
 * overcrowding regardless of r's sign — without that split, a negative r
 * flips the logistic brake into a throttle once a consumer's population drifts
 * above its cap, which blows the simulation up.
 *
 * Nothing here is scripted: predator removal cascades, overgrazing collapse,
 * and drought stress all fall out of the same handful of equations.
 */

// ------------------------------------------------------------------ engine

interface SpeciesDef {
  id: string;
  name: string;
  icon: typeof Sprout;
  color: string;
  role: 'producer' | 'consumer';
  /** Intrinsic rate: positive growth for producers, negative starvation baseline for consumers. */
  r: number;
  /** Soft population cap (exact carrying capacity for producers). */
  K: number;
  /** Self-crowding pressure. Always positive, independent of r's sign. */
  damp: number;
  /** Below this, the species risks stochastic extinction every year it lingers there. */
  floor: number;
  /** Per-year probability of local extinction while below the floor. */
  hazard: number;
}

const SPECIES_LIBRARY: Record<string, SpeciesDef> = {
  grass: { id: 'grass', name: 'Grass', icon: Sprout, color: '#4ade80', role: 'producer', r: 1.8, K: 500, damp: 1.8, floor: 20, hazard: 1.5 },
  rabbit: { id: 'rabbit', name: 'Rabbits', icon: Rabbit, color: '#e5e7eb', role: 'consumer', r: -0.9, K: 900, damp: 0.05, floor: 10, hazard: 1.4 },
  fox: { id: 'fox', name: 'Foxes', icon: Dog, color: '#fb923c', role: 'consumer', r: -0.6, K: 60, damp: 0.4, floor: 4, hazard: 1.6 },
  vole: { id: 'vole', name: 'Voles', icon: Squirrel, color: '#a16207', role: 'consumer', r: -0.7, K: 700, damp: 0.06, floor: 15, hazard: 1.3 },
  hawk: { id: 'hawk', name: 'Hawks', icon: Bird, color: '#64748b', role: 'consumer', r: -0.6, K: 30, damp: 0.4, floor: 3, hazard: 1.6 },
  beetle: { id: 'beetle', name: 'Invasive beetles', icon: Bug, color: '#84cc16', role: 'consumer', r: -0.5, K: 250, damp: 0.1, floor: 8, hazard: 0.5 }
};

type Matrix = Record<string, Record<string, number>>;

/** Builds a sparse interaction matrix from `[affected, source, coefficient]` triples. */
function buildMatrix(pairs: Array<[string, string, number]>): Matrix {
  const m: Matrix = {};
  for (const [i, j, v] of pairs) {
    if (!m[i]) m[i] = {};
    m[i][j] = v;
  }
  return m;
}

interface OvergrazeRule {
  producer: string;
  grazer: string;
  threshold: number;
  rate: number;
  minK: number;
}

interface ArrivalEvent {
  year: number;
  speciesId: string;
  amount: number;
  message: string;
}

interface DroughtWindow {
  startYear: number;
  endYear: number;
  producer: string;
  factor: number;
}

type InterventionType = 'cull' | 'introduce' | 'plant' | 'fence';

interface LevelDef {
  name: string;
  brief: string;
  hint: string;
  speciesIds: string[];
  initial: Record<string, number>;
  matrix: Matrix;
  overgraze: OvergrazeRule[];
  events: ArrivalEvent[];
  drought?: DroughtWindow;
  targetYear: number;
  interventions: InterventionType[];
  interventionBudget?: number;
  requiredAlive: string[];
  containCap?: { speciesId: string; max: number };
}

const LEVELS: LevelDef[] = [
  {
    name: 'Rabbits and Grass',
    brief: 'Just grass and rabbits. Watch the population settle — that ceiling is the carrying capacity.',
    hint: 'Rabbits can only ever be as numerous as the grass can feed. Culling them hard just delays the same ceiling.',
    speciesIds: ['grass', 'rabbit'],
    initial: { grass: 300, rabbit: 20 },
    matrix: buildMatrix([
      ['grass', 'rabbit', -0.02],
      ['rabbit', 'grass', 0.012]
    ]),
    overgraze: [{ producer: 'grass', grazer: 'rabbit', threshold: 70, rate: 0.15, minK: 40 }],
    events: [],
    targetYear: 30,
    interventions: ['cull'],
    requiredAlive: ['grass', 'rabbit']
  },
  {
    name: 'Enter the Fox',
    brief: 'A predator joins the picture. Expect the classic boom-and-bust lag before things settle. Survive 50 years.',
    hint: "Rabbits spike, then foxes spike behind them, then rabbits crash, then foxes starve — the lag is the whole lesson. Don't panic-cull mid-swing.",
    speciesIds: ['grass', 'rabbit', 'fox'],
    initial: { grass: 300, rabbit: 60, fox: 8 },
    matrix: buildMatrix([
      ['grass', 'rabbit', -0.006],
      ['rabbit', 'grass', 0.012],
      ['rabbit', 'fox', -0.05],
      ['fox', 'rabbit', 0.02]
    ]),
    overgraze: [{ producer: 'grass', grazer: 'rabbit', threshold: 90, rate: 0.1, minK: 60 }],
    events: [],
    targetYear: 50,
    interventions: ['cull', 'introduce'],
    requiredAlive: ['grass', 'rabbit', 'fox']
  },
  {
    name: 'The Obvious Mistake',
    brief: 'You inherited an island with far too many foxes suppressing the rabbits. Fix it — carefully.',
    hint: "It's tempting to cull the foxes so the rabbits can recover. Do that and the rabbits overshoot, overgraze the grass, and the whole chain — foxes included — can starve out behind it. Left alone, the fox count settles on its own.",
    speciesIds: ['grass', 'rabbit', 'fox'],
    initial: { grass: 300, rabbit: 30, fox: 28 },
    matrix: buildMatrix([
      ['grass', 'rabbit', -0.015],
      ['rabbit', 'grass', 0.012],
      ['rabbit', 'fox', -0.06],
      ['fox', 'rabbit', 0.022]
    ]),
    overgraze: [{ producer: 'grass', grazer: 'rabbit', threshold: 70, rate: 0.15, minK: 40 }],
    events: [],
    targetYear: 40,
    interventions: ['cull', 'introduce'],
    requiredAlive: ['grass', 'rabbit', 'fox']
  },
  {
    name: 'Keystone',
    brief: 'Five species. The hawks mostly eat voles and barely touch the rabbits you actually like. They still matter.',
    hint: "Cull the hawks and voles boom unchecked — they out-graze the rabbits' grass supply and drag grass, rabbits, and foxes down with them. A keystone species controls the web by what it eats, not by how big or obviously important it looks.",
    speciesIds: ['grass', 'rabbit', 'vole', 'fox', 'hawk'],
    initial: { grass: 350, rabbit: 50, vole: 40, fox: 12, hawk: 8 },
    matrix: buildMatrix([
      ['grass', 'rabbit', -0.006],
      ['grass', 'vole', -0.02],
      ['rabbit', 'grass', 0.012],
      ['rabbit', 'fox', -0.05],
      ['rabbit', 'hawk', -0.01],
      ['vole', 'grass', 0.01],
      ['vole', 'hawk', -0.08],
      ['fox', 'rabbit', 0.02],
      ['hawk', 'rabbit', 0.005],
      ['hawk', 'vole', 0.03]
    ]),
    overgraze: [
      { producer: 'grass', grazer: 'rabbit', threshold: 90, rate: 0.1, minK: 60 },
      { producer: 'grass', grazer: 'vole', threshold: 90, rate: 0.15, minK: 60 }
    ],
    events: [],
    targetYear: 60,
    interventions: ['cull', 'introduce'],
    requiredAlive: ['grass', 'rabbit', 'vole', 'fox', 'hawk']
  },
  {
    name: 'Invasive',
    brief: 'Invasive beetles land at year 20 no matter what you do beforehand. Contain them once they arrive.',
    hint: 'A fence on the grass blunts how hard anything can graze it, beetles included. You cannot fully wipe the beetles out — the win condition only asks you to keep their numbers down, not eradicate them.',
    speciesIds: ['grass', 'rabbit', 'fox', 'beetle'],
    initial: { grass: 300, rabbit: 50, fox: 10, beetle: 0 },
    matrix: buildMatrix([
      ['grass', 'rabbit', -0.006],
      ['grass', 'beetle', -0.018],
      ['rabbit', 'grass', 0.012],
      ['rabbit', 'fox', -0.05],
      ['fox', 'rabbit', 0.02],
      ['beetle', 'grass', 0.02]
    ]),
    overgraze: [
      { producer: 'grass', grazer: 'rabbit', threshold: 90, rate: 0.1, minK: 60 },
      { producer: 'grass', grazer: 'beetle', threshold: 60, rate: 0.15, minK: 50 }
    ],
    events: [{ year: 20, speciesId: 'beetle', amount: 35, message: 'A swarm of invasive beetles has reached the island.' }],
    targetYear: 60,
    interventions: ['cull', 'fence', 'introduce'],
    requiredAlive: ['grass', 'rabbit', 'fox'],
    containCap: { speciesId: 'beetle', max: 80 }
  },
  {
    name: 'Drought Years',
    brief: "Grass's carrying capacity is scheduled to drop 40% from year 30 to year 40. You can see it coming.",
    hint: 'A stressed food web going into a drought crashes; a lightly-stocked one rides it out. Thin the herd or bank some grass before year 30, not during it.',
    speciesIds: ['grass', 'rabbit', 'fox'],
    initial: { grass: 350, rabbit: 55, fox: 14 },
    matrix: buildMatrix([
      ['grass', 'rabbit', -0.006],
      ['rabbit', 'grass', 0.012],
      ['rabbit', 'fox', -0.05],
      ['fox', 'rabbit', 0.02]
    ]),
    overgraze: [{ producer: 'grass', grazer: 'rabbit', threshold: 90, rate: 0.1, minK: 60 }],
    events: [],
    drought: { startYear: 30, endYear: 40, producer: 'grass', factor: 0.6 },
    targetYear: 60,
    interventions: ['cull', 'introduce', 'plant'],
    requiredAlive: ['grass', 'rabbit', 'fox']
  },
  {
    name: 'Hands Off',
    brief: 'The same five-species web as Keystone, fully stocked and stable. You get exactly two interventions across 100 years.',
    hint: 'Nothing is wrong yet, so spend nothing yet. Save your two moves for the moment the graph tells you something is actually going wrong.',
    speciesIds: ['grass', 'rabbit', 'vole', 'fox', 'hawk'],
    initial: { grass: 350, rabbit: 50, vole: 40, fox: 12, hawk: 8 },
    matrix: buildMatrix([
      ['grass', 'rabbit', -0.006],
      ['grass', 'vole', -0.02],
      ['rabbit', 'grass', 0.012],
      ['rabbit', 'fox', -0.05],
      ['rabbit', 'hawk', -0.01],
      ['vole', 'grass', 0.01],
      ['vole', 'hawk', -0.08],
      ['fox', 'rabbit', 0.02],
      ['hawk', 'rabbit', 0.005],
      ['hawk', 'vole', 0.03]
    ]),
    overgraze: [
      { producer: 'grass', grazer: 'rabbit', threshold: 90, rate: 0.1, minK: 60 },
      { producer: 'grass', grazer: 'vole', threshold: 90, rate: 0.15, minK: 60 }
    ],
    events: [],
    targetYear: 100,
    interventions: ['cull', 'introduce', 'plant', 'fence'],
    interventionBudget: 2,
    requiredAlive: ['grass', 'rabbit', 'vole', 'fox', 'hawk']
  }
];

interface HistorySample {
  year: number;
  pop: Record<string, number>;
}

interface SimState {
  year: number;
  pop: Record<string, number>;
  extinct: Record<string, boolean>;
  kOverride: Record<string, number>;
  matrix: Matrix;
  firedEvents: boolean[];
  droughtActive: boolean;
  interventionsUsed: number;
  log: string[];
  history: HistorySample[];
}

const SUBSTEPS_PER_YEAR = 24;
const MAX_HISTORY = 240;

function initSimState(level: LevelDef): SimState {
  const pop: Record<string, number> = {};
  const kOverride: Record<string, number> = {};
  for (const id of level.speciesIds) {
    pop[id] = level.initial[id] ?? 0;
    kOverride[id] = SPECIES_LIBRARY[id].K;
  }
  const matrix: Matrix = {};
  for (const id of level.speciesIds) matrix[id] = { ...(level.matrix[id] ?? {}) };
  return {
    year: 0,
    pop,
    extinct: Object.fromEntries(level.speciesIds.map((id) => [id, pop[id] <= 0])),
    kOverride,
    matrix,
    firedEvents: level.events.map(() => false),
    droughtActive: false,
    interventionsUsed: 0,
    log: [],
    history: [{ year: 0, pop: { ...pop } }]
  };
}

/** One fixed-size sub-step of the coupled ODE, plus overgrazing feedback and stochastic extinction. */
function subStep(level: LevelDef, state: SimState, dt: number): SimState {
  const pop = { ...state.pop };
  const kOverride = { ...state.kOverride };
  const extinct = { ...state.extinct };
  const log = state.log;
  const before = { ...state.pop };

  for (const rule of level.overgraze) {
    if ((before[rule.grazer] ?? 0) > rule.threshold) {
      kOverride[rule.producer] = Math.max(rule.minK, kOverride[rule.producer] * (1 - rule.rate * dt));
    }
  }

  if (level.drought && state.year >= level.drought.startYear && state.year < level.drought.endYear) {
    // Applied once per year-crossing rather than every sub-step so the factor doesn't compound.
  }

  for (const id of level.speciesIds) {
    if (extinct[id] || pop[id] <= 0) continue;
    const def = SPECIES_LIBRARY[id];
    const K = kOverride[id];
    let growth = def.r - def.damp * (pop[id] / K);
    const row = state.matrix[id] ?? {};
    for (const j of level.speciesIds) {
      const coeff = row[j];
      if (coeff) growth += coeff * before[j];
    }
    pop[id] = Math.max(0, pop[id] + dt * pop[id] * growth);

    if (pop[id] > 0 && pop[id] < def.floor) {
      if (Math.random() < def.hazard * dt) {
        pop[id] = 0;
        extinct[id] = true;
        log.push(`Year ${state.year.toFixed(0)}: ${def.name} died out.`);
      }
    }
  }

  return { ...state, pop, kOverride, extinct, log };
}

function stepYears(level: LevelDef, state: SimState, deltaYears: number): SimState {
  const steps = Math.max(1, Math.round(deltaYears * SUBSTEPS_PER_YEAR));
  const dt = deltaYears / steps;
  let s = state;
  for (let i = 0; i < steps; i++) {
    const priorYear = Math.floor(s.year);
    s = subStep(level, s, dt);
    s = { ...s, year: s.year + dt };

    // Year-boundary events: drought K scaling and scripted arrivals fire once.
    const newYear = Math.floor(s.year);
    if (newYear > priorYear) {
      let kOverride = s.kOverride;
      let pop = s.pop;
      let extinct = s.extinct;
      let firedEvents = s.firedEvents;
      let log = s.log;
      let droughtActive = s.droughtActive;

      if (level.drought) {
        const inWindow = newYear >= level.drought.startYear && newYear < level.drought.endYear;
        if (inWindow && !s.droughtActive) {
          kOverride = { ...kOverride, [level.drought.producer]: kOverride[level.drought.producer] * level.drought.factor };
          droughtActive = true;
          log = [...log, `Year ${newYear}: the drought begins.`];
        } else if (!inWindow && s.droughtActive) {
          kOverride = { ...kOverride, [level.drought.producer]: kOverride[level.drought.producer] / level.drought.factor };
          droughtActive = false;
          log = [...log, `Year ${newYear}: the drought ends.`];
        }
      }

      level.events.forEach((event, i2) => {
        if (!firedEvents[i2] && newYear >= event.year) {
          pop = { ...pop, [event.speciesId]: (pop[event.speciesId] ?? 0) + event.amount };
          extinct = { ...extinct, [event.speciesId]: false };
          firedEvents = firedEvents.map((f, idx) => (idx === i2 ? true : f));
          log = [...log, event.message];
        }
      });

      s = { ...s, kOverride, pop, extinct, firedEvents, log, droughtActive };

      const history = [...s.history, { year: newYear, pop: { ...s.pop } }];
      if (history.length > MAX_HISTORY) history.shift();
      s = { ...s, history };
    }
  }
  return s;
}

// ------------------------------------------------------------------ interventions

function applyIntervention(level: LevelDef, state: SimState, type: InterventionType, speciesId: string): SimState {
  const def = SPECIES_LIBRARY[speciesId];
  const pop = { ...state.pop };
  const matrix = { ...state.matrix };
  const extinct = { ...state.extinct };

  if (type === 'cull') {
    pop[speciesId] = pop[speciesId] * 0.5;
  } else if (type === 'introduce') {
    if ((pop[speciesId] ?? 0) <= 0) {
      pop[speciesId] = Math.max(5, def.K * 0.08);
      extinct[speciesId] = false;
    }
  } else if (type === 'plant') {
    if (def.role === 'producer') {
      pop[speciesId] = Math.min(state.kOverride[speciesId], pop[speciesId] + state.kOverride[speciesId] * 0.25);
    }
  } else if (type === 'fence') {
    const row = { ...(matrix[speciesId] ?? {}) };
    for (const j of Object.keys(row)) {
      if (row[j] < 0) row[j] *= 0.5;
    }
    matrix[speciesId] = row;
  }

  return { ...state, pop, matrix, extinct, interventionsUsed: state.interventionsUsed + 1 };
}

// ------------------------------------------------------------------ outcome

function isCollapsed(level: LevelDef, state: SimState): boolean {
  return level.requiredAlive.some((id) => state.extinct[id]);
}

function isSolved(level: LevelDef, state: SimState): boolean {
  if (state.year < level.targetYear) return false;
  if (isCollapsed(level, state)) return false;
  if (level.containCap && (state.pop[level.containCap.speciesId] ?? 0) > level.containCap.max) return false;
  return true;
}

// ------------------------------------------------------------------ visuals

const MAX_GLYPHS = 9;

/** Deterministic per-slot jitter so glyphs don't reshuffle every render. */
function jitterFor(seed: number): { x: number; y: number; r: number } {
  const a = Math.sin(seed * 12.9898) * 43758.5453;
  const b = Math.sin(seed * 78.233) * 12543.897;
  const c = Math.sin(seed * 37.719) * 5647.123;
  const frac = (v: number) => v - Math.floor(v);
  return { x: 10 + frac(a) * 80, y: 15 + frac(b) * 65, r: (frac(c) - 0.5) * 30 };
}

function IslandView({ level, pop }: { level: LevelDef; pop: Record<string, number> }) {
  const glyphs = useMemo(() => {
    const out: Array<{ id: string; def: SpeciesDef; slot: number; jitter: { x: number; y: number; r: number } }> = [];
    level.speciesIds.forEach((id, speciesIdx) => {
      const def = SPECIES_LIBRARY[id];
      out.push({ id, def, slot: -1, jitter: { x: 0, y: 0, r: 0 } });
      for (let slot = 0; slot < MAX_GLYPHS; slot++) {
        out.push({ id, def, slot, jitter: jitterFor(speciesIdx * 97 + slot * 13 + 1) });
      }
    });
    return out;
  }, [level]);

  return (
    <div className="relative w-full h-56 rounded-[40%] bg-gradient-to-b from-[#16281c] to-[#0d1a12] border border-emerald-900/50 overflow-hidden">
      {glyphs
        .filter((g) => g.slot >= 0)
        .map((g) => {
          const count = Math.min(MAX_GLYPHS, Math.round((pop[g.id] ?? 0) / (g.def.K / MAX_GLYPHS)));
          if (g.slot >= count) return null;
          const Icon = g.def.icon;
          return (
            <Icon
              key={`${g.id}-${g.slot}`}
              className="absolute w-4 h-4 sm:w-5 sm:h-5"
              style={{
                left: `${g.jitter.x}%`,
                top: `${g.jitter.y}%`,
                color: g.def.color,
                transform: `rotate(${g.jitter.r}deg)`
              }}
            />
          );
        })}
    </div>
  );
}

function PopulationChart({ level, history, targetYear }: { level: LevelDef; history: HistorySample[]; targetYear: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d0d12';
    ctx.fillRect(0, 0, w, h);

    if (history.length < 2) return;
    const maxPop = Math.max(50, ...history.flatMap((s) => level.speciesIds.map((id) => s.pop[id] ?? 0)));
    const maxYear = Math.max(targetYear, history[history.length - 1].year);

    const xFor = (year: number) => (year / maxYear) * (w - 8) + 4;
    const yFor = (n: number) => h - 6 - (n / maxPop) * (h - 12);

    // Target-year marker.
    ctx.strokeStyle = 'rgba(251,191,36,0.35)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(xFor(targetYear), 0);
    ctx.lineTo(xFor(targetYear), h);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const id of level.speciesIds) {
      const def = SPECIES_LIBRARY[id];
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      history.forEach((sample, i) => {
        const x = xFor(sample.year);
        const y = yFor(sample.pop[id] ?? 0);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }, [level, history, targetYear]);

  return <canvas ref={canvasRef} width={640} height={140} className="w-full h-[140px] rounded-xl border border-white/10" />;
}

// ------------------------------------------------------------------ component

interface IslandKeeperProps {
  solvedLevels: number[];
  onSolve: (levelIndex: number) => void;
}

type Outcome = 'playing' | 'won' | 'collapsed';

export default function IslandKeeper({ solvedLevels, onSolve }: IslandKeeperProps) {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = LEVELS[levelIndex];

  const simRef = useRef<SimState>(initSimState(level));
  const [display, setDisplay] = useState<SimState>(simRef.current);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState<1 | 4>(1);
  const [selectedSpecies, setSelectedSpecies] = useState<string>(level.speciesIds[0]);
  const [showHint, setShowHint] = useState(false);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const outcomeRef = useRef<Outcome>('playing');
  const [outcome, setOutcome] = useState<Outcome>('playing');

  const lastTsRef = useRef<number | null>(null);
  const lastPushRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const YEARS_PER_SECOND = 3;

  const resetLevel = useCallback((index: number) => {
    const lvl = LEVELS[index];
    simRef.current = initSimState(lvl);
    setDisplay(simRef.current);
    setRunning(false);
    setShowHint(false);
    setScrubIndex(null);
    setSelectedSpecies(lvl.speciesIds[0]);
    outcomeRef.current = 'playing';
    setOutcome('playing');
    lastTsRef.current = null;
  }, []);

  useEffect(() => {
    resetLevel(levelIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelIndex]);

  useEffect(() => {
    if (!running) {
      lastTsRef.current = null;
      return;
    }

    const tick = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dtSeconds = Math.min(0.25, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      const deltaYears = dtSeconds * YEARS_PER_SECOND * speed;
      const next = stepYears(level, simRef.current, deltaYears);
      simRef.current = next;

      let stop = false;
      if (isCollapsed(level, next)) {
        outcomeRef.current = 'collapsed';
        setOutcome('collapsed');
        stop = true;
      } else if (isSolved(level, next)) {
        outcomeRef.current = 'won';
        setOutcome('won');
        onSolve(levelIndex);
        stop = true;
      }

      if (ts - lastPushRef.current > 90 || stop) {
        lastPushRef.current = ts;
        setDisplay(next);
      }

      if (!stop) rafRef.current = requestAnimationFrame(tick);
      else setRunning(false);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, speed, level, levelIndex]);

  const handleIntervene = (type: InterventionType) => {
    if (outcome !== 'playing') return;
    if (level.interventionBudget !== undefined && simRef.current.interventionsUsed >= level.interventionBudget) return;
    simRef.current = applyIntervention(level, simRef.current, type, selectedSpecies);
    setDisplay(simRef.current);
  };

  const budgetRemaining = level.interventionBudget !== undefined ? level.interventionBudget - display.interventionsUsed : undefined;
  const isLast = levelIndex === LEVELS.length - 1;

  const shownPop = scrubIndex !== null && display.history[scrubIndex] ? display.history[scrubIndex].pop : display.pop;
  const shownYear = scrubIndex !== null && display.history[scrubIndex] ? display.history[scrubIndex].year : display.year;

  const actionMeta: Record<InterventionType, { label: string; icon: typeof Scissors }> = {
    cull: { label: 'Cull', icon: Scissors },
    introduce: { label: 'Introduce', icon: PlusCircle },
    plant: { label: 'Plant', icon: Flower2 },
    fence: { label: 'Fence', icon: Fence }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {LEVELS.map((lvl, i) => (
          <button
            key={lvl.name}
            onClick={() => setLevelIndex(i)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono border transition cursor-pointer flex items-center gap-1.5 ${
              i === levelIndex ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {solvedLevels.includes(i) && <Trophy className="w-3 h-3 text-amber-400" />}
            {lvl.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-display font-bold text-lg text-white">{level.name}</h4>
        <button onClick={() => setShowHint((s) => !s)} className="text-[11px] font-mono text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5" />
          {showHint ? 'Hide hint' : 'Hint'}
        </button>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed">{level.brief}</p>
      {showHint && <p className="text-xs text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 leading-relaxed">{level.hint}</p>}

      <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d12] p-4 space-y-3 relative">
        <IslandView level={level} pop={shownPop} />
        <PopulationChart level={level} history={display.history} targetYear={level.targetYear} />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono">
          {level.speciesIds.map((id) => {
            const def = SPECIES_LIBRARY[id];
            const Icon = def.icon;
            const alive = (shownPop[id] ?? 0) > 0;
            return (
              <span key={id} className="flex items-center gap-1" style={{ color: alive ? def.color : '#52525b' }}>
                <Icon className="w-3.5 h-3.5" />
                {def.name}: {alive ? Math.round(shownPop[id]) : <Skull className="w-3 h-3 inline" />}
              </span>
            );
          })}
        </div>

        {outcome === 'playing' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
            <button
              onClick={() => setRunning((r) => !r)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-500 hover:bg-emerald-400 text-stone-950 cursor-pointer transition"
            >
              {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {running ? 'Pause' : 'Run'}
            </button>
            <button
              onClick={() => setSpeed((s) => (s === 1 ? 4 : 1))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono border cursor-pointer transition ${
                speed === 4 ? 'border-emerald-400/50 text-emerald-300' : 'border-white/15 text-zinc-400'
              }`}
            >
              <FastForward className="w-3.5 h-3.5" />
              {speed}x
            </button>
            <span className="text-[11px] font-mono text-zinc-400">
              Year {Math.floor(display.year)} / {level.targetYear}
            </span>
            {level.drought && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${display.droughtActive ? 'bg-orange-500/20 text-orange-300' : 'bg-white/5 text-zinc-500'}`}>
                Drought: yrs {level.drought.startYear}-{level.drought.endYear}
              </span>
            )}
            {budgetRemaining !== undefined && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-400">Interventions left: {budgetRemaining}</span>
            )}
          </div>
        )}

        {outcome === 'playing' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {level.speciesIds.map((id) => {
                const def = SPECIES_LIBRARY[id];
                const Icon = def.icon;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedSpecies(id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono border cursor-pointer transition ${
                      selectedSpecies === id ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Icon className="w-3 h-3" style={{ color: def.color }} />
                    {def.name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1.5">
              {level.interventions.map((type) => {
                const meta = actionMeta[type];
                const Icon = meta.icon;
                return (
                  <button
                    key={type}
                    onClick={() => handleIntervene(type)}
                    disabled={budgetRemaining !== undefined && budgetRemaining <= 0}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white cursor-pointer transition"
                  >
                    <Icon className="w-3 h-3" />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {outcome !== 'playing' && (
          <div className="pt-2 border-t border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              {outcome === 'won' ? <Trophy className="w-5 h-5 text-amber-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
              <h5 className={`font-display font-bold text-sm ${outcome === 'won' ? 'text-emerald-400' : 'text-red-400'}`}>
                {outcome === 'won' ? `Year ${level.targetYear} reached — the island holds.` : 'Collapse.'}
              </h5>
            </div>
            {outcome === 'collapsed' && (
              <p className="text-xs text-zinc-400">
                {level.requiredAlive.find((id) => simRef.current.extinct[id]) && `${SPECIES_LIBRARY[level.requiredAlive.find((id) => simRef.current.extinct[id]) as string].name} died out. `}
                Scrub back through the graph below to see where it started.
              </p>
            )}
            <input
              type="range"
              min={0}
              max={display.history.length - 1}
              value={scrubIndex ?? display.history.length - 1}
              onChange={(e) => setScrubIndex(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => resetLevel(levelIndex)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Try again
              </button>
              {outcome === 'won' && !isLast && (
                <button
                  onClick={() => setLevelIndex((i) => i + 1)}
                  className="flex items-center gap-1 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-stone-950 cursor-pointer transition"
                >
                  Next island <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
