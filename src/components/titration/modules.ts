import { REAGENTS, INDICATORS } from './chem';
import { ModuleDef } from './types';

export const MODULES: ModuleDef[] = [
  {
    id: 'module-1',
    number: 1,
    title: 'First Titration',
    subtitle: 'The apparatus, the stopcock, and the endpoint',
    description: 'Learn how to deliver drops from the burette into the flask and catch the first permanent faint pink color change.',
    difficulty: 'Beginner',
    xpReward: 25,
    learningGoals: [
      'Operate the burette stopcock to deliver titrant drop-by-drop',
      'Observe the phenolphthalein indicator turn from colourless to pale pink',
      'Understand that equivalence is reached when moles of acid equal moles of base'
    ],
    setup: {
      analyte: REAGENTS.hcl,
      analyteConc: 0.1,
      analyteVolumeMl: 25.0,
      titrant: REAGENTS.naoh,
      titrantConc: 0.1,
      defaultIndicatorId: 'phenolphthalein',
      allowedIndicatorIds: ['phenolphthalein'],
      autoReadDefault: true,
      showProbeDefault: true,
      allowProbeToggle: true
    },
    predict: {
      question: 'When 0.100 M hydrochloric acid (strong acid) is neutralized by 0.100 M sodium hydroxide (strong base), what will the solution pH be at the exact equivalence point?',
      context: 'Both hydrochloric acid and sodium hydroxide dissociate 100% in water. The reaction is H⁺ + OH⁻ ⇌ H₂O.',
      options: [
        {
          id: 'p1',
          label: 'Exactly pH 7.00 (Neutral)',
          isCorrect: true,
          explanation: 'Correct! Strong acid + strong base yields water and neutral spectator ions (Na⁺ and Cl⁻), giving an exact equivalence pH of 7.00 at 25 °C.'
        },
        {
          id: 'p2',
          label: 'Acidic (pH < 7.00)',
          isCorrect: false,
          explanation: 'At equivalence, all acid protons are neutralized and no excess acid remains.'
        },
        {
          id: 'p3',
          label: 'Basic (pH > 7.00)',
          isCorrect: false,
          explanation: 'Neither Na⁺ nor Cl⁻ undergoes hydrolysis, so the equivalence point is neutral.'
        }
      ]
    },
    deeperNotes: {
      title: 'Mole Ratio in Strong Acid–Strong Base Titrations',
      content: 'Because HCl produces one H⁺ and NaOH produces one OH⁻, the stoichiometric mole ratio is 1:1. Thus, at equivalence: n(acid) = n(base) ⟹ C(acid) × V(acid) = C(titrant) × V(titrant).',
      keyEquation: 'n_{acid} = n_{base} = C_{titrant} \\times V_{titrant}'
    }
  },
  {
    id: 'module-2',
    number: 2,
    title: 'Reading the Burette',
    subtitle: 'Meniscus estimation & precision measurement',
    description: 'Turn off auto-read and practice reading the volume to 0.01 mL using the reading loupe magnifier at the bottom of the meniscus curve.',
    difficulty: 'Beginner',
    xpReward: 25,
    learningGoals: [
      'Read burette scales from top (0.00 mL) to bottom (50.00 mL)',
      'Align the bottom of the liquid meniscus against millimeter marks',
      'Estimate the second decimal place (±0.01 mL) with the loupe reticle'
    ],
    setup: {
      analyte: REAGENTS.hcl,
      analyteConc: 0.08,
      analyteVolumeMl: 25.0,
      titrant: REAGENTS.naoh,
      titrantConc: 0.1,
      defaultIndicatorId: 'phenolphthalein',
      allowedIndicatorIds: ['phenolphthalein', 'bromothymol_blue'],
      autoReadDefault: false,
      showProbeDefault: false,
      allowProbeToggle: true
    },
    predict: {
      question: 'Burette scales are numbered with 0.00 mL at the top and 50.00 mL at the bottom. If the liquid meniscus is between the 18.3 mL and 18.4 mL line, approximately 3/10ths of the way down, what is the correct reading?',
      context: 'Analytical burettes are read downwards, estimating the hundredths digit.',
      options: [
        {
          id: 'p1',
          label: '18.33 mL',
          isCorrect: true,
          explanation: 'Spot on! The major reading is 18.3 mL and estimating 0.03 mL gives 18.33 mL.'
        },
        {
          id: 'p2',
          label: '18.43 mL',
          isCorrect: false,
          explanation: 'Reading downwards means moving from 18.3 toward 18.4, so it must be less than 18.40 mL.'
        },
        {
          id: 'p3',
          label: '18.30 mL',
          isCorrect: false,
          explanation: 'Burettes allow precision to 0.01 mL by estimating between the graduation marks.'
        }
      ]
    },
    deeperNotes: {
      title: 'Parallax and Meniscus Physics',
      content: 'Surface tension pulls water upwards against the glass wall. Always read the lowest horizontal tangent at the bottom of the curve at eye level to avoid parallax error.',
      keyEquation: '\\Delta V = V_{final} - V_{initial}'
    }
  },
  {
    id: 'module-3',
    number: 3,
    title: 'The Steep Jump',
    subtitle: 'Why one single drop swings pH by 4 units',
    description: 'Experience the razor-thin equivalence cliff. See how 0.05 mL changes an acid solution into a bright magenta base without a probe.',
    difficulty: 'Intermediate',
    xpReward: 30,
    learningGoals: [
      'Understand why the titration curve is nearly vertical near equivalence',
      'Slow down to single drops as the transient pink flash takes longer to fade',
      'Avoid overshooting the faint pink endpoint into dark purple'
    ],
    setup: {
      analyte: REAGENTS.hcl,
      analyteConc: 0.12,
      analyteVolumeMl: 20.0,
      titrant: REAGENTS.naoh,
      titrantConc: 0.1,
      defaultIndicatorId: 'phenolphthalein',
      allowedIndicatorIds: ['phenolphthalein'],
      autoReadDefault: false,
      showProbeDefault: false,
      allowProbeToggle: false // Must rely on visual indicator
    },
    predict: {
      question: 'Why does a single drop (0.05 mL) of 0.1 M NaOH cause a huge jump in pH (from ~4 to ~10) right at equivalence, whereas earlier in the titration a drop barely moved the pH?',
      context: 'pH is a logarithmic scale: pH = -log₁₀[H⁺].',
      options: [
        {
          id: 'p1',
          label: 'Near equivalence, [H⁺] is already extremely tiny (10⁻⁵ M), so a single drop contains many more OH⁻ ions than the remaining H⁺',
          isCorrect: true,
          explanation: 'Exactly! When [H⁺] is tiny, even 0.000005 moles of excess OH⁻ swings the logarithmic concentration by many orders of magnitude.'
        },
        {
          id: 'p2',
          label: 'The chemical reaction speeds up by 1000x at the end',
          isCorrect: false,
          explanation: 'The reaction rate constant does not change; it is the logarithmic mathematics of tiny remaining concentrations.'
        },
        {
          id: 'p3',
          label: 'The indicator releases extra hydroxide ions',
          isCorrect: false,
          explanation: 'Indicators are present in trace amounts and do not alter the bulk solution stoichiometry.'
        }
      ]
    },
    deeperNotes: {
      title: 'The Logarithmic Cliff',
      content: 'At 0.05 mL before equivalence, [H⁺] is ~10⁻⁴ M (pH 4). At equivalence, [H⁺] is 10⁻⁷ M (pH 7). At 0.05 mL past equivalence, [OH⁻] is ~10⁻⁴ M, so [H⁺] is 10⁻¹⁰ M (pH 10). One drop spans 6 pH units!',
      keyEquation: 'pH = -\\log_{10}[H^+]'
    }
  },
  {
    id: 'module-4',
    number: 4,
    title: 'Weak Acid, Strong Base',
    subtitle: 'Buffer zones and half-equivalence pKa',
    description: 'Titrate acetic acid (vinegar) with sodium hydroxide. Discover why the equivalence point is basic (pH ≈ 8.7) and how to read pKa directly from the curve.',
    difficulty: 'Intermediate',
    xpReward: 35,
    learningGoals: [
      'Observe the initial jump, buffer plateau, and basic equivalence point',
      'Identify the half-equivalence point where pH = pKa (Henderson–Hasselbalch)',
      'Explain why the conjugate base acetate makes the equivalence solution basic'
    ],
    setup: {
      analyte: REAGENTS.acetic,
      analyteConc: 0.1,
      analyteVolumeMl: 25.0,
      titrant: REAGENTS.naoh,
      titrantConc: 0.1,
      defaultIndicatorId: 'phenolphthalein',
      allowedIndicatorIds: ['phenolphthalein', 'bromothymol_blue', 'methyl_orange'],
      autoReadDefault: false,
      showProbeDefault: true,
      allowProbeToggle: true
    },
    predict: {
      question: 'When acetic acid (CH₃COOH, pKa = 4.76) is titrated with sodium hydroxide to exact equivalence, will the final solution be neutral, acidic, or basic?',
      context: 'CH₃COOH + OH⁻ ⇌ CH₃COO⁻ + H₂O. At equivalence, only sodium acetate remains.',
      options: [
        {
          id: 'p1',
          label: 'Basic (pH > 7.00, around 8.7)',
          isCorrect: true,
          explanation: 'Correct! Acetate ion CH₃COO⁻ is the conjugate base of a weak acid; it hydrolyzes water (CH₃COO⁻ + H₂O ⇌ CH₃COOH + OH⁻) producing extra OH⁻ ions.'
        },
        {
          id: 'p2',
          label: 'Exactly pH 7.00',
          isCorrect: false,
          explanation: 'Because acetate ion acts as a weak base in water, the equivalence point of a weak acid titration is always alkaline (pH > 7).'
        },
        {
          id: 'p3',
          label: 'Acidic (pH < 7.00)',
          isCorrect: false,
          explanation: 'All original acetic acid has been converted into acetate base, so the solution cannot be acidic.'
        }
      ]
    },
    deeperNotes: {
      title: 'Henderson–Hasselbalch & The Half-Equivalence Point',
      content: 'At half-equivalence (V = 0.5 × V_eq), exactly half the weak acid has been converted into its conjugate base: [HA] = [A⁻]. Thus pH = pKa + log([A⁻]/[HA]) = pKa + log(1) = pKa = 4.76.',
      keyEquation: 'pH = pK_a + \\log_{10}\\left(\\frac{[A^-]}{[HA]}\\right)'
    }
  },
  {
    id: 'module-5',
    number: 5,
    title: 'Weak Base, Strong Acid',
    subtitle: 'The mirror image: equivalence below 7',
    description: 'Titrate ammonia (window cleaner) with hydrochloric acid. See the curve flip upside down and find why methyl red is the ideal indicator.',
    difficulty: 'Intermediate',
    xpReward: 35,
    learningGoals: [
      'Titrate starting from high basic pH down into acidic territory',
      'Explain why ammonium ion (NH₄⁺) creates an acidic equivalence point (pH ≈ 5.3)',
      'Select an indicator that changes color in the acidic transition range'
    ],
    setup: {
      analyte: REAGENTS.ammonia,
      analyteConc: 0.1,
      analyteVolumeMl: 25.0,
      titrant: REAGENTS.hcl,
      titrantConc: 0.1,
      defaultIndicatorId: 'methyl_red',
      allowedIndicatorIds: ['methyl_red', 'bromocresol_green', 'phenolphthalein'],
      autoReadDefault: false,
      showProbeDefault: true,
      allowProbeToggle: true
    },
    predict: {
      question: 'When ammonia (NH₃, weak base) is titrated with hydrochloric acid (HCl, strong acid), what will the pH be at the equivalence point?',
      context: 'NH₃ + H⁺ ⇌ NH₄⁺. At equivalence, the solution contains ammonium chloride.',
      options: [
        {
          id: 'p1',
          label: 'Acidic (pH < 7.00, around 5.3)',
          isCorrect: true,
          explanation: 'Spot on! NH₄⁺ is the conjugate acid of a weak base and hydrolyzes water (NH₄⁺ + H₂O ⇌ NH₃ + H₃O⁺), lowering the pH.'
        },
        {
          id: 'p2',
          label: 'Neutral (pH 7.00)',
          isCorrect: false,
          explanation: 'Only strong acid + strong base yields neutral pH 7.00 at equivalence.'
        },
        {
          id: 'p3',
          label: 'Basic (pH > 7.00)',
          isCorrect: false,
          explanation: 'The weak base is fully neutralized, leaving the weak conjugate acid NH₄⁺.'
        }
      ]
    },
    deeperNotes: {
      title: 'Cation Hydrolysis and Indicator Selection',
      content: 'Because equivalence occurs at pH 5.28, phenolphthalein (turning color at pH 8.2–10) would flip far too early! Methyl red (range 4.4–6.2) catches the steep jump cleanly.',
      keyEquation: 'K_a(NH_4^+) = \\frac{K_w}{K_b(NH_3)} = \\frac{1.0 \\times 10^{-14}}{1.78 \\times 10^{-5}} = 5.62 \\times 10^{-10}'
    }
  },
  {
    id: 'module-6',
    number: 6,
    title: 'Choosing an Indicator',
    subtitle: 'Indicator error and matching pKa to equivalence',
    description: 'Titrate 0.1 M acetic acid with three different indicators. Compare the three experimental concentrations to discover indicator error.',
    difficulty: 'Advanced',
    xpReward: 40,
    learningGoals: [
      'Compare methyl orange (pKa 3.7), bromothymol blue (pKa 7.1), and phenolphthalein (pKa 9.4)',
      'Calculate the systematic titration error caused by an mismatched indicator',
      'Choose indicators whose transition interval encompasses the equivalence pH'
    ],
    setup: {
      analyte: REAGENTS.acetic,
      analyteConc: 0.1,
      analyteVolumeMl: 25.0,
      titrant: REAGENTS.naoh,
      titrantConc: 0.1,
      defaultIndicatorId: 'methyl_orange',
      allowedIndicatorIds: ['methyl_orange', 'bromothymol_blue', 'phenolphthalein'],
      autoReadDefault: false,
      showProbeDefault: true,
      allowProbeToggle: true
    },
    predict: {
      question: 'If you use methyl orange (color change at pH 3.1–4.4) to titrate acetic acid (equivalence pH 8.7), what will happen to your calculated acetic acid concentration?',
      context: 'Methyl orange turns yellow long before reaching pH 8.7.',
      options: [
        {
          id: 'p1',
          label: 'It will report a severely UNDERESTIMATED concentration because the color changes after only a tiny volume of NaOH is added',
          isCorrect: true,
          explanation: 'Exact! Methyl orange flips yellow around pH 4.4, when less than 30% of the acetic acid has been neutralized, resulting in massive negative error.'
        },
        {
          id: 'p2',
          label: 'It will report an OVERESTIMATED concentration',
          isCorrect: false,
          explanation: 'Because it flips early at low delivered volume, the calculated moles will be too small, not too large.'
        },
        {
          id: 'p3',
          label: 'It will have zero error because all indicators work the same',
          isCorrect: false,
          explanation: 'Indicators only change color near their individual pKa values.'
        }
      ]
    },
    deeperNotes: {
      title: 'Titration Error Formula',
      content: 'Titration Error % = ((V_endpoint - V_equivalence) / V_equivalence) × 100%. Choosing an indicator whose pKa is within ±1 unit of equivalence keeps error < 0.1%.',
      keyEquation: '\\text{Error \\%} = \\frac{V_{endpoint} - V_{equivalence}}{V_{equivalence}} \\times 100\\%'
    }
  },
  {
    id: 'module-7',
    number: 7,
    title: "When It Doesn't Work",
    subtitle: 'Weak acid vs weak base: no sharp inflection',
    description: 'Titrate acetic acid with ammonia. Without a strong reagent on either side, visual indicators fail and only a calibrated pH probe can find the center of inflection.',
    difficulty: 'Advanced',
    xpReward: 40,
    learningGoals: [
      'Experience why weak acid + weak base titrations lack a sharp pH transition',
      'Understand the limitations of visual chemical indicators',
      'Use derivative analysis (dpH/dV) on the curve data to locate equivalence'
    ],
    setup: {
      analyte: REAGENTS.acetic,
      analyteConc: 0.1,
      analyteVolumeMl: 25.0,
      titrant: REAGENTS.ammonia,
      titrantConc: 0.1,
      defaultIndicatorId: 'bromothymol_blue',
      allowedIndicatorIds: ['bromothymol_blue', 'phenol_red', 'phenolphthalein'],
      autoReadDefault: false,
      showProbeDefault: true,
      allowProbeToggle: true
    },
    predict: {
      question: 'Why are weak acid vs weak base titrations rarely performed in quantitative analytical chemistry laboratories?',
      context: 'Both solutions contain buffer pairs throughout the entire titration.',
      options: [
        {
          id: 'p1',
          label: 'The pH curve has a very gentle slope with no steep vertical jump, making endpoints ambiguous and unreliable',
          isCorrect: true,
          explanation: 'Precisely! Mutual buffering flattens the transition, stretching the color change over several milliliters of titrant.'
        },
        {
          id: 'p2',
          label: 'Weak acids and weak bases do not react with each other',
          isCorrect: false,
          explanation: 'They do react to completion, but the continuous hydrolysis prevents a sharp pH discontinuity.'
        },
        {
          id: 'p3',
          label: 'The reaction generates explosive gases',
          isCorrect: false,
          explanation: 'It is a safe proton transfer, but analytical precision is poor.'
        }
      ]
    },
    deeperNotes: {
      title: 'Inflection Analysis and First Derivative',
      content: 'In weak–weak systems, the true equivalence point is the mathematical inflection point where the second derivative d²pH/dV² = 0, found by finding the maximum of dpH/dV.',
      keyEquation: '\\left(\\frac{dpH}{dV}\\right)_{max} \\implies V_{eq}'
    }
  },
  {
    id: 'module-8',
    number: 8,
    title: 'Two Protons',
    subtitle: 'Polyprotic systems & sequential equivalence points',
    description: 'Titrate sodium carbonate (Na₂CO₃) with hydrochloric acid. Observe two distinct equivalence steps as CO₃²⁻ turns to HCO₃⁻ then to H₂CO₃.',
    difficulty: 'Advanced',
    xpReward: 45,
    learningGoals: [
      'Track stepwise neutralization of a diprotic base',
      'Use phenolphthalein for the first proton (pH ~8.3) and methyl orange for the second (pH ~3.8)',
      'Calculate concentration using the 2:1 stoichiometric mole ratio'
    ],
    setup: {
      analyte: REAGENTS.carbonate,
      analyteConc: 0.08,
      analyteVolumeMl: 20.0,
      titrant: REAGENTS.hcl,
      titrantConc: 0.1,
      defaultIndicatorId: 'phenolphthalein',
      allowedIndicatorIds: ['phenolphthalein', 'methyl_orange', 'bromocresol_green'],
      autoReadDefault: false,
      showProbeDefault: true,
      allowProbeToggle: true
    },
    predict: {
      question: 'In the titration of 20.0 mL of 0.080 M Na₂CO₃ with 0.100 M HCl, the first equivalence point occurs at 16.0 mL of HCl. At what total volume of HCl will the second equivalence point occur?',
      context: 'Step 1: CO₃²⁻ + H⁺ ⇌ HCO₃⁻. Step 2: HCO₃⁻ + H⁺ ⇌ H₂CO₃.',
      options: [
        {
          id: 'p1',
          label: '32.0 mL of HCl (exactly double)',
          isCorrect: true,
          explanation: 'Awesome! Each carbonate ion takes 1 proton in step 1 (16 mL) and a 2nd proton in step 2 (an additional 16 mL, total 32 mL).'
        },
        {
          id: 'p2',
          label: '16.0 mL of HCl (same volume)',
          isCorrect: false,
          explanation: '16 mL is only the first equivalence point.'
        },
        {
          id: 'p3',
          label: '24.0 mL of HCl',
          isCorrect: false,
          explanation: 'Because both steps have equal stoichiometric ratios (1:1 per step), the volume required for step 2 equals step 1.'
        }
      ]
    },
    deeperNotes: {
      title: 'Stepwise Polyprotic Chemistry',
      content: 'When the ratio of successive acid dissociation constants (Ka1/Ka2) is greater than 10⁴ (here ~10⁴), the two proton transfer steps occur sequentially and produce two distinct jumps.',
      keyEquation: 'CO_3^{2-} \\xrightarrow{+H^+} HCO_3^- \\xrightarrow{+H^+} H_2CO_3'
    }
  },
  {
    id: 'module-9',
    number: 9,
    title: 'Mystery Samples',
    subtitle: 'Endlessly repeatable unknown analysis',
    description: 'Receive a coded mystery sample (TR-XXXX). Determine its unknown concentration and earn the Analytical Chemist badge!',
    difficulty: 'Mastery',
    xpReward: 50,
    learningGoals: [
      'Perform careful exploratory run and multiple concordant trials',
      'Select the optimal indicator based on sample classification',
      'Compute unknown concentration within ±5% (Basic) or ±2% (Go Deeper) accuracy'
    ],
    setup: {
      analyte: REAGENTS.acetic, // dynamically replaced by unknown
      analyteConc: 0.1,
      analyteVolumeMl: 25.0,
      titrant: REAGENTS.naoh,
      titrantConc: 0.1,
      defaultIndicatorId: 'phenolphthalein',
      allowedIndicatorIds: Object.keys(INDICATORS),
      autoReadDefault: false,
      showProbeDefault: true,
      allowProbeToggle: true,
      isMystery: true
    },
    predict: {
      question: 'What is the best laboratory strategy when receiving an unknown sample with an unknown approximate concentration?',
      context: 'Analytical chemists use a fast scout titration before performing precise replicates.',
      options: [
        {
          id: 'p1',
          label: 'Perform a fast "scout" trial to find the rough endpoint, then perform 2-3 careful replicates drop-by-drop near the transition',
          isCorrect: true,
          explanation: 'Standard professional lab technique! The scout run prevents wasting time, and the subsequent trials provide high-precision concordant data.'
        },
        {
          id: 'p2',
          label: 'Empty the whole burette at once in one single trial',
          isCorrect: false,
          explanation: 'Overshooting ruins the trial and provides no accurate data.'
        },
        {
          id: 'p3',
          label: 'Guess the molarity without running any titration',
          isCorrect: false,
          explanation: 'Titration is an empirical measurement technique.'
        }
      ]
    },
    deeperNotes: {
      title: 'Concordant Trials in Quantitative Analysis',
      content: 'In analytical laboratories, trials are repeated until at least two titrant volumes agree within 0.10 mL (concordant). The average of concordant titers is used for calculation.',
      keyEquation: '\\bar{V} = \\frac{V_1 + V_2}{2} \\quad \\text{where } |V_1 - V_2| \\le 0.10\\text{ mL}'
    }
  },
  {
    id: 'module-10',
    number: 10,
    title: 'Free Bench',
    subtitle: 'Open sandbox simulation laboratory',
    description: 'Explore the full reagent library. Choose any analyte, any titrant, custom concentrations, and test any indicator with real-time chemical equilibrium.',
    difficulty: 'Mastery',
    xpReward: 20,
    learningGoals: [
      'Design custom titration experiments',
      'Test household substances (lemon juice, cola, ant sting, lye, vinegar)',
      'Examine simulated titration curves across diverse chemical systems'
    ],
    setup: {
      analyte: REAGENTS.citric,
      analyteConc: 0.05,
      analyteVolumeMl: 25.0,
      titrant: REAGENTS.naoh,
      titrantConc: 0.1,
      defaultIndicatorId: 'phenolphthalein',
      allowedIndicatorIds: Object.keys(INDICATORS),
      autoReadDefault: true,
      showProbeDefault: true,
      allowProbeToggle: true,
      isFreeBench: true
    },
    predict: {
      question: 'Citric acid (in lemon juice) is a triprotic acid with 3 reactive protons (pKa 3.13, 4.76, 6.40). How many moles of NaOH are required to completely neutralize 1 mole of citric acid?',
      context: 'C₆H₈O₇ + 3 NaOH ⟶ Na₃C₆H₅O₇ + 3 H₂O.',
      options: [
        {
          id: 'p1',
          label: '3 moles of NaOH (3:1 stoichiometric ratio)',
          isCorrect: true,
          explanation: 'Correct! Because citric acid has three carboxylic acid protons, it takes three moles of strong base to reach full equivalence.'
        },
        {
          id: 'p2',
          label: '1 mole of NaOH',
          isCorrect: false,
          explanation: 'Citric acid is triprotic, so 1 mole of base only neutralizes the first proton.'
        },
        {
          id: 'p3',
          label: '6 moles of NaOH',
          isCorrect: false,
          explanation: 'Only the 3 carboxylic acid protons participate in aqueous acid-base titration.'
        }
      ]
    },
    deeperNotes: {
      title: 'Triprotic Stoichiometry',
      content: 'At the 3rd equivalence point of citric acid: n(NaOH) = 3 × n(citric acid). Therefore, C(citric) = (C(NaOH) × V(NaOH)) / (3 × V(citric)).',
      keyEquation: 'C_{analyte} = \\frac{C_{titrant} \\times V_{titrant}}{3 \\times V_{analyte}}'
    }
  }
];
