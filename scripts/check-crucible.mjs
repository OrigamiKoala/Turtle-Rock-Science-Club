/**
 * Molar Crucible verification script. Exits non-zero on any failure.
 * Run: npm run test:crucible
 */
import {
  ELEMENTS,
  MOLECULES,
  REACTIONS,
  QUEST_CHAPTERS,
  computeStoichiometry,
} from '../src/components/crucible/stoichiometryQuests.ts';

let failed = 0;
const ok = (cond, desc, extra = '') => {
  if (cond) {
    console.log(`PASS ${desc}${extra ? ' ' + extra : ''}`);
  } else {
    failed++;
    console.error(`FAIL ${desc}${extra ? ' ' + extra : ''}`);
  }
};

const close = (a, b, tol, desc) =>
  ok(Math.abs(a - b) <= tol, desc, `(got ${a.toFixed(4)}, expected ${b.toFixed(4)})`);

console.log('=== Checking Elements & Molecules Data ===');
for (const [sym, el] of Object.entries(ELEMENTS)) {
  ok(el.atomicMass > 0, `element ${sym} (${el.name}) has positive atomic mass ${el.atomicMass}`);
}

for (const [id, mol] of Object.entries(MOLECULES)) {
  let expectedMass = 0;
  for (const [elem, count] of Object.entries(mol.composition)) {
    expectedMass += ELEMENTS[elem].atomicMass * count;
  }
  close(mol.molarMass, expectedMass, 0.05, `molecule ${id} (${mol.formula}) molar mass matches elemental composition`);
}

console.log('\n=== Checking Reactions Stoichiometric Balance ===');
for (const [rxnId, rxn] of Object.entries(REACTIONS)) {
  const molA = MOLECULES[rxn.reactantA.speciesId];
  const molB = MOLECULES[rxn.reactantB.speciesId];
  const molC = MOLECULES[rxn.productC.speciesId];
  const molD = rxn.productD ? MOLECULES[rxn.productD.speciesId] : null;

  ok(!!molA && !!molB && !!molC, `reaction ${rxnId} has valid molecule specs`);

  // Count atoms on reactant side
  const reactantAtoms = {};
  for (const [elem, count] of Object.entries(molA.composition)) {
    reactantAtoms[elem] = (reactantAtoms[elem] || 0) + count * rxn.reactantA.coeff;
  }
  for (const [elem, count] of Object.entries(molB.composition)) {
    reactantAtoms[elem] = (reactantAtoms[elem] || 0) + count * rxn.reactantB.coeff;
  }

  // Count atoms on product side
  const productAtoms = {};
  for (const [elem, count] of Object.entries(molC.composition)) {
    productAtoms[elem] = (productAtoms[elem] || 0) + count * rxn.productC.coeff;
  }
  if (molD && rxn.productD) {
    for (const [elem, count] of Object.entries(molD.composition)) {
      productAtoms[elem] = (productAtoms[elem] || 0) + count * rxn.productD.coeff;
    }
  }

  const allElements = new Set([...Object.keys(reactantAtoms), ...Object.keys(productAtoms)]);
  for (const elem of allElements) {
    const left = reactantAtoms[elem] || 0;
    const right = productAtoms[elem] || 0;
    ok(left === right, `reaction ${rxnId} balances element ${elem}: ${left} in reactants vs ${right} in products`);
  }
}

console.log('\n=== Checking 20 Quest Chapters Solutions & Conservation ===');
ok(QUEST_CHAPTERS.length === 20, `expected 20 quest chapters, found ${QUEST_CHAPTERS.length}`);

for (const chapter of QUEST_CHAPTERS) {
  const rxn = REACTIONS[chapter.reactionId];
  ok(!!rxn, `chapter ${chapter.id} (${chapter.title}) points to valid reaction ${chapter.reactionId}`);

  const cond = chapter.targetCondition;
  const targetA = cond.targetMolesA;
  const targetB = cond.targetMolesB;

  ok(targetA > 0 && targetB > 0, `chapter ${chapter.id} has positive target moles`);

  // Run stoichiometry analysis at target condition
  const analysis = computeStoichiometry(
    chapter.reactionId,
    targetA,
    targetB,
    chapter.actualYieldEfficiency
  );

  // Verify total mass conservation (mass in = mass products + mass excess)
  const totalMassIn = analysis.gramsA + analysis.gramsB;
  const massProducts =
    analysis.theoreticalMolesC * analysis.molC.molarMass +
    (analysis.molD ? analysis.theoreticalMolesD * analysis.molD.molarMass : 0);
  const massExcess =
    analysis.excessMolesA * analysis.molA.molarMass +
    analysis.excessMolesB * analysis.molB.molarMass;
  close(
    totalMassIn,
    massProducts + massExcess,
    0.05,
    `chapter ${chapter.id} (${chapter.title}) satisfies conservation of mass`
  );

  // If requireZeroExcess, check that excess moles is 0 at target
  if (cond.requireZeroExcess) {
    const excess = analysis.excessMolesA + analysis.excessMolesB;
    close(excess, 0, 1e-4, `chapter ${chapter.id} target yields zero excess reactants`);
  }

  // If quiz question exists, ensure correctId exists in options
  if (cond.predictionQuestion) {
    const optIds = cond.predictionQuestion.options.map((o) => o.id);
    ok(
      optIds.includes(cond.predictionQuestion.correctId),
      `chapter ${chapter.id} quiz correctId '${cond.predictionQuestion.correctId}' is in options`
    );
  }
}

console.log('\n=== Checking Limiting Reactant Engine ===');
{
  // 2 H2 + O2 -> 2 H2O
  // 4 mol H2 + 1 mol O2 -> O2 is limiting! 2 mol H2O formed, 2 mol H2 leftover
  const r = computeStoichiometry('oxyhydrogen', 4, 1, 1.0);
  ok(r.limitingStatus === 'B', '4 mol H2 + 1 mol O2: O2 is limiting reactant (B)');
  close(r.theoreticalMolesC, 2, 1e-4, '4 mol H2 + 1 mol O2: produces 2 mol H2O');
  close(r.excessMolesA, 2, 1e-4, '4 mol H2 + 1 mol O2: 2 mol H2 excess');
  close(r.excessMolesB, 0, 1e-4, '4 mol H2 + 1 mol O2: 0 mol O2 excess');
}

{
  // 1 mol N2 + 6 mol H2 -> 2 NH3
  // N2 is limiting! 2 mol NH3 formed, 3 mol H2 excess
  const r = computeStoichiometry('haber', 1, 6, 1.0);
  ok(r.limitingStatus === 'A', '1 mol N2 + 6 mol H2: N2 is limiting reactant (A)');
  close(r.theoreticalMolesC, 2, 1e-4, '1 mol N2 + 6 mol H2: produces 2 mol NH3');
  close(r.excessMolesA, 0, 1e-4, '1 mol N2 + 6 mol H2: 0 mol N2 excess');
  close(r.excessMolesB, 3, 1e-4, '1 mol N2 + 6 mol H2: 3 mol H2 excess');
}

if (failed > 0) {
  console.error(`\n${failed} checks failed!`);
  process.exit(1);
} else {
  console.log('\nAll crucible checks passed successfully.');
}
