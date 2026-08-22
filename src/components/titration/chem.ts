/**
 * Pure chemistry engine for acid-base titration simulations.
 * Implements an exact polyprotic charge-balance numerical solver via bisection.
 */

export const KW = 1.0e-14;

export interface AcidSystem {
  /** Total analytical concentration in mol/L after dilution */
  F: number;
  /** Stepwise acid dissociation constants pKa, from most acidic to least acidic */
  pKa: number[];
  /** Charge of the fully protonated form (e.g. HA -> 0, NH4+ -> +1, H2PO4- -> -1) */
  z0: number;
}

export interface SpectatorIon {
  /** Concentration in mol/L after dilution */
  C: number;
  /** Ionic charge (e.g., Na+ -> +1, Cl- -> -1, SO4^2- -> -2) */
  z: number;
}

export interface ReagentDef {
  id: string;
  name: string;
  formula: string;
  commonName: string;
  category: 'strong_acid' | 'weak_acid' | 'strong_base' | 'weak_base';
  pKa: number[]; // Stepwise pKa values
  z0: number; // Charge of fully protonated form
  spectators: { z: number; count: number }[]; // Inherent counter-ions per formula unit
  defaultConc?: number;
  isPolyprotic?: boolean;
}

export interface IndicatorDef {
  id: string;
  name: string;
  pKa: number;
  acidColorHex: string;
  baseColorHex: string;
  acidName: string;
  baseName: string;
  rangeText: string;
}

export interface UnknownSample {
  seed: number;
  sampleId: string;
  reagent: ReagentDef;
  trueMolarity: number;
  sampleVolumeMl: number;
  titrant: ReagentDef;
  titrantMolarity: number;
  recommendedIndicatorId: string;
}

/**
 * Solve for equilibrium pH of an arbitrary mixture of acid/base systems and spectator ions.
 * Solves f([H]) = [H] - Kw/[H] + sum(C_spec * z) + sum(F * (z0 - sum(i * alpha_i))) = 0
 * Uses 60 iterations of bisection over pH range [-1, 15].
 */
export function solvePh(systems: AcidSystem[], spectators: SpectatorIon[]): number {
  // Bisection on pH from -1 to 15
  let minPh = -1.0;
  let maxPh = 15.0;

  function chargeResidual(pH: number): number {
    const H = Math.pow(10, -pH);
    const OH = KW / H;

    let sum = H - OH;

    // Spectator ions contribution
    for (let i = 0; i < spectators.length; i++) {
      const spec = spectators[i];
      sum += spec.C * spec.z;
    }

    // Acid systems contribution
    for (let s = 0; s < systems.length; s++) {
      const sys = systems[s];
      if (sys.F <= 0) continue;

      const n = sys.pKa.length;
      if (n === 0) {
        // Strong acid / strong base without pKa should be modeled via spectators,
        // but handle z0 just in case
        sum += sys.F * sys.z0;
        continue;
      }

      // Precalculate Ka constants
      // Ka_1, Ka_2, ...
      const Ka: number[] = new Array(n);
      for (let k = 0; k < n; k++) {
        Ka[k] = Math.pow(10, -sys.pKa[k]);
      }

      // Compute polynomial terms for D
      // term[0] = [H]^n
      // term[1] = Ka1 * [H]^(n-1)
      // term[2] = Ka1 * Ka2 * [H]^(n-2) ...
      // term[n] = Ka1 * Ka2 * ... * Kan
      const terms: number[] = new Array(n + 1);
      terms[0] = Math.pow(H, n);
      let prodKa = 1.0;
      for (let i = 1; i <= n; i++) {
        prodKa *= Ka[i - 1];
        terms[i] = prodKa * Math.pow(H, n - i);
      }

      let D = 0.0;
      for (let i = 0; i <= n; i++) {
        D += terms[i];
      }

      if (D === 0 || !isFinite(D)) continue;

      // Mean charge: z0 - sum_{i=1..n} (i * alpha_i)
      let protonLossSum = 0.0;
      for (let i = 1; i <= n; i++) {
        const alpha_i = terms[i] / D;
        protonLossSum += i * alpha_i;
      }

      const meanCharge = sys.z0 - protonLossSum;
      sum += sys.F * meanCharge;
    }

    return sum;
  }

  // Note: chargeResidual is monotonically decreasing with pH (as pH increases, [H] decreases and OH/deprotonation increases)
  // Check f(minPh) should be > 0 and f(maxPh) should be < 0
  const fMin = chargeResidual(minPh);
  const fMax = chargeResidual(maxPh);

  if (fMin <= 0) return minPh;
  if (fMax >= 0) return maxPh;

  for (let iter = 0; iter < 60; iter++) {
    const midPh = (minPh + maxPh) / 2.0;
    const fMid = chargeResidual(midPh);
    if (fMid > 0) {
      minPh = midPh;
    } else {
      maxPh = midPh;
    }
  }

  return Number(((minPh + maxPh) / 2.0).toFixed(4));
}

/**
 * Standard Reagent Library
 */
export const REAGENTS: Record<string, ReagentDef> = {
  // Strong acids
  hcl: {
    id: 'hcl',
    name: 'Hydrochloric acid',
    formula: 'HCl',
    commonName: 'Muriatic / Stomach acid',
    category: 'strong_acid',
    pKa: [],
    z0: 0,
    spectators: [{ z: -1, count: 1 }], // Cl-
    defaultConc: 0.1
  },
  hno3: {
    id: 'hno3',
    name: 'Nitric acid',
    formula: 'HNO₃',
    commonName: 'Etching acid',
    category: 'strong_acid',
    pKa: [],
    z0: 0,
    spectators: [{ z: -1, count: 1 }], // NO3-
    defaultConc: 0.1
  },
  h2so4: {
    id: 'h2so4',
    name: 'Sulfuric acid',
    formula: 'H₂SO₄',
    commonName: 'Battery acid',
    category: 'strong_acid',
    pKa: [1.99], // First proton strong (releases H+ and HSO4-), second proton pKa 1.99
    z0: -1, // HSO4- fully protonated has charge -1
    spectators: [{ z: -1, count: 1 }], // 1st strong proton creates 1 free H+ via spectator logic or -1 charge
    defaultConc: 0.05,
    isPolyprotic: true
  },

  // Weak acids
  acetic: {
    id: 'acetic',
    name: 'Acetic acid',
    formula: 'CH₃COOH',
    commonName: 'Vinegar',
    category: 'weak_acid',
    pKa: [4.76],
    z0: 0,
    spectators: [],
    defaultConc: 0.1
  },
  citric: {
    id: 'citric',
    name: 'Citric acid',
    formula: 'C₆H₈O₇',
    commonName: 'Lemon juice acid',
    category: 'weak_acid',
    pKa: [3.13, 4.76, 6.40],
    z0: 0,
    spectators: [],
    defaultConc: 0.05,
    isPolyprotic: true
  },
  ascorbic: {
    id: 'ascorbic',
    name: 'Ascorbic acid',
    formula: 'C₆H₈O₆',
    commonName: 'Vitamin C',
    category: 'weak_acid',
    pKa: [4.10, 11.60],
    z0: 0,
    spectators: [],
    defaultConc: 0.1,
    isPolyprotic: true
  },
  formic: {
    id: 'formic',
    name: 'Formic acid',
    formula: 'HCOOH',
    commonName: 'Ant sting acid',
    category: 'weak_acid',
    pKa: [3.75],
    z0: 0,
    spectators: [],
    defaultConc: 0.1
  },
  carbonic: {
    id: 'carbonic',
    name: 'Carbonic acid',
    formula: 'H₂CO₃',
    commonName: 'Fizzy soda acid',
    category: 'weak_acid',
    pKa: [6.35, 10.33],
    z0: 0,
    spectators: [],
    defaultConc: 0.05,
    isPolyprotic: true
  },
  phosphoric: {
    id: 'phosphoric',
    name: 'Phosphoric acid',
    formula: 'H₃PO₄',
    commonName: 'Cola acid',
    category: 'weak_acid',
    pKa: [2.15, 7.20, 12.35],
    z0: 0,
    spectators: [],
    defaultConc: 0.05,
    isPolyprotic: true
  },
  oxalic: {
    id: 'oxalic',
    name: 'Oxalic acid',
    formula: 'H₂C₂O₄',
    commonName: 'Rhubarb / Rust remover',
    category: 'weak_acid',
    pKa: [1.27, 4.27],
    z0: 0,
    spectators: [],
    defaultConc: 0.05,
    isPolyprotic: true
  },
  benzoic: {
    id: 'benzoic',
    name: 'Benzoic acid',
    formula: 'C₇H₆O₂',
    commonName: 'Food preservative',
    category: 'weak_acid',
    pKa: [4.20],
    z0: 0,
    spectators: [],
    defaultConc: 0.05
  },

  // Strong bases
  naoh: {
    id: 'naoh',
    name: 'Sodium hydroxide',
    formula: 'NaOH',
    commonName: 'Lye / Drain cleaner',
    category: 'strong_base',
    pKa: [],
    z0: 0,
    spectators: [{ z: +1, count: 1 }], // Na+
    defaultConc: 0.1
  },
  koh: {
    id: 'koh',
    name: 'Potassium hydroxide',
    formula: 'KOH',
    commonName: 'Potash lye',
    category: 'strong_base',
    pKa: [],
    z0: 0,
    spectators: [{ z: +1, count: 1 }], // K+
    defaultConc: 0.1
  },

  // Weak bases
  ammonia: {
    id: 'ammonia',
    name: 'Ammonia',
    formula: 'NH₃',
    commonName: 'Window cleaner',
    category: 'weak_base',
    pKa: [9.25], // Conjugate acid NH4+ has pKa = 14 - 4.75 = 9.25
    z0: +1, // NH4+ has charge +1
    spectators: [],
    defaultConc: 0.1
  },
  bicarb: {
    id: 'bicarb',
    name: 'Sodium bicarbonate',
    formula: 'NaHCO₃',
    commonName: 'Baking soda',
    category: 'weak_base',
    pKa: [6.35, 10.33], // Carbonic acid system
    z0: 0, // H2CO3 is uncharged
    spectators: [{ z: +1, count: 1 }], // Na+
    defaultConc: 0.1,
    isPolyprotic: true
  },
  pyridine: {
    id: 'pyridine',
    name: 'Pyridine',
    formula: 'C₅H₅N',
    commonName: 'Organic solvent base',
    category: 'weak_base',
    pKa: [5.23], // Conjugate acid C5H5NH+ has pKa = 14 - 8.77 = 5.23
    z0: +1,
    spectators: [],
    defaultConc: 0.1
  },
  ethylamine: {
    id: 'ethylamine',
    name: 'Ethylamine',
    formula: 'CH₃CH₂NH₂',
    commonName: 'Aliphatic amine base',
    category: 'weak_base',
    pKa: [10.75], // Conjugate acid has pKa = 14 - 3.25 = 10.75
    z0: +1,
    spectators: [],
    defaultConc: 0.1
  },
  carbonate: {
    id: 'carbonate',
    name: 'Sodium carbonate',
    formula: 'Na₂CO₃',
    commonName: 'Washing soda',
    category: 'weak_base',
    pKa: [6.35, 10.33], // Carbonic system
    z0: 0,
    spectators: [{ z: +1, count: 2 }], // 2 Na+
    defaultConc: 0.1,
    isPolyprotic: true
  }
};

/**
 * Indicators with realistic transition pKa and colors
 */
export const INDICATORS: Record<string, IndicatorDef> = {
  methyl_orange: {
    id: 'methyl_orange',
    name: 'Methyl orange',
    pKa: 3.7,
    acidColorHex: '#E53935', // Red
    baseColorHex: '#FDD835', // Yellow
    acidName: 'Red',
    baseName: 'Yellow',
    rangeText: 'pH 3.1 – 4.4 (Red → Yellow)'
  },
  bromocresol_green: {
    id: 'bromocresol_green',
    name: 'Bromocresol green',
    pKa: 4.7,
    acidColorHex: '#FBC02D', // Yellow
    baseColorHex: '#1976D2', // Blue
    acidName: 'Yellow',
    baseName: 'Blue',
    rangeText: 'pH 3.8 – 5.4 (Yellow → Blue)'
  },
  methyl_red: {
    id: 'methyl_red',
    name: 'Methyl red',
    pKa: 5.1,
    acidColorHex: '#D32F2F', // Red
    baseColorHex: '#FDD835', // Yellow
    acidName: 'Red',
    baseName: 'Yellow',
    rangeText: 'pH 4.4 – 6.2 (Red → Yellow)'
  },
  bromothymol_blue: {
    id: 'bromothymol_blue',
    name: 'Bromothymol blue',
    pKa: 7.1,
    acidColorHex: '#FDD835', // Yellow
    baseColorHex: '#1976D2', // Blue
    acidName: 'Yellow',
    baseName: 'Blue',
    rangeText: 'pH 6.0 – 7.6 (Yellow → Blue)'
  },
  phenol_red: {
    id: 'phenol_red',
    name: 'Phenol red',
    pKa: 7.9,
    acidColorHex: '#FDD835', // Yellow
    baseColorHex: '#C2185B', // Red / Pink
    acidName: 'Yellow',
    baseName: 'Red',
    rangeText: 'pH 6.8 – 8.4 (Yellow → Red)'
  },
  phenolphthalein: {
    id: 'phenolphthalein',
    name: 'Phenolphthalein',
    pKa: 9.4,
    acidColorHex: '#F5F5F0', // Colourless (rendered as clean water / faint glass tint)
    baseColorHex: '#E91E63', // Magenta / Vivid Pink
    acidName: 'Colourless',
    baseName: 'Vivid Pink',
    rangeText: 'pH 8.2 – 10.0 (Colourless → Pink)'
  },
  thymolphthalein: {
    id: 'thymolphthalein',
    name: 'Thymolphthalein',
    pKa: 9.9,
    acidColorHex: '#F5F5F0', // Colourless
    baseColorHex: '#1565C0', // Royal Blue
    acidName: 'Colourless',
    baseName: 'Royal Blue',
    rangeText: 'pH 9.3 – 10.5 (Colourless → Blue)'
  },
  alizarin_yellow: {
    id: 'alizarin_yellow',
    name: 'Alizarin yellow R',
    pKa: 11.0,
    acidColorHex: '#FDD835', // Yellow
    baseColorHex: '#D84315', // Red-Orange
    acidName: 'Yellow',
    baseName: 'Red-Orange',
    rangeText: 'pH 10.2 – 12.0 (Yellow → Orange-Red)'
  }
};

/**
 * Calculates current titration flask state given analyte, titrant, and delivered titrant volume.
 */
export function calculateTitrationState(params: {
  analyte: ReagentDef;
  analyteConc: number; // M
  analyteVolumeMl: number; // mL
  titrant: ReagentDef;
  titrantConc: number; // M
  titrantVolumeMl: number; // mL delivered
}) {
  const { analyte, analyteConc, analyteVolumeMl, titrant, titrantConc, titrantVolumeMl } = params;

  const vTotMl = Math.max(0.001, analyteVolumeMl + titrantVolumeMl);
  const dilutionFactorAnalyte = analyteVolumeMl / vTotMl;
  const dilutionFactorTitrant = titrantVolumeMl / vTotMl;

  const systems: AcidSystem[] = [];
  const spectators: SpectatorIon[] = [];

  // Analyte contributions
  const F_analyte = analyteConc * dilutionFactorAnalyte;
  if (analyte.pKa.length > 0 || (analyte.category !== 'strong_acid' && analyte.category !== 'strong_base')) {
    systems.push({
      F: F_analyte,
      pKa: analyte.pKa,
      z0: analyte.z0
    });
  }
  for (const s of analyte.spectators) {
    spectators.push({
      C: F_analyte * s.count,
      z: s.z
    });
  }

  // Titrant contributions
  const F_titrant = titrantConc * dilutionFactorTitrant;
  if (titrant.pKa.length > 0 || (titrant.category !== 'strong_acid' && titrant.category !== 'strong_base')) {
    systems.push({
      F: F_titrant,
      pKa: titrant.pKa,
      z0: titrant.z0
    });
  }
  for (const s of titrant.spectators) {
    spectators.push({
      C: F_titrant * s.count,
      z: s.z
    });
  }

  const pH = solvePh(systems, spectators);
  return {
    pH,
    totalVolumeMl: vTotMl,
    analyteConcDiluted: F_analyte,
    titrantConcDiluted: F_titrant
  };
}

/**
 * Helper to interpolate hex color between two colors in sRGB space
 */
export function interpolateHexColor(color1: string, color2: string, ratio: number): string {
  const clampRatio = Math.max(0, Math.min(1, ratio));

  function parseHex(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  const [r1, g1, b1] = parseHex(color1);
  const [r2, g2, b2] = parseHex(color2);

  const r = Math.round(r1 + (r2 - r1) * clampRatio);
  const g = Math.round(g1 + (g2 - g1) * clampRatio);
  const b = Math.round(b1 + (b2 - b1) * clampRatio);

  const hex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  return `#${hex}`;
}

/**
 * Returns the indicator color at a given pH.
 */
export function getIndicatorColor(indicatorId: string, pH: number): {
  colorHex: string;
  fractionBase: number;
  description: string;
} {
  const ind = INDICATORS[indicatorId] || INDICATORS.phenolphthalein;
  // f = 1 / (1 + 10^(pKa - pH)) is fraction in basic form
  const exponent = ind.pKa - pH;
  const f = exponent > 10 ? 0 : exponent < -10 ? 1 : 1.0 / (1.0 + Math.pow(10, exponent));

  const blendedColor = interpolateHexColor(ind.acidColorHex, ind.baseColorHex, f);

  let description = '';
  if (f < 0.05) {
    description = ind.acidName;
  } else if (f > 0.95) {
    description = ind.baseName;
  } else {
    description = `Transition (mixture of ${ind.acidName.toLowerCase()} and ${ind.baseName.toLowerCase()})`;
  }

  return {
    colorHex: blendedColor,
    fractionBase: f,
    description
  };
}

/**
 * Mulberry32 PRNG
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic Unknown Mystery Sample Generator
 */
export function makeUnknown(seed: number, allowedPool?: ('strong_acid' | 'weak_acid' | 'strong_base' | 'weak_base')[]): UnknownSample {
  const rng = mulberry32(seed);

  const pool = allowedPool || ['strong_acid', 'weak_acid', 'strong_base', 'weak_base'];
  const chosenCat = pool[Math.floor(rng() * pool.length)];

  const eligibleReagents = Object.values(REAGENTS).filter((r) => r.category === chosenCat && r.id !== 'carbonate');
  const reagent = eligibleReagents[Math.floor(rng() * eligibleReagents.length)];

  // Realistic concentration: 0.030 to 0.220 M quantized to 3 sig figs
  const rawConc = 0.03 + rng() * 0.19;
  const trueMolarity = Number(rawConc.toPrecision(3));

  // Pipette sample volume: 10.00, 20.00, or 25.00 mL
  const volumes = [10.0, 20.0, 25.0];
  const sampleVolumeMl = volumes[Math.floor(rng() * volumes.length)];

  // Titrant choice: if analyte is acid, titrant is NaOH (or KOH). If base, titrant is HCl.
  let titrant: ReagentDef;
  let recommendedIndicatorId = 'phenolphthalein';

  if (chosenCat === 'strong_acid') {
    titrant = REAGENTS.naoh;
    recommendedIndicatorId = rng() > 0.5 ? 'phenolphthalein' : 'bromothymol_blue';
  } else if (chosenCat === 'weak_acid') {
    titrant = REAGENTS.naoh;
    recommendedIndicatorId = 'phenolphthalein';
  } else if (chosenCat === 'strong_base') {
    titrant = REAGENTS.hcl;
    recommendedIndicatorId = rng() > 0.5 ? 'methyl_red' : 'bromothymol_blue';
  } else {
    // weak_base
    titrant = REAGENTS.hcl;
    recommendedIndicatorId = 'methyl_red';
  }

  const titrantMolarity = 0.1;

  const sampleIdNum = Math.abs(seed) % 9000 + 1000;
  const sampleId = `TR-${sampleIdNum}`;

  return {
    seed,
    sampleId,
    reagent,
    trueMolarity,
    sampleVolumeMl,
    titrant,
    titrantMolarity,
    recommendedIndicatorId
  };
}
