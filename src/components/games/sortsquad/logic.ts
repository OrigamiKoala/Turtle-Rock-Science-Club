/**
 * Pure Sort Squad logic — no DOM, no React — so `scripts/check-sortsquad.mjs`
 * can import it straight into Node, the same arrangement as
 * `titration/chem.ts` + `scripts/check-titration.mjs`. That is also why this
 * file sticks to erasable TypeScript (no enums, no parameter properties): Node
 * strips the types and runs the rest as-is.
 *
 * Every robot is "recorded": `buildSteps` runs the algorithm once, up front, on
 * a private copy of the list and writes down each thing it does. The game then
 * replays that list one step at a time. Because the whole run is known in
 * advance, the puzzles can ask questions about it that a live simulation
 * couldn't answer — "which robot is this?" is answered by comparing what you
 * saw against what every candidate robot *would* have done.
 */

export const MIN_N = 4;
export const MAX_N = 32;
/** Chunk size for the mini Timsort. */
export const RUN = 4;

export const ALG = {
  BUBBLE: 1,
  SELECTION: 2,
  INSERTION: 3,
  QUICK: 4,
  MERGE: 5,
  TIM: 6,
  RADIX: 7,
  BOGO: 8
} as const;
export type AlgId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const ALG_COUNT = 9;

/** 0 = look at two slots · 1 = swap two slots · 2 = write a value into a slot. */
export type StepType = 0 | 1 | 2;
export interface Step {
  type: StepType;
  /** Slot indices. For a write, only `i` is used. */
  i: number;
  j: number;
  /** Look: value at slot i. Write: the value written. */
  a: number;
  /** Look: value at slot j. Write: the radix pass number (0 for non-radix). */
  b: number;
}

export type Rng = () => number;

/* ---------- text ---------- */

export const ALGO_NAME: readonly string[] = [
  '', 'Bubble Sort', 'Selection Sort', 'Insertion Sort', 'Quick Sort',
  'Merge Sort', 'Timsort (mini)', 'Radix Sort', 'Bogo Sort'
];
export const ALGO_LABEL: readonly string[] = [
  '', 'Bubble', 'Selection', 'Insertion', 'Quick', 'Merge', 'Timsort', 'Radix', 'Bogo'
];
export const ALGO_DESC: readonly string[] = ['',
  "Swap neighbors if\nthey're out of\norder. Big bars\nbubble right.",
  'Find the smallest\nbar and put it in\nfront. Repeat.',
  'Like sorting cards\nin your hand.\nSlide each bar\nback into place.',
  'Pick a pivot.\nSmaller bars left,\nbigger bars right.\nRepeat on both\nsides!',
  'Split in halves,\nsort each half,\nthen merge them\nback together.',
  'Sort small chunks,\nthen merge them.\nUsed by Python\nand Java!',
  'Sort by binary\ndigits (0s then\n1s), one digit\nat a time.',
  'Shuffle randomly.\nIs it sorted? No?\nShuffle again!\nPure luck...'
];
export const ALGO_LESSON: readonly string[] = ['',
  'Bubble Sort only swaps neighbors, so it swaps once for every flipped pair!',
  'Selection Sort makes very few swaps, but does lots of looking around.',
  'Insertion Sort slides each bar back into place.\nGreat when the list is almost sorted already!',
  "Quick Sort picks a pivot, splits the bars into smaller and bigger,\nthen repeats on each side. It's super fast on big lists!",
  'Merge Sort splits the list in halves, sorts each, then merges them.\nIt always makes the same number of moves!',
  'Mini Timsort: sort small chunks, then merge them together.\nThe real Timsort is used by Python and Java!',
  'Radix Sort never compares bars. It sorts by one binary digit at a time,\nfrom the last digit to the first.',
  'Bogo Sort is a joke algorithm. With 100 bars it would take longer\nthan the age of the universe. Never use it!'
];
/**
 * The giveaway for each robot — shown only once a Mystery Robot puzzle is over,
 * never while the player is still deducing.
 */
export const ALGO_CLUE: readonly string[] = ['',
  'Bubble Sort only ever looks at and swaps NEIGHBOURS, sweeping left to right. Its tell: the tallest bar drifts to the right end, pass after pass.',
  'Selection Sort scans a long way — lots of looks, no swaps — to find the smallest bar, then makes just ONE swap per pass, often between bars far apart.',
  'Insertion Sort takes one bar and walks it back LEFT with neighbour swaps until it fits, then moves on. Its tell: after a swap it looks backwards, not forwards.',
  'Quick Sort compares everything against one pivot bar — the LAST bar — so its looks always involve the far-right slot, and its swaps jump across the list.',
  'Merge Sort never swaps. It only PLACES bars, building sorted runs by comparing the front bars of two halves.',
  'Mini Timsort starts like Insertion Sort on tiny chunks of four bars, then switches to Merge-style placements to join the chunks.',
  'Radix Sort never LOOKS at two bars to compare them. It only places bars, one pass per binary digit.',
  ''
];

/* ---------- small helpers ---------- */

export function bitsFor(n: number): number {
  let p = 0;
  while ((1 << p) <= n) p++;
  return p;
}

export function isSorted(v: readonly number[]): boolean {
  for (let i = 0; i < v.length - 1; i++) if (v[i] > v[i + 1]) return false;
  return true;
}

export function inversions(v: readonly number[]): number {
  let c = 0;
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (v[i] > v[j]) c++;
  return c;
}

/** n! as a double (it gets huge fast). */
export function factorial(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A shuffled 1..n that is guaranteed not to be sorted already. */
export function randomUnsorted(n: number, rng: Rng): number[] {
  const v: number[] = [];
  do {
    v.length = 0;
    for (let i = 0; i < n; i++) v.push(i + 1);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = v[i]; v[i] = v[j]; v[j] = t;
    }
  } while (isSorted(v));
  return v;
}

/* ---------- the recorded robots ---------- */

export function buildSteps(which: AlgId, values: readonly number[]): Step[] {
  const n = values.length;
  const steps: Step[] = [];
  const tmp = values.slice();

  const rec = (type: StepType, i: number, j: number, a: number, b: number) => {
    steps.push({ type, i, j, a, b });
  };
  const rlook = (i: number, j: number): boolean => { rec(0, i, j, tmp[i], tmp[j]); return tmp[i] > tmp[j]; };
  const rswap = (i: number, j: number) => { const t = tmp[i]; tmp[i] = tmp[j]; tmp[j] = t; rec(1, i, j, 0, 0); };
  const rwrite = (i: number, v: number, pass: number) => { tmp[i] = v; rec(2, i, 0, v, pass); };

  const insertionRange = (lo: number, hi: number) => {           /* sorts tmp[lo..hi) */
    for (let i = lo + 1; i < hi; i++)
      for (let j = i; j > lo; j--) {
        if (rlook(j - 1, j)) rswap(j - 1, j); else break;
      }
  };
  const mergeRuns = (lo: number, mid: number, hi: number) => {   /* merge tmp[lo..mid) + tmp[mid..hi) */
    const aux = tmp.slice();
    let i = lo, j = mid, k = lo;
    while (i < mid && j < hi) {
      rec(0, i, j, aux[i], aux[j]);                              /* compare the front of each half */
      if (aux[i] > aux[j]) rwrite(k++, aux[j++], 0);
      else                 rwrite(k++, aux[i++], 0);
    }
    while (i < mid) rwrite(k++, aux[i++], 0);
    while (j < hi)  rwrite(k++, aux[j++], 0);
  };
  const mergeSortRec = (lo: number, hi: number) => {
    if (hi - lo < 2) return;
    const mid = (lo + hi) >> 1;
    mergeSortRec(lo, mid);
    mergeSortRec(mid, hi);
    mergeRuns(lo, mid, hi);
  };
  const quickSortRec = (lo: number, hi: number) => {             /* pivot = last bar */
    if (lo >= hi) return;
    let store = lo;
    for (let j = lo; j < hi; j++)
      if (rlook(hi, j)) {                                        /* pivot bigger? then bar j goes left */
        if (store !== j) rswap(store, j);
        store++;
      }
    if (store !== hi) rswap(store, hi);                          /* drop the pivot into its final spot */
    quickSortRec(lo, store - 1);
    quickSortRec(store + 1, hi);
  };

  switch (which) {
    case ALG.BUBBLE:
      for (let i = 0; i < n - 1; i++)
        for (let j = 0; j < n - 1 - i; j++)
          if (rlook(j, j + 1)) rswap(j, j + 1);
      break;
    case ALG.SELECTION:
      for (let i = 0; i < n - 1; i++) {
        let min = i;
        for (let j = i + 1; j < n; j++) if (rlook(min, j)) min = j;
        if (min !== i) rswap(i, min);
      }
      break;
    case ALG.INSERTION: insertionRange(0, n); break;
    case ALG.QUICK:     quickSortRec(0, n - 1); break;
    case ALG.MERGE:     mergeSortRec(0, n); break;
    case ALG.TIM:                                                /* small chunks, then merge */
      for (let lo = 0; lo < n; lo += RUN) insertionRange(lo, Math.min(lo + RUN, n));
      for (let size = RUN; size < n; size *= 2)
        for (let lo = 0; lo + size < n; lo += 2 * size)
          mergeRuns(lo, lo + size, Math.min(lo + 2 * size, n));
      break;
    case ALG.RADIX: {                                            /* LSD radix, base 2 */
      const passes = bitsFor(n);
      for (let bit = 0; bit < passes; bit++) {
        const out: number[] = [];
        for (let i = 0; i < n; i++) if (!((tmp[i] >> bit) & 1)) out.push(tmp[i]);
        for (let i = 0; i < n; i++) if (  (tmp[i] >> bit) & 1 ) out.push(tmp[i]);
        for (let i = 0; i < n; i++) rwrite(i, out[i], bit + 1);
      }
      break;
    }
    default: break;                                              /* bogo is played live */
  }
  return steps;
}

/** Replay a recorded run on a copy of `values` — used to check a robot really sorts. */
export function applySteps(values: readonly number[], steps: readonly Step[]): number[] {
  const v = values.slice();
  for (const s of steps) {
    if (s.type === 1) { const t = v[s.i]; v[s.i] = v[s.j]; v[s.j] = t; }
    else if (s.type === 2) v[s.i] = s.a;
  }
  return v;
}

export interface StepCounts { looks: number; swaps: number; writes: number; moves: number; total: number }

export function countSteps(steps: readonly Step[]): StepCounts {
  let looks = 0, swaps = 0, writes = 0;
  for (const s of steps) {
    if (s.type === 0) looks++;
    else if (s.type === 1) swaps++;
    else writes++;
  }
  return { looks, swaps, writes, moves: swaps + writes, total: looks + swaps + writes };
}

/* ---------- reasoning about what a player has seen ---------- */

/** Two steps look identical to a watcher (the radix pass number is invisible). */
function sameStep(x: Step, y: Step): boolean {
  return x.type === y.type && x.i === y.i && (x.type === 2 || x.j === y.j) && (x.type !== 2 || x.a === y.a);
}

/**
 * Index of the first step at which two recorded runs differ, or -1 if one is a
 * prefix of the other (and, when `observed` is shorter, nothing seen so far
 * tells them apart).
 */
export function firstMismatch(a: readonly Step[], b: readonly Step[]): number {
  const m = Math.min(a.length, b.length);
  for (let k = 0; k < m; k++) if (!sameStep(a[k], b[k])) return k;
  return -1;
}

function phrase(s: Step): string {
  if (s.type === 0) return `look at slots ${s.i + 1} and ${s.j + 1}`;
  if (s.type === 1) return `swap slots ${s.i + 1} and ${s.j + 1}`;
  return `place a ${s.a} into slot ${s.i + 1}`;
}

/**
 * A rigorous reason the robot the player watched CANNOT be `alg`, or null if
 * nothing seen so far rules it out. Built by running `alg` on the same starting
 * list and finding the first step where it would have acted differently — so it
 * is never a guess about the robot's style, only a fact about this very run.
 */
export function whyNot(alg: AlgId, seen: readonly Step[], start: readonly number[]): string | null {
  const cand = buildSteps(alg, start);
  const m = Math.min(seen.length, cand.length);
  for (let k = 0; k < m; k++) {
    if (!sameStep(seen[k], cand[k])) {
      return `At step ${k + 1}, ${ALGO_NAME[alg]} would ${phrase(cand[k])} — but this robot chose to ${phrase(seen[k])}.`;
    }
  }
  if (cand.length < seen.length) {
    return `${ALGO_NAME[alg]} would already be finished after ${cand.length} steps — this robot is still going.`;
  }
  return null;
}

/* ---------- the puzzles ---------- */

export interface MysteryPuzzle {
  kind: 'mystery';
  title: string;
  blurb: string;
  hint: string;
  n: number;
  /** The robot is drawn from this pool each attempt, so there is nothing to memorise. */
  pool: AlgId[];
}
export type BestShape = 'nearly-sorted' | 'reversed';
export interface BestPuzzle {
  kind: 'best';
  title: string;
  blurb: string;
  hint: string;
  n: number;
  shape: BestShape;
  candidates: AlgId[];
  /** Shown only after the answer is locked in. */
  lesson: string;
}
export type Puzzle = MysteryPuzzle | BestPuzzle;

const ALL_SEVEN: AlgId[] = [ALG.BUBBLE, ALG.SELECTION, ALG.INSERTION, ALG.QUICK, ALG.MERGE, ALG.TIM, ALG.RADIX];

/**
 * Five puzzles, alternating the two kinds and getting harder — XP is
 * `10 + 5·index`, so the set banks 100 XP like the other games' level lists.
 * Every number here (sizes, pools, candidates) is checked by
 * `scripts/check-sortsquad.mjs`; change one and run it.
 */
export const PUZZLES: Puzzle[] = [
  {
    kind: 'mystery',
    title: 'Three Signatures',
    blurb: 'A hidden robot is sorting. Which one is it?',
    hint: 'Robots leave fingerprints. Does it ever swap two bars? Does it ever place a bar? Does it ever look at two bars to compare them?',
    n: 8,
    pool: [ALG.BUBBLE, ALG.MERGE, ALG.RADIX]
  },
  {
    kind: 'best',
    title: 'Almost Done',
    blurb: 'The list is nearly sorted. Which robot has the least to do?',
    hint: 'Count what each robot MUST do even here. Some check every pair no matter how tidy the list already is.',
    n: 10,
    shape: 'nearly-sorted',
    candidates: [ALG.BUBBLE, ALG.INSERTION, ALG.QUICK, ALG.MERGE],
    lesson: 'Insertion Sort only has to slide the one or two bars that are out of place. Bubble Sort checks every pair anyway, and Quick Sort (which pivots on the last bar) hits its worst case on a list that is already nearly in order.'
  },
  {
    kind: 'mystery',
    title: 'Neighbours or Not?',
    blurb: 'Three robots that all swap. Tell them apart.',
    hint: 'All three swap, so watch WHICH bars it looks at. Always neighbours? Does it turn around and walk back left? Does it scan a long way before its first swap?',
    n: 9,
    pool: [ALG.BUBBLE, ALG.INSERTION, ALG.SELECTION]
  },
  {
    kind: 'best',
    title: 'Backwards',
    blurb: 'The list is in exactly the wrong order. Who wins now?',
    hint: 'A backwards list is every robot\'s worst day — unless a robot doesn\'t care about order at all.',
    n: 10,
    shape: 'reversed',
    candidates: [ALG.BUBBLE, ALG.SELECTION, ALG.MERGE, ALG.RADIX],
    lesson: 'A backwards list is Bubble Sort\'s worst day: every bar has to travel the whole way. Radix Sort never compares bars, so backwards costs it exactly what any order does: one placement per bar per binary digit.'
  },
  {
    kind: 'mystery',
    title: 'Cold Case',
    blurb: 'Any of the seven could be behind this one.',
    hint: 'Rule robots out one at a time. What is the very first thing it does? Which bars does it compare against — a neighbour, a far-off bar, or none at all?',
    n: 12,
    pool: ALL_SEVEN
  }
];

export function makeBestList(p: BestPuzzle, rng: Rng): number[] {
  const v: number[] = [];
  for (let i = 0; i < p.n; i++) v.push(i + 1);
  if (p.shape === 'reversed') return v.reverse();
  /* nearly-sorted: nudge one or two neighbouring pairs out of place */
  let swaps = 1 + Math.floor(rng() * 2);
  const used = new Set<number>();
  while (swaps > 0) {
    const at = Math.floor(rng() * (p.n - 1));
    if (used.has(at) || used.has(at - 1) || used.has(at + 1)) continue;
    used.add(at);
    const t = v[at]; v[at] = v[at + 1]; v[at + 1] = t;
    swaps--;
  }
  return v;
}

export interface BestResult extends StepCounts { alg: AlgId }
export interface BestOutcome { results: BestResult[]; winner: AlgId; runnerUp: AlgId; margin: number }

/** Race every candidate on the same list. `margin` = runner-up steps ÷ winner steps. */
export function evaluateBest(p: BestPuzzle, list: readonly number[]): BestOutcome {
  const results: BestResult[] = p.candidates.map((alg) => ({ alg, ...countSteps(buildSteps(alg, list)) }));
  const sorted = results.slice().sort((x, y) => x.total - y.total);
  return { results, winner: sorted[0].alg, runnerUp: sorted[1].alg, margin: sorted[1].total / sorted[0].total };
}

/** A recorded Mystery Robot run, plus how soon a careful watcher could name it. */
export interface MysteryRound {
  start: number[];
  alg: AlgId;
  steps: Step[];
  /** Steps a watcher must see before every OTHER robot in the pool is ruled out. */
  decisiveAt: number;
}

/**
 * How many steps until every other pool robot has done something `alg` didn't —
 * i.e. the earliest a perfect reasoner could be certain. -1 if some other robot
 * produces the identical run (the round would be unanswerable).
 */
export function decisiveAt(alg: AlgId, start: readonly number[], steps: readonly Step[], pool: readonly AlgId[]): number {
  let worst = 0;
  for (const other of pool) {
    if (other === alg) continue;
    const os = buildSteps(other, start);
    const k = firstMismatch(steps, os);
    if (k < 0) {
      if (os.length === steps.length) return -1;       /* identical run: can't tell apart */
      worst = Math.max(worst, Math.min(os.length, steps.length) + 1);
    } else {
      worst = Math.max(worst, k + 1);
    }
  }
  return worst;
}

/** A round is only kept if the evidence shows up early enough to reason from. */
export const DECISIVE_FRACTION = 0.4;

export function makeMysteryRound(p: MysteryPuzzle, rng: Rng): MysteryRound {
  let last: MysteryRound | null = null;
  for (let attempt = 0; attempt < 500; attempt++) {
    const alg = p.pool[Math.floor(rng() * p.pool.length)];
    const start = randomUnsorted(p.n, rng);
    const steps = buildSteps(alg, start);
    const d = decisiveAt(alg, start, steps, p.pool);
    last = { start, alg, steps, decisiveAt: d };
    if (d >= 0 && d <= Math.ceil(steps.length * DECISIVE_FRACTION)) return last;
  }
  return last as MysteryRound;
}
