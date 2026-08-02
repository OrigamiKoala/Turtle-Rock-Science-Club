import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trophy, Lightbulb, Play, Pause, RotateCcw, Plus, Minus, Power, ChevronRight } from 'lucide-react';

/**
 * Reactor Line
 * ------------
 * Factorio, but conservation of mass is the law. Reagent silos feed reaction
 * nodes feed a product tank; a node refuses to run until its equation is
 * balanced, and balance is verified for real — by parsing every formula into
 * an element -> count map and comparing the reagent side against the product
 * side, scaled by whatever coefficients the player has dialed in.
 *
 * The simulation is a discrete tick, not a continuous flow model: every tick,
 * every enabled + balanced node consumes `min(available / coefficient)`
 * across its reagents (the limiting-reagent calculation, done for real) and
 * emits products at that reaction's yield fraction. Nothing here special-cases
 * a "correct answer" — the same generic engine drives all seven levels,
 * including the multi-step chain (level 4), the finite scarce reagent
 * (level 3), the lossy yield (level 5), the byproduct recycle loop (level 6)
 * and the multi-route cost comparison (level 7), because every reagent and
 * product lives in one shared `stock` pool keyed by formula.
 */

// ------------------------------------------------------------------ formulas

type ElementCounts = Record<string, number>;

const formulaCache = new Map<string, ElementCounts>();

/** Parses formulas like `Fe2O3` and `Ca(OH)2` into an element -> count map. */
function parseFormula(formula: string): ElementCounts {
  const cached = formulaCache.get(formula);
  if (cached) return cached;

  let i = 0;

  function parseCount(): number {
    const start = i;
    while (i < formula.length && formula[i] >= '0' && formula[i] <= '9') i++;
    return i === start ? 1 : parseInt(formula.slice(start, i), 10);
  }

  function parseSegment(): ElementCounts {
    const counts: ElementCounts = {};
    while (i < formula.length && formula[i] !== ')') {
      const ch = formula[i];
      if (ch === '(') {
        i++;
        const inner = parseSegment();
        i++; // consume the matching ')'
        const mult = parseCount();
        for (const el in inner) counts[el] = (counts[el] ?? 0) + inner[el] * mult;
      } else if (ch >= 'A' && ch <= 'Z') {
        const start = i;
        i++;
        while (i < formula.length && formula[i] >= 'a' && formula[i] <= 'z') i++;
        const el = formula.slice(start, i);
        const n = parseCount();
        counts[el] = (counts[el] ?? 0) + n;
      } else {
        i++; // skip anything unexpected rather than crash the UI on it
      }
    }
    return counts;
  }

  const result = parseSegment();
  formulaCache.set(formula, result);
  return result;
}

const SUBSCRIPT_DIGITS: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
};

/** `Fe2O3` -> `Fe₂O₃`, for display anywhere a formula is rendered. */
function toDisplayFormula(formula: string): string {
  return formula.replace(/\d/g, (d) => SUBSCRIPT_DIGITS[d] ?? d);
}

// ------------------------------------------------------------------ types

interface SpeciesRef {
  formula: string;
}

interface ReactionDef {
  id: string;
  label: string;
  reagents: SpeciesRef[];
  products: SpeciesRef[];
  /** Fraction of stoichiometric product actually isolated; 1 = no loss. */
  yield: number;
  /** Cap on reaction-units per tick, purely for pacing the animation. */
  maxRate: number;
}

interface SiloDef {
  formula: string;
  /** Amount released into stock per tick, while the silo's valve is open. */
  rate: number;
  /** Total lifetime amount available. `Infinity` for an unlimited feed. */
  cap: number;
  /** Cost per unit drawn — only levels with a `budget` use this. */
  price?: number;
}

interface LevelSpec {
  name: string;
  subtitle: string;
  hint: string;
  reactions: ReactionDef[];
  silos: SiloDef[];
  target: { formula: string; quantity: number };
  /** When set, solving also requires total silo spend to stay under this. */
  budget?: number;
}

interface NodeCoeffs {
  reagents: number[];
  products: number[];
}

interface SimState {
  /** Live, consumable inventory of every formula in play. */
  stock: Record<string, number>;
  /** Monotonic — never decreases, even when recycling draws material back
   *  out of `stock`. This is what quota checks against. */
  totalProduced: Record<string, number>;
  siloRemaining: Record<string, number>;
  spent: Record<string, number>;
  batches: number;
}

// ------------------------------------------------------------------ levels

const LEVELS: LevelSpec[] = [
  {
    name: 'Make Water',
    subtitle: 'H₂ + O₂ → H₂O — the simplest reactor on the line',
    hint: 'Two hydrogens for every oxygen, and two waters come out. Balance the coefficients so every atom on the left has a match on the right, then hit Run.',
    reactions: [
      { id: 'n1', label: 'Reactor', reagents: [{ formula: 'H2' }, { formula: 'O2' }], products: [{ formula: 'H2O' }], yield: 1, maxRate: 6 }
    ],
    silos: [
      { formula: 'H2', rate: 4, cap: Infinity },
      { formula: 'O2', rate: 4, cap: Infinity }
    ],
    target: { formula: 'H2O', quantity: 20 }
  },
  {
    name: 'Rust Never Sleeps',
    subtitle: 'Fe + O₂ → Fe₂O₃ — the coefficients get uglier',
    hint: 'Iron rusts as Fe₂O₃, not FeO. Balance the oxygens across both sides first, then fix the irons to match.',
    reactions: [
      { id: 'n1', label: 'Reactor', reagents: [{ formula: 'Fe' }, { formula: 'O2' }], products: [{ formula: 'Fe2O3' }], yield: 1, maxRate: 6 }
    ],
    silos: [
      { formula: 'Fe', rate: 3, cap: Infinity },
      { formula: 'O2', rate: 3, cap: Infinity }
    ],
    target: { formula: 'Fe2O3', quantity: 16 }
  },
  {
    name: 'The Bottleneck',
    subtitle: 'Al + O₂ → Al₂O₃ — one silo runs dry',
    hint: 'Aluminum is abundant here; oxygen is not — only 12 units of it will ever arrive. Work out the most Al₂O₃ that oxygen can make before you assume more aluminum helps.',
    reactions: [
      { id: 'n1', label: 'Reactor', reagents: [{ formula: 'Al' }, { formula: 'O2' }], products: [{ formula: 'Al2O3' }], yield: 1, maxRate: 5 }
    ],
    silos: [
      { formula: 'Al', rate: 8, cap: Infinity },
      { formula: 'O2', rate: 3, cap: 12 }
    ],
    target: { formula: 'Al2O3', quantity: 8 }
  },
  {
    name: 'Two-Step',
    subtitle: 'Ammonia synthesis feeds a fertiliser line',
    hint: 'Node 1 makes the ammonia that node 2 consumes — balance each equation on its own first. If node 1 outruns node 2, watch the NH₃ pile up on the connecting pipe.',
    reactions: [
      { id: 'a', label: 'Synthesize NH₃', reagents: [{ formula: 'N2' }, { formula: 'H2' }], products: [{ formula: 'NH3' }], yield: 1, maxRate: 6 },
      { id: 'b', label: 'Neutralize', reagents: [{ formula: 'NH3' }, { formula: 'H2SO4' }], products: [{ formula: '(NH4)2SO4' }], yield: 1, maxRate: 6 }
    ],
    silos: [
      { formula: 'N2', rate: 3, cap: Infinity },
      { formula: 'H2', rate: 6, cap: Infinity },
      { formula: 'H2SO4', rate: 1, cap: Infinity }
    ],
    target: { formula: '(NH4)2SO4', quantity: 12 }
  },
  {
    name: 'Eighty Percent',
    subtitle: 'A lossy reaction — yield is only 80%',
    hint: 'The reagents still get fully consumed at the balanced ratio — only 80% of what they could make actually converts to isolable product. Let the whole supply run through; watch how far short of the naive total you land.',
    reactions: [
      { id: 'n1', label: 'Reactor', reagents: [{ formula: 'H2' }, { formula: 'O2' }], products: [{ formula: 'H2O' }], yield: 0.8, maxRate: 6 }
    ],
    silos: [
      { formula: 'H2', rate: 6, cap: 30 },
      { formula: 'O2', rate: 3, cap: 15 }
    ],
    target: { formula: 'H2O', quantity: 24 }
  },
  {
    name: 'Nothing Wasted',
    subtitle: 'Recycle the byproduct, or run the starter tanks dry',
    hint: 'The starter H₂/O₂ tanks alone can only ever make a fraction of quota — they are capped. Balance and switch on the electrolysis node too: it splits spent water back into hydrogen and oxygen and feeds node 1 again, lossy but sustained.',
    reactions: [
      { id: 'n1', label: 'Combustion', reagents: [{ formula: 'H2' }, { formula: 'O2' }], products: [{ formula: 'H2O' }], yield: 1, maxRate: 6 },
      { id: 'n2', label: 'Electrolysis', reagents: [{ formula: 'H2O' }], products: [{ formula: 'H2' }, { formula: 'O2' }], yield: 0.7, maxRate: 4 }
    ],
    silos: [
      { formula: 'H2', rate: 5, cap: 10 },
      { formula: 'O2', rate: 3, cap: 5 }
    ],
    target: { formula: 'H2O', quantity: 30 }
  },
  {
    name: 'The Contract',
    subtitle: 'Free build — hit quota without blowing the budget',
    hint: 'Ready-made NH₃ is expensive per unit; synthesizing it from N₂ and H₂ on-site is cheap but needs its own balanced node. Blend the two routes (or drop one silo\'s valve entirely) to land under budget.',
    reactions: [
      { id: 'a', label: 'Synthesize NH₃', reagents: [{ formula: 'N2' }, { formula: 'H2' }], products: [{ formula: 'NH3' }], yield: 1, maxRate: 8 },
      { id: 'b', label: 'Neutralize', reagents: [{ formula: 'NH3' }, { formula: 'H2SO4' }], products: [{ formula: '(NH4)2SO4' }], yield: 1, maxRate: 8 }
    ],
    silos: [
      { formula: 'N2', rate: 6, cap: Infinity, price: 1 },
      { formula: 'H2', rate: 18, cap: Infinity, price: 1 },
      { formula: 'NH3', rate: 4, cap: Infinity, price: 5 },
      { formula: 'H2SO4', rate: 4, cap: Infinity, price: 2 }
    ],
    target: { formula: '(NH4)2SO4', quantity: 12 },
    budget: 120
  }
];

/** Read by badge wiring elsewhere so a "built every reactor" achievement can
 *  track reality instead of a hardcoded count. */
export const REACTOR_LEVEL_COUNT = LEVELS.length;

// ------------------------------------------------------------------ balance checking

function scaledCounts(species: SpeciesRef[], coeffs: number[]): ElementCounts {
  const totals: ElementCounts = {};
  species.forEach((s, i) => {
    const counts = parseFormula(s.formula);
    const c = coeffs[i] ?? 0;
    for (const el in counts) totals[el] = (totals[el] ?? 0) + counts[el] * c;
  });
  return totals;
}

function countsEqual(a: ElementCounts, b: ElementCounts): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? 0) !== (b[key] ?? 0)) return false;
  }
  return true;
}

function isNodeBalanced(reaction: ReactionDef, coeffs: NodeCoeffs): boolean {
  if (coeffs.reagents.some((c) => c < 1) || coeffs.products.some((c) => c < 1)) return false;
  return countsEqual(scaledCounts(reaction.reagents, coeffs.reagents), scaledCounts(reaction.products, coeffs.products));
}

/** Compact equation string for the node label, e.g. "2H₂ + O₂ → 2H₂O". */
function equationText(reaction: ReactionDef, coeffs: NodeCoeffs): string {
  const side = (species: SpeciesRef[], list: number[]) =>
    species.map((s, i) => `${list[i] === 1 ? '' : list[i]}${toDisplayFormula(s.formula)}`).join(' + ');
  return `${side(reaction.reagents, coeffs.reagents)} → ${side(reaction.products, coeffs.products)}`;
}

// ------------------------------------------------------------------ tick simulation

function initSimState(level: LevelSpec): SimState {
  const siloRemaining: Record<string, number> = {};
  level.silos.forEach((s) => { siloRemaining[s.formula] = s.cap; });
  return { stock: {}, totalProduced: {}, siloRemaining, spent: {}, batches: 0 };
}

/**
 * Advances the whole board by one discrete tick: silos release supply into a
 * shared stock pool, then every enabled + balanced node consumes
 * `min(available / coefficient)` across its reagents — the limiting-reagent
 * calculation — and emits products scaled by its yield. A half-built line
 * (some nodes unbalanced or disabled) simply skips those nodes; whatever is
 * balanced still runs, so a partial factory still produces something.
 */
function runTick(
  level: LevelSpec,
  nodeCoeffs: Record<string, NodeCoeffs>,
  nodeEnabled: Record<string, boolean>,
  siloEnabled: Record<string, boolean>,
  state: SimState
): { next: SimState; flowing: Record<string, boolean> } {
  const stock: Record<string, number> = { ...state.stock };
  const siloRemaining: Record<string, number> = { ...state.siloRemaining };
  const totalProduced: Record<string, number> = { ...state.totalProduced };
  const spent: Record<string, number> = { ...state.spent };

  for (const silo of level.silos) {
    if (!siloEnabled[silo.formula]) continue;
    const remaining = siloRemaining[silo.formula] ?? silo.cap;
    const supply = Math.min(silo.rate, remaining);
    if (supply > 0) {
      stock[silo.formula] = (stock[silo.formula] ?? 0) + supply;
      siloRemaining[silo.formula] = remaining - supply;
      if (silo.price) spent[silo.formula] = (spent[silo.formula] ?? 0) + supply * silo.price;
    }
  }

  const flowing: Record<string, boolean> = {};

  for (const reaction of level.reactions) {
    const coeffs = nodeCoeffs[reaction.id];
    if (!nodeEnabled[reaction.id] || !coeffs || !isNodeBalanced(reaction, coeffs)) {
      flowing[reaction.id] = false;
      continue;
    }

    let units = reaction.maxRate;
    reaction.reagents.forEach((rg, i) => {
      const available = Math.max(0, stock[rg.formula] ?? 0);
      units = Math.min(units, available / coeffs.reagents[i]);
    });
    units = Math.max(0, units);

    if (units <= 1e-9) {
      flowing[reaction.id] = false;
      continue;
    }

    reaction.reagents.forEach((rg, i) => {
      stock[rg.formula] = (stock[rg.formula] ?? 0) - units * coeffs.reagents[i];
    });
    reaction.products.forEach((p, i) => {
      const amount = units * coeffs.products[i] * reaction.yield;
      stock[p.formula] = (stock[p.formula] ?? 0) + amount;
      totalProduced[p.formula] = (totalProduced[p.formula] ?? 0) + amount;
    });
    flowing[reaction.id] = true;
  }

  return { next: { stock, siloRemaining, totalProduced, spent, batches: state.batches + 1 }, flowing };
}

function freshNodeCoeffs(level: LevelSpec): Record<string, NodeCoeffs> {
  const out: Record<string, NodeCoeffs> = {};
  level.reactions.forEach((r) => {
    out[r.id] = { reagents: r.reagents.map(() => 1), products: r.products.map(() => 1) };
  });
  return out;
}

function freshEnabled(level: LevelSpec): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  level.reactions.forEach((r) => { out[r.id] = true; });
  return out;
}

function freshSiloEnabled(level: LevelSpec): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  level.silos.forEach((s) => { out[s.formula] = true; });
  return out;
}

// ------------------------------------------------------------------ layout

interface Pt { x: number; y: number; }
type NodeRef = { kind: 'silo'; formula: string } | { kind: 'node'; id: string } | { kind: 'tank' };
interface Edge { key: string; from: NodeRef; to: NodeRef; formula: string; }
interface Layout { silos: Record<string, Pt>; nodes: Record<string, Pt>; tank: Pt; }

const BOARD_W = 900;
const BOARD_H = 380;
const SILO_X = 90;
const NODE_X = BOARD_W / 2;
const TANK_X = BOARD_W - 110;
const TICK_MS = 450;

function layoutY(index: number, count: number): number {
  if (count <= 1) return BOARD_H / 2;
  const margin = 55;
  return margin + ((BOARD_H - margin * 2) / (count - 1)) * index;
}

function computeLayout(level: LevelSpec): Layout {
  const silos: Record<string, Pt> = {};
  level.silos.forEach((s, i) => { silos[s.formula] = { x: SILO_X, y: layoutY(i, level.silos.length) }; });
  const nodes: Record<string, Pt> = {};
  level.reactions.forEach((r, i) => { nodes[r.id] = { x: NODE_X, y: layoutY(i, level.reactions.length) }; });
  return { silos, nodes, tank: { x: TANK_X, y: BOARD_H / 2 } };
}

function refKey(ref: NodeRef): string {
  if (ref.kind === 'silo') return `silo:${ref.formula}`;
  if (ref.kind === 'node') return `node:${ref.id}`;
  return 'tank';
}

function pointFor(ref: NodeRef, layout: Layout): Pt {
  if (ref.kind === 'silo') return layout.silos[ref.formula] ?? { x: SILO_X, y: BOARD_H / 2 };
  if (ref.kind === 'node') return layout.nodes[ref.id] ?? { x: NODE_X, y: BOARD_H / 2 };
  return layout.tank;
}

function bezierPath(a: Pt, b: Pt): string {
  const midX = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`;
}

/** Every pipe on the board, derived purely from the level's reaction graph:
 *  a reagent pulls from its silo (if one exists) and/or from whichever node
 *  produces that formula (which is how a recycle loop like level 6's
 *  electrolysis node shows up automatically, with no per-level special-casing),
 *  and any product matching the level's target formula pipes to the tank. */
function computeEdges(level: LevelSpec): Edge[] {
  const edges: Edge[] = [];
  const producerOf: Record<string, string> = {};
  level.reactions.forEach((r) => r.products.forEach((p) => {
    if (!(p.formula in producerOf)) producerOf[p.formula] = r.id;
  }));

  level.reactions.forEach((r) => {
    r.reagents.forEach((rg) => {
      const silo = level.silos.find((s) => s.formula === rg.formula);
      if (silo) {
        const from: NodeRef = { kind: 'silo', formula: silo.formula };
        const to: NodeRef = { kind: 'node', id: r.id };
        edges.push({ key: `${refKey(from)}=>${refKey(to)}:${rg.formula}`, from, to, formula: rg.formula });
      }
      const producerId = producerOf[rg.formula];
      if (producerId && producerId !== r.id) {
        const from: NodeRef = { kind: 'node', id: producerId };
        const to: NodeRef = { kind: 'node', id: r.id };
        edges.push({ key: `${refKey(from)}=>${refKey(to)}:${rg.formula}`, from, to, formula: rg.formula });
      }
    });
    r.products.forEach((p) => {
      if (p.formula === level.target.formula) {
        const from: NodeRef = { kind: 'node', id: r.id };
        const to: NodeRef = { kind: 'tank' };
        edges.push({ key: `${refKey(from)}=>${refKey(to)}:${p.formula}`, from, to, formula: p.formula });
      }
    });
  });

  return edges;
}

// ------------------------------------------------------------------ small helpers

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function CoeffStepper({ value, onDelta, disabled }: { value: number; onDelta: (delta: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-0.5 bg-black/40 rounded-full px-1 py-0.5 border border-white/10">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDelta(-1)}
        className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-300 hover:bg-white/10 disabled:opacity-30 cursor-pointer transition"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="w-4 text-center text-sm font-bold text-white font-mono">{value}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDelta(1)}
        className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-300 hover:bg-white/10 disabled:opacity-30 cursor-pointer transition"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ component

interface ReactorLineProps {
  /** Level indices already solved, owned and persisted by the app. */
  solvedLevels: number[];
  onSolve: (levelIndex: number) => void;
}

export default function ReactorLine({ solvedLevels, onSolve }: ReactorLineProps) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [nodeCoeffs, setNodeCoeffs] = useState<Record<string, NodeCoeffs>>(() => freshNodeCoeffs(LEVELS[0]));
  const [nodeEnabled, setNodeEnabled] = useState<Record<string, boolean>>(() => freshEnabled(LEVELS[0]));
  const [siloEnabled, setSiloEnabled] = useState<Record<string, boolean>>(() => freshSiloEnabled(LEVELS[0]));
  const [simState, setSimState] = useState<SimState>(() => initSimState(LEVELS[0]));
  const [flowing, setFlowing] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(LEVELS[0].reactions[0].id);
  const [showHint, setShowHint] = useState(false);

  const simStateRef = useRef<SimState>(simState);

  const level = LEVELS[levelIndex];
  const layout = useMemo(() => computeLayout(level), [level]);
  const edges = useMemo(() => computeEdges(level), [level]);

  const goToLevel = useCallback((index: number) => {
    const lvl = LEVELS[index];
    const fresh = initSimState(lvl);
    simStateRef.current = fresh;
    setLevelIndex(index);
    setNodeCoeffs(freshNodeCoeffs(lvl));
    setNodeEnabled(freshEnabled(lvl));
    setSiloEnabled(freshSiloEnabled(lvl));
    setSimState(fresh);
    setFlowing({});
    setRunning(false);
    setSelectedNodeId(lvl.reactions[0].id);
    setShowHint(false);
  }, []);

  const resetLevel = useCallback(() => goToLevel(levelIndex), [levelIndex, goToLevel]);

  const bumpCoeff = useCallback((reactionId: string, side: 'reagents' | 'products', index: number, delta: number) => {
    setNodeCoeffs((prev) => {
      const node = prev[reactionId];
      const arr = [...node[side]];
      arr[index] = clamp(arr[index] + delta, 1, 9);
      return { ...prev, [reactionId]: { ...node, [side]: arr } };
    });
  }, []);

  const toggleNode = useCallback((reactionId: string) => {
    setNodeEnabled((prev) => ({ ...prev, [reactionId]: !prev[reactionId] }));
  }, []);

  const toggleSilo = useCallback((formula: string) => {
    setSiloEnabled((prev) => ({ ...prev, [formula]: !prev[formula] }));
  }, []);

  // Run/pause loop. Reads the latest sim state from a ref so the interval
  // doesn't need to be torn down and rebuilt on every stepper click.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const { next, flowing: flowMap } = runTick(level, nodeCoeffs, nodeEnabled, siloEnabled, simStateRef.current);
      simStateRef.current = next;
      setSimState(next);
      setFlowing(flowMap);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, level, nodeCoeffs, nodeEnabled, siloEnabled]);

  const producedQty = simState.totalProduced[level.target.formula] ?? 0;
  const totalSpent = useMemo(
    () => Object.values(simState.spent).reduce((a: number, b: number) => a + b, 0),
    [simState.spent]
  );
  const quotaMet = producedQty >= level.target.quantity;
  const budgetOk = level.budget === undefined || totalSpent <= level.budget;
  const solved = quotaMet && budgetOk;

  useEffect(() => {
    if (solved) {
      onSolve(levelIndex);
      setRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved, levelIndex, onSolve]);

  const selectedReaction = level.reactions.find((r) => r.id === selectedNodeId) ?? level.reactions[0];
  const selectedCoeffs = nodeCoeffs[selectedReaction.id];
  const selectedLeftTotals = scaledCounts(selectedReaction.reagents, selectedCoeffs.reagents);
  const selectedRightTotals = scaledCounts(selectedReaction.products, selectedCoeffs.products);
  const selectedBalanced = countsEqual(selectedLeftTotals, selectedRightTotals);
  const tallyElements = Array.from(
    new Set([...Object.keys(selectedLeftTotals), ...Object.keys(selectedRightTotals)])
  ).sort();

  const allElements = useMemo(() => {
    const set = new Set<string>();
    const addFormula = (f: string) => Object.keys(parseFormula(f)).forEach((el) => set.add(el));
    level.reactions.forEach((r) => {
      r.reagents.forEach((x) => addFormula(x.formula));
      r.products.forEach((x) => addFormula(x.formula));
    });
    level.silos.forEach((s) => addFormula(s.formula));
    return Array.from(set).sort();
  }, [level]);

  const atomsInSystem = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const [formula, qty] of Object.entries(simState.stock) as [string, number][]) {
      if (qty <= 0) continue;
      const counts = parseFormula(formula);
      for (const el in counts) totals[el] = (totals[el] ?? 0) + counts[el] * qty;
    }
    return totals;
  }, [simState.stock]);

  const fillFrac = clamp(producedQty / level.target.quantity, 0, 1);
  const isLast = levelIndex === LEVELS.length - 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {LEVELS.map((lvl, i) => (
          <button
            key={lvl.name}
            onClick={() => goToLevel(i)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono border transition cursor-pointer flex items-center gap-1.5 ${
              i === levelIndex
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
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
          <p className="text-xs text-zinc-500 font-sans">{level.subtitle}</p>
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
        <p className="text-xs text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 font-sans leading-relaxed">
          {level.hint}
        </p>
      )}

      <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d12] relative">
        <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className="w-full block">
          {edges.map((edge) => {
            const from = pointFor(edge.from, layout);
            const to = pointFor(edge.to, layout);
            const d = bezierPath(from, to);
            const isFlowing = edge.to.kind === 'node' ? !!flowing[edge.to.id] : edge.from.kind === 'node' && !!flowing[edge.from.id];
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            return (
              <g key={edge.key}>
                <path
                  d={d}
                  fill="none"
                  stroke={isFlowing ? '#10b981' : '#3f3f46'}
                  strokeWidth={isFlowing ? 3 : 2}
                  opacity={isFlowing ? 0.9 : 0.4}
                />
                {isFlowing && (
                  <circle r={4} fill="#6ee7b7">
                    <animateMotion dur="1.4s" repeatCount="indefinite" path={d} />
                  </circle>
                )}
                {edge.from.kind === 'node' && edge.to.kind === 'node' && (
                  <text x={midX} y={midY - 8} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="#71717a">
                    {toDisplayFormula(edge.formula)}: {formatNumber(simState.stock[edge.formula] ?? 0)}
                  </text>
                )}
              </g>
            );
          })}

          {level.silos.map((silo) => {
            const pt = layout.silos[silo.formula];
            const enabled = siloEnabled[silo.formula];
            const remaining = simState.siloRemaining[silo.formula] ?? silo.cap;
            return (
              <g
                key={silo.formula}
                transform={`translate(${pt.x},${pt.y})`}
                onClick={() => toggleSilo(silo.formula)}
                className="cursor-pointer"
              >
                <rect
                  x={-55} y={-28} width={110} height={56} rx={10}
                  fill={enabled ? '#18181b' : '#0a0a0d'}
                  stroke={enabled ? '#52525b' : '#3f3f46'}
                  strokeWidth={1.5}
                />
                <text x={0} y={-6} textAnchor="middle" fontSize={15} fontWeight={700} fontFamily="monospace" fill={enabled ? '#e4e4e7' : '#52525b'}>
                  {toDisplayFormula(silo.formula)}
                </text>
                <text x={0} y={12} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={enabled ? '#a1a1aa' : '#3f3f46'}>
                  {silo.cap === Infinity ? `${silo.rate}/tick` : `${formatNumber(remaining)} left`}
                </text>
                {!enabled && (
                  <text x={0} y={24} textAnchor="middle" fontSize={8} fontFamily="monospace" fill="#71717a">
                    valve closed
                  </text>
                )}
              </g>
            );
          })}

          {level.reactions.map((r) => {
            const pt = layout.nodes[r.id];
            const coeffs = nodeCoeffs[r.id];
            const balanced = isNodeBalanced(r, coeffs);
            const enabled = nodeEnabled[r.id];
            const nodeFlowing = !!flowing[r.id];
            const selected = selectedNodeId === r.id;
            const stateColor = !balanced ? '#f87171' : nodeFlowing ? '#34d399' : enabled ? '#fbbf24' : '#71717a';
            return (
              <g
                key={r.id}
                transform={`translate(${pt.x},${pt.y})`}
                onClick={() => setSelectedNodeId(r.id)}
                className="cursor-pointer"
              >
                <rect
                  x={-110} y={-34} width={220} height={68} rx={12}
                  fill="#18181b"
                  stroke={selected ? '#fbbf24' : stateColor}
                  strokeWidth={selected ? 3 : 2}
                />
                <text x={0} y={-10} textAnchor="middle" fontSize={11} fontWeight={700} fontFamily="monospace" fill="#e4e4e7">
                  {r.label}
                </text>
                <text x={0} y={8} textAnchor="middle" fontSize={10} fontFamily="monospace" fill="#a1a1aa">
                  {equationText(r, coeffs)}
                </text>
                <circle cx={92} cy={-20} r={5} fill={stateColor} />
              </g>
            );
          })}

          <g transform={`translate(${layout.tank.x},${layout.tank.y})`}>
            <rect x={-55} y={-60} width={110} height={120} rx={14} fill="#0a0a0d" stroke="#52525b" strokeWidth={1.5} />
            <rect
              x={-50}
              y={56 - 108 * fillFrac}
              width={100}
              height={108 * fillFrac}
              rx={6}
              fill="#10b981"
              opacity={0.45}
            />
            <text x={0} y={-70} textAnchor="middle" fontSize={11} fontWeight={700} fontFamily="monospace" fill="#e4e4e7">
              {toDisplayFormula(level.target.formula)}
            </text>
            <text x={0} y={0} textAnchor="middle" fontSize={14} fontWeight={700} fontFamily="monospace" fill="#e4e4e7">
              {formatNumber(producedQty)}
            </text>
            <text x={0} y={16} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="#71717a">
              / {level.target.quantity}
            </text>
          </g>
        </svg>

        {solved && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-center px-6">
            <Trophy className="w-10 h-10 text-amber-400" />
            <h4 className="font-display font-bold text-xl text-emerald-400">{level.name} — quota filled</h4>
            <p className="text-xs text-zinc-300 font-sans max-w-sm leading-relaxed">
              {level.budget !== undefined
                ? `Contract closed at $${formatNumber(totalSpent)}, under the $${level.budget} ceiling.`
                : `The line produced ${formatNumber(producedQty)} ${toDisplayFormula(level.target.formula)} in ${formatNumber(simState.batches)} batches.`}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={resetLevel}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer transition"
              >
                Rebuild
              </button>
              {!isLast && (
                <button
                  onClick={() => goToLevel(levelIndex + 1)}
                  className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-stone-950 cursor-pointer transition flex items-center gap-1"
                >
                  Next line <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h5 className="font-display font-bold text-sm text-white">{selectedReaction.label}</h5>
          <button
            onClick={() => toggleNode(selectedReaction.id)}
            className={`text-[11px] font-mono flex items-center gap-1 px-2.5 py-1 rounded-full border cursor-pointer transition ${
              nodeEnabled[selectedReaction.id]
                ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                : 'border-white/10 text-zinc-500'
            }`}
          >
            <Power className="w-3 h-3" /> {nodeEnabled[selectedReaction.id] ? 'Running' : 'Paused'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-sm text-zinc-200">
          {selectedReaction.reagents.map((rg, i) => (
            <React.Fragment key={`rg-${i}`}>
              {i > 0 && <span className="text-zinc-500">+</span>}
              <CoeffStepper value={selectedCoeffs.reagents[i]} onDelta={(d) => bumpCoeff(selectedReaction.id, 'reagents', i, d)} />
              <span>{toDisplayFormula(rg.formula)}</span>
            </React.Fragment>
          ))}
          <span className="text-zinc-500 mx-1">→</span>
          {selectedReaction.products.map((p, i) => (
            <React.Fragment key={`p-${i}`}>
              {i > 0 && <span className="text-zinc-500">+</span>}
              <CoeffStepper value={selectedCoeffs.products[i]} onDelta={(d) => bumpCoeff(selectedReaction.id, 'products', i, d)} />
              <span>{toDisplayFormula(p.formula)}</span>
            </React.Fragment>
          ))}
          {selectedBalanced ? (
            <span className="ml-2 text-emerald-400 text-xs font-bold">balanced ✓</span>
          ) : (
            <span className="ml-2 text-red-400 text-xs font-bold">unbalanced</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] font-mono">
          {tallyElements.map((el) => {
            const l = selectedLeftTotals[el] ?? 0;
            const r = selectedRightTotals[el] ?? 0;
            const ok = l === r;
            return (
              <span
                key={el}
                className={`px-2 py-1 rounded-md border ${
                  ok ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10' : 'border-red-500/30 text-red-300 bg-red-500/10'
                }`}
              >
                {el}: {l} / {r}
              </span>
            );
          })}
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${fillFrac * 100}%` }} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRunning((r) => !r)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold cursor-pointer transition"
          >
            {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {running ? 'Pause' : 'Run'}
          </button>
          <button
            onClick={resetLevel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <span className="text-[11px] font-mono text-zinc-500">Batches: {formatNumber(simState.batches)}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className={quotaMet ? 'text-emerald-400' : 'text-zinc-400'}>
            {toDisplayFormula(level.target.formula)}: {formatNumber(producedQty)} / {level.target.quantity}
          </span>
          {level.budget !== undefined && (
            <span className={totalSpent > level.budget ? 'text-red-400' : 'text-zinc-400'}>
              Cost: ${formatNumber(totalSpent)} / ${level.budget}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-[11px] font-mono text-zinc-500 flex flex-wrap gap-x-4 gap-y-1">
        <span className="text-zinc-400">Atoms in system:</span>
        {allElements.map((el) => (
          <span key={el}>{el}: {formatNumber(atomsInSystem[el] ?? 0)}</span>
        ))}
      </div>
    </div>
  );
}
