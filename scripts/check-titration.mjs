/**
 * Chemistry Engine Verification Script
 * Validates the 7 benchmark cases specified in titration-lab-plan.md §1.2
 */

import { solvePh, REAGENTS, calculateTitrationState } from '../src/components/titration/chem.ts';

console.log('🧪 Running Chemistry Solver Benchmark Checks...\n');

let passed = 0;
let failed = 0;

function assertClose(actual, expected, tolerance, desc) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    console.log(`✅ [PASS] ${desc}: got pH ${actual.toFixed(2)} (expected ${expected.toFixed(2)}, tolerance ±${tolerance})`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${desc}: got pH ${actual.toFixed(2)} (expected ${expected.toFixed(2)}, diff ${diff.toFixed(4)})`);
    failed++;
  }
}

// 1. 0.1 M HCl vs 0.1 M NaOH, at equivalence (25 mL + 25 mL)
{
  const res = calculateTitrationState({
    analyte: REAGENTS.hcl,
    analyteConc: 0.1,
    analyteVolumeMl: 25.0,
    titrant: REAGENTS.naoh,
    titrantConc: 0.1,
    titrantVolumeMl: 25.0
  });
  assertClose(res.pH, 7.00, 0.05, '1. 0.1 M HCl vs 0.1 M NaOH at equivalence');
}

// 2. 0.1 M acetic (pKa 4.76) vs NaOH, at half-equivalence (25 mL + 12.5 mL)
{
  const res = calculateTitrationState({
    analyte: REAGENTS.acetic,
    analyteConc: 0.1,
    analyteVolumeMl: 25.0,
    titrant: REAGENTS.naoh,
    titrantConc: 0.1,
    titrantVolumeMl: 12.5
  });
  assertClose(res.pH, 4.76, 0.05, '2. 0.1 M acetic vs NaOH at half-equivalence');
}

// 3. 0.1 M acetic vs 0.1 M NaOH, at equivalence (25 mL + 25 mL)
{
  const res = calculateTitrationState({
    analyte: REAGENTS.acetic,
    analyteConc: 0.1,
    analyteVolumeMl: 25.0,
    titrant: REAGENTS.naoh,
    titrantConc: 0.1,
    titrantVolumeMl: 25.0
  });
  assertClose(res.pH, 8.72, 0.08, '3. 0.1 M acetic vs 0.1 M NaOH at equivalence');
}

// 4. 0.1 M NH3 (pKb 4.75 -> pKa 9.25) vs 0.1 M HCl, at equivalence (25 mL + 25 mL)
{
  const res = calculateTitrationState({
    analyte: REAGENTS.ammonia,
    analyteConc: 0.1,
    analyteVolumeMl: 25.0,
    titrant: REAGENTS.hcl,
    titrantConc: 0.1,
    titrantVolumeMl: 25.0
  });
  assertClose(res.pH, 5.28, 0.08, '4. 0.1 M NH3 vs 0.1 M HCl at equivalence');
}

// 5. 1e-7 M HCl (the classic trap: auto-ionization of water matters)
{
  // 1e-7 M HCl in pure water
  const res = calculateTitrationState({
    analyte: REAGENTS.hcl,
    analyteConc: 1e-7,
    analyteVolumeMl: 100.0,
    titrant: REAGENTS.naoh,
    titrantConc: 0.0,
    titrantVolumeMl: 0.0
  });
  assertClose(res.pH, 6.79, 0.05, '5. 1e-7 M HCl (dilute acid trap)');
}

// 6. Pure water, no analyte / blank
{
  const pH = solvePh([], []);
  assertClose(pH, 7.00, 0.01, '6. Pure water (neutrality)');
}

// 7. 0.1 M Na2CO3 vs 0.1 M HCl (two jumps near pH 8.3 and 3.8)
{
  // 25 mL 0.1 M Na2CO3:
  // Eq 1 at 25 mL (HCO3-): pH ~ 8.3
  const res1 = calculateTitrationState({
    analyte: REAGENTS.carbonate,
    analyteConc: 0.1,
    analyteVolumeMl: 25.0,
    titrant: REAGENTS.hcl,
    titrantConc: 0.1,
    titrantVolumeMl: 25.0
  });
  // Eq 2 at 50 mL (H2CO3): pH ~ 3.8
  const res2 = calculateTitrationState({
    analyte: REAGENTS.carbonate,
    analyteConc: 0.1,
    analyteVolumeMl: 25.0,
    titrant: REAGENTS.hcl,
    titrantConc: 0.1,
    titrantVolumeMl: 50.0
  });

  assertClose(res1.pH, 8.34, 0.15, '7a. 0.1 M Na2CO3 vs HCl (1st equivalence, HCO3-)');
  assertClose(res2.pH, 3.85, 0.15, '7b. 0.1 M Na2CO3 vs HCl (2nd equivalence, H2CO3)');
}

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All benchmark chemistry solver checks passed!');
}
