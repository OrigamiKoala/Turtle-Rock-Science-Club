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
      'Understand that equivalence is reached when moles of acid equal moles of base: $n_{\\text{acid}} = n_{\\text{base}}$'
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
      question: 'When $0.100\\text{ M}$ hydrochloric acid ($\\text{HCl}$, strong acid) is neutralized by $0.100\\text{ M}$ sodium hydroxide ($\\text{NaOH}$, strong base), what will the solution $\\text{pH}$ be at the exact equivalence point?',
      context: 'Both $\\text{HCl}$ and $\\text{NaOH}$ dissociate $100\\%$ in water. The neutralization reaction is $\\text{H}^+ + \\text{OH}^- \\rightleftharpoons \\text{H}_2\\text{O}$.',
      options: [
        {
          id: 'p1',
          label: 'Exactly $\\text{pH } 7.00$ (Neutral)',
          isCorrect: true,
          explanation: 'Correct! Strong acid + strong base yields $\\text{H}_2\\text{O}$ and neutral spectator ions ($\\text{Na}^+$ and $\\text{Cl}^-$), giving an exact equivalence $\\text{pH}$ of $7.00$ at $25\\text{ }^\\circ\\text{C}$.'
        },
        {
          id: 'p2',
          label: 'Acidic ($\\text{pH} < 7.00$)',
          isCorrect: false,
          explanation: 'At equivalence, all acid protons are neutralized and no excess acid remains.'
        },
        {
          id: 'p3',
          label: 'Basic ($\\text{pH} > 7.00$)',
          isCorrect: false,
          explanation: 'Neither $\\text{Na}^+$ nor $\\text{Cl}^-$ undergoes hydrolysis, so the equivalence point is neutral.'
        }
      ]
    },
    deeperNotes: {
      title: 'Mole Ratio in Strong Acid–Strong Base Titrations',
      content: 'Because $\\text{HCl}$ produces one $\\text{H}^+$ and $\\text{NaOH}$ produces one $\\text{OH}^-$, the stoichiometric mole ratio is $1:1$. Thus, at equivalence: $n_{\\text{acid}} = n_{\\text{base}} \\implies C_{\\text{acid}} \\times V_{\\text{acid}} = C_{\\text{titrant}} \\times V_{\\text{titrant}}$.',
      keyEquation: 'n_{\\text{acid}} = n_{\\text{base}} = C_{\\text{titrant}} \\times V_{\\text{titrant}}'
    }
  },
  {
    id: 'module-2',
    number: 2,
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
      question: 'Why does a single drop ($0.05\\text{ mL}$) of $0.1\\text{ M NaOH}$ cause a huge jump in $\\text{pH}$ (from $\\sim 4$ to $\\sim 10$) right at equivalence, whereas earlier in the titration a drop barely moved the $\\text{pH}$?',
      context: '$\\text{pH}$ is a logarithmic scale: $\\text{pH} = -\\log_{10}[\\text{H}^+]$.',
      options: [
        {
          id: 'p1',
          label: 'Near equivalence, $[\\text{H}^+]$ is already extremely tiny ($10^{-5}\\text{ M}$), so a single drop contains many more $\\text{OH}^-$ ions than the remaining $\\text{H}^+$',
          isCorrect: true,
          explanation: 'Exactly! When $[\\text{H}^+]$ is tiny, even $5 \\times 10^{-6}\\text{ mol}$ of excess $\\text{OH}^-$ swings the logarithmic concentration by many orders of magnitude.'
        },
        {
          id: 'p2',
          label: 'The chemical reaction speeds up by $1000\\times$ at the end',
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
      content: 'At $0.05\\text{ mL}$ before equivalence, $[\\text{H}^+] \\sim 10^{-4}\\text{ M}$ ($\\text{pH } 4$). At equivalence, $[\\text{H}^+] = 10^{-7}\\text{ M}$ ($\\text{pH } 7$). At $0.05\\text{ mL}$ past equivalence, $[\\text{OH}^-] \\sim 10^{-4}\\text{ M}$, so $[\\text{H}^+] = 10^{-10}\\text{ M}$ ($\\text{pH } 10$). One drop spans $6\\text{ pH}$ units!',
      keyEquation: '\\text{pH} = -\\log_{10}[\\text{H}^+]'
    }
  },
  {
    id: 'module-3',
    number: 3,
    title: 'Weak Acid, Strong Base',
    subtitle: 'Buffer zones and half-equivalence pKa',
    description: 'Titrate acetic acid (vinegar) with sodium hydroxide. Discover why the equivalence point is basic (pH ≈ 8.7) and how to read pKa directly from the curve.',
    difficulty: 'Intermediate',
    xpReward: 35,
    learningGoals: [
      'Observe the initial jump, buffer plateau, and basic equivalence point',
      'Identify the half-equivalence point where $\\text{pH} = \\text{p}K_a$ (Henderson–Hasselbalch)',
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
      question: 'When acetic acid ($\\text{CH}_3\\text{COOH}$, $\\text{p}K_a = 4.76$) is titrated with sodium hydroxide ($\\text{NaOH}$) to exact equivalence, will the final solution be neutral, acidic, or basic?',
      context: '$\\text{CH}_3\\text{COOH} + \\text{OH}^- \\rightleftharpoons \\text{CH}_3\\text{COO}^- + \\text{H}_2\\text{O}$. At equivalence, only sodium acetate remains.',
      options: [
        {
          id: 'p1',
          label: 'Basic ($\\text{pH} > 7.00$, around $\\text{pH } 8.7$)',
          isCorrect: true,
          explanation: 'Correct! Acetate ion $\\text{CH}_3\\text{COO}^-$ is the conjugate base of a weak acid; it hydrolyzes water ($\\text{CH}_3\\text{COO}^- + \\text{H}_2\\text{O} \\rightleftharpoons \\text{CH}_3\\text{COOH} + \\text{OH}^-$) producing extra $\\text{OH}^-$ ions.'
        },
        {
          id: 'p2',
          label: 'Exactly $\\text{pH } 7.00$',
          isCorrect: false,
          explanation: 'Because acetate ion acts as a weak base in water, the equivalence point of a weak acid titration is always alkaline ($\\text{pH} > 7$).'
        },
        {
          id: 'p3',
          label: 'Acidic ($\\text{pH} < 7.00$)',
          isCorrect: false,
          explanation: 'All original acetic acid has been converted into acetate base, so the solution cannot be acidic.'
        }
      ]
    },
    deeperNotes: {
      title: 'Henderson–Hasselbalch & The Half-Equivalence Point',
      content: 'At half-equivalence ($V = 0.5 \\times V_{\\text{eq}}$), exactly half the weak acid has been converted into its conjugate base: $[\\text{HA}] = [\\text{A}^-]$. Thus $\\text{pH} = \\text{p}K_a + \\log_{10}\\left(\\frac{[\\text{A}^-]}{[\\text{HA}]}\\right) = \\text{p}K_a + \\log_{10}(1) = \\text{p}K_a = 4.76$.',
      keyEquation: '\\text{pH} = \\text{p}K_a + \\log_{10}\\left(\\frac{[\\text{A}^-]}{[\\text{HA}]}\\right)'
    }
  },
  {
    id: 'module-4',
    number: 4,
    title: 'Weak Base, Strong Acid',
    subtitle: 'The mirror image: equivalence below 7',
    description: 'Titrate ammonia (window cleaner) with hydrochloric acid. See the curve flip upside down and find why methyl red is the ideal indicator.',
    difficulty: 'Intermediate',
    xpReward: 35,
    learningGoals: [
      'Titrate starting from high basic $\\text{pH}$ down into acidic territory',
      'Explain why ammonium ion ($\\text{NH}_4^+$) creates an acidic equivalence point ($\\text{pH} \\approx 5.3$)',
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
      question: 'When ammonia ($\\text{NH}_3$, weak base) is titrated with hydrochloric acid ($\\text{HCl}$, strong acid), what will the $\\text{pH}$ be at the equivalence point?',
      context: '$\\text{NH}_3 + \\text{H}^+ \\rightleftharpoons \\text{NH}_4^+$. At equivalence, the solution contains ammonium chloride ($\\text{NH}_4\\text{Cl}$).',
      options: [
        {
          id: 'p1',
          label: 'Acidic ($\\text{pH} < 7.00$, around $\\text{pH } 5.3$)',
          isCorrect: true,
          explanation: 'Spot on! $\\text{NH}_4^+$ is the conjugate acid of a weak base and hydrolyzes water ($\\text{NH}_4^+ + \\text{H}_2\\text{O} \\rightleftharpoons \\text{NH}_3 + \\text{H}_3\\text{O}^+$), lowering the $\\text{pH}$.'
        },
        {
          id: 'p2',
          label: 'Neutral ($\\text{pH } 7.00$)',
          isCorrect: false,
          explanation: 'Only strong acid + strong base yields neutral $\\text{pH } 7.00$ at equivalence.'
        },
        {
          id: 'p3',
          label: 'Basic ($\\text{pH} > 7.00$)',
          isCorrect: false,
          explanation: 'The weak base is fully neutralized, leaving the weak conjugate acid $\\text{NH}_4^+$.'
        }
      ]
    },
    deeperNotes: {
      title: 'Cation Hydrolysis and Indicator Selection',
      content: 'Because equivalence occurs at $\\text{pH } 5.28$, phenolphthalein (turning color at $\\text{pH } 8.2\\text{--}10$) would flip far too early! Methyl red (range $4.4\\text{--}6.2$) catches the steep jump cleanly.',
      keyEquation: 'K_a(\\text{NH}_4^+) = \\frac{K_w}{K_b(\\text{NH}_3)} = \\frac{1.0 \\times 10^{-14}}{1.78 \\times 10^{-5}} = 5.62 \\times 10^{-10}'
    }
  },
  {
    id: 'module-5',
    number: 5,
    title: 'Choosing an Indicator',
    subtitle: 'Indicator error and matching pKa to equivalence',
    description: 'Titrate 0.1 M acetic acid with three different indicators. Compare the three experimental concentrations to discover indicator error.',
    difficulty: 'Advanced',
    xpReward: 40,
    learningGoals: [
      'Compare methyl orange ($\\text{p}K_a = 3.7$), bromothymol blue ($\\text{p}K_a = 7.1$), and phenolphthalein ($\\text{p}K_a = 9.4$)',
      'Calculate the systematic titration error caused by a mismatched indicator',
      'Choose indicators whose transition interval encompasses the equivalence $\\text{pH}$'
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
      question: 'If you use methyl orange (color change at $\\text{pH } 3.1\\text{--}4.4$) to titrate acetic acid (equivalence $\\text{pH } 8.7$), what will happen to your calculated acetic acid concentration?',
      context: 'Methyl orange turns yellow long before reaching $\\text{pH } 8.7$.',
      options: [
        {
          id: 'p1',
          label: 'It will report a severely UNDERESTIMATED concentration because the color changes after only a tiny volume of $\\text{NaOH}$ is added',
          isCorrect: true,
          explanation: 'Exact! Methyl orange flips yellow around $\\text{pH } 4.4$, when less than $30\\%$ of the acetic acid has been neutralized, resulting in massive negative error.'
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
          explanation: 'Indicators only change color near their individual $\\text{p}K_a$ values.'
        }
      ]
    },
    deeperNotes: {
      title: 'Titration Error Formula',
      content: 'Titration Error $\\% = \\frac{V_{\\text{endpoint}} - V_{\\text{equivalence}}}{V_{\\text{equivalence}}} \\times 100\\%$. Choosing an indicator whose $\\text{p}K_a$ is within $\\pm 1$ unit of equivalence keeps error $< 0.1\\%$.',
      keyEquation: '\\text{Error \\%} = \\frac{V_{\\text{endpoint}} - V_{\\text{equivalence}}}{V_{\\text{equivalence}}} \\times 100\\%'
    }
  },
  {
    id: 'module-6',
    number: 6,
    title: "When It Doesn't Work",
    subtitle: 'Weak acid vs weak base: no sharp inflection',
    description: 'Titrate acetic acid with ammonia. Without a strong reagent on either side, visual indicators fail and only a calibrated pH probe can find the center of inflection.',
    difficulty: 'Advanced',
    xpReward: 40,
    learningGoals: [
      'Experience why weak acid + weak base titrations lack a sharp $\\text{pH}$ transition',
      'Understand the limitations of visual chemical indicators',
      'Use derivative analysis ($\\frac{d\\text{pH}}{dV}$) on the curve data to locate equivalence'
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
          label: 'The $\\text{pH}$ curve has a very gentle slope with no steep vertical jump, making endpoints ambiguous and unreliable',
          isCorrect: true,
          explanation: 'Precisely! Mutual buffering flattens the transition, stretching the color change over several milliliters of titrant.'
        },
        {
          id: 'p2',
          label: 'Weak acids and weak bases do not react with each other',
          isCorrect: false,
          explanation: 'They do react to completion, but continuous hydrolysis prevents a sharp $\\text{pH}$ discontinuity.'
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
      content: 'In weak–weak systems, the true equivalence point is the mathematical inflection point where the second derivative $\\frac{d^2\\text{pH}}{dV^2} = 0$, found by locating the maximum of $\\frac{d\\text{pH}}{dV}$.',
      keyEquation: '\\left(\\frac{d\\text{pH}}{dV}\\right)_{\\max} \\implies V_{\\text{eq}}'
    }
  },
  {
    id: 'module-7',
    number: 7,
    title: 'Two Protons',
    subtitle: 'Polyprotic systems & sequential equivalence points',
    description: 'Titrate sodium carbonate (Na₂CO₃) with hydrochloric acid. Observe two distinct equivalence steps as CO₃²⁻ turns to HCO₃⁻ then to H₂CO₃.',
    difficulty: 'Advanced',
    xpReward: 45,
    learningGoals: [
      'Track stepwise neutralization of a diprotic base ($\\text{Na}_2\\text{CO}_3$)',
      'Use phenolphthalein for the first proton ($\\text{pH} \\sim 8.3$) and methyl orange for the second ($\\text{pH} \\sim 3.8$)',
      'Calculate concentration using the $2:1$ stoichiometric mole ratio'
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
      question: 'In the titration of $20.0\\text{ mL}$ of $0.080\\text{ M Na}_2\\text{CO}_3$ with $0.100\\text{ M HCl}$, the first equivalence point occurs at $16.0\\text{ mL}$ of $\\text{HCl}$. At what total volume of $\\text{HCl}$ will the second equivalence point occur?',
      context: 'Step 1: $\\text{CO}_3^{2-} + \\text{H}^+ \\rightleftharpoons \\text{HCO}_3^-$. Step 2: $\\text{HCO}_3^- + \\text{H}^+ \\rightleftharpoons \\text{H}_2\\text{CO}_3$.',
      options: [
        {
          id: 'p1',
          label: '$32.0\\text{ mL}$ of $\\text{HCl}$ (exactly double)',
          isCorrect: true,
          explanation: 'Awesome! Each carbonate ion takes $1$ proton in step 1 ($16\\text{ mL}$) and a $2$nd proton in step 2 (an additional $16\\text{ mL}$, total $32\\text{ mL}$).'
        },
        {
          id: 'p2',
          label: '$16.0\\text{ mL}$ of $\\text{HCl}$ (same volume)',
          isCorrect: false,
          explanation: '$16\\text{ mL}$ is only the first equivalence point.'
        },
        {
          id: 'p3',
          label: '$24.0\\text{ mL}$ of $\\text{HCl}$',
          isCorrect: false,
          explanation: 'Because both steps have equal stoichiometric ratios ($1:1$ per step), the volume required for step 2 equals step 1.'
        }
      ]
    },
    deeperNotes: {
      title: 'Stepwise Polyprotic Chemistry',
      content: 'When the ratio of successive acid dissociation constants ($K_{a1}/K_{a2}$) is greater than $10^4$ (here $\\sim 10^4$), the two proton transfer steps occur sequentially and produce two distinct jumps.',
      keyEquation: '\\text{CO}_3^{2-} \\xrightarrow{+\\text{H}^+} \\text{HCO}_3^- \\xrightarrow{+\\text{H}^+} \\text{H}_2\\text{CO}_3'
    }
  },
  {
    id: 'module-8',
    number: 8,
    title: 'Mystery Samples',
    subtitle: 'Endlessly repeatable unknown analysis',
    description: 'Receive a coded mystery sample (TR-XXXX). Determine its unknown concentration and earn the Analytical Chemist badge!',
    difficulty: 'Mastery',
    xpReward: 50,
    learningGoals: [
      'Perform careful exploratory run and multiple concordant trials',
      'Select the optimal indicator based on sample classification',
      'Compute unknown concentration within $\\pm 5\\%$ (Basic) or $\\pm 2\\%$ (Go Deeper) accuracy'
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
          explanation: 'Standard professional lab technique! The scout run prevents wasting time, and subsequent trials provide high-precision concordant data.'
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
      content: 'In analytical laboratories, trials are repeated until at least two titrant volumes agree within $0.10\\text{ mL}$ (concordant). The average of concordant titers is used for calculation.',
      keyEquation: '\\bar{V} = \\frac{V_1 + V_2}{2} \\quad \\text{where } |V_1 - V_2| \\le 0.10\\text{ mL}'
    }
  },
  {
    id: 'module-9',
    number: 9,
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
      question: 'Citric acid (in lemon juice) is a triprotic acid with $3$ reactive protons ($\\text{p}K_a = 3.13, 4.76, 6.40$). How many moles of $\\text{NaOH}$ are required to completely neutralize $1\\text{ mole}$ of citric acid?',
      context: '$\\text{C}_6\\text{H}_8\\text{O}_7 + 3\\text{ NaOH} \\longrightarrow \\text{Na}_3\\text{C}_6\\text{H}_5\\text{O}_7 + 3\\text{ H}_2\\text{O}$.',
      options: [
        {
          id: 'p1',
          label: '$3\\text{ moles of NaOH}$ ($3:1$ stoichiometric ratio)',
          isCorrect: true,
          explanation: 'Correct! Because citric acid has three carboxylic acid protons, it takes three moles of strong base to reach full equivalence.'
        },
        {
          id: 'p2',
          label: '$1\\text{ mole of NaOH}$',
          isCorrect: false,
          explanation: 'Citric acid is triprotic, so $1\\text{ mole}$ of base only neutralizes the first proton.'
        },
        {
          id: 'p3',
          label: '$6\\text{ moles of NaOH}$',
          isCorrect: false,
          explanation: 'Only the $3$ carboxylic acid protons participate in aqueous acid-base titration.'
        }
      ]
    },
    deeperNotes: {
      title: 'Triprotic Stoichiometry',
      content: 'At the $3$rd equivalence point of citric acid: $n(\\text{NaOH}) = 3 \\times n(\\text{citric acid})$. Therefore, $C_{\\text{citric}} = \\frac{C_{\\text{NaOH}} \\times V_{\\text{NaOH}}}{3 \\times V_{\\text{citric}}}$.',
      keyEquation: 'C_{\\text{analyte}} = \\frac{C_{\\text{titrant}} \\times V_{\\text{titrant}}}{3 \\times V_{\\text{analyte}}}'
    }
  }
];
