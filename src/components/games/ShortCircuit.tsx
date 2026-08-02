import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Trophy,
  Lightbulb,
  ChevronRight,
  RotateCcw,
  Zap,
  Fan,
  BatteryCharging,
  ToggleLeft,
  ToggleRight,
  SlidersHorizontal,
  Gauge,
  Eraser,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';

/**
 * Short Circuit
 * -------------
 * A breadboard that actually solves. Every level is checked by running the
 * same general circuit solver over whatever the player wired up — modified
 * nodal analysis: build a conductance matrix from every resistive branch,
 * treat the battery as a voltage source via an extra row/column, and solve
 * `Gx = b` by Gaussian elimination with partial pivoting. Nothing here is
 * special-cased for series or parallel wiring, which is what makes the
 * Wheatstone bridge (level 6) and the two-way "hallway light" switch
 * (level 7) actually work — they are not solvable by series/parallel
 * shortcuts, only by the real thing.
 *
 * Zero-resistance branches (plain wire, a closed switch, the live throw of a
 * two-way switch) are collapsed with union-find *before* the matrix is built,
 * because a literal 0-ohm branch in the conductance matrix is a divide-by-zero
 * waiting to happen. What's left after that collapse — resistors, bulbs, a
 * motor, a potentiometer, a galvanometer, plus the battery itself — is what
 * the solver actually sees.
 */

// ------------------------------------------------------------------ model

type ComponentType =
  | 'wire'
  | 'resistor'
  | 'bulb'
  | 'motor'
  | 'battery'
  | 'switch'
  | 'potentiometer'
  | 'galvanometer'
  | 'spdt';

type ToolId = ComponentType | 'erase' | 'meter';

interface CircuitComponent {
  id: string;
  type: ComponentType;
  /** Two node ids for everything except `spdt`, which uses three:
   *  [common, throwA, throwB]. */
  nodes: number[];
  /** Ohms for resistive parts, volts for the battery, 0 for a plain wire. */
  value: number;
  /** Bulbs and the motor pop past this current (amps). */
  maxCurrent?: number;
  /** 'open' | 'closed' for a switch; 'A' | 'B' for a two-way switch. */
  state?: 'open' | 'closed' | 'A' | 'B';
  burnt?: boolean;
  /** Displays as "R?" instead of its value — the bridge level's mystery resistor. */
  hidden?: boolean;
}

interface SolveResult {
  status: 'ok' | 'short' | 'open' | 'no-power';
  /** Supernode id -> volts, ground (battery −) pinned at 0. */
  voltage: Map<number, number>;
  /** Component id -> signed current through it, amps, direction nodes[0]→nodes[1]. */
  current: Map<string, number>;
  batteryCurrent: number;
  find: (node: number) => number;
}

interface LevelSpecCtx {
  result: SolveResult;
  components: CircuitComponent[];
}

interface Level {
  id: string;
  name: string;
  brief: string;
  hint: string;
  successText: string;
  batteryVoltage: number;
  tools: ComponentType[];
  resistorChoices?: number[];
  unknownResistance?: number;
  bulbRating?: { resistance: number; maxCurrent: number };
  motorRating?: { resistance: number; maxCurrent: number };
  potRange?: [number, number];
  potStep?: number;
  galvanometerResistance?: number;
  isSolved: (ctx: LevelSpecCtx) => boolean;
}

// ------------------------------------------------------------------ board geometry

const GRID_COLS = 10;
const GRID_ROWS = 8;
const NODE_COUNT = GRID_COLS * GRID_ROWS;
const BOARD_W = 780;
const BOARD_H = 480;
const MARGIN = 46;

function nodePos(id: number): { x: number; y: number } {
  const col = id % GRID_COLS;
  const row = Math.floor(id / GRID_COLS);
  const spacingX = (BOARD_W - 2 * MARGIN) / (GRID_COLS - 1);
  const spacingY = (BOARD_H - 2 * MARGIN) / (GRID_ROWS - 1);
  return { x: MARGIN + col * spacingX, y: MARGIN + row * spacingY };
}

function zigZagPath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = -dy / len;
  const uy = dx / len;
  const segments = 6;
  const start = 0.28;
  const end = 0.72;
  const points: string[] = [`M ${a.x} ${a.y}`];
  for (let i = 0; i <= segments; i++) {
    const t = start + ((end - start) * i) / segments;
    const x = a.x + dx * t;
    const y = a.y + dy * t;
    const offset = i === 0 || i === segments ? 0 : (i % 2 === 0 ? -9 : 9);
    points.push(`L ${x + ux * offset} ${y + uy * offset}`);
  }
  points.push(`L ${b.x} ${b.y}`);
  return points.join(' ');
}

// ------------------------------------------------------------------ union-find

function makeUnionFind(size: number) {
  const parent = Array.from({ length: size }, (_, i) => i);
  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }
  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }
  return { find, union };
}

// ------------------------------------------------------------------ linear solver

/** Gaussian elimination with partial pivoting. Returns null if the matrix is
 *  singular — which, for us, means an unconnected fragment (see solveCircuit). */
function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    let best = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(M[r][col]);
      if (v > best) {
        best = v;
        pivot = r;
      }
    }
    if (best < 1e-9) return null;
    if (pivot !== col) {
      const tmp = M[col];
      M[col] = M[pivot];
      M[pivot] = tmp;
    }
    for (let r = col + 1; r < n; r++) {
      const factor = M[r][col] / M[col][col];
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }

  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = M[r][n];
    for (let c = r + 1; c < n; c++) sum -= M[r][c] * x[c];
    x[r] = sum / M[r][r];
  }
  return x;
}

// ------------------------------------------------------------------ the solver

/**
 * Modified nodal analysis over whatever the player built. No topology is
 * assumed — every branch just contributes conductance between two supernodes,
 * and the battery is folded in as one extra unknown (its current) and one
 * extra equation (its terminal voltage difference equals its rating). That
 * genuinely-general formulation is what makes the bridge and the two-way
 * switch solvable without any series/parallel special-casing.
 */
function solveCircuit(components: CircuitComponent[]): SolveResult {
  const { find, union } = makeUnionFind(NODE_COUNT);

  // Zero-resistance branches collapse nodes together before the matrix exists.
  for (const c of components) {
    if (c.burnt) continue;
    if (c.type === 'wire') {
      union(c.nodes[0], c.nodes[1]);
    } else if (c.type === 'switch' && c.state === 'closed') {
      union(c.nodes[0], c.nodes[1]);
    } else if (c.type === 'spdt') {
      const activeThrow = c.state === 'B' ? c.nodes[2] : c.nodes[1];
      union(c.nodes[0], activeThrow);
    }
  }

  const empty = (status: SolveResult['status']): SolveResult => ({
    status,
    voltage: new Map(),
    current: new Map(),
    batteryCurrent: 0,
    find
  });

  const battery = components.find((c) => c.type === 'battery');
  if (!battery) return empty('no-power');

  const posSuper = find(battery.nodes[0]);
  const negSuper = find(battery.nodes[1]);
  if (posSuper === negSuper) return empty('short');

  interface RBranch {
    u: number;
    v: number;
    g: number;
    id: string;
  }
  const rbranches: RBranch[] = [];
  for (const c of components) {
    if (c.burnt) continue;
    if (c.type === 'wire' || c.type === 'battery' || c.type === 'spdt') continue;
    if (c.type === 'switch' && c.state !== 'closed') continue;
    const u = find(c.nodes[0]);
    const v = find(c.nodes[1]);
    if (u === v) continue; // shorted component contributes nothing
    rbranches.push({ u, v, g: 1 / Math.max(c.value, 1e-6), id: c.id });
  }

  // Every supernode touched by a resistive branch or the battery's + terminal
  // gets an unknown; the battery's − terminal is ground, fixed at 0V.
  const indexOf = new Map<number, number>();
  const addNode = (s: number) => {
    if (s === negSuper) return;
    if (!indexOf.has(s)) indexOf.set(s, indexOf.size);
  };
  addNode(posSuper);
  for (const rb of rbranches) {
    addNode(rb.u);
    addNode(rb.v);
  }

  const n = indexOf.size;
  const size = n + 1; // + the battery's own current, per modified nodal analysis
  const battRow = n;
  const A: number[][] = Array.from({ length: size }, () => new Array(size).fill(0));
  const b: number[] = new Array(size).fill(0);
  const idx = (s: number) => (s === negSuper ? -1 : indexOf.get(s) ?? -1);

  for (const rb of rbranches) {
    const iu = idx(rb.u);
    const iv = idx(rb.v);
    if (iu >= 0) {
      A[iu][iu] += rb.g;
      if (iv >= 0) A[iu][iv] -= rb.g;
    }
    if (iv >= 0) {
      A[iv][iv] += rb.g;
      if (iu >= 0) A[iv][iu] -= rb.g;
    }
  }

  // Battery: inject its unknown current at the + node, and pin V(+) - V(-) to its rating.
  const ip = idx(posSuper);
  if (ip >= 0) {
    A[ip][battRow] -= 1;
    A[battRow][ip] += 1;
  }
  b[battRow] = battery.value;

  const x = solveLinear(A, b);
  // A singular matrix here means a resistive sub-graph with no path back to
  // the battery at all — an unconnected fragment, not a crash.
  if (!x) return empty('open');

  const voltage = new Map<number, number>();
  voltage.set(negSuper, 0);
  for (const [s, i] of indexOf) voltage.set(s, x[i]);

  const current = new Map<string, number>();
  for (const rb of rbranches) {
    current.set(rb.id, ((voltage.get(rb.u) ?? 0) - (voltage.get(rb.v) ?? 0)) * rb.g);
  }
  current.set(battery.id, x[battRow]);

  return { status: 'ok', voltage, current, batteryCurrent: x[battRow], find };
}

function powerOf(c: CircuitComponent, result: SolveResult): number {
  const i = result.current.get(c.id) ?? 0;
  return i * i * c.value;
}

// ------------------------------------------------------------------ topology checks
// Small, standalone, and checkable by eye — these are what "solved" means per level.

/** True if `a` and `b` share exactly one supernode, and nothing else touches it —
 *  the structural definition of series (a single shared pinch point). */
function areInSeries(
  a: CircuitComponent,
  b: CircuitComponent,
  components: CircuitComponent[],
  find: (node: number) => number
): boolean {
  const supersOf = (c: CircuitComponent) => [find(c.nodes[0]), find(c.nodes[1])];
  const [au, av] = supersOf(a);
  const [bu, bv] = supersOf(b);
  const shared = new Set([au, av].filter((s) => s === bu || s === bv));
  if (shared.size !== 1) return false;
  const [pinch] = [...shared];

  let degree = 0;
  for (const c of components) {
    if (c.burnt) continue;
    if (c.type === 'wire') continue; // already folded into the supernode itself
    if (c.type === 'switch' && c.state !== 'closed') continue;
    if (c.type === 'spdt') {
      const activeThrow = c.state === 'B' ? c.nodes[2] : c.nodes[1];
      if (find(c.nodes[0]) === pinch || find(activeThrow) === pinch) degree++;
      continue;
    }
    if (find(c.nodes[0]) === pinch || find(c.nodes[1]) === pinch) degree++;
  }
  return degree === 2; // only a and b touch this node
}

/** Runs the solver across all four combinations of two two-way switches and
 *  checks that the result is a genuine alternator: flipping either switch
 *  alone changes the lamp, flipping both back together restores it. This is
 *  the level that most needs a real solver — there's no shortcut topology
 *  test for "is this wired as a hallway light," only running the physics. */
function evaluateHallwayLogic(components: CircuitComponent[]): boolean {
  const spdts = components.filter((c) => c.type === 'spdt');
  const bulb = components.find((c) => c.type === 'bulb' && !c.burnt);
  if (spdts.length !== 2 || !bulb) return false;
  const [s1, s2] = spdts;

  const litFor = (stateA: 'A' | 'B', stateB: 'A' | 'B'): boolean => {
    const trial = components.map((c) => {
      if (c.id === s1.id) return { ...c, state: stateA };
      if (c.id === s2.id) return { ...c, state: stateB };
      return c;
    });
    const r = solveCircuit(trial);
    return r.status === 'ok' && Math.abs(r.current.get(bulb.id) ?? 0) > LIT_THRESHOLD;
  };

  const aa = litFor('A', 'A');
  const bb = litFor('B', 'B');
  const ab = litFor('A', 'B');
  const ba = litFor('B', 'A');
  const isAlternator = aa === bb && ab === ba && aa !== ab;

  const s1State: 'A' | 'B' = s1.state === 'B' ? 'B' : 'A';
  const s2State: 'A' | 'B' = s2.state === 'B' ? 'B' : 'A';
  const currentlyLit = litFor(s1State, s2State);

  return isAlternator && currentlyLit;
}

// ------------------------------------------------------------------ ratings & levels

const LIT_THRESHOLD = 0.02; // amps — below this, "on" isn't a meaningful claim
const BALANCE_EPS = 0.003; // amps — galvanometer reading close enough to call "zero"
const RPM_PER_AMP = 200;
const DIMMER_TARGET: [number, number] = [55, 85];

const STANDARD_BULB = { resistance: 30, maxCurrent: 0.35 };
const FRAGILE_BULB = { resistance: 20, maxCurrent: 0.2 };
const DIMMER_MOTOR = { resistance: 10, maxCurrent: 1.2 };

const LEVELS: Level[] = [
  {
    id: 'close-the-loop',
    name: 'Close the Loop',
    brief: 'A battery, a bulb, a switch. Wire them into one unbroken loop and close the switch.',
    hint: 'Current has to leave the battery, pass through the bulb, and get all the way back — one gap anywhere, even an open switch, keeps it dark.',
    successText: 'One unbroken loop — that is every circuit in this game, underneath.',
    batteryVoltage: 9,
    tools: ['battery', 'wire', 'bulb', 'switch'],
    bulbRating: STANDARD_BULB,
    isSolved: ({ result, components }) => {
      const bulb = components.find((c) => c.type === 'bulb');
      if (!bulb || bulb.burnt || result.status !== 'ok') return false;
      return Math.abs(result.current.get(bulb.id) ?? 0) > LIT_THRESHOLD;
    }
  },
  {
    id: 'two-in-a-row',
    name: 'Two in a Row',
    brief: 'Wire two bulbs in series — one path, both bulbs on it — and watch what that does to their brightness.',
    hint: 'Chain battery, bulb, bulb, switch into a single loop with no branches. Sharing one path means sharing the current.',
    successText: 'Series wiring: the same current squeezes through both bulbs, so both run dimmer than one alone would.',
    batteryVoltage: 9,
    tools: ['battery', 'wire', 'bulb', 'switch'],
    bulbRating: STANDARD_BULB,
    isSolved: ({ result, components }) => {
      if (result.status !== 'ok') return false;
      const bulbs = components.filter((c) => c.type === 'bulb' && !c.burnt);
      if (bulbs.length !== 2) return false;
      const [a, b] = bulbs;
      const ia = Math.abs(result.current.get(a.id) ?? 0);
      const ib = Math.abs(result.current.get(b.id) ?? 0);
      if (ia <= LIT_THRESHOLD || ib <= LIT_THRESHOLD) return false;
      return areInSeries(a, b, components, result.find);
    }
  },
  {
    id: 'side-by-side',
    name: 'Side by Side',
    brief: 'Wire two bulbs in parallel — each on its own path between the same two points.',
    hint: 'Connect both bulbs to the exact same pair of nodes. Each one sees the full battery voltage.',
    successText: 'Parallel wiring: both bulbs get the full voltage and shine full brightness — but the battery now feeds both at once.',
    batteryVoltage: 9,
    tools: ['battery', 'wire', 'bulb', 'switch'],
    bulbRating: STANDARD_BULB,
    isSolved: ({ result, components }) => {
      if (result.status !== 'ok') return false;
      const bulbs = components.filter((c) => c.type === 'bulb' && !c.burnt);
      if (bulbs.length !== 2) return false;
      const [a, b] = bulbs;
      const ia = Math.abs(result.current.get(a.id) ?? 0);
      const ib = Math.abs(result.current.get(b.id) ?? 0);
      if (ia <= LIT_THRESHOLD || ib <= LIT_THRESHOLD) return false;
      const sa = new Set([result.find(a.nodes[0]), result.find(a.nodes[1])]);
      const sb = new Set([result.find(b.nodes[0]), result.find(b.nodes[1])]);
      return sa.size === 2 && sb.size === 2 && [...sa].every((s) => sb.has(s));
    }
  },
  {
    id: 'dont-pop-it',
    name: "Don't Pop It",
    brief: 'This bulb is only rated for 0.2 A and the battery is 9 V. Add a resistor in series to keep it lit and alive.',
    hint: 'Too little resistance and the bulb pops; too much and it barely glows. There is a window in the middle.',
    successText: "The resistor eats just enough voltage that the bulb runs safely under its rated current — lit, not popped.",
    batteryVoltage: 9,
    tools: ['battery', 'wire', 'bulb', 'resistor'],
    bulbRating: FRAGILE_BULB,
    resistorChoices: [5, 10, 22, 47, 100],
    isSolved: ({ result, components }) => {
      const bulb = components.find((c) => c.type === 'bulb');
      if (!bulb || bulb.burnt || result.status !== 'ok') return false;
      const i = Math.abs(result.current.get(bulb.id) ?? 0);
      return i > LIT_THRESHOLD && i <= (bulb.maxCurrent ?? Infinity);
    }
  },
  {
    id: 'the-dimmer',
    name: 'The Dimmer',
    brief: 'A potentiometer and a motor. Slide the dial until the motor holds inside the target RPM band for 3 seconds.',
    hint: 'More resistance on the dial means less current means a slower motor. Sneak up on the band slowly rather than jumping to it.',
    successText: 'Held it. The dial trades resistance for speed smoothly — current, not some fixed setting, is what actually spins the motor.',
    batteryVoltage: 9,
    tools: ['battery', 'wire', 'motor', 'potentiometer'],
    motorRating: DIMMER_MOTOR,
    potRange: [0, 90],
    potStep: 2,
    isSolved: ({ result, components }) => {
      const motor = components.find((c) => c.type === 'motor');
      if (!motor || motor.burnt || result.status !== 'ok') return false;
      const rpm = Math.abs(result.current.get(motor.id) ?? 0) * RPM_PER_AMP;
      return rpm >= DIMMER_TARGET[0] && rpm <= DIMMER_TARGET[1];
    }
  },
  {
    id: 'the-bridge',
    name: 'The Bridge',
    brief:
      "Build a Wheatstone bridge — two known resistors, the mystery resistor, the dial, and the galvanometer across the middle — and balance the meter to zero.",
    hint:
      'Two arms out of the battery\'s + terminal, two arms into its − terminal, galvanometer bridging the two midpoints. There is no series/parallel shortcut for this one — that is the point.',
    successText: 'Balanced. A zero reading on the galvanometer means no current crosses the bridge at all — that is what "solving for the unknown" looks like.',
    batteryVoltage: 9,
    tools: ['battery', 'wire', 'resistor', 'potentiometer', 'galvanometer'],
    resistorChoices: [220],
    unknownResistance: 330,
    potRange: [0, 500],
    potStep: 5,
    galvanometerResistance: 80,
    isSolved: ({ result, components }) => {
      if (result.status !== 'ok') return false;
      const galv = components.find((c) => c.type === 'galvanometer');
      if (!galv) return false;
      return Math.abs(result.current.get(galv.id) ?? 0) < BALANCE_EPS;
    }
  },
  {
    id: 'two-way-switch',
    name: 'Two-Way Switch',
    brief: 'The hallway-light problem: one lamp, two switches, and either one has to be able to turn it on or off.',
    hint: 'Each switch is a fork, not an on/off — it sends current down one of two wires depending on its position. Wire the two forks so every combination of positions does something.',
    successText: 'Flip either switch and the lamp changes — a real two-way circuit, checked by running the solver across all four switch combinations.',
    batteryVoltage: 9,
    tools: ['battery', 'wire', 'bulb', 'spdt'],
    bulbRating: STANDARD_BULB,
    isSolved: ({ components }) => evaluateHallwayLogic(components)
  }
];

/** Read by `badges.ts` so the "built them all" achievement tracks reality. */
export const SHORT_CIRCUIT_LEVEL_COUNT = LEVELS.length;

// ------------------------------------------------------------------ component factory

function nextId(type: ComponentType): string {
  return `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeComponent(
  type: ComponentType,
  nodes: number[],
  level: Level,
  resistorValue: number,
  resistorIsUnknown: boolean
): CircuitComponent {
  const id = nextId(type);
  switch (type) {
    case 'wire':
      return { id, type, nodes, value: 0 };
    case 'resistor':
      return resistorIsUnknown
        ? { id, type, nodes, value: level.unknownResistance ?? 100, hidden: true }
        : { id, type, nodes, value: resistorValue };
    case 'bulb': {
      const r = level.bulbRating ?? STANDARD_BULB;
      return { id, type, nodes, value: r.resistance, maxCurrent: r.maxCurrent };
    }
    case 'motor': {
      const r = level.motorRating ?? DIMMER_MOTOR;
      return { id, type, nodes, value: r.resistance, maxCurrent: r.maxCurrent };
    }
    case 'battery':
      return { id, type, nodes, value: level.batteryVoltage };
    case 'switch':
      return { id, type, nodes, value: 0, state: 'closed' };
    case 'potentiometer': {
      const [lo, hi] = level.potRange ?? [0, 100];
      return { id, type, nodes, value: Math.round((lo + hi) / 2) };
    }
    case 'galvanometer':
      return { id, type, nodes, value: level.galvanometerResistance ?? 80 };
    case 'spdt':
      return { id, type, nodes, value: 0, state: 'A' };
  }
}

// ------------------------------------------------------------------ tray metadata

type IconComponent = typeof Zap;

const TOOL_META: Record<ToolId, { label: string; icon?: IconComponent; badge?: string; color: string }> = {
  wire: { label: 'Wire', icon: Zap, color: 'bg-zinc-500/20 border-zinc-500/40 text-zinc-300' },
  resistor: { label: 'Resistor', badge: 'Ω', color: 'bg-sky-500/20 border-sky-500/40 text-sky-300' },
  bulb: { label: 'Bulb', icon: Lightbulb, color: 'bg-amber-500/20 border-amber-500/40 text-amber-300' },
  motor: { label: 'Motor', icon: Fan, color: 'bg-violet-500/20 border-violet-500/40 text-violet-300' },
  battery: { label: 'Battery', icon: BatteryCharging, color: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' },
  switch: { label: 'Switch', icon: ToggleLeft, color: 'bg-sky-500/20 border-sky-500/40 text-sky-300' },
  potentiometer: {
    label: 'Dial',
    icon: SlidersHorizontal,
    color: 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300'
  },
  galvanometer: { label: 'Galvanometer', icon: Gauge, color: 'bg-sky-500/20 border-sky-500/40 text-sky-300' },
  spdt: { label: 'Two-way switch', icon: ToggleRight, color: 'bg-sky-500/20 border-sky-500/40 text-sky-300' },
  erase: { label: 'Erase', icon: Eraser, color: 'bg-red-500/20 border-red-500/40 text-red-300' },
  meter: { label: 'Multimeter', icon: Activity, color: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' }
};

// ------------------------------------------------------------------ component

interface ShortCircuitProps {
  /** Level indices already solved, owned and persisted by the app. */
  solvedLevels: number[];
  onSolve: (levelIndex: number) => void;
}

export default function ShortCircuit({ solvedLevels, onSolve }: ShortCircuitProps) {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = LEVELS[levelIndex];

  const [components, setComponents] = useState<CircuitComponent[]>([]);
  const [tool, setTool] = useState<ToolId | null>(null);
  const [pending, setPending] = useState<number[]>([]);
  const [meterProbes, setMeterProbes] = useState<number[]>([]);
  const [resistorValue, setResistorValue] = useState<number>(level.resistorChoices?.[0] ?? 22);
  const [resistorIsUnknown, setResistorIsUnknown] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [poppedIds, setPoppedIds] = useState<string[]>([]);
  const [holdMs, setHoldMs] = useState(0);

  const holdMsRef = useRef(0);
  const instSolvedRef = useRef(false);

  const resetBoard = () => {
    setComponents([]);
    setPending([]);
    setMeterProbes([]);
    setTool(null);
    setResistorIsUnknown(false);
    holdMsRef.current = 0;
    setHoldMs(0);
  };

  // A new level starts from a blank board sized to that level's own tray.
  useEffect(() => {
    resetBoard();
    setResistorValue(level.resistorChoices?.[0] ?? 22);
    setShowHint(false);
    // Intentionally only reacting to the level changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelIndex]);

  const result = useMemo(() => solveCircuit(components), [components]);

  // Bulbs and the motor burn out the instant they're driven past their rating.
  useEffect(() => {
    if (result.status !== 'ok') return;
    const toBurn: string[] = [];
    for (const c of components) {
      if ((c.type === 'bulb' || c.type === 'motor') && !c.burnt && c.maxCurrent !== undefined) {
        const i = Math.abs(result.current.get(c.id) ?? 0);
        if (i > c.maxCurrent) toBurn.push(c.id);
      }
    }
    if (toBurn.length === 0) return;
    setComponents((prev) => prev.map((c) => (toBurn.includes(c.id) ? { ...c, burnt: true } : c)));
    setPoppedIds((prev) => [...prev, ...toBurn]);
    const timer = window.setTimeout(() => {
      setPoppedIds((prev) => prev.filter((id) => !toBurn.includes(id)));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [result, components]);

  const instSolved = useMemo(() => level.isSolved({ result, components }), [level, result, components]);

  useEffect(() => {
    instSolvedRef.current = instSolved;
  }, [instSolved]);

  // The Dimmer (index 4) needs the band held for 3 continuous seconds, not just touched.
  useEffect(() => {
    if (levelIndex !== 4) return;
    const interval = window.setInterval(() => {
      holdMsRef.current = instSolvedRef.current ? Math.min(3000, holdMsRef.current + 120) : 0;
      setHoldMs(holdMsRef.current);
    }, 120);
    return () => window.clearInterval(interval);
  }, [levelIndex]);

  const solved = levelIndex === 4 ? holdMs >= 3000 : instSolved;

  useEffect(() => {
    if (solved) onSolve(levelIndex);
  }, [solved, levelIndex, onSolve]);

  // ------------------------------------------------------------------ interaction

  const selectTool = (t: ToolId) => {
    setTool((prev) => (prev === t ? null : t));
    setPending([]);
    setResistorIsUnknown(false);
  };

  const selectMysteryResistor = () => {
    setTool('resistor');
    setResistorIsUnknown(true);
    setPending([]);
  };

  const commitComponent = (type: ComponentType, nodes: number[]) => {
    const created = makeComponent(type, nodes, level, resistorValue, resistorIsUnknown);
    setComponents((prev) => {
      const base = type === 'battery' ? prev.filter((c) => c.type !== 'battery') : prev;
      return [...base, created];
    });
  };

  const handleNodeClick = (nodeId: number) => {
    if (tool === 'meter') {
      setMeterProbes((prev) => {
        if (prev.includes(nodeId)) return [];
        if (prev.length >= 2) return [nodeId];
        return [...prev, nodeId];
      });
      return;
    }
    if (!tool || tool === 'erase') return;
    const activeTool: ComponentType = tool;
    const need = activeTool === 'spdt' ? 3 : 2;
    setPending((prev) => {
      if (prev.includes(nodeId)) return [];
      const next = [...prev, nodeId];
      if (next.length === need) {
        commitComponent(activeTool, next);
        return [];
      }
      return next;
    });
  };

  const handleComponentClick = (id: string) => {
    if (tool === 'erase') {
      setComponents((prev) => prev.filter((c) => c.id !== id));
      return;
    }
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (c.type === 'switch') return { ...c, state: c.state === 'closed' ? 'open' : 'closed' };
        if (c.type === 'spdt') return { ...c, state: c.state === 'A' ? 'B' : 'A' };
        return c;
      })
    );
  };

  const onComponentClick = (id: string) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    handleComponentClick(id);
  };

  const potComponent = components.find((c) => c.type === 'potentiometer') ?? null;
  const battery = components.find((c) => c.type === 'battery') ?? null;
  const bulbs = components.filter((c) => c.type === 'bulb');
  const motors = components.filter((c) => c.type === 'motor');
  const galvComponent = components.find((c) => c.type === 'galvanometer') ?? null;
  const motorComponent = motors[0] ?? null;

  const meterReading = useMemo(() => {
    if (meterProbes.length !== 2 || result.status !== 'ok') return null;
    const [n1, n2] = meterProbes;
    const s1 = result.find(n1);
    const s2 = result.find(n2);
    const v1 = result.voltage.get(s1) ?? 0;
    const v2 = result.voltage.get(s2) ?? 0;
    const direct = components.find(
      (c) =>
        c.type !== 'wire' &&
        c.type !== 'spdt' &&
        ((c.nodes[0] === n1 && c.nodes[1] === n2) || (c.nodes[0] === n2 && c.nodes[1] === n1))
    );
    const current = direct ? result.current.get(direct.id) ?? 0 : null;
    return { voltage: v1 - v2, current, resistance: direct ? direct.value : null };
  }, [meterProbes, result, components]);

  const isLast = levelIndex === LEVELS.length - 1;

  /** Only speaks up once something has actually burned out — not a proactive
   *  tutorial on each part before the player has tried anything. */
  const burntComponent = components.find((c) => c.burnt);
  const mistakeNote = burntComponent
    ? `That ${burntComponent.type} popped — more current tried to force through it than its rating allows. Cut the resistance in its path and current only goes up from there.`
    : null;

  // ------------------------------------------------------------------ svg parts

  const renderComponent = (c: CircuitComponent) => {
    const isBurnt = !!c.burnt;
    const current = result.current.get(c.id) ?? 0;

    if (c.type === 'spdt') {
      const common = nodePos(c.nodes[0]);
      const throwA = nodePos(c.nodes[1]);
      const throwB = nodePos(c.nodes[2]);
      const active = c.state === 'B' ? throwB : throwA;
      const inactive = c.state === 'B' ? throwA : throwB;
      return (
        <g key={c.id} onClick={onComponentClick(c.id)} className="cursor-pointer">
          <line x1={common.x} y1={common.y} x2={inactive.x} y2={inactive.y} stroke="#52525b" strokeWidth={3} strokeDasharray="4 4" />
          <line x1={common.x} y1={common.y} x2={active.x} y2={active.y} stroke="#38bdf8" strokeWidth={4} strokeLinecap="round" />
          <circle cx={common.x} cy={common.y} r={7} fill="#38bdf8" />
          <text x={common.x} y={common.y - 12} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="#93c5fd">
            {c.state}
          </text>
        </g>
      );
    }

    const a = nodePos(c.nodes[0]);
    const b = nodePos(c.nodes[1]);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const hitLine = <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={16} />;

    if (c.type === 'wire') {
      return (
        <g key={c.id} onClick={onComponentClick(c.id)} className="cursor-pointer">
          {hitLine}
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#a1a1aa" strokeWidth={4} strokeLinecap="round" />
        </g>
      );
    }

    if (c.type === 'switch') {
      const closed = c.state === 'closed';
      const leverEnd = closed ? b : { x: mx + (b.y - a.y) * 0.18, y: my - (b.x - a.x) * 0.18 };
      return (
        <g key={c.id} onClick={onComponentClick(c.id)} className="cursor-pointer">
          {hitLine}
          <line x1={a.x} y1={a.y} x2={mx} y2={my} stroke="#a1a1aa" strokeWidth={4} strokeLinecap="round" />
          <line
            x1={mx}
            y1={my}
            x2={leverEnd.x}
            y2={leverEnd.y}
            stroke={closed ? '#34d399' : '#f59e0b'}
            strokeWidth={4}
            strokeLinecap="round"
          />
          {closed && <line x1={leverEnd.x} y1={leverEnd.y} x2={b.x} y2={b.y} stroke="#a1a1aa" strokeWidth={4} strokeLinecap="round" />}
          <circle cx={mx} cy={my} r={4} fill="#3f3f46" />
        </g>
      );
    }

    if (c.type === 'resistor') {
      return (
        <g key={c.id} onClick={onComponentClick(c.id)} className="cursor-pointer">
          {hitLine}
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#3f3f46" strokeWidth={2} />
          <path d={zigZagPath(a, b)} fill="none" stroke="#38bdf8" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          <text x={mx} y={my - 14} textAnchor="middle" fontSize={10} fontFamily="monospace" fill="#7dd3fc">
            {c.hidden ? 'R?' : `${c.value}Ω`}
          </text>
        </g>
      );
    }

    if (c.type === 'potentiometer') {
      const [lo, hi] = level.potRange ?? [0, 100];
      const ratio = hi > lo ? (c.value - lo) / (hi - lo) : 0.5;
      const angle = -Math.PI / 2 + ratio * Math.PI;
      const tip = { x: mx + Math.cos(angle) * 20, y: my - 10 + Math.sin(angle) * 20 };
      return (
        <g key={c.id} onClick={onComponentClick(c.id)} className="cursor-pointer">
          {hitLine}
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#3f3f46" strokeWidth={2} />
          <path d={zigZagPath(a, b)} fill="none" stroke="#e879f9" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          <line x1={mx} y1={my - 10} x2={tip.x} y2={tip.y} stroke="#f0abfc" strokeWidth={2.5} strokeLinecap="round" />
          <text x={mx} y={my + 22} textAnchor="middle" fontSize={10} fontFamily="monospace" fill="#f0abfc">
            {Math.round(c.value)}Ω
          </text>
        </g>
      );
    }

    if (c.type === 'battery') {
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const px = -(b.y - a.y) / len;
      const py = (b.x - a.x) / len;
      const p1 = { x: a.x + (b.x - a.x) * 0.42, y: a.y + (b.y - a.y) * 0.42 };
      const p2 = { x: a.x + (b.x - a.x) * 0.58, y: a.y + (b.y - a.y) * 0.58 };
      return (
        <g key={c.id} onClick={onComponentClick(c.id)} className="cursor-pointer">
          {hitLine}
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#a1a1aa" strokeWidth={3} />
          <line x1={p1.x - px * 12} y1={p1.y - py * 12} x2={p1.x + px * 12} y2={p1.y + py * 12} stroke="#4ade80" strokeWidth={5} strokeLinecap="round" />
          <line x1={p2.x - px * 7} y1={p2.y - py * 7} x2={p2.x + px * 7} y2={p2.y + py * 7} stroke="#4ade80" strokeWidth={3} strokeLinecap="round" />
          <text x={mx} y={my - 16} textAnchor="middle" fontSize={10} fontFamily="monospace" fill="#86efac">
            {c.value}V
          </text>
        </g>
      );
    }

    if (c.type === 'galvanometer') {
      const magnitude = Math.min(1, Math.abs(current) / 0.03);
      const sign = current >= 0 ? 1 : -1;
      const needleAngle = sign * magnitude * ((55 * Math.PI) / 180);
      const balanced = Math.abs(current) < BALANCE_EPS;
      return (
        <g key={c.id} onClick={onComponentClick(c.id)} className="cursor-pointer">
          {hitLine}
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#3f3f46" strokeWidth={2} />
          <circle cx={mx} cy={my} r={16} fill="#18181b" stroke={balanced ? '#34d399' : '#71717a'} strokeWidth={2} />
          <line
            x1={mx}
            y1={my}
            x2={mx + Math.sin(needleAngle) * 11}
            y2={my - Math.cos(needleAngle) * 11}
            stroke={balanced ? '#34d399' : '#fbbf24'}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <text x={mx} y={my + 28} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="#a1a1aa">
            G
          </text>
        </g>
      );
    }

    if (c.type === 'motor') {
      const rpm = Math.abs(current) * RPM_PER_AMP;
      const spinning = rpm > 1 && !isBurnt;
      return (
        <g key={c.id} onClick={onComponentClick(c.id)} className="cursor-pointer">
          {hitLine}
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#3f3f46" strokeWidth={2} />
          <circle cx={mx} cy={my} r={16} fill={isBurnt ? '#3f3f46' : 'rgba(167,139,250,0.2)'} stroke={isBurnt ? '#71717a' : '#a78bfa'} strokeWidth={2} />
          <g className={spinning ? 'animate-spin' : ''} style={{ transformOrigin: `${mx}px ${my}px` }}>
            <line x1={mx - 9} y1={my} x2={mx + 9} y2={my} stroke={isBurnt ? '#71717a' : '#c4b5fd'} strokeWidth={2.5} strokeLinecap="round" />
            <line x1={mx} y1={my - 9} x2={mx} y2={my + 9} stroke={isBurnt ? '#71717a' : '#c4b5fd'} strokeWidth={2.5} strokeLinecap="round" />
          </g>
          <text x={mx} y={my + 28} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="#a1a1aa">
            {isBurnt ? 'burnt out' : `${Math.round(rpm)} rpm`}
          </text>
        </g>
      );
    }

    // bulb
    const rated = c.maxCurrent ?? 1;
    const brightness = isBurnt ? 0 : Math.min(1, (Math.abs(current) / rated) ** 2);
    const glowId = `glow-${c.id}`;
    return (
      <g key={c.id} onClick={onComponentClick(c.id)} className="cursor-pointer">
        {hitLine}
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#3f3f46" strokeWidth={2} />
        {!isBurnt && brightness > 0.02 && (
          <>
            <defs>
              <radialGradient id={glowId}>
                <stop offset="0%" stopColor="#fde68a" stopOpacity={brightness} />
                <stop offset="100%" stopColor="#fde68a" stopOpacity={0} />
              </radialGradient>
            </defs>
            <circle cx={mx} cy={my} r={26} fill={`url(#${glowId})`} />
          </>
        )}
        <circle
          cx={mx}
          cy={my}
          r={13}
          fill={isBurnt ? '#3f3f46' : `rgba(253,230,138,${0.25 + brightness * 0.65})`}
          stroke={isBurnt ? '#71717a' : '#fbbf24'}
          strokeWidth={2}
        />
        <path
          d={`M ${mx - 5} ${my + 4} L ${mx - 2} ${my - 4} L ${mx + 2} ${my + 4} L ${mx + 5} ${my - 4}`}
          fill="none"
          stroke={isBurnt ? '#52525b' : '#78350f'}
          strokeWidth={1.5}
        />
        {poppedIds.includes(c.id) &&
          [0, 1, 2].map((i) => (
            <motion.circle
              key={`${c.id}-smoke-${i}`}
              cx={mx + (i - 1) * 6}
              cy={my}
              r={4}
              fill="#a1a1aa"
              initial={{ opacity: 0.7, y: 0 }}
              animate={{ opacity: 0, y: -28 - i * 5 }}
              transition={{ duration: 0.9, delay: i * 0.08 }}
            />
          ))}
      </g>
    );
  };

  // ------------------------------------------------------------------ render

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {LEVELS.map((lvl, i) => (
          <button
            key={lvl.id}
            onClick={() => setLevelIndex(i)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono border transition cursor-pointer flex items-center gap-1.5 ${
              i === levelIndex
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {solvedLevels.includes(i) && <Trophy className="w-3 h-3 text-amber-400" />}
            {i + 1}. {lvl.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-2xl">{level.brief}</p>
        <button
          onClick={() => setShowHint((s) => !s)}
          className="text-[11px] font-mono text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-1 shrink-0"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          {showHint ? 'Hide hint' : 'Hint'}
        </button>
      </div>

      {showHint && (
        <p className="text-xs text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 font-sans leading-relaxed">
          {level.hint}
        </p>
      )}

      {result.status === 'short' && (
        <div className="flex items-center gap-2 text-xs font-sans text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Short circuit! The battery&apos;s two terminals are wired straight together — nothing gets to light up.
        </div>
      )}
      {result.status === 'open' && components.length > 0 && (
        <div className="flex items-center gap-2 text-xs font-sans text-zinc-400 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Part of what you&apos;ve built isn&apos;t connected back to the battery yet.
        </div>
      )}
      {result.status === 'no-power' && components.length > 0 && (
        <div className="flex items-center gap-2 text-xs font-sans text-zinc-400 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Place a battery to bring the board to life.
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_260px] gap-4 items-start">
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d12] relative">
          <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className="w-full block touch-none select-none" onClick={() => setPending([])}>
            {Array.from({ length: NODE_COUNT }).map((_, id) => {
              const p = nodePos(id);
              const isPending = pending.includes(id);
              const isProbe = meterProbes.includes(id);
              return (
                <circle
                  key={id}
                  cx={p.x}
                  cy={p.y}
                  r={isPending || isProbe ? 6 : 3.5}
                  fill={isProbe ? '#22d3ee' : isPending ? '#fbbf24' : '#3f3f46'}
                  className="cursor-pointer transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNodeClick(id);
                  }}
                />
              );
            })}

            {components.map((c) => renderComponent(c))}

            {result.status === 'short' && battery && (
              <g>
                <circle cx={nodePos(battery.nodes[0]).x} cy={nodePos(battery.nodes[0]).y} r={10} fill="#f97316" className="animate-ping" />
                <circle cx={nodePos(battery.nodes[0]).x} cy={nodePos(battery.nodes[0]).y} r={6} fill="#ef4444" />
              </g>
            )}
          </svg>

          {solved && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-center px-6">
              <Trophy className="w-10 h-10 text-amber-400" />
              <h4 className="font-display font-bold text-xl text-emerald-400">{level.name} — solved!</h4>
              <p className="text-xs text-zinc-300 font-sans max-w-sm leading-relaxed">{level.successText}</p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={resetBoard}
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer transition"
                >
                  Rebuild
                </button>
                {!isLast && (
                  <button
                    onClick={() => setLevelIndex((i) => i + 1)}
                    className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-stone-950 cursor-pointer transition flex items-center gap-1"
                  >
                    Next circuit <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {level.tools.map((t) => {
              const meta = TOOL_META[t];
              const Icon = meta.icon;
              const isActive = tool === t && !(t === 'resistor' && resistorIsUnknown);
              return (
                <button
                  key={t}
                  onClick={() => selectTool(t)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-mono border transition cursor-pointer flex items-center gap-1.5 ${
                    isActive ? meta.color : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {Icon ? <Icon className="w-3.5 h-3.5" /> : <span className="font-bold">{meta.badge}</span>}
                  {meta.label}
                </button>
              );
            })}
            {level.id === 'the-bridge' && (
              <button
                onClick={selectMysteryResistor}
                className={`px-3 py-1.5 rounded-full text-[11px] font-mono border transition cursor-pointer flex items-center gap-1.5 ${
                  tool === 'resistor' && resistorIsUnknown
                    ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <span className="font-bold">R?</span> Mystery resistor
              </button>
            )}
            <button
              onClick={() => selectTool('erase')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-mono border transition cursor-pointer flex items-center gap-1.5 ${
                tool === 'erase' ? TOOL_META.erase.color : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" /> Erase
            </button>
            <button
              onClick={() => selectTool('meter')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-mono border transition cursor-pointer flex items-center gap-1.5 ${
                tool === 'meter' ? TOOL_META.meter.color : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Multimeter
            </button>
          </div>

          {mistakeNote && (
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">{mistakeNote}</p>
          )}

          {tool === 'resistor' && !resistorIsUnknown && level.resistorChoices && (
            <div className="flex flex-wrap gap-1.5">
              {level.resistorChoices.map((v) => (
                <button
                  key={v}
                  onClick={() => setResistorValue(v)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border cursor-pointer transition ${
                    resistorValue === v
                      ? 'bg-sky-500 border-sky-400 text-stone-950 font-bold'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {v}Ω
                </button>
              ))}
            </div>
          )}

          {potComponent && level.potRange && (
            <div className="space-y-1 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-300/80">
                Dial: {Math.round(potComponent.value)}Ω
              </label>
              <input
                type="range"
                min={level.potRange[0]}
                max={level.potRange[1]}
                step={level.potStep ?? 1}
                value={potComponent.value}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  const potId = potComponent.id;
                  setComponents((prev) => prev.map((c) => (c.id === potId ? { ...c, value: v } : c)));
                }}
                className="w-full accent-fuchsia-400 cursor-pointer"
              />
            </div>
          )}

          {tool === 'meter' && (
            <div className="space-y-1 bg-white/[0.03] border border-cyan-500/20 rounded-xl px-3 py-2.5 text-[11px] font-mono text-cyan-200">
              <p>Tap two nodes to probe between them.</p>
              {meterReading ? (
                <>
                  <p>
                    Voltage: <b>{meterReading.voltage.toFixed(2)} V</b>
                  </p>
                  <p>
                    Current: <b>{meterReading.current !== null ? `${(meterReading.current * 1000).toFixed(1)} mA` : '—'}</b>
                  </p>
                  <p>
                    Resistance: <b>{meterReading.resistance !== null ? `${meterReading.resistance.toFixed(0)} Ω` : '—'}</b>
                  </p>
                </>
              ) : (
                <p className="text-cyan-400/50">No reading yet.</p>
              )}
            </div>
          )}

          {levelIndex === 4 && (
            <div className="space-y-1">
              <p className="text-[11px] font-mono text-zinc-400">
                Hold the band: {(holdMs / 1000).toFixed(1)}s / 3.0s
              </p>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-emerald-400 transition-[width]" style={{ width: `${(holdMs / 3000) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-mono text-zinc-400 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5">
        <span>
          Battery: <b className="text-white">{battery ? `${battery.value}V` : '—'}</b>
        </span>
        <span>
          Total current:{' '}
          <b className="text-white">{result.status === 'ok' ? `${(Math.abs(result.batteryCurrent) * 1000).toFixed(0)} mA` : '0 mA'}</b>
        </span>
        {bulbs.map((c, i) => (
          <span key={c.id}>
            Bulb {i + 1}:{' '}
            <b className={c.burnt ? 'text-red-400' : 'text-emerald-400'}>
              {c.burnt ? 'burnt out' : `${(powerOf(c, result) * 1000).toFixed(0)} mW`}
            </b>
          </span>
        ))}
        {motorComponent && (
          <span>
            Motor RPM: <b className="text-white">{Math.round(Math.abs(result.current.get(motorComponent.id) ?? 0) * RPM_PER_AMP)}</b>
          </span>
        )}
        {galvComponent && (
          <span>
            Galvanometer:{' '}
            <b className={Math.abs(result.current.get(galvComponent.id) ?? 0) < BALANCE_EPS ? 'text-emerald-400' : 'text-amber-400'}>
              {((result.current.get(galvComponent.id) ?? 0) * 1000).toFixed(1)} mA
            </b>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-zinc-400">
        <span>Pick a part, then tap two dots to place it · tap a placed switch to flip it · Erase removes what you tap</span>
        <button onClick={resetBoard} className="flex items-center gap-1.5 hover:text-white cursor-pointer transition">
          <RotateCcw className="w-3.5 h-3.5" /> Clear board
        </button>
      </div>
    </div>
  );
}
