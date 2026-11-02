export type ElementSymbol =
  | 'H'
  | 'C'
  | 'N'
  | 'O'
  | 'Na'
  | 'Mg'
  | 'Al'
  | 'Si'
  | 'P'
  | 'S'
  | 'Cl'
  | 'Fe'
  | 'Cu';

export interface AtomSpec {
  element: ElementSymbol;
  name: string;
  atomicMass: number; // g/mol
  color: number; // Hex color (CPK standard inspired)
  cssColor: string;
  radius: number; // 3D visual radius
}

export const ELEMENTS: Record<ElementSymbol, AtomSpec> = {
  H: {
    element: 'H',
    name: 'Hydrogen',
    atomicMass: 1.008,
    color: 0xf8fafc,
    cssColor: '#f8fafc',
    radius: 0.21,
  },
  C: {
    element: 'C',
    name: 'Carbon',
    atomicMass: 12.011,
    color: 0x475569,
    cssColor: '#64748b',
    radius: 0.33,
  },
  N: {
    element: 'N',
    name: 'Nitrogen',
    atomicMass: 14.007,
    color: 0x38bdf8,
    cssColor: '#38bdf8',
    radius: 0.31,
  },
  O: {
    element: 'O',
    name: 'Oxygen',
    atomicMass: 15.999,
    color: 0xef4444,
    cssColor: '#ef4444',
    radius: 0.3,
  },
  Na: {
    element: 'Na',
    name: 'Sodium',
    atomicMass: 22.99,
    color: 0xa855f7,
    cssColor: '#a855f7',
    radius: 0.38,
  },
  Mg: {
    element: 'Mg',
    name: 'Magnesium',
    atomicMass: 24.305,
    color: 0x10b981,
    cssColor: '#10b981',
    radius: 0.36,
  },
  Al: {
    element: 'Al',
    name: 'Aluminum',
    atomicMass: 26.982,
    color: 0xa8a29e,
    cssColor: '#a8a29e',
    radius: 0.37,
  },
  Si: {
    element: 'Si',
    name: 'Silicon',
    atomicMass: 28.085,
    color: 0x14b8a6,
    cssColor: '#14b8a6',
    radius: 0.36,
  },
  P: {
    element: 'P',
    name: 'Phosphorus',
    atomicMass: 30.974,
    color: 0xf59e0b,
    cssColor: '#f59e0b',
    radius: 0.35,
  },
  S: {
    element: 'S',
    name: 'Sulfur',
    atomicMass: 32.06,
    color: 0xfacc15,
    cssColor: '#facc15',
    radius: 0.35,
  },
  Cl: {
    element: 'Cl',
    name: 'Chlorine',
    atomicMass: 35.45,
    color: 0x84cc16,
    cssColor: '#84cc16',
    radius: 0.34,
  },
  Fe: {
    element: 'Fe',
    name: 'Iron',
    atomicMass: 55.845,
    color: 0xf97316,
    cssColor: '#f97316',
    radius: 0.38,
  },
  Cu: {
    element: 'Cu',
    name: 'Copper',
    atomicMass: 63.546,
    color: 0xea580c,
    cssColor: '#ea580c',
    radius: 0.38,
  },
};

export interface AtomNode {
  element: ElementSymbol;
  position: [number, number, number];
}

export interface BondSpec {
  from: number;
  to: number;
  order: 1 | 2 | 3;
}

export interface MoleculeSpec {
  id: string;
  formula: string;
  displayFormula: string;
  name: string;
  molarMass: number; // g/mol
  state: 'gas' | 'liquid' | 'solid';
  geometryDesc: string;
  accentColor: string;
  atoms: AtomNode[];
  bonds: BondSpec[];
  composition: Partial<Record<ElementSymbol, number>>;
}

export const MOLECULES: Record<string, MoleculeSpec> = {
  H2: {
    id: 'H2',
    formula: 'H2',
    displayFormula: 'H₂',
    name: 'Hydrogen',
    molarMass: 2.016,
    state: 'gas',
    geometryDesc: '2 H atoms',
    accentColor: '#e2e8f0',
    atoms: [
      { element: 'H', position: [-0.24, 0, 0] },
      { element: 'H', position: [0.24, 0, 0] },
    ],
    bonds: [{ from: 0, to: 1, order: 1 }],
    composition: { H: 2 },
  },
  O2: {
    id: 'O2',
    formula: 'O2',
    displayFormula: 'O₂',
    name: 'Oxygen',
    molarMass: 31.998,
    state: 'gas',
    geometryDesc: '2 O atoms',
    accentColor: '#ef4444',
    atoms: [
      { element: 'O', position: [-0.32, 0, 0] },
      { element: 'O', position: [0.32, 0, 0] },
    ],
    bonds: [{ from: 0, to: 1, order: 2 }],
    composition: { O: 2 },
  },
  H2O: {
    id: 'H2O',
    formula: 'H2O',
    displayFormula: 'H₂O',
    name: 'Water',
    molarMass: 18.015,
    state: 'gas',
    geometryDesc: '2 H + 1 O',
    accentColor: '#38bdf8',
    atoms: [
      { element: 'O', position: [0, 0.12, 0] },
      { element: 'H', position: [-0.36, -0.18, 0] },
      { element: 'H', position: [0.36, -0.18, 0] },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
    ],
    composition: { H: 2, O: 1 },
  },
  Cl2: {
    id: 'Cl2',
    formula: 'Cl2',
    displayFormula: 'Cl₂',
    name: 'Chlorine',
    molarMass: 70.9,
    state: 'gas',
    geometryDesc: '2 Cl atoms',
    accentColor: '#84cc16',
    atoms: [
      { element: 'Cl', position: [-0.35, 0, 0] },
      { element: 'Cl', position: [0.35, 0, 0] },
    ],
    bonds: [{ from: 0, to: 1, order: 1 }],
    composition: { Cl: 2 },
  },
  HCl: {
    id: 'HCl',
    formula: 'HCl',
    displayFormula: 'HCl',
    name: 'Hydrogen Chloride',
    molarMass: 36.458,
    state: 'gas',
    geometryDesc: '1 H + 1 Cl',
    accentColor: '#84cc16',
    atoms: [
      { element: 'Cl', position: [-0.16, 0, 0] },
      { element: 'H', position: [0.28, 0, 0] },
    ],
    bonds: [{ from: 0, to: 1, order: 1 }],
    composition: { H: 1, Cl: 1 },
  },
  Mg: {
    id: 'Mg',
    formula: 'Mg',
    displayFormula: 'Mg',
    name: 'Magnesium',
    molarMass: 24.305,
    state: 'solid',
    geometryDesc: '1 Mg atom',
    accentColor: '#10b981',
    atoms: [{ element: 'Mg', position: [0, 0, 0] }],
    bonds: [],
    composition: { Mg: 1 },
  },
  MgO: {
    id: 'MgO',
    formula: 'MgO',
    displayFormula: 'MgO',
    name: 'Magnesium Oxide',
    molarMass: 40.304,
    state: 'solid',
    geometryDesc: '1 Mg + 1 O',
    accentColor: '#10b981',
    atoms: [
      { element: 'Mg', position: [-0.28, 0, 0] },
      { element: 'O', position: [0.28, 0, 0] },
    ],
    bonds: [{ from: 0, to: 1, order: 2 }],
    composition: { Mg: 1, O: 1 },
  },
  N2: {
    id: 'N2',
    formula: 'N2',
    displayFormula: 'N₂',
    name: 'Nitrogen',
    molarMass: 28.014,
    state: 'gas',
    geometryDesc: '2 N atoms',
    accentColor: '#38bdf8',
    atoms: [
      { element: 'N', position: [-0.31, 0, 0] },
      { element: 'N', position: [0.31, 0, 0] },
    ],
    bonds: [{ from: 0, to: 1, order: 3 }],
    composition: { N: 2 },
  },
  NH3: {
    id: 'NH3',
    formula: 'NH3',
    displayFormula: 'NH₃',
    name: 'Ammonia',
    molarMass: 17.031,
    state: 'gas',
    geometryDesc: '1 N + 3 H',
    accentColor: '#0ea5e9',
    atoms: [
      { element: 'N', position: [0, 0.16, 0] },
      { element: 'H', position: [0.35, -0.16, 0] },
      { element: 'H', position: [-0.18, -0.16, 0.31] },
      { element: 'H', position: [-0.18, -0.16, -0.31] },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 },
    ],
    composition: { N: 1, H: 3 },
  },
  P4: {
    id: 'P4',
    formula: 'P4',
    displayFormula: 'P₄',
    name: 'White Phosphorus',
    molarMass: 123.896,
    state: 'solid',
    geometryDesc: '4 P tetrahedron',
    accentColor: '#f59e0b',
    atoms: [
      { element: 'P', position: [0, 0.36, 0] },
      { element: 'P', position: [-0.34, -0.18, 0.2] },
      { element: 'P', position: [0.34, -0.18, 0.2] },
      { element: 'P', position: [0, -0.18, -0.36] },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 },
      { from: 1, to: 2, order: 1 },
      { from: 2, to: 3, order: 1 },
      { from: 3, to: 1, order: 1 },
    ],
    composition: { P: 4 },
  },
  PCl3: {
    id: 'PCl3',
    formula: 'PCl3',
    displayFormula: 'PCl₃',
    name: 'Phosphorus Trichloride',
    molarMass: 137.324,
    state: 'liquid',
    geometryDesc: '1 P + 3 Cl',
    accentColor: '#84cc16',
    atoms: [
      { element: 'P', position: [0, 0.18, 0] },
      { element: 'Cl', position: [0.42, -0.18, 0] },
      { element: 'Cl', position: [-0.21, -0.18, 0.36] },
      { element: 'Cl', position: [-0.21, -0.18, -0.36] },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 },
    ],
    composition: { P: 1, Cl: 3 },
  },
  C: {
    id: 'C',
    formula: 'C',
    displayFormula: 'C',
    name: 'Carbon',
    molarMass: 12.011,
    state: 'solid',
    geometryDesc: '1 C atom',
    accentColor: '#94a3b8',
    atoms: [{ element: 'C', position: [0, 0, 0] }],
    bonds: [],
    composition: { C: 1 },
  },
  CO: {
    id: 'CO',
    formula: 'CO',
    displayFormula: 'CO',
    name: 'Carbon Monoxide',
    molarMass: 28.01,
    state: 'gas',
    geometryDesc: '1 C + 1 O',
    accentColor: '#94a3b8',
    atoms: [
      { element: 'C', position: [-0.28, 0, 0] },
      { element: 'O', position: [0.28, 0, 0] },
    ],
    bonds: [{ from: 0, to: 1, order: 3 }],
    composition: { C: 1, O: 1 },
  },
  Na: {
    id: 'Na',
    formula: 'Na',
    displayFormula: 'Na',
    name: 'Sodium',
    molarMass: 22.99,
    state: 'solid',
    geometryDesc: '1 Na atom',
    accentColor: '#a855f7',
    atoms: [{ element: 'Na', position: [0, 0, 0] }],
    bonds: [],
    composition: { Na: 1 },
  },
  NaCl: {
    id: 'NaCl',
    formula: 'NaCl',
    displayFormula: 'NaCl',
    name: 'Sodium Chloride',
    molarMass: 58.44,
    state: 'solid',
    geometryDesc: '1 Na + 1 Cl',
    accentColor: '#a855f7',
    atoms: [
      { element: 'Na', position: [-0.3, 0, 0] },
      { element: 'Cl', position: [0.3, 0, 0] },
    ],
    bonds: [{ from: 0, to: 1, order: 1 }],
    composition: { Na: 1, Cl: 1 },
  },
  CH4: {
    id: 'CH4',
    formula: 'CH4',
    displayFormula: 'CH₄',
    name: 'Methane',
    molarMass: 16.043,
    state: 'gas',
    geometryDesc: '1 C + 4 H',
    accentColor: '#94a3b8',
    atoms: [
      { element: 'C', position: [0, 0, 0] },
      { element: 'H', position: [0.28, 0.28, 0.28] },
      { element: 'H', position: [-0.28, -0.28, 0.28] },
      { element: 'H', position: [-0.28, 0.28, -0.28] },
      { element: 'H', position: [0.28, -0.28, -0.28] },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 },
      { from: 0, to: 4, order: 1 },
    ],
    composition: { C: 1, H: 4 },
  },
  CO2: {
    id: 'CO2',
    formula: 'CO2',
    displayFormula: 'CO₂',
    name: 'Carbon Dioxide',
    molarMass: 44.009,
    state: 'gas',
    geometryDesc: '1 C + 2 O',
    accentColor: '#f43f5e',
    atoms: [
      { element: 'C', position: [0, 0, 0] },
      { element: 'O', position: [-0.46, 0, 0] },
      { element: 'O', position: [0.46, 0, 0] },
    ],
    bonds: [
      { from: 0, to: 1, order: 2 },
      { from: 0, to: 2, order: 2 },
    ],
    composition: { C: 1, O: 2 },
  },
  CuO: {
    id: 'CuO',
    formula: 'CuO',
    displayFormula: 'CuO',
    name: 'Copper(II) Oxide',
    molarMass: 79.545,
    state: 'solid',
    geometryDesc: '1 Cu + 1 O',
    accentColor: '#ea580c',
    atoms: [
      { element: 'Cu', position: [-0.28, 0, 0] },
      { element: 'O', position: [0.28, 0, 0] },
    ],
    bonds: [{ from: 0, to: 1, order: 2 }],
    composition: { Cu: 1, O: 1 },
  },
  Cu: {
    id: 'Cu',
    formula: 'Cu',
    displayFormula: 'Cu',
    name: 'Copper',
    molarMass: 63.546,
    state: 'solid',
    geometryDesc: '1 Cu atom',
    accentColor: '#ea580c',
    atoms: [{ element: 'Cu', position: [0, 0, 0] }],
    bonds: [],
    composition: { Cu: 1 },
  },
  Fe: {
    id: 'Fe',
    formula: 'Fe',
    displayFormula: 'Fe',
    name: 'Iron',
    molarMass: 55.845,
    state: 'solid',
    geometryDesc: '1 Fe atom',
    accentColor: '#fb923c',
    atoms: [{ element: 'Fe', position: [0, 0, 0] }],
    bonds: [],
    composition: { Fe: 1 },
  },
  Fe2O3: {
    id: 'Fe2O3',
    formula: 'Fe2O3',
    displayFormula: 'Fe₂O₃',
    name: 'Iron(III) Oxide',
    molarMass: 159.687,
    state: 'solid',
    geometryDesc: '2 Fe + 3 O',
    accentColor: '#f97316',
    atoms: [
      { element: 'Fe', position: [-0.32, 0.14, 0] },
      { element: 'Fe', position: [0.32, 0.14, 0] },
      { element: 'O', position: [0, 0.36, 0] },
      { element: 'O', position: [-0.36, -0.25, 0.15] },
      { element: 'O', position: [0.36, -0.25, -0.15] },
    ],
    bonds: [
      { from: 0, to: 2, order: 1 },
      { from: 1, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 },
      { from: 1, to: 4, order: 1 },
    ],
    composition: { Fe: 2, O: 3 },
  },
  Al: {
    id: 'Al',
    formula: 'Al',
    displayFormula: 'Al',
    name: 'Aluminum',
    molarMass: 26.982,
    state: 'solid',
    geometryDesc: '1 Al atom',
    accentColor: '#d6d3d1',
    atoms: [{ element: 'Al', position: [0, 0, 0] }],
    bonds: [],
    composition: { Al: 1 },
  },
  Al2O3: {
    id: 'Al2O3',
    formula: 'Al2O3',
    displayFormula: 'Al₂O₃',
    name: 'Alumina',
    molarMass: 101.961,
    state: 'solid',
    geometryDesc: '2 Al + 3 O',
    accentColor: '#cbd5e1',
    atoms: [
      { element: 'Al', position: [-0.31, 0.12, 0] },
      { element: 'Al', position: [0.31, 0.12, 0] },
      { element: 'O', position: [0, 0.35, 0] },
      { element: 'O', position: [-0.35, -0.24, 0.14] },
      { element: 'O', position: [0.35, -0.24, -0.14] },
    ],
    bonds: [
      { from: 0, to: 2, order: 1 },
      { from: 1, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 },
      { from: 1, to: 4, order: 1 },
    ],
    composition: { Al: 2, O: 3 },
  },
  C2H4: {
    id: 'C2H4',
    formula: 'C2H4',
    displayFormula: 'C₂H₄',
    name: 'Ethylene',
    molarMass: 28.054,
    state: 'gas',
    geometryDesc: '2 C + 4 H',
    accentColor: '#38bdf8',
    atoms: [
      { element: 'C', position: [-0.26, 0, 0] },
      { element: 'C', position: [0.26, 0, 0] },
      { element: 'H', position: [-0.52, 0.28, 0] },
      { element: 'H', position: [-0.52, -0.28, 0] },
      { element: 'H', position: [0.52, 0.28, 0] },
      { element: 'H', position: [0.52, -0.28, 0] },
    ],
    bonds: [
      { from: 0, to: 1, order: 2 },
      { from: 0, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 },
      { from: 1, to: 4, order: 1 },
      { from: 1, to: 5, order: 1 },
    ],
    composition: { C: 2, H: 4 },
  },
  C2H6: {
    id: 'C2H6',
    formula: 'C2H6',
    displayFormula: 'C₂H₆',
    name: 'Ethane',
    molarMass: 30.07,
    state: 'gas',
    geometryDesc: '2 C + 6 H',
    accentColor: '#38bdf8',
    atoms: [
      { element: 'C', position: [-0.28, 0, 0] },
      { element: 'C', position: [0.28, 0, 0] },
      { element: 'H', position: [-0.52, 0.28, 0.16] },
      { element: 'H', position: [-0.52, -0.28, 0.16] },
      { element: 'H', position: [-0.52, 0, -0.3] },
      { element: 'H', position: [0.52, 0.28, -0.16] },
      { element: 'H', position: [0.52, -0.28, -0.16] },
      { element: 'H', position: [0.52, 0, 0.3] },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 },
      { from: 0, to: 4, order: 1 },
      { from: 1, to: 5, order: 1 },
      { from: 1, to: 6, order: 1 },
      { from: 1, to: 7, order: 1 },
    ],
    composition: { C: 2, H: 6 },
  },
  NO: {
    id: 'NO',
    formula: 'NO',
    displayFormula: 'NO',
    name: 'Nitric Oxide',
    molarMass: 30.006,
    state: 'gas',
    geometryDesc: '1 N + 1 O',
    accentColor: '#38bdf8',
    atoms: [
      { element: 'N', position: [-0.28, 0, 0] },
      { element: 'O', position: [0.28, 0, 0] },
    ],
    bonds: [{ from: 0, to: 1, order: 2 }],
    composition: { N: 1, O: 1 },
  },
  NO2: {
    id: 'NO2',
    formula: 'NO2',
    displayFormula: 'NO₂',
    name: 'Nitrogen Dioxide',
    molarMass: 46.005,
    state: 'gas',
    geometryDesc: '1 N + 2 O',
    accentColor: '#ef4444',
    atoms: [
      { element: 'N', position: [0, 0.14, 0] },
      { element: 'O', position: [-0.36, -0.16, 0] },
      { element: 'O', position: [0.36, -0.16, 0] },
    ],
    bonds: [
      { from: 0, to: 1, order: 2 },
      { from: 0, to: 2, order: 1 },
    ],
    composition: { N: 1, O: 2 },
  },
  SiO2: {
    id: 'SiO2',
    formula: 'SiO2',
    displayFormula: 'SiO₂',
    name: 'Silica',
    molarMass: 60.083,
    state: 'solid',
    geometryDesc: '1 Si + 2 O',
    accentColor: '#14b8a6',
    atoms: [
      { element: 'Si', position: [0, 0, 0] },
      { element: 'O', position: [-0.46, 0, 0] },
      { element: 'O', position: [0.46, 0, 0] },
    ],
    bonds: [
      { from: 0, to: 1, order: 2 },
      { from: 0, to: 2, order: 2 },
    ],
    composition: { Si: 1, O: 2 },
  },
  Si: {
    id: 'Si',
    formula: 'Si',
    displayFormula: 'Si',
    name: 'Silicon',
    molarMass: 28.085,
    state: 'solid',
    geometryDesc: '1 Si atom',
    accentColor: '#14b8a6',
    atoms: [{ element: 'Si', position: [0, 0, 0] }],
    bonds: [],
    composition: { Si: 1 },
  },
  H2S: {
    id: 'H2S',
    formula: 'H2S',
    displayFormula: 'H₂S',
    name: 'Hydrogen Sulfide',
    molarMass: 34.076,
    state: 'gas',
    geometryDesc: '2 H + 1 S',
    accentColor: '#facc15',
    atoms: [
      { element: 'S', position: [0, 0.14, 0] },
      { element: 'H', position: [-0.36, -0.18, 0] },
      { element: 'H', position: [0.36, -0.18, 0] },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
    ],
    composition: { H: 2, S: 1 },
  },
  SO2: {
    id: 'SO2',
    formula: 'SO2',
    displayFormula: 'SO₂',
    name: 'Sulfur Dioxide',
    molarMass: 64.058,
    state: 'gas',
    geometryDesc: '1 S + 2 O',
    accentColor: '#facc15',
    atoms: [
      { element: 'S', position: [0, 0.14, 0] },
      { element: 'O', position: [-0.38, -0.16, 0] },
      { element: 'O', position: [0.38, -0.16, 0] },
    ],
    bonds: [
      { from: 0, to: 1, order: 2 },
      { from: 0, to: 2, order: 2 },
    ],
    composition: { S: 1, O: 2 },
  },
  SO3: {
    id: 'SO3',
    formula: 'SO3',
    displayFormula: 'SO₃',
    name: 'Sulfur Trioxide',
    molarMass: 80.057,
    state: 'gas',
    geometryDesc: '1 S + 3 O',
    accentColor: '#eab308',
    atoms: [
      { element: 'S', position: [0, 0, 0] },
      { element: 'O', position: [0, 0.42, 0] },
      { element: 'O', position: [-0.36, -0.21, 0] },
      { element: 'O', position: [0.36, -0.21, 0] },
    ],
    bonds: [
      { from: 0, to: 1, order: 2 },
      { from: 0, to: 2, order: 2 },
      { from: 0, to: 3, order: 2 },
    ],
    composition: { S: 1, O: 3 },
  },
};

export interface ReactionSpec {
  id: string;
  name: string;
  unbalancedDisplay: string;
  equationDisplay: string;
  reactantA: { speciesId: string; coeff: number };
  reactantB: { speciesId: string; coeff: number };
  productC: { speciesId: string; coeff: number };
  productD?: { speciesId: string; coeff: number };
}

export const REACTIONS: Record<string, ReactionSpec> = {
  oxyhydrogen: {
    id: 'oxyhydrogen',
    name: 'Water Synthesis',
    unbalancedDisplay: 'H₂  +  O₂  →  H₂O',
    equationDisplay: '2 H₂ + O₂ → 2 H₂O',
    reactantA: { speciesId: 'H2', coeff: 2 },
    reactantB: { speciesId: 'O2', coeff: 1 },
    productC: { speciesId: 'H2O', coeff: 2 },
  },
  hcl_synth: {
    id: 'hcl_synth',
    name: 'Hydrogen Chloride Synthesis',
    unbalancedDisplay: 'H₂  +  Cl₂  →  HCl',
    equationDisplay: 'H₂ + Cl₂ → 2 HCl',
    reactantA: { speciesId: 'H2', coeff: 1 },
    reactantB: { speciesId: 'Cl2', coeff: 1 },
    productC: { speciesId: 'HCl', coeff: 2 },
  },
  magnesium_ox: {
    id: 'magnesium_ox',
    name: 'Magnesium Oxidation',
    unbalancedDisplay: 'Mg  +  O₂  →  MgO',
    equationDisplay: '2 Mg + O₂ → 2 MgO',
    reactantA: { speciesId: 'Mg', coeff: 2 },
    reactantB: { speciesId: 'O2', coeff: 1 },
    productC: { speciesId: 'MgO', coeff: 2 },
  },
  haber: {
    id: 'haber',
    name: 'Ammonia Synthesis',
    unbalancedDisplay: 'N₂  +  H₂  →  NH₃',
    equationDisplay: 'N₂ + 3 H₂ → 2 NH₃',
    reactantA: { speciesId: 'N2', coeff: 1 },
    reactantB: { speciesId: 'H2', coeff: 3 },
    productC: { speciesId: 'NH3', coeff: 2 },
  },
  pcl3_synth: {
    id: 'pcl3_synth',
    name: 'Phosphorus Trichloride Synthesis',
    unbalancedDisplay: 'P₄  +  Cl₂  →  PCl₃',
    equationDisplay: 'P₄ + 6 Cl₂ → 4 PCl₃',
    reactantA: { speciesId: 'P4', coeff: 1 },
    reactantB: { speciesId: 'Cl2', coeff: 6 },
    productC: { speciesId: 'PCl3', coeff: 4 },
  },
  carbon_monoxide: {
    id: 'carbon_monoxide',
    name: 'Incomplete Carbon Oxidation',
    unbalancedDisplay: 'C  +  O₂  →  CO',
    equationDisplay: '2 C + O₂ → 2 CO',
    reactantA: { speciesId: 'C', coeff: 2 },
    reactantB: { speciesId: 'O2', coeff: 1 },
    productC: { speciesId: 'CO', coeff: 2 },
  },
  nacl_synth: {
    id: 'nacl_synth',
    name: 'Halite Synthesis',
    unbalancedDisplay: 'Na  +  Cl₂  →  NaCl',
    equationDisplay: '2 Na + Cl₂ → 2 NaCl',
    reactantA: { speciesId: 'Na', coeff: 2 },
    reactantB: { speciesId: 'Cl2', coeff: 1 },
    productC: { speciesId: 'NaCl', coeff: 2 },
  },
  methane: {
    id: 'methane',
    name: 'Methane Combustion',
    unbalancedDisplay: 'CH₄  +  O₂  →  CO₂  +  H₂O',
    equationDisplay: 'CH₄ + 2 O₂ → CO₂ + 2 H₂O',
    reactantA: { speciesId: 'CH4', coeff: 1 },
    reactantB: { speciesId: 'O2', coeff: 2 },
    productC: { speciesId: 'CO2', coeff: 1 },
    productD: { speciesId: 'H2O', coeff: 2 },
  },
  copper_reduction: {
    id: 'copper_reduction',
    name: 'Copper(II) Oxide Reduction',
    unbalancedDisplay: 'CuO  +  H₂  →  Cu  +  H₂O',
    equationDisplay: 'CuO + H₂ → Cu + H₂O',
    reactantA: { speciesId: 'CuO', coeff: 1 },
    reactantB: { speciesId: 'H2', coeff: 1 },
    productC: { speciesId: 'Cu', coeff: 1 },
    productD: { speciesId: 'H2O', coeff: 1 },
  },
  iron_rust: {
    id: 'iron_rust',
    name: 'Iron(III) Oxide Formation',
    unbalancedDisplay: 'Fe  +  O₂  →  Fe₂O₃',
    equationDisplay: '4 Fe + 3 O₂ → 2 Fe₂O₃',
    reactantA: { speciesId: 'Fe', coeff: 4 },
    reactantB: { speciesId: 'O2', coeff: 3 },
    productC: { speciesId: 'Fe2O3', coeff: 2 },
  },
  thermite: {
    id: 'thermite',
    name: 'Thermite Reduction',
    unbalancedDisplay: 'Fe₂O₃  +  Al  →  Fe  +  Al₂O₃',
    equationDisplay: 'Fe₂O₃ + 2 Al → 2 Fe + Al₂O₃',
    reactantA: { speciesId: 'Fe2O3', coeff: 1 },
    reactantB: { speciesId: 'Al', coeff: 2 },
    productC: { speciesId: 'Fe', coeff: 2 },
    productD: { speciesId: 'Al2O3', coeff: 1 },
  },
  ethylene_hydro: {
    id: 'ethylene_hydro',
    name: 'Ethylene Hydrogenation',
    unbalancedDisplay: 'C₂H₄  +  H₂  →  C₂H₆',
    equationDisplay: 'C₂H₄ + H₂ → C₂H₆',
    reactantA: { speciesId: 'C2H4', coeff: 1 },
    reactantB: { speciesId: 'H2', coeff: 1 },
    productC: { speciesId: 'C2H6', coeff: 1 },
  },
  no_oxidation: {
    id: 'no_oxidation',
    name: 'Nitric Oxide Oxidation',
    unbalancedDisplay: 'NO  +  O₂  →  NO₂',
    equationDisplay: '2 NO + O₂ → 2 NO₂',
    reactantA: { speciesId: 'NO', coeff: 2 },
    reactantB: { speciesId: 'O2', coeff: 1 },
    productC: { speciesId: 'NO2', coeff: 2 },
  },
  silicon_smelt: {
    id: 'silicon_smelt',
    name: 'Carbothermic Silicon Reduction',
    unbalancedDisplay: 'SiO₂  +  C  →  Si  +  CO',
    equationDisplay: 'SiO₂ + 2 C → Si + 2 CO',
    reactantA: { speciesId: 'SiO2', coeff: 1 },
    reactantB: { speciesId: 'C', coeff: 2 },
    productC: { speciesId: 'Si', coeff: 1 },
    productD: { speciesId: 'CO', coeff: 2 },
  },
  h2s_roast: {
    id: 'h2s_roast',
    name: 'Sulfide Roasting',
    unbalancedDisplay: 'H₂S  +  O₂  →  SO₂  +  H₂O',
    equationDisplay: '2 H₂S + 3 O₂ → 2 SO₂ + 2 H₂O',
    reactantA: { speciesId: 'H2S', coeff: 2 },
    reactantB: { speciesId: 'O2', coeff: 3 },
    productC: { speciesId: 'SO2', coeff: 2 },
    productD: { speciesId: 'H2O', coeff: 2 },
  },
  contact: {
    id: 'contact',
    name: 'Sulfur Oxidation',
    unbalancedDisplay: 'SO₂  +  O₂  →  SO₃',
    equationDisplay: '2 SO₂ + O₂ → 2 SO₃',
    reactantA: { speciesId: 'SO2', coeff: 2 },
    reactantB: { speciesId: 'O2', coeff: 1 },
    productC: { speciesId: 'SO3', coeff: 2 },
  },
  ethylene_combust: {
    id: 'ethylene_combust',
    name: 'Ethylene Combustion',
    unbalancedDisplay: 'C₂H₄  +  O₂  →  CO₂  +  H₂O',
    equationDisplay: 'C₂H₄ + 3 O₂ → 2 CO₂ + 2 H₂O',
    reactantA: { speciesId: 'C2H4', coeff: 1 },
    reactantB: { speciesId: 'O2', coeff: 3 },
    productC: { speciesId: 'CO2', coeff: 2 },
    productD: { speciesId: 'H2O', coeff: 2 },
  },
};

export interface QuestChapter {
  id: number;
  code: string;
  act: string;
  title: string;
  conceptFocus: string;
  reactionId: string;
  initialMolesA: number;
  initialMolesB: number;
  lockReactantInputs?: boolean;
  stepSize: number;
  maxMoles: number;
  inputUnitDefault: 'moles' | 'grams';
  actualYieldEfficiency: number;
  puzzlePrompt: string;
  subtleHint: string;
  targetCondition: {
    targetMolesA: number;
    targetMolesB: number;
    requireZeroExcess: boolean;
    predictionQuestion?: {
      prompt: string;
      options: { id: string; label: string }[];
      correctId: string;
    };
  };
}

export const QUEST_CHAPTERS: QuestChapter[] = [
  // ===========================================================================
  // ACT I: CONSERVATION OF ATOMS & MOLE RATIOS (Puzzles 1 - 5)
  // ===========================================================================
  {
    id: 1,
    code: 'Puzzle 1',
    act: 'Act I · Conservation',
    title: 'Conservation of Atoms',
    conceptFocus: 'Atom Counting & Stoichiometric Ratio',
    reactionId: 'oxyhydrogen',
    initialMolesA: 1,
    initialMolesB: 2,
    stepSize: 1,
    maxMoles: 6,
    inputUnitDefault: 'moles',
    actualYieldEfficiency: 1.0,
    puzzlePrompt:
      'Synthesize exactly 2 mol of Water (H₂O) with zero leftover reactants.',
    subtleHint:
      'An O₂ molecule carries 2 oxygen atoms. Each H₂O needs 2 hydrogens and 1 oxygen.',
    targetCondition: {
      targetMolesA: 2,
      targetMolesB: 1,
      requireZeroExcess: true,
    },
  },
  {
    id: 2,
    code: 'Puzzle 2',
    act: 'Act I · Conservation',
    title: 'Symmetric Diatomics',
    conceptFocus: '1:1 Diatomic Synthesis',
    reactionId: 'hcl_synth',
    initialMolesA: 1,
    initialMolesB: 2,
    stepSize: 1,
    maxMoles: 6,
    inputUnitDefault: 'moles',
    actualYieldEfficiency: 1.0,
    puzzlePrompt:
      'Synthesize exactly 6 mol of Hydrogen Chloride (HCl) with zero leftover gas.',
    subtleHint:
      'Each H₂ has 2 H atoms and each Cl₂ has 2 Cl atoms—together, 1 mol of each produces 2 mol of HCl.',
    targetCondition: {
      targetMolesA: 3,
      targetMolesB: 3,
      requireZeroExcess: true,
    },
  },
  {
    id: 3,
    code: 'Puzzle 3',
    act: 'Act I · Conservation',
    title: 'Magnesium Flare',
    conceptFocus: 'Monatomic Metal vs. Diatomic Gas',
    reactionId: 'magnesium_ox',
    initialMolesA: 2,
    initialMolesB: 2,
    stepSize: 1,
    maxMoles: 8,
    inputUnitDefault: 'moles',
    actualYieldEfficiency: 1.0,
    puzzlePrompt:
      'Oxidize Magnesium to form 4 mol of MgO with zero leftover Oxygen.',
    subtleHint:
      'Mg is a single metal atom, while O₂ is a pair of oxygen atoms. 4 MgO requires 4 Mg atoms and 4 O atoms.',
    targetCondition: {
      targetMolesA: 4,
      targetMolesB: 2,
      requireZeroExcess: true,
    },
  },
  {
    id: 4,
    code: 'Puzzle 4',
    act: 'Act I · Conservation',
    title: 'The Nitrogen Lock',
    conceptFocus: '1:3 Molar Ratio',
    reactionId: 'haber',
    initialMolesA: 2,
    initialMolesB: 2,
    stepSize: 1,
    maxMoles: 9,
    inputUnitDefault: 'moles',
    actualYieldEfficiency: 1.0,
    puzzlePrompt:
      'Convert 2 mol of Nitrogen (N₂) completely into Ammonia (NH₃) with no leftover gas.',
    subtleHint:
      '2 mol of N₂ contains 4 Nitrogen atoms, forming 4 NH₃ molecules. Count how many H₂ pairs are needed for 4 NH₃.',
    targetCondition: {
      targetMolesA: 2,
      targetMolesB: 6,
      requireZeroExcess: true,
    },
  },
  {
    id: 5,
    code: 'Puzzle 5',
    act: 'Act I · Conservation',
    title: 'Tetrahedral Phosphorus',
    conceptFocus: 'Polyatomic 1:6 Molar Ratio',
    reactionId: 'pcl3_synth',
    initialMolesA: 2,
    initialMolesB: 3,
    stepSize: 1,
    maxMoles: 9,
    inputUnitDefault: 'moles',
    actualYieldEfficiency: 1.0,
    puzzlePrompt:
      'React 1 mol of tetrahedral White Phosphorus (P₄) completely into PCl₃ with zero leftover Chlorine.',
    subtleHint:
      'A single P₄ molecule splits into 4 phosphorus atoms, producing 4 PCl₃ molecules (12 chlorine atoms total).',
    targetCondition: {
      targetMolesA: 1,
      targetMolesB: 6,
      requireZeroExcess: true,
    },
  },

  // ===========================================================================
  // ACT II: THE MOLAR MASS BRIDGE — GRAMS TO MOLES (Puzzles 6 - 10)
  // ===========================================================================
  {
    id: 6,
    code: 'Puzzle 6',
    act: 'Act II · Molar Mass',
    title: 'Carbon Monoxide Smelting',
    conceptFocus: 'Grams to Moles Conversion',
    reactionId: 'carbon_monoxide',
    initialMolesA: 1,
    initialMolesB: 2,
    stepSize: 1,
    maxMoles: 8,
    inputUnitDefault: 'grams',
    actualYieldEfficiency: 1.0,
    puzzlePrompt:
      'Burn 24.0 g of Carbon (C) completely into Carbon Monoxide (CO) with zero leftover Oxygen.',
    subtleHint:
      'Carbon has a molar mass of 12.0 g/mol, so 24.0 g is 2 mol of C. How many O₂ molecules hold 2 oxygen atoms?',
    targetCondition: {
      targetMolesA: 2,
      targetMolesB: 1,
      requireZeroExcess: true,
    },
  },
  {
    id: 7,
    code: 'Puzzle 7',
    act: 'Act II · Molar Mass',
    title: 'Halite Crystal Synthesis',
    conceptFocus: 'Target Mass from Reactant Masses',
    reactionId: 'nacl_synth',
    initialMolesA: 2,
    initialMolesB: 2,
    stepSize: 1,
    maxMoles: 8,
    inputUnitDefault: 'grams',
    actualYieldEfficiency: 1.0,
    puzzlePrompt:
      'Weigh out the exact grams of Sodium (Na) and Chlorine (Cl₂) needed to synthesize 233.8 g of NaCl with zero excess.',
    subtleHint:
      'NaCl is 58.4 g/mol, so 233.8 g is 4 mol of NaCl. Load the masses corresponding to 4 mol Na and the matching Cl₂.',
    targetCondition: {
      targetMolesA: 4,
      targetMolesB: 2,
      requireZeroExcess: true,
    },
  },
  {
    id: 8,
    code: 'Puzzle 8',
    act: 'Act II · Molar Mass',
    title: 'Methane Clean Burn',
    conceptFocus: 'Hydrocarbon Combustion by Mass',
    reactionId: 'methane',
    initialMolesA: 1,
    initialMolesB: 1,
    stepSize: 1,
    maxMoles: 8,
    inputUnitDefault: 'grams',
    actualYieldEfficiency: 1.0,
    puzzlePrompt:
      'Burn 32.1 g of Methane (CH₄) completely with the exact mass of Oxygen (O₂) needed for zero leftovers.',
    subtleHint:
      'CH₄ is 16.0 g/mol (so 32.1 g = 2 mol CH₄). Each CH₄ needs 2 O₂ molecules to form CO₂ + 2 H₂O.',
    targetCondition: {
      targetMolesA: 2,
      targetMolesB: 4,
      requireZeroExcess: true,
    },
  },
  {
    id: 9,
    code: 'Puzzle 9',
    act: 'Act II · Molar Mass',
    title: 'Copper Smelting Reduction',
    conceptFocus: 'Metal Oxide Mass Reduction',
    reactionId: 'copper_reduction',
    initialMolesA: 1,
    initialMolesB: 2,
    stepSize: 1,
    maxMoles: 8,
    inputUnitDefault: 'grams',
    actualYieldEfficiency: 1.0,
    puzzlePrompt:
      'Reduce CuO with H₂ to yield exactly 190.6 g of pure metallic Copper (Cu) with zero wasted Hydrogen.',
    subtleHint:
      'Pure Copper is 63.5 g/mol, so 190.6 g is 3 mol of Cu. Match CuO and H₂ in a 1:1 molar ratio.',
    targetCondition: {
      targetMolesA: 3,
      targetMolesB: 3,
      requireZeroExcess: true,
    },
  },
  {
    id: 10,
    code: 'Puzzle 10',
    act: 'Act II · Molar Mass',
    title: 'Hematite Rust Formation',
    conceptFocus: '4:3 Stoichiometric Mass Ratio',
    reactionId: 'iron_rust',
    initialMolesA: 2,
    initialMolesB: 2,
    stepSize: 1,
    maxMoles: 8,
    inputUnitDefault: 'grams',
    actualYieldEfficiency: 1.0,
    puzzlePrompt:
      'Oxidize 223.4 g of Iron (Fe) completely into Fe₂O₃ with the exact stoichiometric mass of Oxygen.',
    subtleHint:
      'Iron is 55.85 g/mol (223.4 g = 4 mol Fe). Forming 2 Fe₂O₃ requires 6 oxygen atoms (3 mol of O₂).',
    targetCondition: {
      targetMolesA: 4,
      targetMolesB: 3,
      requireZeroExcess: true,
    },
  },

  // ===========================================================================
  // ACT III: LIMITING & EXCESS REAGENTS (Puzzles 11 - 15)
  // ===========================================================================
  {
    id: 11,
    code: 'Puzzle 11',
    act: 'Act III · Limiting',
    title: 'The Thermite Bottleneck',
    conceptFocus: 'Identifying the Limiting Reagent',
    reactionId: 'thermite',
    initialMolesA: 3,
    initialMolesB: 8,
    lockReactantInputs: true,
    stepSize: 1,
    maxMoles: 10,
    inputUnitDefault: 'moles',
    actualYieldEfficiency: 1.0,
    puzzlePrompt:
      'Trays are locked at 3 mol Fe₂O₃ and 8 mol Al. Predict the exact outcome before triggering the reaction.',
    subtleHint:
      'Each Fe₂O₃ needs 2 Al to form Al₂O₃ + 2 Fe. Find which reactant runs out first.',
    targetCondition: {
      targetMolesA: 3,
      targetMolesB: 8,
      requireZeroExcess: false,
      predictionQuestion: {
        prompt: 'What will happen when 3 mol Fe₂O₃ reacts with 8 mol Al?',
        options: [
          { id: 'opt1', label: '4 mol Fe formed · 1 mol Fe₂O₃ left over' },
          { id: 'opt2', label: '6 mol Fe formed · 2 mol Al left over' },
          { id: 'opt3', label: '8 mol Fe formed · 0 mol left over' },
        ],
        correctId: 'opt2',
      },
    },
  },
  {
    id: 12,
    code: 'Puzzle 12',
    act: 'Act III · Limiting',
    title: 'Controlled Hydrogen Excess',
    conceptFocus: 'Engineering a Target Excess',
    reactionId: 'ethylene_hydro',
    initialMolesA: 2,
    initialMolesB: 2,
    stepSize: 1,
    maxMoles: 8,
    inputUnitDefault: 'moles',
    actualYieldEfficiency: 1.0,
    puzzlePrompt:
      'Synthesize 3 mol of Ethane (C₂H₆) while intentionally leaving 2 mol of unreacted H₂ excess on the right tray.',
    subtleHint:
      'C₂H₄ + H₂ → C₂H₆ is a 1:1 reaction. To form 3 mol C₂H₆ and have 2 mol H₂ left over, add the excess H₂ to the feed.',
    targetCondition: {
      targetMolesA: 3,
      targetMolesB: 5,
      requireZeroExcess: false,
    },
  },
  {
    id: 13,
    code: 'Puzzle 13',
    act: 'Act III · Limiting',
    title: 'Nitric Oxide Bottleneck',
    conceptFocus: '2:1 Limiting Reagent Deduction',
    reactionId: 'no_oxidation',
    initialMolesA: 6,
    initialMolesB: 5,
    lockReactantInputs: true,
    stepSize: 1,
    maxMoles: 10,
    inputUnitDefault: 'moles',
    actualYieldEfficiency: 1.0,
    puzzlePrompt:
      'Trays are locked at 6 mol NO and 5 mol O₂. Predict how much NO₂ forms and how much excess gas remains.',
    subtleHint:
      '2 NO + O₂ → 2 NO₂. Every 2 mol of NO consumes only 1 mol of O₂.',
    targetCondition: {
      targetMolesA: 6,
      targetMolesB: 5,
      requireZeroExcess: false,
      predictionQuestion: {
        prompt: 'Outcome for 6 mol NO + 5 mol O₂:',
        options: [
          { id: 'opt1', label: '6 mol NO₂ formed · 2 mol O₂ left over' },
          { id: 'opt2', label: '10 mol NO₂ formed · 0 mol left over' },
          { id: 'opt3', label: '5 mol NO₂ formed · 1 mol NO left over' },
        ],
        correctId: 'opt1',
      },
    },
  },
  {
    id: 14,
    code: 'Puzzle 14',
    act: 'Act III · Limiting',
    title: 'Silica Cushion',
    conceptFocus: 'Carbon-Limited Smelting',
    reactionId: 'silicon_smelt',
    initialMolesA: 2,
    initialMolesB: 2,
    stepSize: 1,
    maxMoles: 9,
    inputUnitDefault: 'moles',
    actualYieldEfficiency: 1.0,
    puzzlePrompt:
      'Synthesize 3 mol of pure Silicon (Si) while leaving exactly 1 mol of unreacted SiO₂ on the left tray.',
    subtleHint:
      'SiO₂ + 2 C → Si + 2 CO. Producing 3 mol Si consumes 3 mol SiO₂ and 6 mol C—plus 1 extra mol of SiO₂.',
    targetCondition: {
      targetMolesA: 4,
      targetMolesB: 6,
      requireZeroExcess: false,
    },
  },
  {
    id: 15,
    code: 'Puzzle 15',
    act: 'Act III · Limiting',
    title: 'Sour Gas Roasting',
    conceptFocus: '2:3 Multi-Product Limiting Analysis',
    reactionId: 'h2s_roast',
    initialMolesA: 4,
    initialMolesB: 8,
    lockReactantInputs: true,
    stepSize: 1,
    maxMoles: 10,
    inputUnitDefault: 'moles',
    actualYieldEfficiency: 1.0,
    puzzlePrompt:
      'Trays are locked at 4 mol H₂S and 8 mol O₂. Predict the yield of SO₂ and the remaining excess reagent.',
    subtleHint:
      'Balanced reaction: 2 H₂S + 3 O₂ → 2 SO₂ + 2 H₂O. Check how much O₂ is consumed by 4 mol H₂S.',
    targetCondition: {
      targetMolesA: 4,
      targetMolesB: 8,
      requireZeroExcess: false,
      predictionQuestion: {
        prompt: 'Outcome for 4 mol H₂S + 8 mol O₂:',
        options: [
          { id: 'opt1', label: '4 mol SO₂ formed · 2 mol O₂ left over' },
          { id: 'opt2', label: '6 mol SO₂ formed · 1 mol H₂S left over' },
          { id: 'opt3', label: '8 mol SO₂ formed · 0 mol left over' },
        ],
        correctId: 'opt1',
      },
    },
  },

  // ===========================================================================
  // ACT IV: PERCENT YIELD & INDUSTRIAL MASTERY (Puzzles 16 - 20)
  // ===========================================================================
  {
    id: 16,
    code: 'Puzzle 16',
    act: 'Act IV · Yield Mastery',
    title: 'Catalytic Loss (80% Yield)',
    conceptFocus: 'Theoretical vs. Actual Yield',
    reactionId: 'contact',
    initialMolesA: 2,
    initialMolesB: 2,
    stepSize: 1,
    maxMoles: 10,
    inputUnitDefault: 'moles',
    actualYieldEfficiency: 0.8,
    puzzlePrompt:
      'At 80% reactor efficiency, load the exact stoichiometric feed needed to recover 3.2 mol (256 g) of SO₃ with zero excess.',
    subtleHint:
      '3.2 mol is 80% of 4.0 mol theoretical SO₃. Load the exact SO₂ and O₂ required for 4.0 mol theoretical SO₃.',
    targetCondition: {
      targetMolesA: 4,
      targetMolesB: 2,
      requireZeroExcess: true,
    },
  },
  {
    id: 17,
    code: 'Puzzle 17',
    act: 'Act IV · Yield Mastery',
    title: 'Single-Pass Haber (50% Yield)',
    conceptFocus: 'Scaling Feed for 50% Conversion',
    reactionId: 'haber',
    initialMolesA: 1,
    initialMolesB: 3,
    stepSize: 1,
    maxMoles: 12,
    inputUnitDefault: 'moles',
    actualYieldEfficiency: 0.5,
    puzzlePrompt:
      'At 50% single-pass efficiency, load the exact stoichiometric feed needed to recover 3.0 mol of NH₃ with zero leftover ratio.',
    subtleHint:
      'Recovering 3.0 mol at 50% yield requires a theoretical yield of 6.0 mol NH₃ (from N₂ + 3 H₂ → 2 NH₃).',
    targetCondition: {
      targetMolesA: 3,
      targetMolesB: 9,
      requireZeroExcess: true,
    },
  },
  {
    id: 18,
    code: 'Puzzle 18',
    act: 'Act IV · Yield Mastery',
    title: 'Ethylene Flame Balance',
    conceptFocus: '1:3 Hydrocarbon Mass Combustion',
    reactionId: 'ethylene_combust',
    initialMolesA: 1,
    initialMolesB: 2,
    stepSize: 1,
    maxMoles: 9,
    inputUnitDefault: 'grams',
    actualYieldEfficiency: 1.0,
    puzzlePrompt:
      'Burn 56.1 g of Ethylene (C₂H₄) completely with the exact mass of Oxygen (O₂) needed for zero leftovers.',
    subtleHint:
      'C₂H₄ is 28.05 g/mol (56.1 g = 2 mol C₂H₄). Each C₂H₄ needs 3 O₂ to convert 2 C → 2 CO₂ and 4 H → 2 H₂O.',
    targetCondition: {
      targetMolesA: 2,
      targetMolesB: 6,
      requireZeroExcess: true,
    },
  },
  {
    id: 19,
    code: 'Puzzle 19',
    act: 'Act IV · Yield Mastery',
    title: 'Wafer Ingot Pull (75% Yield)',
    conceptFocus: 'Mass + Percent Yield Combined',
    reactionId: 'silicon_smelt',
    initialMolesA: 2,
    initialMolesB: 4,
    stepSize: 1,
    maxMoles: 10,
    inputUnitDefault: 'grams',
    actualYieldEfficiency: 0.75,
    puzzlePrompt:
      'At 75% crystal yield, weigh out the exact stoichiometric masses of SiO₂ and C to recover 84.3 g (3.0 mol) of pure Silicon.',
    subtleHint:
      '3.0 mol actual Si at 75% efficiency requires 4.0 mol theoretical Si. Use SiO₂ + 2 C → Si + 2 CO.',
    targetCondition: {
      targetMolesA: 4,
      targetMolesB: 8,
      requireZeroExcess: true,
    },
  },
  {
    id: 20,
    code: 'Puzzle 20',
    act: 'Act IV · Yield Mastery',
    title: 'Grand Crucible Finale (75% Yield)',
    conceptFocus: 'Polyatomic Synthesis & Yield Mastery',
    reactionId: 'pcl3_synth',
    initialMolesA: 1,
    initialMolesB: 4,
    stepSize: 1,
    maxMoles: 12,
    inputUnitDefault: 'moles',
    actualYieldEfficiency: 0.75,
    puzzlePrompt:
      'At 75% condenser efficiency, load the exact stoichiometric feed of P₄ and Cl₂ to recover 6.0 mol of PCl₃ with zero excess.',
    subtleHint:
      '6.0 mol actual PCl₃ at 75% yield requires 8.0 mol theoretical PCl₃. Since P₄ + 6 Cl₂ → 4 PCl₃, double the base equation.',
    targetCondition: {
      targetMolesA: 2,
      targetMolesB: 12,
      requireZeroExcess: true,
    },
  },
];

export interface StoichiometryAnalysis {
  reaction: ReactionSpec;
  molA: MoleculeSpec;
  molB: MoleculeSpec;
  molC: MoleculeSpec;
  molD: MoleculeSpec | null;
  molesA: number;
  molesB: number;
  gramsA: number;
  gramsB: number;
  extentA: number;
  extentB: number;
  reactionExtent: number;
  limitingStatus: 'exact' | 'A' | 'B' | 'empty';
  consumedMolesA: number;
  consumedMolesB: number;
  excessMolesA: number;
  excessMolesB: number;
  excessGramsA: number;
  excessGramsB: number;
  theoreticalMolesC: number;
  theoreticalGramsC: number;
  theoreticalMolesD: number;
  theoreticalGramsD: number;
  actualMolesC: number;
  actualGramsC: number;
  percentYield: number;
  balanceTiltRadians: number;
}

export function computeStoichiometry(
  reactionId: string,
  molesA: number,
  molesB: number,
  efficiency = 1.0
): StoichiometryAnalysis {
  const reaction = REACTIONS[reactionId] || REACTIONS.oxyhydrogen;
  const molA = MOLECULES[reaction.reactantA.speciesId];
  const molB = MOLECULES[reaction.reactantB.speciesId];
  const molC = MOLECULES[reaction.productC.speciesId];
  const molD = reaction.productD ? MOLECULES[reaction.productD.speciesId] : null;

  const gramsA = molesA * molA.molarMass;
  const gramsB = molesB * molB.molarMass;

  const extentA = molesA / reaction.reactantA.coeff;
  const extentB = molesB / reaction.reactantB.coeff;
  const reactionExtent = Math.min(extentA, extentB);

  let limitingStatus: 'exact' | 'A' | 'B' | 'empty' = 'exact';
  if (molesA <= 0.001 && molesB <= 0.001) {
    limitingStatus = 'empty';
  } else if (Math.abs(extentA - extentB) < 0.01) {
    limitingStatus = 'exact';
  } else if (extentA < extentB) {
    limitingStatus = 'A';
  } else {
    limitingStatus = 'B';
  }

  const consumedMolesA = reactionExtent * reaction.reactantA.coeff;
  const consumedMolesB = reactionExtent * reaction.reactantB.coeff;

  const excessMolesA = Math.max(0, molesA - consumedMolesA);
  const excessMolesB = Math.max(0, molesB - consumedMolesB);
  const excessGramsA = excessMolesA * molA.molarMass;
  const excessGramsB = excessMolesB * molB.molarMass;

  const theoreticalMolesC = reactionExtent * reaction.productC.coeff;
  const theoreticalGramsC = theoreticalMolesC * molC.molarMass;

  const theoreticalMolesD =
    reaction.productD && molD ? reactionExtent * reaction.productD.coeff : 0;
  const theoreticalGramsD =
    reaction.productD && molD ? theoreticalMolesD * molD.molarMass : 0;

  const actualMolesC = theoreticalMolesC * efficiency;
  const actualGramsC = theoreticalGramsC * efficiency;
  const percentYield = efficiency * 100;

  const diff = extentB - extentA;
  const balanceTiltRadians = Math.max(-0.28, Math.min(0.28, diff * 0.085));

  return {
    reaction,
    molA,
    molB,
    molC,
    molD,
    molesA,
    molesB,
    gramsA,
    gramsB,
    extentA,
    extentB,
    reactionExtent,
    limitingStatus,
    consumedMolesA,
    consumedMolesB,
    excessMolesA,
    excessMolesB,
    excessGramsA,
    excessGramsB,
    theoreticalMolesC,
    theoreticalGramsC,
    theoreticalMolesD,
    theoreticalGramsD,
    actualMolesC,
    actualGramsC,
    percentYield,
    balanceTiltRadians,
  };
}
