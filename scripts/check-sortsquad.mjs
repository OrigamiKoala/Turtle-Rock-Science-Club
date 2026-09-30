/**
 * Sort Squad verification script.
 *
 *   node scripts/check-sortsquad.mjs
 *
 * Checks two things about `src/components/games/sortsquad/logic.ts`:
 *
 *  1. The robots are correct: every recorded run really sorts, and the cost
 *     properties the game teaches (Bubble's swaps = flipped pairs, Merge and
 *     Radix costing the same for any order, ...) actually hold.
 *  2. The puzzles are fair: every Best Robot puzzle has ONE clear winner that
 *     stays the same across the randomised lists, and every Mystery Robot round
 *     gives away the answer early enough to reason from.
 *
 * Exits non-zero on any failure, so it is safe to wire into a hook or CI.
 */

import {
  ALG, ALGO_NAME, PUZZLES, buildSteps, applySteps, countSteps, inversions, bitsFor,
  randomUnsorted, mulberry32, makeBestList, evaluateBest, makeMysteryRound, decisiveAt,
  whyNot, DECISIVE_FRACTION
} from '../src/components/games/sortsquad/logic.ts';

let passed = 0;
let failed = 0;
function check(ok, desc, detail = '') {
  if (ok) { passed++; console.log(`✅ [PASS] ${desc}${detail ? ` — ${detail}` : ''}`); }
  else    { failed++; console.error(`❌ [FAIL] ${desc}${detail ? ` — ${detail}` : ''}`); }
}

const rng = mulberry32(20260930);
const SEVEN = [ALG.BUBBLE, ALG.SELECTION, ALG.INSERTION, ALG.QUICK, ALG.MERGE, ALG.TIM, ALG.RADIX];
const SAMPLES = 200;

console.log('🤖 Sort Squad checks\n');
console.log('— Robots —');

/* 1. every robot sorts every list, for every bar count */
{
  let bad = 0, runs = 0;
  for (const alg of SEVEN) {
    for (let n = 4; n <= 32; n++) {
      for (let s = 0; s < SAMPLES / 4; s++) {
        const list = randomUnsorted(n, rng);
        const out = applySteps(list, buildSteps(alg, list));
        runs++;
        if (out.some((v, i) => v !== i + 1)) bad++;
      }
    }
  }
  check(bad === 0, 'All seven robots sort every list (n = 4..32)', `${runs} runs, ${bad} wrong`);
}

/* 2. cost properties the lessons claim */
{
  let ok = true, why = '';
  for (let n = 4; n <= 32 && ok; n++) {
    let mergeMoves = null, timMoves = null;
    for (let s = 0; s < SAMPLES / 4 && ok; s++) {
      const list = randomUnsorted(n, rng);
      const inv = inversions(list);
      const bub = countSteps(buildSteps(ALG.BUBBLE, list));
      const ins = countSteps(buildSteps(ALG.INSERTION, list));
      const sel = countSteps(buildSteps(ALG.SELECTION, list));
      const mer = countSteps(buildSteps(ALG.MERGE, list));
      const rad = countSteps(buildSteps(ALG.RADIX, list));
      if (bub.swaps !== inv) { ok = false; why = `Bubble swaps ${bub.swaps} != inversions ${inv} at n=${n}`; }
      else if (ins.swaps !== inv) { ok = false; why = `Insertion swaps ${ins.swaps} != inversions ${inv} at n=${n}`; }
      else if (bub.looks !== (n * (n - 1)) / 2) { ok = false; why = `Bubble looks not n(n-1)/2 at n=${n}`; }
      else if (sel.swaps > n - 1) { ok = false; why = `Selection swaps > n-1 at n=${n}`; }
      else if (mer.swaps !== 0) { ok = false; why = `Merge swapped at n=${n}`; }
      else if (rad.looks !== 0 || rad.swaps !== 0) { ok = false; why = `Radix looked/swapped at n=${n}`; }
      else if (rad.writes !== n * bitsFor(n)) { ok = false; why = `Radix writes != n*bits at n=${n}`; }
      else {
        if (mergeMoves === null) mergeMoves = mer.moves;
        else if (mergeMoves !== mer.moves) { ok = false; why = `Merge move count varies with order at n=${n}`; }
      }
    }
  }
  check(ok, 'Cost properties hold (Bubble/Insertion swaps = flipped pairs, Merge & Radix moves fixed by n, ...)', why);
}

/* 3. whyNot: silent about the real robot, and eventually rigorous about others */
{
  let ok = true, why = '';
  for (let s = 0; s < 300 && ok; s++) {
    const alg = SEVEN[Math.floor(rng() * SEVEN.length)];
    const list = randomUnsorted(12, rng);
    const steps = buildSteps(alg, list);
    if (whyNot(alg, steps, list) !== null) { ok = false; why = `${ALGO_NAME[alg]} was ruled out of its own run`; break; }
    for (const other of SEVEN) {
      if (other === alg) continue;
      if (whyNot(other, steps, list) === null && decisiveAt(alg, list, steps, SEVEN) >= 0 &&
          buildSteps(other, list).length !== steps.length) {
        ok = false; why = `${ALGO_NAME[other]} not ruled out over the whole ${ALGO_NAME[alg]} run`; break;
      }
    }
  }
  check(ok, 'whyNot never rules out the true robot, and rules out impostors over a full run', why);
}

console.log('\n— Puzzles —');

PUZZLES.forEach((p, idx) => {
  const tag = `Puzzle ${idx + 1} "${p.title}"`;
  if (p.kind === 'best') {
    const winners = new Map();
    let minMargin = Infinity, ties = 0;
    const trials = p.shape === 'reversed' ? 1 : 400;
    let last = null;
    for (let s = 0; s < trials; s++) {
      const list = makeBestList(p, rng);
      const out = evaluateBest(p, list);
      last = out;
      winners.set(out.winner, (winners.get(out.winner) || 0) + 1);
      minMargin = Math.min(minMargin, out.margin);
      if (out.margin <= 1) ties++;
    }
    check(winners.size === 1 && ties === 0,
      `${tag}: one clear winner on every list`,
      `${[...winners].map(([a, c]) => `${ALGO_NAME[a]} ×${c}`).join(', ')}; worst margin ${minMargin.toFixed(2)}×`);
    check(minMargin >= 1.15, `${tag}: winner leads by at least 15% on the worst list`, `${minMargin.toFixed(2)}×`);
    console.log('        steps on the last list:',
      last.results.map((r) => `${ALGO_NAME[r.alg]} ${r.total} (${r.looks} looks + ${r.moves} moves)`).join(' · '));
  } else {
    let kept = 0, tried = 0, fracSum = 0, worstFrac = 0, unanswerable = 0;
    for (let s = 0; s < 2000; s++) {
      const alg = p.pool[Math.floor(rng() * p.pool.length)];
      const start = randomUnsorted(p.n, rng);
      const steps = buildSteps(alg, start);
      const d = decisiveAt(alg, start, steps, p.pool);
      tried++;
      if (d < 0) { unanswerable++; continue; }
      if (d <= Math.ceil(steps.length * DECISIVE_FRACTION)) { kept++; fracSum += d / steps.length; }
    }
    check(unanswerable === 0, `${tag}: no round is unanswerable (two robots never produce the same run)`, `${unanswerable}/${tried}`);
    check(kept / tried >= 0.5, `${tag}: at least half of random rounds give the answer away within ${DECISIVE_FRACTION * 100}% of the run`,
      `${((kept / tried) * 100).toFixed(0)}% qualify, avg decisive point ${((fracSum / Math.max(1, kept)) * 100).toFixed(0)}% into the run`);
    /* the generator itself must always return a round that meets the rule */
    let genBad = 0;
    for (let s = 0; s < 300; s++) {
      const r = makeMysteryRound(p, rng);
      const ok = r.decisiveAt >= 0 && r.decisiveAt <= Math.ceil(r.steps.length * DECISIVE_FRACTION) && p.pool.includes(r.alg);
      if (!ok) genBad++;
      worstFrac = Math.max(worstFrac, r.decisiveAt / r.steps.length);
    }
    check(genBad === 0, `${tag}: makeMysteryRound always returns a fair round`, `worst decisive point ${(worstFrac * 100).toFixed(0)}% into the run`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
