import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Lightbulb, RotateCcw, ChevronRight, X, Sparkles, FlaskConical, Dna } from 'lucide-react';

/**
 * Critter Ranch
 * -------------
 * A Mendelian-genetics breeding puzzle. You run a ranch, a customer wants a
 * critter with a specific look, and the only tool you have is picking which
 * two critters to cross. Every offspring is drawn live from its genotype.
 *
 * The deduction is real: a critter showing the dominant trait could be
 * homozygous (HH) or heterozygous (Hh) — they look identical — so genotype
 * strips show "H?" until it's been proven one way or the other, either by a
 * recessive baby giving away a heterozygous parent, or (Level 4) by a
 * genuine test cross against a known recessive tester.
 */

// --------------------------------------------------------------------- types

type Allele = string;
type GeneId = string;
type Sex = 'F' | 'M';
type Genotype = Record<GeneId, [Allele, Allele]>;
type RNG = () => number;
type PhenoState = 'dominant' | 'recessive' | 'hetero';

interface PhenoResult {
  label: string;
  state: PhenoState;
}

interface GeneDef {
  id: GeneId;
  name: string;
  visualRole: 'color' | 'ears' | 'tail' | 'spots' | 'pigment';
  dominantAllele: Allele;
  recessiveAllele: Allele;
  dominantLabel: string;
  recessiveLabel: string;
  resolver: 'dominant' | 'incomplete';
  heterozygoteLabel?: string;
  dominantColor?: string;
  recessiveColor?: string;
  heteroColor?: string;
  /** True if this gene rides on the sex chromosome (only ever used alone). */
  sexLinked?: boolean;
}

interface Critter {
  id: string;
  sex: Sex;
  genotype: Genotype;
  /** Gene ids proven heterozygous because a recessive baby gave it away. */
  provenHet: GeneId[];
  /** Gene ids certified homozygous-dominant via a passed test cross. */
  provenHomozygous: GeneId[];
  /** A fixed recessive tester used for Level 4's test-cross mechanic. */
  tester?: boolean;
  /** Founders that can't be released (currently only testers). */
  fixed?: boolean;
  /** Running Level-4 test-cross sample tally, if this critter is a candidate. */
  testTotal?: number;
  testRecessive?: number;
}

// ---------------------------------------------------------------- seeded RNG

/** mulberry32 — tiny deterministic PRNG so a level's litters are reproducible. */
function mulberry32(seed: number): RNG {
  let s = seed;
  return function next() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ----------------------------------------------------------- genetics engine

function pair(a: Allele, b: Allele): [Allele, Allele] {
  return [a, b];
}

function mkCritter(id: string, sex: Sex, genotype: Genotype, opts: Partial<Critter> = {}): Critter {
  return {
    id,
    sex,
    genotype,
    provenHet: opts.provenHet ?? [],
    provenHomozygous: opts.provenHomozygous ?? [],
    tester: opts.tester ?? false,
    fixed: opts.fixed ?? false
  };
}

/** Pure phenotype resolver — the only place dominance rules live. */
function resolveGenePhenotype(gene: GeneDef, alleles: [Allele, Allele]): PhenoResult {
  const homDominant = alleles[0] === gene.dominantAllele && alleles[1] === gene.dominantAllele;
  const homRecessive = alleles[0] === gene.recessiveAllele && alleles[1] === gene.recessiveAllele;

  if (gene.resolver === 'incomplete') {
    if (homDominant) return { label: gene.dominantLabel, state: 'dominant' };
    if (homRecessive) return { label: gene.recessiveLabel, state: 'recessive' };
    return { label: gene.heterozygoteLabel ?? `${gene.dominantLabel}/${gene.recessiveLabel} blend`, state: 'hetero' };
  }

  if (homRecessive) return { label: gene.recessiveLabel, state: 'recessive' };
  return { label: gene.dominantLabel, state: homDominant ? 'dominant' : 'hetero' };
}

/** Genotype as the player is allowed to know it: "?" for anything unproven. */
function genotypeDisplay(gene: GeneDef, critter: Critter): string {
  const alleles = critter.genotype[gene.id];
  if (!alleles) return '??';
  const resolved = resolveGenePhenotype(gene, alleles);

  if (gene.sexLinked) {
    if (critter.sex === 'M') return `X${alleles[0]}Y`;
    if (resolved.state === 'recessive') return `X${alleles[0]}X${alleles[1]}`;
    if (critter.provenHomozygous.includes(gene.id)) return `X${gene.dominantAllele}X${gene.dominantAllele}`;
    if (critter.provenHet.includes(gene.id)) return `X${gene.dominantAllele}X${gene.recessiveAllele}`;
    return `X${gene.dominantAllele}X?`;
  }

  if (gene.resolver === 'incomplete') return alleles.join('');
  if (resolved.state === 'recessive') return alleles.join('');
  if (critter.provenHomozygous.includes(gene.id)) return `${gene.dominantAllele}${gene.dominantAllele}`;
  if (critter.provenHet.includes(gene.id)) return `${gene.dominantAllele}${gene.recessiveAllele}`;
  return `${gene.dominantAllele}?`;
}

function isGenotypeKnown(critter: Critter, genes: GeneDef[]): boolean {
  return genes.every((g) => !genotypeDisplay(g, critter).includes('?'));
}

/**
 * Breeds one offspring. Autosomal genes: each parent contributes one of its
 * two alleles at random. The sex-linked gene is special-cased: a father is
 * stored as a duplicated pair standing in for his single X, so he passes
 * that one allele to every daughter and nothing (genetically, a Y) to every
 * son — sons get their sex-linked allele from mom alone.
 */
function breedOffspring(mother: Critter, father: Critter, genes: GeneDef[], rng: RNG, id: string): Critter {
  const sex: Sex = rng() < 0.5 ? 'F' : 'M';
  const genotype: Genotype = {};

  for (const gene of genes) {
    const momPair = mother.genotype[gene.id];
    const dadPair = father.genotype[gene.id];
    const fromMom = momPair[rng() < 0.5 ? 0 : 1];

    if (gene.sexLinked) {
      genotype[gene.id] = sex === 'F' ? pair(fromMom, dadPair[0]) : pair(fromMom, fromMom);
    } else {
      const fromDad = dadPair[rng() < 0.5 ? 0 : 1];
      genotype[gene.id] = pair(fromMom, fromDad);
    }
  }

  return mkCritter(id, sex, genotype);
}

// ---------------------------------------------------------------- visuals

interface VisualTraits {
  color: string;
  ears: 'floppy' | 'pointy';
  tail: 'long' | 'short';
  spotted: boolean;
}

/**
 * Turns a genotype into what the critter actually looks like. A 'pigment'
 * gene is epistatic: if it resolves recessive (no working pigment), it wins
 * over whatever the 'color' gene would otherwise draw — that's albinism
 * masking the coat-color gene entirely, Level 7's whole point.
 */
function deriveVisual(critter: Critter, genes: GeneDef[]): VisualTraits {
  let color = '#9ca3af';
  let ears: 'floppy' | 'pointy' = 'floppy';
  let tail: 'long' | 'short' = 'long';
  let spotted = false;
  let albino = false;

  for (const gene of genes) {
    if (gene.visualRole !== 'pigment') continue;
    const alleles = critter.genotype[gene.id];
    if (alleles && resolveGenePhenotype(gene, alleles).state === 'recessive') albino = true;
  }

  for (const gene of genes) {
    const alleles = critter.genotype[gene.id];
    if (!alleles) continue;
    const resolved = resolveGenePhenotype(gene, alleles);

    switch (gene.visualRole) {
      case 'color':
        if (albino) {
          color = '#f4f4f5';
        } else if (gene.resolver === 'incomplete') {
          color =
            resolved.state === 'dominant'
              ? gene.dominantColor ?? color
              : resolved.state === 'recessive'
                ? gene.recessiveColor ?? color
                : gene.heteroColor ?? color;
        } else {
          color = resolved.state === 'recessive' ? gene.recessiveColor ?? color : gene.dominantColor ?? color;
        }
        break;
      case 'ears':
        ears = resolved.state === 'recessive' ? 'pointy' : 'floppy';
        break;
      case 'tail':
        tail = resolved.state === 'recessive' ? 'short' : 'long';
        break;
      case 'spots':
        spotted = resolved.state === 'recessive';
        break;
      default:
        break;
    }
  }

  return { color, ears, tail, spotted };
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, v));
}

/** Darkens a hex color by `percent` (negative lightens) — used for ear shading. */
function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const r = clampByte((num >> 16) + amt);
  const g = clampByte(((num >> 8) & 0xff) + amt);
  const b = clampByte((num & 0xff) + amt);
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

function CritterArt({ visual, size = 88 }: { visual: VisualTraits; size?: number }) {
  const darker = shade(visual.color, -18);
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className="shrink-0">
      {visual.tail === 'long' ? (
        <path d="M92,78 Q140,45 148,80" fill="none" stroke={visual.color} strokeWidth={11} strokeLinecap="round" />
      ) : (
        <path d="M92,80 Q108,68 116,80" fill="none" stroke={visual.color} strokeWidth={11} strokeLinecap="round" />
      )}

      {visual.ears === 'floppy' ? (
        <>
          <ellipse cx={32} cy={46} rx={13} ry={22} fill={darker} transform="rotate(-18 32 46)" />
          <ellipse cx={88} cy={46} rx={13} ry={22} fill={darker} transform="rotate(18 88 46)" />
        </>
      ) : (
        <>
          <path d="M22,50 L36,14 L46,48 Z" fill={darker} />
          <path d="M98,50 L84,14 L74,48 Z" fill={darker} />
        </>
      )}

      <ellipse cx={60} cy={72} rx={40} ry={32} fill={visual.color} stroke="#00000022" strokeWidth={2} />

      {visual.spotted && (
        <>
          <circle cx={44} cy={64} r={4.5} fill="#00000030" />
          <circle cx={72} cy={58} r={3.5} fill="#00000030" />
          <circle cx={66} cy={82} r={4} fill="#00000030" />
          <circle cx={40} cy={84} r={3} fill="#00000030" />
        </>
      )}

      <circle cx={48} cy={64} r={4.5} fill="#111827" />
      <circle cx={72} cy={64} r={4.5} fill="#111827" />
      <circle cx={49.3} cy={62.5} r={1.3} fill="#fff" />
      <circle cx={73.3} cy={62.5} r={1.3} fill="#fff" />
      <ellipse cx={60} cy={82} rx={5} ry={3} fill="#00000025" />
    </svg>
  );
}

// ------------------------------------------------------------------- genes

const GENE_HUE: GeneDef = {
  id: 'hue',
  name: 'Coat Color',
  visualRole: 'color',
  dominantAllele: 'H',
  recessiveAllele: 'h',
  dominantLabel: 'Tangerine',
  recessiveLabel: 'Blueberry',
  resolver: 'dominant',
  dominantColor: '#f97316',
  recessiveColor: '#3b82f6'
};

const GENE_EARS: GeneDef = {
  id: 'ears',
  name: 'Ear Shape',
  visualRole: 'ears',
  dominantAllele: 'E',
  recessiveAllele: 'e',
  dominantLabel: 'Floppy Ears',
  recessiveLabel: 'Perky Ears',
  resolver: 'dominant'
};

const GENE_SHADE: GeneDef = {
  id: 'shade',
  name: 'Fur Shade',
  visualRole: 'color',
  dominantAllele: 'R',
  recessiveAllele: 'r',
  dominantLabel: 'Ruby Red',
  recessiveLabel: 'Snow White',
  heterozygoteLabel: 'Bubblegum Pink',
  resolver: 'incomplete',
  dominantColor: '#dc2626',
  recessiveColor: '#f8fafc',
  heteroColor: '#f472b6'
};

const GENE_SPOTS: GeneDef = {
  id: 'spots',
  name: 'Speckle Gene',
  visualRole: 'spots',
  dominantAllele: 'S',
  recessiveAllele: 's',
  dominantLabel: 'Plain Coat',
  recessiveLabel: 'Speckled',
  resolver: 'dominant',
  sexLinked: true
};

const GENE_PIGMENT: GeneDef = {
  id: 'pigment',
  name: 'Pigment Gene',
  visualRole: 'pigment',
  dominantAllele: 'P',
  recessiveAllele: 'p',
  dominantLabel: 'Pigmented',
  recessiveLabel: 'Albino',
  resolver: 'dominant'
};

// ------------------------------------------------------------------ Punnett

function autosomalGametes(genotype: Genotype, genes: GeneDef[]): Array<Record<GeneId, Allele>> {
  let combos: Array<Record<GeneId, Allele>> = [{}];
  for (const gene of genes) {
    const p = genotype[gene.id];
    const next: Array<Record<GeneId, Allele>> = [];
    for (const combo of combos) {
      next.push({ ...combo, [gene.id]: p[0] });
      next.push({ ...combo, [gene.id]: p[1] });
    }
    combos = next;
  }
  return combos;
}

function gameteLabel(gamete: Record<GeneId, Allele>, genes: GeneDef[]): string {
  return genes.map((g) => gamete[g.id]).join('');
}

function PunnettPanel({ mother, father, genes }: { mother: Critter; father: Critter; genes: GeneDef[] }) {
  const sexLinkedGene = genes.length === 1 ? genes.find((g) => g.sexLinked) : undefined;

  if (sexLinkedGene) {
    const gene = sexLinkedGene;
    const momAlleles = mother.genotype[gene.id];
    const dadAllele = father.genotype[gene.id][0];
    const cols: Array<{ key: string; isY: boolean }> = [
      { key: dadAllele, isY: false },
      { key: 'Y', isY: true }
    ];

    return (
      <div className="overflow-x-auto">
        <table className="text-[10px] font-mono border-collapse">
          <thead>
            <tr>
              <th className="p-1.5" />
              {cols.map((c) => (
                <th key={c.key + c.isY} className="p-1.5 text-amber-300">
                  {c.isY ? 'Y' : `X${c.key}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {momAlleles.map((momA, i) => (
              <tr key={i}>
                <td className="p-1.5 text-amber-300">{`X${momA}`}</td>
                {cols.map((c) => {
                  const alleles: [Allele, Allele] = c.isY ? pair(momA, momA) : pair(momA, c.key);
                  const resolved = resolveGenePhenotype(gene, alleles);
                  const code = c.isY ? `X${alleles[0]}Y` : `X${alleles[0]}X${alleles[1]}`;
                  return (
                    <td key={c.key + c.isY} className="p-1.5 border border-white/10 text-center text-zinc-300">
                      <div>{code}</div>
                      <div className="text-[9px] text-zinc-500">
                        {c.isY ? '♂' : '♀'} {resolved.label}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const rowGametes = autosomalGametes(mother.genotype, genes);
  const colGametes = autosomalGametes(father.genotype, genes);

  return (
    <div className="overflow-x-auto">
      <table className="text-[10px] font-mono border-collapse">
        <thead>
          <tr>
            <th className="p-1.5" />
            {colGametes.map((g, j) => (
              <th key={j} className="p-1.5 text-amber-300">
                {gameteLabel(g, genes)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowGametes.map((rg, i) => (
            <tr key={i}>
              <td className="p-1.5 text-amber-300">{gameteLabel(rg, genes)}</td>
              {colGametes.map((cg, j) => {
                const genotype: Genotype = {};
                for (const gene of genes) genotype[gene.id] = pair(rg[gene.id], cg[gene.id]);
                const cellCritter = mkCritter('cell', 'F', genotype);
                const visual = deriveVisual(cellCritter, genes);
                const code = genes.map((gene) => genotype[gene.id].join('')).join(' ');
                return (
                  <td key={j} className="p-1.5 border border-white/10 text-center text-zinc-300">
                    <div className="flex items-center justify-center gap-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: visual.color }} />
                      {code}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------------ levels

interface LevelDef {
  id: string;
  title: string;
  concept: string;
  hint: string;
  order: string;
  genes: GeneDef[];
  makeBarn: (rng: RNG) => Critter[];
  checkSolved: (barn: Critter[]) => boolean;
  isTestCross?: boolean;
}

const TEST_CROSS_TARGET = 6;

const LEVELS: LevelDef[] = [
  {
    id: 'L1',
    title: 'The Obvious Order',
    concept:
      'Every critter has two copies of the coat color gene — one from mom, one from dad. Tangerine beats Blueberry, so a critter only shows Blueberry if it got the Blueberry copy from both parents at once.',
    order: 'A customer wants any Blueberry critter. Click Breed and see what comes out!',
    hint: 'Both parents are secretly Tangerine + Blueberry (written as Hh). On average, 1 in every 4 babies gets Blueberry from both sides and actually shows it. Keep breeding until one pops up.',
    genes: [GENE_HUE],
    makeBarn: () => [
      mkCritter('f0', 'F', { hue: pair('H', 'h') }, { provenHet: ['hue'] }),
      mkCritter('m0', 'M', { hue: pair('H', 'h') }, { provenHet: ['hue'] })
    ],
    checkSolved: (barn) => barn.some((c) => resolveGenePhenotype(GENE_HUE, c.genotype.hue).state === 'recessive'),
  },
  {
    id: 'L2',
    title: 'Two Traits',
    concept:
      'Coat color and ear shape are separate genes that get shuffled around completely independently. When you track two traits at once, you can get four different combos — some way more common than others.',
    order: 'Deliver a Blueberry, Perky-eared critter. It\'s the rarest combo, so it might take a few litters.',
    hint: 'With two hidden traits in both parents, the odds break down like this: about 9 out of 16 babies are Tangerine + Floppy, 3 are Tangerine + Perky, 3 are Blueberry + Floppy, and only 1 is Blueberry + Perky. That last one is what you need — just keep breeding.',
    genes: [GENE_HUE, GENE_EARS],
    makeBarn: () => [
      mkCritter('f0', 'F', { hue: pair('H', 'h'), ears: pair('E', 'e') }, { provenHet: ['hue', 'ears'] }),
      mkCritter('m0', 'M', { hue: pair('H', 'h'), ears: pair('E', 'e') }, { provenHet: ['hue', 'ears'] })
    ],
    checkSolved: (barn) =>
      barn.some(
        (c) =>
          resolveGenePhenotype(GENE_HUE, c.genotype.hue).state === 'recessive' &&
          resolveGenePhenotype(GENE_EARS, c.genotype.ears).state === 'recessive'
      ),
  },
  {
    id: 'L3',
    title: 'Out of Stock',
    concept:
      "Sometimes a hidden trait doesn't show up anywhere in the barn — it's just being carried silently by parents who look totally normal. It's only hiding, not gone.",
    order:
      'Somewhere in this barn is a hidden Blueberry gene. Figure out which pair carries it and breed a Blueberry critter — but not every pair can do it.',
    hint: "All four critters look Tangerine, but some secretly carry a Blueberry copy underneath. The only way to tell is to breed them and watch the babies. If two critters both carry the hidden copy, about 1 in 4 of their babies will come out Blueberry and give the game away. Critters that carry a hidden copy without showing it are called carriers.",
    genes: [GENE_HUE],
    makeBarn: (rng) => {
      const femaleHet = rng() < 0.5;
      const maleHet = rng() < 0.5;
      return [
        mkCritter('f0', 'F', { hue: femaleHet ? pair('H', 'h') : pair('H', 'H') }),
        mkCritter('f1', 'F', { hue: femaleHet ? pair('H', 'H') : pair('H', 'h') }),
        mkCritter('m0', 'M', { hue: maleHet ? pair('H', 'h') : pair('H', 'H') }),
        mkCritter('m1', 'M', { hue: maleHet ? pair('H', 'H') : pair('H', 'h') })
      ];
    },
    checkSolved: (barn) => barn.some((c) => resolveGenePhenotype(GENE_HUE, c.genotype.hue).state === 'recessive')
  },
  {
    id: 'L4',
    title: 'Certified True-Breeding',
    concept:
      'Two Tangerine critters can look exactly alike but have totally different genetics underneath — one might be "pure" Tangerine (HH) while the other secretly carries a hidden Blueberry copy (Hh). The only way to tell them apart is a test cross.',
    order:
      'The customer wants a critter that\'s guaranteed pure Tangerine — not just Tangerine-looking. Pick a candidate, breed it with the Recessive Tester, and prove it\'s the real deal.',
    hint: `A test cross works like this: breed your mystery critter with a known Blueberry (hh) critter. If even one baby comes out Blueberry, your candidate is secretly carrying a hidden copy — disqualified. If it's truly pure Tangerine (HH), every single baby will be Tangerine. We need at least ${TEST_CROSS_TARGET} clean Tangerine babies before we're confident — a small sample could just get lucky.`,
    genes: [GENE_HUE],
    isTestCross: true,
    makeBarn: (rng) => {
      const sexes: Sex[] = ['F', 'M', 'F', 'M'];
      let hasHet = false;
      let hasHom = false;
      const genos: Genotype[] = sexes.map(() => {
        const isHet = rng() < 0.5;
        if (isHet) hasHet = true;
        else hasHom = true;
        return { hue: isHet ? pair('H', 'h') : pair('H', 'H') };
      });
      if (!hasHet) genos[0] = { hue: pair('H', 'h') };
      if (!hasHom) genos[1] = { hue: pair('H', 'H') };

      const candidates = sexes.map((sex, i) => mkCritter(`cand${i}`, sex, genos[i]));
      const testerF = mkCritter('tester-f', 'F', { hue: pair('h', 'h') }, { tester: true, fixed: true });
      const testerM = mkCritter('tester-m', 'M', { hue: pair('h', 'h') }, { tester: true, fixed: true });
      return [...candidates, testerF, testerM];
    },
    checkSolved: (barn) => barn.some((c) => c.provenHomozygous.includes('hue'))
  },
  {
    id: 'L5',
    title: 'Pink Ones Only',
    concept:
      "With coat color, one shade usually beats the other — but not always. For fur shade, Red and White don't fight for dominance, they just blend. A critter with one Red copy and one White copy comes out Bubblegum Pink.",
    order: 'The customer wants a Bubblegum Pink critter. Start from the Red and White parents in the barn.',
    hint: 'The only way to get Pink is to have exactly one Red copy and one White copy. Breed the Red and White parents to get Pink babies. If you then breed two Pink critters together, you get a mix of Red, Pink, and White — never all Pink, because Pink can\'t "breed true".',
    genes: [GENE_SHADE],
    makeBarn: () => [
      mkCritter('f0', 'F', { shade: pair('R', 'R') }),
      mkCritter('m0', 'M', { shade: pair('r', 'r') })
    ],
    checkSolved: (barn) => barn.some((c) => resolveGenePhenotype(GENE_SHADE, c.genotype.shade).state === 'hetero'),
  },
  {
    id: 'L6',
    title: "The Prince's Cats",
    concept:
      'The Speckle gene is stuck on the same chromosome that determines sex. This matters because sons only carry one copy of it (from mom), while daughters carry two. That means sons show recessive traits way more often than daughters do.',
    order: 'The customer wants a Speckled DAUGHTER specifically — a Speckled son does not count.',
    hint: "Dad is Speckled. Mom looks Plain, but she might secretly carry a hidden Speckled copy. A son only needs to inherit that one hidden copy from Mom to show Speckled — easy. A daughter needs to inherit Dad's Speckled copy AND Mom's hidden copy at the same time — much rarer, and only possible if Mom is a carrier in the first place.",
    genes: [GENE_SPOTS],
    makeBarn: () => [
      mkCritter('f0', 'F', { spots: pair('S', 's') }),
      mkCritter('m0', 'M', { spots: pair('s', 's') })
    ],
    checkSolved: (barn) =>
      barn.some((c) => c.sex === 'F' && resolveGenePhenotype(GENE_SPOTS, c.genotype.spots).state === 'recessive')
  },
  {
    id: 'L7',
    title: 'The Masked Gene',
    concept:
      'Sometimes one gene completely overrides another. The Pigment gene is like a master switch — if a critter has no working Pigment gene at all (pp), it turns out Albino no matter what color it would have been otherwise.',
    order:
      "Deliver an Albino critter. Just so you know — an Albino critter's hidden coat color gene could be anything underneath. You genuinely can't tell by looking at it.",
    hint: "Both parents look Tangerine and are fully pigmented, but they each secretly carry one hidden copy of the Pigment gene (Pp) and one hidden Blueberry copy (Hh). About 1 in 4 of their babies will end up with no working Pigment gene at all (pp) and come out Albino, regardless of whatever color was hiding underneath. When one gene completely shuts down another like this, it's called epistasis.",
    genes: [GENE_PIGMENT, GENE_HUE],
    makeBarn: () => [
      mkCritter(
        'f0',
        'F',
        { pigment: pair('P', 'p'), hue: pair('H', 'h') },
        { provenHet: ['pigment', 'hue'] }
      ),
      mkCritter(
        'm0',
        'M',
        { pigment: pair('P', 'p'), hue: pair('H', 'h') },
        { provenHet: ['pigment', 'hue'] }
      )
    ],
    checkSolved: (barn) => barn.some((c) => resolveGenePhenotype(GENE_PIGMENT, c.genotype.pigment).state === 'recessive'),
  }
];

/** Read by badges.ts so the "ran the whole ranch" achievement tracks reality. */
export const CRITTER_RANCH_LEVEL_COUNT = LEVELS.length;

const LEVEL_SEEDS = [101, 202, 303, 404, 505, 606, 707];
const BARN_CAP = 12;

// -------------------------------------------------------------- sub-parts

function ParentSlot({ critter, label, genes }: { critter: Critter | null; label: string; genes: GeneDef[] }) {
  if (!critter) {
    return (
      <div className="w-20 h-20 rounded-xl border border-dashed border-white/15 flex items-center justify-center text-[10px] text-zinc-600 font-mono text-center px-1">
        {label}
      </div>
    );
  }
  const visual = deriveVisual(critter, genes);
  return (
    <div className="w-20 h-20 rounded-xl border border-amber-400/40 bg-amber-500/5 flex flex-col items-center justify-center">
      <CritterArt visual={visual} size={48} />
      <span className="text-[9px] font-mono text-zinc-400">{critter.sex === 'F' ? '♀ mom' : '♂ dad'}</span>
    </div>
  );
}

interface CritterCardProps {
  critter: Critter;
  genes: GeneDef[];
  selected: boolean;
  onSelect: () => void;
  onRelease: () => void;
  highlight: boolean;
}

const CritterCard: React.FC<CritterCardProps> = ({ critter, genes, selected, onSelect, onRelease, highlight }) => {
  const visual = deriveVisual(critter, genes);
  const known = isGenotypeKnown(critter, genes);

  return (
    <motion.div
      layout
      initial={highlight ? { opacity: 0, scale: 0.7 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      onClick={onSelect}
      className={`relative rounded-xl border p-2 cursor-pointer transition select-none ${selected ? 'border-amber-400 bg-amber-500/10' : 'border-white/10 bg-white/5 hover:border-white/25'
        }`}
    >
      {!critter.fixed && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRelease();
          }}
          className="absolute top-1 right-1 text-zinc-500 hover:text-red-400 cursor-pointer"
          aria-label="Release critter"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      <div className="flex items-center justify-center">
        <CritterArt visual={visual} size={72} />
      </div>
      <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono mt-1">
        <span className={critter.sex === 'F' ? 'text-pink-400' : 'text-sky-400'}>{critter.sex === 'F' ? '♀' : '♂'}</span>
        {critter.tester && <span className="text-amber-400">TESTER</span>}
      </div>
      <div className="text-[9px] text-zinc-400 text-center leading-tight mt-0.5">
        {genes.map((g) => resolveGenePhenotype(g, critter.genotype[g.id]).label).join(' · ')}
      </div>
      <div className="text-[9px] font-mono text-center mt-0.5 text-zinc-500">
        {genes.map((g) => genotypeDisplay(g, critter)).join(' ')}
        {!known && <span className="text-zinc-600"> (unproven)</span>}
      </div>
      {critter.provenHomozygous.length > 0 && (
        <div className="text-[9px] text-emerald-400 text-center mt-0.5">✓ certified</div>
      )}
      {typeof critter.testTotal === 'number' && (
        <div className="text-[9px] text-zinc-500 text-center">
          test: {(critter.testTotal ?? 0) - (critter.testRecessive ?? 0)}/{critter.testTotal} clean
        </div>
      )}
    </motion.div>
  );
};

function TestCrossPanel({
  candidate,
  gene,
  lastLitter
}: {
  candidate: Critter | null;
  gene: GeneDef;
  lastLitter: Critter[];
}) {
  if (!candidate) {
    return (
      <p className="text-[11px] text-zinc-500 font-mono">
        Click one candidate and the opposite-sex Recessive Tester to select them, then hit "Run test cross".
      </p>
    );
  }

  const total = candidate.testTotal ?? 0;
  const recessive = candidate.testRecessive ?? 0;
  const certified = candidate.provenHomozygous.includes(gene.id);
  const failed = recessive > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
        <FlaskConical className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          Sample: {total - recessive}/{total} clean (need {TEST_CROSS_TARGET} clean, zero {gene.recessiveLabel})
        </span>
      </div>
      {lastLitter.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {lastLitter.map((o) => {
            const resolved = resolveGenePhenotype(gene, o.genotype[gene.id]);
            return (
              <span
                key={o.id}
                title={resolved.label}
                className={`w-4 h-4 rounded-full ${resolved.state === 'recessive' ? 'bg-blue-500' : 'bg-orange-500'}`}
              />
            );
          })}
        </div>
      )}
      {certified && (
        <p className="text-xs text-emerald-400 font-mono">
          ✓ Certified true-breeding ({gene.dominantAllele}
          {gene.dominantAllele})!
        </p>
      )}
      {failed && !certified && (
        <p className="text-xs text-red-400 font-mono">
          Disqualified — a {gene.recessiveLabel} baby appeared, which means this critter was secretly carrying a hidden copy all along. Pick a different candidate and try again.
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- main

interface CritterRanchProps {
  solvedLevels: number[];
  onSolve: (levelIndex: number) => void;
}

export default function CritterRanch({ solvedLevels, onSolve }: CritterRanchProps) {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = LEVELS[levelIndex];
  const genes = level.genes;

  const rngRef = useRef<RNG>(mulberry32(LEVEL_SEEDS[0]));
  const idCounter = useRef(0);

  const [barn, setBarn] = useState<Critter[]>(() => LEVELS[0].makeBarn(rngRef.current));
  const [parentSlots, setParentSlots] = useState<[string | null, string | null]>([null, null]);
  const [showHint, setShowHint] = useState(false);
  const [tally, setTally] = useState<Record<string, number>>({});
  const [lastLitterIds, setLastLitterIds] = useState<string[]>([]);
  const [lastTestLitter, setLastTestLitter] = useState<Critter[]>([]);

  const loadLevel = useCallback((index: number, seed: number) => {
    rngRef.current = mulberry32(seed);
    idCounter.current = 0;
    setBarn(LEVELS[index].makeBarn(rngRef.current));
    setParentSlots([null, null]);
    setShowHint(false);
    setTally({});
    setLastLitterIds([]);
    setLastTestLitter([]);
  }, []);

  const selectLevel = useCallback(
    (index: number) => {
      setLevelIndex(index);
      loadLevel(index, LEVEL_SEEDS[index]);
    },
    [loadLevel]
  );

  const startOver = useCallback(() => {
    loadLevel(levelIndex, Math.floor(Date.now() % 1e9) ^ Math.floor(Math.random() * 1e9));
  }, [levelIndex, loadLevel]);

  const selectParent = (id: string) => {
    setParentSlots((prev) => {
      if (prev[0] === id) return [null, prev[1]];
      if (prev[1] === id) return [prev[0], null];
      if (!prev[0]) return [id, prev[1]];
      if (!prev[1]) return [prev[0], id];
      return [id, null];
    });
  };

  const releaseCritter = (id: string) => {
    setBarn((prev) => prev.filter((c) => c.id !== id || c.fixed));
    setParentSlots((prev) => [prev[0] === id ? null : prev[0], prev[1] === id ? null : prev[1]]);
  };

  const p1 = barn.find((c) => c.id === parentSlots[0]) ?? null;
  const p2 = barn.find((c) => c.id === parentSlots[1]) ?? null;
  const mother = p1 && p2 ? (p1.sex === 'F' ? p1 : p2.sex === 'F' ? p2 : null) : null;
  const father = p1 && p2 ? (p1.sex === 'M' ? p1 : p2.sex === 'M' ? p2 : null) : null;

  const testCandidate: Critter | null =
    level.isTestCross && mother && father
      ? mother.tester && !father.tester
        ? father
        : !mother.tester && father.tester
          ? mother
          : null
      : null;
  const isTestCrossPair = !!testCandidate;
  const barnFull = !isTestCrossPair && barn.length >= BARN_CAP;
  const canBreed = !!mother && !!father && !barnFull;

  const breedHint = !p1 || !p2 ? null : p1.sex === p2.sex ? 'You need one female and one male to breed.' : barnFull ? 'The barn is full — click the ✕ on a critter to release it and make room.' : null;

  const punnettReady = !level.isTestCross && !!mother && !!father && isGenotypeKnown(mother, genes) && isGenotypeKnown(father, genes);

  const solved = level.checkSolved(barn);

  useEffect(() => {
    if (solved) onSolve(levelIndex);
  }, [solved, levelIndex, onSolve]);

  const handleBreed = () => {
    if (!mother || !father || barnFull) return;
    const rng = rngRef.current;
    const size = isTestCrossPair ? 4 : 4 + Math.floor(rng() * 3);
    const litter: Critter[] = [];
    for (let i = 0; i < size; i++) {
      idCounter.current += 1;
      litter.push(breedOffspring(mother, father, genes, rng, `g${levelIndex}-${idCounter.current}`));
    }

    let nextMother = mother;
    let nextFather = father;
    for (const gene of genes) {
      if (gene.resolver !== 'dominant') continue;
      const anyRecessive = litter.some((o) => resolveGenePhenotype(gene, o.genotype[gene.id]).state === 'recessive');
      if (!anyRecessive) continue;
      if (
        !nextMother.tester &&
        resolveGenePhenotype(gene, nextMother.genotype[gene.id]).state !== 'recessive' &&
        !nextMother.provenHet.includes(gene.id)
      ) {
        nextMother = { ...nextMother, provenHet: [...nextMother.provenHet, gene.id] };
      }
      if (
        !nextFather.tester &&
        resolveGenePhenotype(gene, nextFather.genotype[gene.id]).state !== 'recessive' &&
        !nextFather.provenHet.includes(gene.id)
      ) {
        nextFather = { ...nextFather, provenHet: [...nextFather.provenHet, gene.id] };
      }
    }

    if (isTestCrossPair && testCandidate) {
      const gene = genes[0];
      const isCandidateMother = testCandidate.id === nextMother.id;
      let candidate = isCandidateMother ? nextMother : nextFather;
      const recessiveCount = litter.filter((o) => resolveGenePhenotype(gene, o.genotype[gene.id]).state === 'recessive').length;
      const newTotal = (candidate.testTotal ?? 0) + litter.length;
      const newRecessive = (candidate.testRecessive ?? 0) + recessiveCount;
      candidate = { ...candidate, testTotal: newTotal, testRecessive: newRecessive };
      if (newRecessive > 0 && !candidate.provenHet.includes(gene.id)) {
        candidate = { ...candidate, provenHet: [...candidate.provenHet, gene.id] };
      } else if (newRecessive === 0 && newTotal >= TEST_CROSS_TARGET && !candidate.provenHomozygous.includes(gene.id)) {
        candidate = { ...candidate, provenHomozygous: [...candidate.provenHomozygous, gene.id] };
      }
      const finalCandidate = candidate;
      setBarn((prev) => prev.map((c) => (c.id === finalCandidate.id ? finalCandidate : c)));
      setLastTestLitter(litter);
    } else {
      setBarn((prev) => {
        const withParents = prev.map((c) => (c.id === nextMother.id ? nextMother : c.id === nextFather.id ? nextFather : c));
        return [...withParents, ...litter];
      });
      setLastLitterIds(litter.map((o) => o.id));
      setTally((prev) => {
        const next = { ...prev };
        for (const o of litter) {
          const key = genes.map((g) => resolveGenePhenotype(g, o.genotype[g.id]).label).join(' + ');
          next[key] = (next[key] ?? 0) + 1;
        }
        return next;
      });
    }
  };

  const isLast = levelIndex === LEVELS.length - 1;

  /** A casual read on whatever the last litter actually did, not the level's
   *  static concept text — reacts to the real babies just born. */
  const litterNote = (() => {
    if (level.isTestCross || lastLitterIds.length === 0 || genes.length === 0) return null;
    const lastLitter = barn.filter((c) => lastLitterIds.includes(c.id));
    if (lastLitter.length === 0) return null;
    const gene = genes[0];
    const recessiveCount = lastLitter.filter(
      (c) => resolveGenePhenotype(gene, c.genotype[gene.id]).state === 'recessive'
    ).length;
    if (recessiveCount === 0) {
      return `No ${gene.recessiveLabel} babies this time — that doesn't mean nobody's carrying the hidden copy. With a small litter, the odds just didn't pan out. Try again!`;
    }
    return `${recessiveCount} out of ${lastLitter.length} babies came out ${gene.recessiveLabel}! That happened because both parents passed their hidden copy to the same lucky (or unlucky) baby.`;
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {LEVELS.map((lvl, i) => (
          <button
            key={lvl.id}
            onClick={() => selectLevel(i)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono border transition cursor-pointer flex items-center gap-1.5 ${i === levelIndex ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
          >
            {solvedLevels.includes(i) && <Trophy className="w-3 h-3 text-amber-400" />}
            L{i + 1}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-display font-bold text-lg text-white">
          {level.title}{' '}
          <span className="text-zinc-500 font-sans font-normal text-sm">
            (Level {levelIndex + 1} of {LEVELS.length})
          </span>
        </h4>
        <button
          onClick={() => setShowHint((s) => !s)}
          className="text-[11px] font-mono text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-1"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          {showHint ? 'Hide hint' : 'Hint'}
        </button>
      </div>

      <p className="text-xs text-zinc-400 font-sans leading-relaxed">{level.concept}</p>

      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-zinc-200 font-sans flex items-start gap-2">
        <Dna className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <span>
          <span className="font-bold text-emerald-300">Order: </span>
          {level.order}
        </span>
      </div>

      {showHint && (
        <p className="text-xs text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 font-sans leading-relaxed">
          {level.hint}
        </p>
      )}

      {solved && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-emerald-300 font-display font-bold text-sm">
            <Trophy className="w-5 h-5 text-amber-400" /> Order fulfilled!
          </div>
          {!isLast && (
            <button
              onClick={() => selectLevel(levelIndex + 1)}
              className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-stone-950 cursor-pointer transition flex items-center gap-1"
            >
              Next order <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-[#0d0d12] p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <ParentSlot critter={mother} label="Mother" genes={genes} />
          <span className="text-zinc-600 font-mono text-xs">×</span>
          <ParentSlot critter={father} label="Father" genes={genes} />
          <button
            onClick={handleBreed}
            disabled={!canBreed}
            className="ml-auto px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/10 disabled:text-zinc-500 disabled:cursor-not-allowed text-xs font-bold text-stone-950 cursor-pointer transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> {isTestCrossPair ? 'Run test cross' : 'Breed'}
          </button>
        </div>

        {breedHint && <p className="text-[11px] text-amber-300/80 font-mono">{breedHint}</p>}

        {level.isTestCross ? (
          <TestCrossPanel candidate={testCandidate} gene={genes[0]} lastLitter={lastTestLitter} />
        ) : punnettReady && mother && father ? (
          <div>
            <div className="text-[10px] font-mono text-zinc-500 mb-1.5 uppercase tracking-wide">Punnett square</div>
            <PunnettPanel mother={mother} father={father} genes={genes} />
          </div>
        ) : mother && father ? (
          <p className="text-[11px] text-zinc-500 font-mono">
            We don't know both parents' full genetics yet. Breed them — if a recessive baby shows up, it'll reveal what the parents were hiding.
          </p>
        ) : null}

        {litterNote && <p className="text-xs text-zinc-400 font-sans leading-relaxed">{litterNote}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide">
            Barn ({barn.length}/{BARN_CAP})
          </div>
          <button onClick={startOver} className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-white cursor-pointer transition">
            <RotateCcw className="w-3.5 h-3.5" /> Start over
          </button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {barn.map((c) => (
            <CritterCard
              key={c.id}
              critter={c}
              genes={genes}
              selected={parentSlots.includes(c.id)}
              onSelect={() => selectParent(c.id)}
              onRelease={() => releaseCritter(c.id)}
              highlight={lastLitterIds.includes(c.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
