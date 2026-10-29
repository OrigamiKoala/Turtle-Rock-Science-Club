/**
 * Gravity Slingshot verification. Exits non-zero on any failure.
 * Run: npm run test:slingshot
 */
import { simulate, circularSpeed, GM_SUN } from '../src/components/slingshot/physics.ts';
import { STAGES, kmsToAu, auToKms, NEPTUNE_A, SATURN_A, neptuneClosest, stageAt, closestToBody, shiftBody } from '../src/components/slingshot/stages.ts';

let failed = 0;
const ok = (cond, desc, extra = '') => {
  if (cond) console.log(`PASS ${desc}${extra ? ' ' + extra : ''}`);
  else {
    failed++;
    console.error(`FAIL ${desc}${extra ? ' ' + extra : ''}`);
  }
};
const close = (a, b, tol, desc) => ok(Math.abs(a - b) <= tol, desc, `(got ${a.toFixed(4)}, expected ${b.toFixed(4)})`);

const [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10] = STAGES;
const DEG = Math.PI / 180;
const run = (stage, dirDeg, kms, opts = { sampleEvery: 0.05 }) =>
  simulate(stage.world, stage.makeLaunch((dirDeg * Math.PI) / 180, kmsToAu(kms)), opts);
const sunOnly = { bodies: [], tMax: 60 };

// ---- engine against known values ----
{
  const r = simulate(sunOnly, { x: 1, y: 0, vx: 0, vy: circularSpeed(1), dvx: 0, dvy: 0, t0: 0 }, { tMax: 20 });
  const last = r.samples[r.samples.length - 1];
  close(Math.hypot(last.x, last.y), 1, 1e-4, 'circular orbit keeps r = 1 AU for 20 years');
  close(r.swept / (2 * Math.PI), 20, 0.01, 'circular orbit at 1 AU takes one year per lap');
}
for (const dv of [1.0, 1.5, 2.0, 2.3]) {
  const vp = 2 * Math.PI + dv;
  const eps = (vp * vp) / 2 - GM_SUN;
  const a = -GM_SUN / (2 * eps);
  const r = simulate(sunOnly, { x: 1, y: 0, vx: 0, vy: 2 * Math.PI, dvx: 0, dvy: dv, t0: 0 }, { sampleEvery: 0.2 });
  close(r.maxR, 2 * a - 1, 0.02 * (2 * a - 1), `aphelion after a ${dv} AU/yr burn matches the vis-viva value`);
}

// ---- stage 1 ----
{
  const fall = run(s1, 0, 0);
  ok(fall.end === 'sun', 'stage 1: no sideways speed falls into the Sun');
  const lap = run(s1, 0, 29.8);
  ok(s1.evaluate(lap, kmsToAu(29.8), [false]).done, 'stage 1: 29.8 km/s sideways completes a lap');
  const low = run(s1, 0, 12);
  ok(s1.evaluate(low, kmsToAu(12), [false]).done, 'stage 1: a fast fall that still misses the Sun counts');
  const out = run(s1, 90, 45);
  ok(!s1.evaluate(out, kmsToAu(45), [false]).done, 'stage 1: a hard push straight away from the Sun does not count');
  const ten = run(s1, 0, 4);
  ok(!s1.evaluate(ten, kmsToAu(4), [false]).done, 'stage 1: a weak sideways push hits the Sun and does not count');
}

// ---- stage 2: nothing inside the tank reaches Neptune ----
{
  let best = 0;
  let reached = false;
  for (let d = -180; d < 180; d += 2) {
    const r = simulate(s2.world, s2.makeLaunch((d * Math.PI) / 180, s2.tank), { sampleEvery: 0.5 });
    best = Math.max(best, r.maxR);
    if (r.maxR >= NEPTUNE_A) reached = true;
  }
  ok(!reached, 'stage 2: no direction with a full tank reaches 30 AU', `(best ${best.toFixed(1)} AU)`);
  const prograde = simulate(s2.world, s2.makeLaunch(0, s2.tank), { sampleEvery: 0.2 });
  ok(s2.evaluate(prograde, s2.tank, [false]).done, 'stage 2: a full-tank launch completes the stage');
  const half = simulate(s2.world, s2.makeLaunch(0, s2.tank * 0.5), { sampleEvery: 0.2 });
  ok(!s2.evaluate(half, s2.tank * 0.5, [false]).done, 'stage 2: a half tank does not complete it');
  ok(auToKms(s2.tank) <= 10.001, 'stage 2: tank is 10 km/s');
}

// ---- stage 3 ----
{
  const zero = run(s3, 0, 0);
  const f0 = zero.flybys[0];
  ok(f0 && f0.complete && f0.vOut > f0.vIn, 'stage 3: with no burn the flyby still changes speed from the Sun');
  ok(!s3.evaluate(zero, 0, [false]).done, 'stage 3: no burn does not reach Saturn');

  let fuelBest = 0;
  const noJupiter = { bodies: [], tMax: 30 };
  for (let d = -180; d < 180; d += 3)
    fuelBest = Math.max(fuelBest, simulate(noJupiter, s3.makeLaunch((d * Math.PI) / 180, s3.tank), { sampleEvery: 0.2 }).maxR);
  ok(fuelBest < SATURN_A, "stage 3: the tank alone can't reach Saturn's orbit", `(best ${fuelBest.toFixed(1)} AU)`);

  const sol = run(s3, -100, 1.1);
  const ev = s3.evaluate(sol, kmsToAu(1.1), [false]);
  ok(ev.done, "stage 3: reference burn reaches Saturn's orbit with Jupiter", `(${sol.maxR.toFixed(1)} AU)`);
  ok(1.1 <= auToKms(s3.tank), 'stage 3: reference burn fits in the tank');
  const f = sol.flybys[0];
  ok(f.vOut - f.vIn > 0, 'stage 3: reference flyby raises speed from the Sun', `(${auToKms(f.vIn).toFixed(1)} -> ${auToKms(f.vOut).toFixed(1)} km/s)`);
  close(f.relOut, f.relIn, 0.12 * f.relIn, 'stage 3: speed relative to Jupiter is nearly the same in and out');
  const solNoJ = simulate(noJupiter, s3.makeLaunch((-100 * Math.PI) / 180, kmsToAu(1.1)), { sampleEvery: 0.2 });
  ok(solNoJ.maxR < SATURN_A, 'stage 3: the same burn without Jupiter falls short');

  let robust = 0;
  let total = 0;
  for (const dd of [-2, -1, 0, 1, 2])
    for (const dk of [-0.1, 0, 0.1]) {
      total++;
      const r = run(s3, -100 + dd, 1.1 + dk, { sampleEvery: 0.2 });
      if (s3.evaluate(r, 0, [false]).done) robust++;
    }
  ok(robust / total >= 0.6, 'stage 3: the solution survives small aiming errors', `(${robust}/${total})`);
}

// ---- stage 4 ----
{
  const sol = run(s4, (-0.351 * 180) / Math.PI, auToKms(2.0));
  const ev = s4.evaluate(sol, 2.0, [false]);
  ok(ev.done, 'stage 4: reference launch gets within 6 AU of Neptune', `(${neptuneClosest(sol).toFixed(1)} AU)`);
  ok(2.0 <= s4.tank, 'stage 4: reference launch fits in the tank');
  ok(sol.flybys.filter((x) => x.complete).length >= 1, 'stage 4: reference launch flies past at least one planet');

  const noPlanets = { bodies: [], tMax: 40 };
  let reached = false;
  let bestD = Infinity;
  for (let d = -180; d < 180; d += 2) {
    const r = simulate(noPlanets, s4.makeLaunch((d * Math.PI) / 180, s4.tank), { sampleEvery: 0.5 });
    const c = neptuneClosest(r);
    bestD = Math.min(bestD, c);
    if (c <= 6) reached = true;
  }
  ok(!reached, 'stage 4: a full tank without planets cannot get within 6 AU of Neptune', `(best ${bestD.toFixed(1)} AU)`);

  let robust = 0;
  let total = 0;
  for (const dd of [-0.004, -0.002, 0, 0.002, 0.004])
    for (const dm of [-0.02, 0, 0.02]) {
      total++;
      const r = simulate(s4.world, s4.makeLaunch(-0.351 + dd, 2.0 + dm), { sampleEvery: 0.1 });
      if (neptuneClosest(r) <= 6) robust++;
    }
  ok(robust / total >= 0.5, 'stage 4: the solution survives small aiming errors', `(${robust}/${total})`);
}


// ---- stages 5-10 ----
const fly = (st, months, dirDeg, kms) => {
  const at = stageAt(st, months / 12);
  const r = simulate(at.world, at.makeLaunch(dirDeg * DEG, kmsToAu(kms)), { sampleEvery: 0.1 });
  return { r, at, ev: at.evaluate(r, kmsToAu(kms), [false], months / 12) };
};
const robustness = (st, months, dir, kms) => {
  let n = 0;
  let total = 0;
  for (const dm of [-0.3, 0, 0.3])
    for (const dd of [-0.5, 0, 0.5]) {
      total++;
      if (fly(st, Math.max(0, months + dm), dir + dd, kms).ev.done) n++;
    }
  return [n, total];
};
const sunOnlyStage = (st) => ({ ...st, world: { bodies: [], tMax: st.world.tMax } });

// 5: launch window
{
  ok(fly(s5, 5, 0, 8.9).ev.done, 'stage 5: a full prograde burn launched in month 5 reaches Jupiter');
  ok(!fly(s5, 0, 0, 8.9).ev.done, 'stage 5: the same burn launched now misses Jupiter');
  ok(!fly(s5, 8, 0, 8.9).ev.done, 'stage 5: the same burn launched in month 8 misses Jupiter');
  const [n, t] = robustness(s5, 5, 0, 8.9);
  ok(n / t >= 0.5, 'stage 5: the solution survives small timing and aiming errors', `(${n}/${t})`);
}

// 6: falling in
{
  const zero = fly(s6, 0, 0, 0);
  ok(!zero.ev.done, 'stage 6: no burn does not get inside Mercury\'s orbit', `(min ${zero.r.minR.toFixed(2)} AU)`);
  const sol = fly(s6, 0, -108, 1.5);
  ok(sol.ev.done, 'stage 6: reference burn gets inside 0.39 AU', `(min ${sol.r.minR.toFixed(2)} AU)`);
  const f = sol.r.flybys[0];
  ok(f && f.complete && f.vOut < f.vIn, 'stage 6: reference flyby lowers speed from the Sun', f ? `(${auToKms(f.vIn).toFixed(1)} -> ${auToKms(f.vOut).toFixed(1)} km/s)` : '');
  let best = Infinity;
  for (let d = -180; d < 180; d += 3) {
    const r = simulate(sunOnlyStage(s6).world, s6.makeLaunch(d * DEG, s6.tank), { sampleEvery: 0.2 });
    if (r.end !== 'sun') best = Math.min(best, r.minR);
  }
  ok(best > 0.39, 'stage 6: the tank alone cannot get inside 0.39 AU', `(best ${best.toFixed(2)} AU)`);
  const [n, t] = robustness(s6, 0, -108, 1.5);
  ok(n / t >= 0.5, 'stage 6: the solution survives small aiming errors', `(${n}/${t})`);
}

// 7: escape
{
  const zero = fly(s7, 0, 0, 0);
  ok(!zero.ev.done, 'stage 7: no burn does not escape', `(farthest ${zero.r.maxR.toFixed(1)} AU)`);
  const sol = fly(s7, 0, -30, 1.5);
  ok(sol.ev.done, 'stage 7: reference burn escapes past 48 AU');
  const f = sol.r.flybys[0];
  ok(f && auToKms(f.vOut) > 0, 'stage 7: reference burn flies past Jupiter');
  let escaped = false;
  for (let d = -180; d < 180; d += 3) {
    const r = simulate(sunOnlyStage(s7).world, s7.makeLaunch(d * DEG, s7.tank), { sampleEvery: 0.5 });
    if (r.end === 'lost') escaped = true;
  }
  ok(!escaped, 'stage 7: the tank alone cannot escape');
  const [n, t] = robustness(s7, 0, -30, 1.5);
  ok(n / t >= 0.5, 'stage 7: the solution survives small aiming errors', `(${n}/${t})`);
}

// 8-10: planet chains
for (const [st, mo, dir, kms, label] of [
  [s8, 20.5, 0, 8.5, 'Saturn'],
  [s9, 7.5, 0, 8.5, 'Uranus'],
  [s10, 23, 1.5, 8.5, 'Neptune'],
]) {
  const sol = fly(st, mo, dir, kms);
  ok(sol.ev.done, `stage ${st.id}: reference launch gets within ${st.target.r} AU of ${label}`);
  ok(kms <= auToKms(st.tank), `stage ${st.id}: reference burn fits in the tank`);
  ok(sol.r.flybys.filter((x) => x.complete).length >= 1, `stage ${st.id}: reference launch flies past an earlier planet first`);
  const [n, t] = robustness(st, mo, dir, kms);
  ok(n / t >= 0.5, `stage ${st.id}: the solution survives small timing and aiming errors`, `(${n}/${t})`);
  let reached = false;
  const bare = sunOnlyStage(st);
  for (let m = 0; m <= st.windowMonths; m += 1)
    for (let d = -30; d <= 30; d += 5) {
      const at = stageAt(bare, m / 12);
      const r = simulate(at.world, at.makeLaunch(d * DEG, st.tank), { sampleEvery: 0.5 });
      const tb = shiftBody(st.world.bodies.find((b) => b.id === st.target.id), m / 12);
      if (closestToBody(r, tb) <= st.target.r) reached = true;
    }
  ok(!reached, `stage ${st.id}: a full tank without planets cannot reach ${label}`);
  const early = fly(st, 0, 0, 0);
  ok(!early.ev.done, `stage ${st.id}: doing nothing does not complete it`);
}

// ---- words appear only once earned ----
{
  const text = (s) => [s.prompt, s.caption ?? '', ...s.hints].join(' \n ').toLowerCase();
  for (const s of [s1, s2]) ok(!text(s).includes('assist'), `stage ${s.id}: "assist" is not used before stage 3 is solved`);
  ok(!text(s3).includes('assist'), 'stage 3: "assist" only appears in the naming card');
  ok(s3.naming.toLowerCase().includes('gravity assist'), 'stage 3: naming card names the gravity assist');
  ok(!text(s1).includes('orbit'), 'stage 1: "orbit" only appears in the naming card');
  ok(s1.naming.toLowerCase().includes('orbit'), 'stage 1: naming card names the orbit');
  const banned = ['prograde', 'retrograde', 'behind', 'ahead of', 'in front of'];
  for (const s of STAGES) {
    const all = [text(s), s.naming.toLowerCase()].join(' ');
    const hit = banned.filter((w) => all.includes(w));
    ok(hit.length === 0, `stage ${s.id}: no solution words in prompts, hints or captions`, hit.join(','));
  }
  const miss = s4.evaluate(run(s4, 90, 5), 1, [false]).readouts.join(' ').toLowerCase();
  ok(!banned.some((w) => miss.includes(w)), 'stage 4: a miss message only reports readings');
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nAll slingshot checks passed');
