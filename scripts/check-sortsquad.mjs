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
 *  2. Every puzzle is fair. "Fair" is checked per kind: a race has ONE clear
 *     winner; a mystery round gives itself away early; an after-one-pass round
 *     has exactly one right picture (verified against an independent
 *     re-implementation of each pass); the flip and swap par values match
 *     brute force; a worst-day goal is reachable but not something a random
 *     arrangement hits by luck.
 *
 * Exits non-zero on any failure, so it is safe to wire into a hook or CI.
 */

import {
  ALG, ALGO_NAME, PUZZLES, buildSteps, applySteps, countSteps, inversions, bitsFor,
  randomUnsorted, mulberry32, makeRaceList, evaluateRace, makeIdentifyRound, decisiveAt,
  whyNot, DECISIVE_FRACTION, passEnd, makeAfterPassRound, PASS_RULE, makeCountRound,
  inversionPairs, flipPrefix, flipTable, makeFlipRound, minSwaps, makeSwapRound,
  forEachPermutation, worstInfo, worstGoal, makeWorstRound, starsForMoves, PAR_SLACK
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
const isPerm = (v, n) => v.length === n && [...v].sort((a, b) => a - b).every((x, i) => x === i + 1);
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

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
    let mergeMoves = null;
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

console.log('\n— Question machinery —');

/* 4. pancake flipping: BFS table is right (known pancake numbers) and self-consistent */
{
  const KNOWN_MAX = { 4: 4, 5: 5, 6: 7, 7: 8 };          // OEIS A058986: the pancake numbers
  let ok = true, why = '';
  for (const n of [4, 5, 6, 7]) {
    const t = flipTable(n);
    let fact = 1; for (let i = 2; i <= n; i++) fact *= i;
    const max = Math.max(...t.values());
    if (t.size !== fact) { ok = false; why = `n=${n}: table has ${t.size} states, expected ${fact}`; break; }
    if (max !== KNOWN_MAX[n]) { ok = false; why = `n=${n}: max flips ${max}, expected ${KNOWN_MAX[n]}`; break; }
  }
  if (ok) {       /* every state at distance d>0 has a flip that gets it to d-1, and none get lower */
    const n = 5, t = flipTable(n);
    forEachPermutation(n, (v) => {
      if (!ok) return;
      const d = t.get(v.join(','));
      let best = Infinity;
      for (let k = 2; k <= n; k++) best = Math.min(best, t.get(flipPrefix(v, k).join(',')));
      if (d > 0 && best !== d - 1) { ok = false; why = `n=5 [${v}]: best neighbour ${best}, distance ${d}`; }
    });
  }
  check(ok, 'Flip table matches the known pancake numbers (4,5,7,8) and is self-consistent', why);
}

/* 5. swap-any par is n - cycles, confirmed against brute-force search */
{
  let ok = true, why = '', checked = 0;
  for (const n of [4, 5, 6, 7]) {
    const dist = new Map();
    const id = Array.from({ length: n }, (_, i) => i + 1);
    dist.set(id.join(','), 0);
    let frontier = [id];
    while (frontier.length) {
      const next = [];
      for (const v of frontier) for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const w = v.slice(); [w[i], w[j]] = [w[j], w[i]];
        const key = w.join(',');
        if (!dist.has(key)) { dist.set(key, dist.get(v.join(',')) + 1); next.push(w); }
      }
      frontier = next;
    }
    forEachPermutation(n, (v) => { checked++; if (ok && minSwaps(v) !== dist.get(v.join(','))) { ok = false; why = `n=${n} [${v}]`; } });
  }
  check(ok, 'minSwaps (n - cycles) equals brute-force BFS for every arrangement', ok ? `${checked} arrangements` : why);
}

/* 6. star rule */
check(starsForMoves(4, 4) === 3 && starsForMoves(4 + PAR_SLACK, 4) === 2 && starsForMoves(4 + PAR_SLACK + 1, 4) === 1,
  'starsForMoves: par = 3 stars, par+slack = 2, worse = 1');

console.log('\n— Puzzles —');

/* independent re-implementations of each pass, to check passEnd + applySteps against */
const refPass = {
  [ALG.BUBBLE]: (v) => { const a = v.slice(); for (let j = 0; j < a.length - 1; j++) if (a[j] > a[j + 1]) [a[j], a[j + 1]] = [a[j + 1], a[j]]; return a; },
  [ALG.SELECTION]: (v) => { const a = v.slice(); let m = 0; for (let j = 1; j < a.length; j++) if (a[j] < a[m]) m = j; [a[0], a[m]] = [a[m], a[0]]; return a; },
  [ALG.INSERTION]: (v) => [...v.slice(0, 3).sort((x, y) => x - y), ...v.slice(3)],
  [ALG.RADIX]: (v) => [...v.filter((x) => !(x & 1)), ...v.filter((x) => x & 1)]
};

PUZZLES.forEach((p, idx) => {
  const tag = `Puzzle ${idx + 1} "${p.title}" (${p.kind})`;

  if (p.kind === 'race') {
    const winners = new Map();
    let minMargin = Infinity, ties = 0;
    const trials = p.shape === 'reversed' ? 1 : 400;
    let last = null;
    for (let s = 0; s < trials; s++) {
      const list = makeRaceList(p, rng);
      const out = evaluateRace(p, list);
      last = out;
      winners.set(out.winner, (winners.get(out.winner) || 0) + 1);
      minMargin = Math.min(minMargin, out.margin);
      if (out.margin <= 1) ties++;
    }
    check(winners.size === 1 && ties === 0, `${tag}: one clear winner on every list`,
      `${[...winners].map(([a, c]) => `${ALGO_NAME[a]} ×${c}`).join(', ')}; worst margin ${minMargin.toFixed(2)}×`);
    check(minMargin >= 1.15, `${tag}: winner leads by at least 15% on the worst list`, `${minMargin.toFixed(2)}×`);
    console.log('        steps on the last list:',
      last.results.map((r) => `${ALGO_NAME[r.alg]} ${r.total} (${r.looks} looks + ${r.moves} moves)`).join(' · '));
  }

  else if (p.kind === 'identify') {
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
    let genBad = 0;
    for (let s = 0; s < 300; s++) {
      const r = makeIdentifyRound(p, rng);
      const ok = r.decisiveAt >= 0 && r.decisiveAt <= Math.ceil(r.steps.length * DECISIVE_FRACTION) && p.pool.includes(r.alg);
      if (!ok) genBad++;
      worstFrac = Math.max(worstFrac, r.decisiveAt / r.steps.length);
    }
    check(genBad === 0, `${tag}: makeIdentifyRound always returns a fair round`, `worst decisive point ${(worstFrac * 100).toFixed(0)}% into the run`);
  }

  else if (p.kind === 'afterPass') {
    let bad = '', rounds = 0;
    const seenAlgs = new Set();
    const okPasses = { bubbleMax: true, selMin: true };
    for (let s = 0; s < 400 && !bad; s++) {
      const r = makeAfterPassRound(p, rng);
      rounds++; seenAlgs.add(r.alg);
      const steps = buildSteps(r.alg, r.start);
      const right = applySteps(r.start, steps.slice(0, passEnd(r.alg, r.start, steps)));
      const ref = refPass[r.alg](r.start);
      if (!same(right, ref)) bad = `${ALGO_NAME[r.alg]}: passEnd gives [${right}] but the reference pass gives [${ref}] from [${r.start}]`;
      else if (r.options.length !== 4) bad = `expected 4 options, got ${r.options.length}`;
      else if (!r.options.every((o) => isPerm(o.values, p.n))) bad = 'an option is not a permutation of the bars';
      else if (new Set(r.options.map((o) => o.values.join(','))).size !== 4) bad = 'options are not all distinct';
      else if (!same(r.options[r.answer].values, right)) bad = 'answer index does not point at the right list';
      else if (r.options.filter((o) => same(o.values, right)).length !== 1) bad = 'more than one option matches the right list';
      else if (r.options.some((o) => !o.why)) bad = 'an option has no explanation';
      else if (same(right, r.start)) bad = 'the pass changed nothing';
      else if (!PASS_RULE[r.alg]) bad = `no PASS_RULE text for ${ALGO_NAME[r.alg]}`;
    }
    check(!bad, `${tag}: every round has 4 distinct pictures and exactly one right one (vs independent reference passes)`, bad || `${rounds} rounds`);
    check(seenAlgs.size === p.pool.length, `${tag}: every robot in the pool comes up`, `${[...seenAlgs].map((a) => ALGO_NAME[a]).join(', ')}`);
  }

  else if (p.kind === 'count') {
    let bad = '', rounds = 0, lo = Infinity, hi = 0;
    for (let s = 0; s < 400 && !bad; s++) {
      const r = makeCountRound(p, rng);
      rounds++; lo = Math.min(lo, r.answer); hi = Math.max(hi, r.answer);
      if (r.answer !== inversions(r.start)) bad = `answer ${r.answer} != inversions ${inversions(r.start)} for [${r.start}]`;
      else if (r.pairs.length !== r.answer) bad = `${r.pairs.length} listed pairs vs answer ${r.answer}`;
      else if (r.answer !== countSteps(buildSteps(r.alg, r.start)).swaps) bad = 'answer disagrees with the robot actually running';
    }
    check(!bad, `${tag}: the answer is the real swap count and equals the listed wrong-way pairs`, bad || `${rounds} rounds, answers ${lo}..${hi}`);
  }

  else if (p.kind === 'flip') {
    const t = flipTable(p.n);
    let good = 0; forEachPermutation(p.n, (v) => { if (t.get(v.join(',')) >= p.minPar) good++; });
    let bad = '';
    for (let s = 0; s < 300 && !bad; s++) {
      const r = makeFlipRound(p, rng);
      if (r.par < p.minPar) bad = `par ${r.par} < minPar ${p.minPar}`;
      else if (r.par !== t.get(r.start.join(','))) bad = 'par disagrees with the table';
    }
    check(!bad, `${tag}: every round has par ≥ ${p.minPar} and the right par`, bad || `${good} of ${t.size} arrangements qualify (${((good / t.size) * 100).toFixed(0)}%)`);
  }

  else if (p.kind === 'swapAny') {
    let good = 0, total = 0; forEachPermutation(p.n, (v) => { total++; if (minSwaps(v) >= p.minPar) good++; });
    let bad = '';
    for (let s = 0; s < 300 && !bad; s++) {
      const r = makeSwapRound(p, rng);
      if (r.par < p.minPar) bad = `par ${r.par} < minPar ${p.minPar}`;
      else if (r.par !== minSwaps(r.start)) bad = 'par disagrees with minSwaps';
    }
    check(!bad, `${tag}: every round has par ≥ ${p.minPar} and the right par`, bad || `${good} of ${total} arrangements qualify (${((good / total) * 100).toFixed(0)}%)`);
  }

  else if (p.kind === 'worst') {
    for (const alg of p.pool) {
      const info = worstInfo(alg, p.n);
      const goal = worstGoal(p, alg);
      const cost = countSteps(buildSteps(alg, info.example)).total;
      const luck = info.atLeast(goal) / info.total;
      check(cost === info.max && goal <= info.max, `${tag}: ${ALGO_NAME[alg]} worst case is real and the goal is reachable`,
        `max ${info.max} steps (e.g. [${info.example}]), goal ≥ ${goal}`);
      check(luck > 0 && luck <= 0.12, `${tag}: ${ALGO_NAME[alg]} goal is not something luck hits`,
        `${info.atLeast(goal)} of ${info.total} arrangements (${(luck * 100).toFixed(1)}%) reach it`);
    }
    let bad = '';
    for (let s = 0; s < 200 && !bad; s++) {
      const r = makeWorstRound(p, rng);
      if (!p.pool.includes(r.alg) || r.goal > r.max || !isPerm(r.start, p.n)) bad = 'bad worst round';
      if (!bad && r.start.join() === [...r.start].sort((a, b) => a - b).join()) bad = 'started already sorted';
    }
    check(!bad, `${tag}: makeWorstRound is well-formed`, bad);
  }
});

/* the levels that shipped first must never move: visitors' progress is stored by index */
{
  const first5 = PUZZLES.slice(0, 5).map((p) => `${p.kind}:${p.title}`).join(' | ');
  const EXPECT = 'identify:Three Signatures | race:Almost Done | identify:Neighbours or Not? | race:Backwards | identify:Cold Case';
  check(first5 === EXPECT, 'Levels 1-5 are unchanged (saved progress is stored by index)', first5 === EXPECT ? '' : first5);
  check(PUZZLES.length === 10 && new Set(PUZZLES.map((p) => p.kind)).size === 7, 'Ten levels across seven question kinds');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
