/**
 * Gravity Slingshot — Automated Verification Script
 * Validates physics engine, conservation, gravity assist speed boost, and stage logic.
 */

import {
  GM_SUN,
  AU_YR_TO_KM_S,
  getPlanetState,
  computeAcceleration,
  stepSimulation,
  createLaunchState
} from '../src/components/slingshot/physics.ts';

import {
  STAGES,
  PLANET_EARTH,
  PLANET_JUPITER,
  PLANET_SATURN,
  PLANET_NEPTUNE
} from '../src/components/slingshot/stages.ts';

console.log('🚀 Running Gravity Slingshot Verification Suite...\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failed++;
  }
}

// 1. Keplerian Orbit Benchmark: Earth at 1.0 AU
{
  const t0 = 0;
  const p0 = getPlanetState(PLANET_EARTH, t0);
  const pHalf = getPlanetState(PLANET_EARTH, 0.5);
  const pFull = getPlanetState(PLANET_EARTH, 1.0);

  const speedKmS = Math.hypot(p0.vel.x, p0.vel.y) * AU_YR_TO_KM_S;
  assert(Math.abs(speedKmS - 29.78) < 0.1, `Earth orbital speed is ~29.78 km/s (got ${speedKmS.toFixed(2)})`);
  assert(Math.abs(pHalf.pos.x - (-1.0)) < 0.01 && Math.abs(pHalf.pos.y) < 0.01, 'Earth is at (-1, 0) AU at t = 0.5 yr');
  assert(Math.abs(pFull.pos.x - 1.0) < 0.01 && Math.abs(pFull.pos.y) < 0.01, 'Earth completes 1 revolution at t = 1.0 yr');
}

// 2. Gravitational Acceleration at 1 AU
{
  const a = computeAcceleration({ x: 1.0, y: 0.0 }, [], 0);
  assert(Math.abs(a.x - (-GM_SUN)) < 0.01 && Math.abs(a.y) < 0.01, 'Central Sun gravity at 1.0 AU matches GM_SUN');
}

// 3. Symplectic Verlet Orbital Energy Conservation
{
  let probe = {
    pos: { x: 1.0, y: 0.0 },
    vel: { x: 0.0, y: 2 * Math.PI },
    fuel: 10,
    maxFuel: 10,
    timeYr: 0,
    status: 'flying'
  };

  const dt = 0.001;
  const totalSteps = 1000;
  for (let i = 0; i < totalSteps; i++) {
    const { nextState } = stepSimulation(probe, [], dt);
    probe = nextState;
  }

  const finalDist = Math.hypot(probe.pos.x, probe.pos.y);
  const distErrorPercent = Math.abs(finalDist - 1.0) * 100;
  assert(distErrorPercent < 0.1, `Orbit after 1 yr conserves radius within 0.1% (error: ${distErrorPercent.toFixed(4)}%)`);
}

// 4. The Discriminating Observation: Gravity Assist Speed Gain
{
  // Case A: Passing behind Jupiter -> Slingshots probe outward to 28+ AU
  let probeBehind = createLaunchState(PLANET_EARTH, [PLANET_JUPITER], 85.0, 9.6, 12.0);
  let maxDistBehind = 0;

  for (let i = 0; i < 25000; i++) {
    const { nextState } = stepSimulation(probeBehind, [PLANET_JUPITER], 0.0005);
    probeBehind = nextState;
    const dist = Math.hypot(probeBehind.pos.x, probeBehind.pos.y);
    if (dist > maxDistBehind) maxDistBehind = dist;
    if (probeBehind.status !== 'flying') break;
  }

  // Case B: Passing in front of Jupiter -> Traps probe in inner solar system
  let probeFront = createLaunchState(PLANET_EARTH, [PLANET_JUPITER], 87.5, 9.6, 12.0);
  let maxDistFront = 0;

  for (let i = 0; i < 25000; i++) {
    const { nextState } = stepSimulation(probeFront, [PLANET_JUPITER], 0.0005);
    probeFront = nextState;
    const dist = Math.hypot(probeFront.pos.x, probeFront.pos.y);
    if (dist > maxDistFront) maxDistFront = dist;
    if (probeFront.status !== 'flying') break;
  }

  assert(maxDistBehind > 25.0, `Passing behind Jupiter slingshots probe to ${maxDistBehind.toFixed(1)} AU (huge outward gain)`);
  assert(maxDistFront < 6.0, `Passing in front of Jupiter slows probe down to ${maxDistFront.toFixed(1)} AU (inner orbit trap)`);
}

// 5. Stage 1 Solvable Check: Establish Orbit
{
  const stage1 = STAGES[0];
  let probe = createLaunchState(PLANET_EARTH, [], stage1.defaultLaunchAngleDeg, stage1.defaultLaunchSpeedKmS, stage1.initialFuelKmS);
  for (let i = 0; i < 1200; i++) {
    const { nextState } = stepSimulation(probe, stage1.planets, 0.001);
    probe = nextState;
  }
  const passedS1 = stage1.checkSuccess(probe, []);
  assert(passedS1, 'Stage 1 default launch establishes a stable orbit for 1 year without crashing');
}

// 6. Stage 2 Constraint Check: The Fuel Wall
{
  const stage2 = STAGES[1];
  let probe = createLaunchState(PLANET_EARTH, stage2.planets, stage2.defaultLaunchAngleDeg, stage2.defaultLaunchSpeedKmS, stage2.initialFuelKmS);

  let maxDist = 0;
  for (let i = 0; i < 3000; i++) {
    const { nextState } = stepSimulation(probe, stage2.planets, 0.001);
    probe = nextState;
    const dist = Math.hypot(probe.pos.x, probe.pos.y);
    if (dist > maxDist) maxDist = dist;
  }

  assert(maxDist < 5.0, `Direct max-fuel burn stalls at ${maxDist.toFixed(1)} AU, proving Neptune (30 AU) is unreachable by engine alone`);
  assert(probe.fuel === 0, 'Fuel is 100% depleted');
}

// 7. Stage 3 Solvable Check: Reach Saturn via Jupiter Assist
{
  const stage3 = STAGES[2];
  let probe = createLaunchState(PLANET_EARTH, stage3.planets, stage3.defaultLaunchAngleDeg, stage3.defaultLaunchSpeedKmS, stage3.initialFuelKmS);
  const flightLog = [];

  for (let i = 0; i < 20000; i++) {
    const { nextState, event, eventBody } = stepSimulation(probe, stage3.planets, 0.0005);
    probe = nextState;
    if (event) {
      const jPos = getPlanetState(PLANET_JUPITER, probe.timeYr).pos;
      const jDist = Math.hypot(probe.pos.x - jPos.x, probe.pos.y - jPos.y);
      flightLog.push({
        timeYr: probe.timeYr,
        x: probe.pos.x,
        y: probe.pos.y,
        speedKmS: Math.hypot(probe.vel.x, probe.vel.y) * AU_YR_TO_KM_S,
        fuelKmS: probe.fuel,
        nearestPlanetId: 'jupiter',
        nearestPlanetDistAU: jDist,
        event
      });
    }
    if (stage3.checkSuccess(probe, flightLog)) break;
    if (probe.status !== 'flying') break;
  }

  const passedS3 = stage3.checkSuccess(probe, flightLog);
  assert(passedS3, 'Stage 3: Jupiter assist flings probe to Saturn on a single launch tank');
}

// 8. Stage 4 Solvable Check: The Grand Tour to Neptune
{
  const stage4 = STAGES[3];
  let probe = createLaunchState(PLANET_EARTH, stage4.planets, stage4.defaultLaunchAngleDeg, stage4.defaultLaunchSpeedKmS, stage4.initialFuelKmS);

  for (let i = 0; i < 40000; i++) {
    const { nextState } = stepSimulation(probe, stage4.planets, 0.0005);
    probe = nextState;
    if (stage4.checkSuccess(probe)) break;
    if (probe.status !== 'flying') break;
  }

  const passedS4 = stage4.checkSuccess(probe);
  assert(passedS4, 'Stage 4: Chained assists across Jupiter & Saturn carry probe all the way to Neptune');
}

// 9. Vocabulary Gate Check (copy-and-hints.md discipline)
{
  const earlyStages = [STAGES[0], STAGES[1]];
  let vocabViolation = false;

  for (const s of earlyStages) {
    const textToCheck = [
      s.prompt,
      s.goalDescription,
      ...s.hints.map(h => h.text)
    ].join(' ').toLowerCase();

    if (textToCheck.includes('gravity assist') || textToCheck.includes('slingshot') || textToCheck.includes('hyperbolic')) {
      vocabViolation = true;
      console.error(`Vocab violation in stage ${s.number}: technical terms used before earned`);
    }
  }

  assert(!vocabViolation, 'Stage 1 and 2 prompts and hints use no unearned technical terms');
}

console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Gravity Slingshot physics and pedagogical gates PASSED!\n');
}
