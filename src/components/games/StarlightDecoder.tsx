import { useEffect, useMemo, useRef, useState } from 'react';
import { Trophy, Lightbulb, ChevronRight, RotateCcw, Check } from 'lucide-react';

/**
 * Starlight Decoder
 * -----------------
 * A telescope feed gives you one thing: a band of light with dark lines cut
 * out of it. From that alone you work out what a star is made of, how hot it
 * is, how fast it is moving toward or away from us, and whether it has
 * planets worth a second look.
 *
 * The spine of the puzzle is the Doppler shift: `λ_obs = λ_rest · (1 + v/c)`.
 * That is a *multiplicative* shift, so every one of an element's lines moves
 * by the same fraction at once. A single line matching is a coincidence; a
 * whole pattern matching is proof — which is exactly why the win condition
 * below requires every line of a candidate element to land, not just one.
 */

// --------------------------------------------------------------------- data

const C_KM_S = 299792.458;
/** Generous on purpose — this is a drag-a-card game, not a data-entry test. */
const MATCH_TOLERANCE_NM = 2.5;

interface ElementSpec {
  name: string;
  color: string;
  /** Real rest-frame wavelengths, nm. A curious kid who looks these up will
   *  find they match: hydrogen's Balmer series, sodium's D lines, helium's
   *  visible set, calcium's H & K lines. */
  lines: number[];
}

const ELEMENT_LINES: Record<string, ElementSpec> = {
  H: { name: 'Hydrogen', color: '#60a5fa', lines: [410.2, 434.0, 486.1, 656.3] },
  He: { name: 'Helium', color: '#facc15', lines: [447.1, 501.6, 587.6, 667.8] },
  Na: { name: 'Sodium', color: '#fb923c', lines: [589.0, 589.6] },
  Ca: { name: 'Calcium', color: '#34d399', lines: [393.4, 396.8] }
};

const SPECTRAL_CLASSES = ['O', 'B', 'A', 'F', 'G', 'K', 'M'] as const;
type SpectralClass = (typeof SPECTRAL_CLASSES)[number];

interface SpectralLevel {
  kind: 'spectral';
  title: string;
  brief: string;
  trueElements: string[];
  velocityKmS: number;
  candidateElements: string[];
  hasDopplerSlider: boolean;
  hint: string;
}

interface TemperatureLevel {
  kind: 'temperature';
  title: string;
  brief: string;
  trueTempK: number;
  hint: string;
}

interface TransitLevel {
  kind: 'transit';
  title: string;
  brief: string;
  starRadiusSolar: number;
  planetRadiusSolar: number;
  periodDays: number;
  depthTolerancePct: number;
  periodToleranceDays: number;
  hint: string;
}

interface WobbleLevel {
  kind: 'wobble';
  title: string;
  brief: string;
  trueAmplitudeKmS: number;
  truePeriodDays: number;
  amplitudeTolerance: number;
  periodTolerance: number;
  hint: string;
}

interface SynthesisLevel {
  kind: 'synthesis';
  title: string;
  brief: string;
  trueTempK: number;
  orbitalDistanceAU: number;
  hint: string;
}

type Level = SpectralLevel | TemperatureLevel | TransitLevel | WobbleLevel | SynthesisLevel;

const LEVELS: Level[] = [
  {
    kind: 'spectral',
    title: "What's in the Sun?",
    brief:
      "Our own star's light, dead calm — nothing is moving toward or away from us. Drag the elements you think are present onto the spectrum and see if their lines land on the dark bands.",
    trueElements: ['H', 'Na', 'Ca'],
    velocityKmS: 0,
    candidateElements: ['H', 'Na', 'Ca', 'He'],
    hasDopplerSlider: false,
    hint: 'Three of the four cards belong. A card with no lines on a dark band is not part of the mix — even if it seems likely.'
  },
  {
    kind: 'temperature',
    title: 'How Hot?',
    brief:
      "A star's colour is a thermometer. Bluer means hotter, redder means cooler — that's Wien's law. Slide until your swatch matches the star's, then pick its letter class.",
    trueTempK: 5778,
    hint: 'Wien\'s law: λ_peak = 2.898×10⁶ nm·K ÷ T. A yellow-white star like this one sits in the middle of the classes — not the bluest, not the reddest.'
  },
  {
    kind: 'spectral',
    title: 'Red Shift',
    brief:
      "A distant galaxy's light — but nothing lines up at zero shift. Every line is redder than it should be. Slide the velocity control until the whole pattern, not just one line, snaps into place.",
    trueElements: ['Na', 'Ca'],
    velocityKmS: 6000,
    candidateElements: ['Na', 'Ca', 'H'],
    hasDopplerSlider: true,
    hint: "Positive velocity means receding — the whole spectrum stretches toward red. Try around 2% of the speed of light."
  },
  {
    kind: 'spectral',
    title: 'Blue Arrival',
    brief:
      'This star is heading toward us. One reference card will tempt you — its line sits suspiciously close to two of the dark bands. Check ALL of its lines before you trust it.',
    trueElements: ['H', 'Na'],
    velocityKmS: -1200,
    candidateElements: ['H', 'Na', 'He', 'Ca'],
    hasDopplerSlider: true,
    hint: "Helium's yellow-ish line (587.6 nm) sits only about 1.5 nm from sodium's D lines — real astronomers hit this exact trap. Helium's other three lines match nothing here, so the full pattern fails."
  },
  {
    kind: 'transit',
    title: 'Transit',
    brief:
      "Starlight dims a little every time a planet crosses in front of its star. Measure how deep the dip is to size the planet; measure the spacing between dips to time its year.",
    starRadiusSolar: 1.0,
    planetRadiusSolar: 0.1,
    periodDays: 3.5,
    depthTolerancePct: 0.18,
    periodToleranceDays: 0.25,
    hint: 'Depth, as a percent of starlight lost, equals (planet radius ÷ star radius) squared. A 10%-of-the-star planet blocks about 1% of the light.'
  },
  {
    kind: 'wobble',
    title: 'The Wobble',
    brief:
      "No transit this time — the planet never crosses our view. But the star's own light drifts blue, then red, then blue again, like clockwork. Something unseen is tugging on it.",
    trueAmplitudeKmS: 42,
    truePeriodDays: 8,
    amplitudeTolerance: 5,
    periodTolerance: 0.6,
    hint: 'Fit a smooth wave through the noisy points. The wave\'s height is the wobble speed; the distance between its peaks is the orbital period.'
  },
  {
    kind: 'synthesis',
    title: 'Is It Habitable?',
    brief:
      'One planet, three numbers: how hot its star burns, how far out the planet orbits, and what that means for liquid water. Classify the star, then decide.',
    trueTempK: 5500,
    orbitalDistanceAU: 0.9,
    hint: 'A cooler star\'s habitable zone sits closer in. Compare the orbit distance to where liquid water could survive — not too hot, not too cold.'
  }
];

export const STARLIGHT_LEVEL_COUNT = LEVELS.length;

// ---------------------------------------------------------------- pure math

/** The one multiplicative transform every line pattern goes through together. */
function dopplerShift(restNm: number, velocityKmS: number): number {
  return restNm * (1 + velocityKmS / C_KM_S);
}

/** The actual observed dark-line wavelengths for a spectral level — fixed,
 *  regardless of what the player guesses. */
function observedLines(level: SpectralLevel): number[] {
  return level.trueElements.flatMap((key) =>
    ELEMENT_LINES[key].lines.map((nm) => dopplerShift(nm, level.velocityKmS))
  );
}

/** How many of a candidate element's lines, shifted by the player's guessed
 *  velocity, land within tolerance of an actually-observed line. */
function matchedLineCount(elementKey: string, velocityGuess: number, observed: number[]): number {
  return ELEMENT_LINES[elementKey].lines.filter((nm) => {
    const shifted = dopplerShift(nm, velocityGuess);
    return observed.some((obs) => Math.abs(obs - shifted) <= MATCH_TOLERANCE_NM);
  }).length;
}

function isFullMatch(elementKey: string, velocityGuess: number, observed: number[]): boolean {
  return matchedLineCount(elementKey, velocityGuess, observed) === ELEMENT_LINES[elementKey].lines.length;
}

/** Solved only when the guessed composition is *exactly* the true set (no
 *  decoys sneaked in) and every one of those elements' lines fully matches at
 *  the guessed velocity — "fit everything, not something." */
function isSpectralSolved(level: SpectralLevel, composition: Set<string>, velocityGuess: number): boolean {
  if (composition.size !== level.trueElements.length) return false;
  if (!level.trueElements.every((el) => composition.has(el))) return false;
  const observed = observedLines(level);
  return level.trueElements.every((el) => isFullMatch(el, velocityGuess, observed));
}

function classifyTemperature(tempK: number): SpectralClass {
  if (tempK >= 30000) return 'O';
  if (tempK >= 10000) return 'B';
  if (tempK >= 7500) return 'A';
  if (tempK >= 6000) return 'F';
  if (tempK >= 5200) return 'G';
  if (tempK >= 3700) return 'K';
  return 'M';
}

/** Wien's law, λ_peak = 2.898e-3 / T (metres), rewritten in nanometres. */
function wienPeakNm(tempK: number): number {
  return 2.898e6 / tempK;
}

function isTemperatureSolved(level: TemperatureLevel, classGuess: SpectralClass | null): boolean {
  return classGuess === classifyTemperature(level.trueTempK);
}

function transitDepthPct(level: TransitLevel): number {
  return (level.planetRadiusSolar / level.starRadiusSolar) ** 2 * 100;
}

function isTransitSolved(level: TransitLevel, depthGuessPct: number, periodGuessDays: number): boolean {
  return (
    Math.abs(depthGuessPct - transitDepthPct(level)) <= level.depthTolerancePct &&
    Math.abs(periodGuessDays - level.periodDays) <= level.periodToleranceDays
  );
}

function isWobbleSolved(level: WobbleLevel, ampGuess: number, periodGuess: number): boolean {
  return (
    Math.abs(ampGuess - level.trueAmplitudeKmS) <= level.amplitudeTolerance &&
    Math.abs(periodGuess - level.truePeriodDays) <= level.periodTolerance
  );
}

/** Simplified, kid-friendly habitable-zone estimate: luminosity scales with
 *  T⁴ (Stefan-Boltzmann, assuming near-solar radius), and the habitable band
 *  scales with the square root of luminosity, calibrated to our own solar
 *  system's roughly 0.95–1.37 AU conservative zone. */
function habitableZoneAU(tempK: number): { inner: number; outer: number } {
  const luminosityRatio = (tempK / 5778) ** 4;
  const sq = Math.sqrt(luminosityRatio);
  return { inner: 0.95 * sq, outer: 1.37 * sq };
}

function isHabitableDistance(tempK: number, distanceAU: number): boolean {
  const { inner, outer } = habitableZoneAU(tempK);
  return distanceAU >= inner && distanceAU <= outer;
}

function isSynthesisSolved(
  level: SynthesisLevel,
  classGuess: SpectralClass | null,
  habitableGuess: boolean | null
): boolean {
  return (
    classGuess === classifyTemperature(level.trueTempK) &&
    habitableGuess === isHabitableDistance(level.trueTempK, level.orbitalDistanceAU)
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Deterministic pseudo-random noise so light curves and wobble plots don't
 *  reshuffle on every render, but still look like real, imperfect data. */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/** Bruton's standard wavelength → RGB approximation for the visible range. */
function wavelengthToRGB(nm: number): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;

  if (nm >= 380 && nm < 440) {
    r = -(nm - 440) / (440 - 380);
    b = 1;
  } else if (nm >= 440 && nm < 490) {
    g = (nm - 440) / (490 - 440);
    b = 1;
  } else if (nm >= 490 && nm < 510) {
    g = 1;
    b = -(nm - 510) / (510 - 490);
  } else if (nm >= 510 && nm < 580) {
    r = (nm - 510) / (580 - 510);
    g = 1;
  } else if (nm >= 580 && nm < 645) {
    r = 1;
    g = -(nm - 645) / (645 - 580);
  } else if (nm >= 645 && nm <= 780) {
    r = 1;
  }

  let factor = 0;
  if (nm >= 380 && nm < 420) factor = 0.3 + (0.7 * (nm - 380)) / (420 - 380);
  else if (nm >= 420 && nm < 701) factor = 1;
  else if (nm >= 701 && nm <= 780) factor = 0.3 + (0.7 * (780 - nm)) / (780 - 700);

  const gamma = 0.8;
  const toByte = (c: number) => (c === 0 ? 0 : Math.round(255 * (c * factor) ** gamma));
  return [toByte(r), toByte(g), toByte(b)];
}

function rgbCss([r, g, b]: [number, number, number]): string {
  return `rgb(${r},${g},${b})`;
}

// ------------------------------------------------------------ chart geometry

const SPEC_W = 700;
const SPEC_MARK_H = 26;
const SPEC_BAND_H = 90;
const CHART_W = 700;
const CHART_H = 200;

function nmToX(nm: number): number {
  return ((nm - 380) / 320) * SPEC_W;
}

interface TransitPoint {
  t: number;
  flux: number;
}

function generateTransitData(level: TransitLevel): TransitPoint[] {
  const depth = (level.planetRadiusSolar / level.starRadiusSolar) ** 2;
  const duration = level.periodDays * 3;
  const widthFrac = 0.06;
  const n = 260;
  const points: TransitPoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * duration;
    const phase = (t / level.periodDays) % 1;
    const d = Math.min(phase, 1 - phase);
    const dip = d < widthFrac / 2 ? depth * (1 - (d / (widthFrac / 2)) ** 2) : 0;
    points.push({ t, flux: 1 - dip + noise(i * 3.7) * 0.0018 });
  }
  return points;
}

interface WobblePoint {
  t: number;
  v: number;
}

function generateWobbleData(level: WobbleLevel): WobblePoint[] {
  const duration = level.truePeriodDays * 2.5;
  const n = 55;
  const points: WobblePoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * duration;
    const v =
      level.trueAmplitudeKmS * Math.sin((2 * Math.PI * t) / level.truePeriodDays) +
      noise(i * 5.3) * level.trueAmplitudeKmS * 0.15;
    points.push({ t, v });
  }
  return points;
}

// -------------------------------------------------------------- drawing fns

function drawSpectrum(
  canvas: HTMLCanvasElement,
  level: SpectralLevel,
  composition: Set<string>,
  velocityGuess: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#0d0d12';
  ctx.fillRect(0, 0, SPEC_W, SPEC_MARK_H);

  for (let x = 0; x < SPEC_W; x++) {
    const nm = 380 + (x / SPEC_W) * 320;
    ctx.fillStyle = rgbCss(wavelengthToRGB(nm));
    ctx.fillRect(x, SPEC_MARK_H, 1, SPEC_BAND_H);
  }

  const observed = observedLines(level);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  for (const nm of observed) {
    ctx.fillRect(nmToX(nm) - 2, SPEC_MARK_H, 4, SPEC_BAND_H);
  }

  for (const key of composition) {
    const spec = ELEMENT_LINES[key];
    for (const nm of spec.lines) {
      const shifted = dopplerShift(nm, velocityGuess);
      const x = nmToX(shifted);
      const isMatch = observed.some((obs) => Math.abs(obs - shifted) <= MATCH_TOLERANCE_NM);
      ctx.strokeStyle = isMatch ? '#34d399' : spec.color;
      ctx.lineWidth = isMatch ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(x, 1);
      ctx.lineTo(x, SPEC_MARK_H - 2);
      ctx.stroke();
    }
  }
}

function drawTransitChart(
  canvas: HTMLCanvasElement,
  level: TransitLevel,
  data: TransitPoint[],
  depthGuessPct: number,
  periodGuessDays: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#0d0d12';
  ctx.fillRect(0, 0, CHART_W, CHART_H);

  const duration = level.periodDays * 3;
  const trueDepthFrac = (level.planetRadiusSolar / level.starRadiusSolar) ** 2;
  const maxDip = Math.max(trueDepthFrac, depthGuessPct / 100) * 1.6 + 0.004;
  const yMin = 1 - maxDip;
  const yMax = 1.008;
  const xOf = (t: number) => (t / duration) * CHART_W;
  const yOf = (flux: number) => CHART_H - ((flux - yMin) / (yMax - yMin)) * CHART_H;

  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.moveTo(0, yOf(1));
  ctx.lineTo(CHART_W, yOf(1));
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  for (const p of data) {
    ctx.beginPath();
    ctx.arc(xOf(p.t), yOf(p.flux), 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const widthFrac = 0.06;
  const depthFrac = depthGuessPct / 100;
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  let first = true;
  for (let x = 0; x <= CHART_W; x += 2) {
    const t = (x / CHART_W) * duration;
    const phase = periodGuessDays > 0 ? (t / periodGuessDays) % 1 : 0;
    const d = Math.min(phase, 1 - phase);
    const dip = d < widthFrac / 2 ? depthFrac * (1 - (d / (widthFrac / 2)) ** 2) : 0;
    const y = yOf(1 - dip);
    if (first) {
      ctx.moveTo(x, y);
      first = false;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawWobbleChart(
  canvas: HTMLCanvasElement,
  level: WobbleLevel,
  data: WobblePoint[],
  ampGuess: number,
  periodGuess: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#0d0d12';
  ctx.fillRect(0, 0, CHART_W, CHART_H);

  const duration = level.truePeriodDays * 2.5;
  const maxV = Math.max(level.trueAmplitudeKmS, ampGuess) * 1.4 + 5;
  const xOf = (t: number) => (t / duration) * CHART_W;
  const yOf = (v: number) => CHART_H / 2 - (v / maxV) * (CHART_H / 2 - 10);

  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.moveTo(0, yOf(0));
  ctx.lineTo(CHART_W, yOf(0));
  ctx.stroke();

  ctx.fillStyle = '#c084fc';
  for (const p of data) {
    ctx.beginPath();
    ctx.arc(xOf(p.t), yOf(p.v), 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  let first = true;
  for (let x = 0; x <= CHART_W; x += 2) {
    const t = (x / CHART_W) * duration;
    const v = periodGuess > 0 ? ampGuess * Math.sin((2 * Math.PI * t) / periodGuess) : 0;
    const y = yOf(v);
    if (first) {
      ctx.moveTo(x, y);
      first = false;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

// -------------------------------------------------------------- component

interface StarlightDecoderProps {
  solvedLevels: number[];
  onSolve: (levelIndex: number) => void;
}

export default function StarlightDecoder({ solvedLevels, onSolve }: StarlightDecoderProps) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const [composition, setComposition] = useState<Set<string>>(new Set());
  const [velocityGuess, setVelocityGuess] = useState(0);

  const [tempGuess, setTempGuess] = useState(5000);
  const [classGuess, setClassGuess] = useState<SpectralClass | null>(null);

  const [depthGuess, setDepthGuess] = useState(0.3);
  const [periodGuess, setPeriodGuess] = useState(1);

  const [ampGuess, setAmpGuess] = useState(10);
  const [wobblePeriodGuess, setWobblePeriodGuess] = useState(3);

  const [synthClassGuess, setSynthClassGuess] = useState<SpectralClass | null>(null);
  const [habitableGuess, setHabitableGuess] = useState<boolean | null>(null);

  const spectrumRef = useRef<HTMLCanvasElement | null>(null);
  const transitRef = useRef<HTMLCanvasElement | null>(null);
  const wobbleRef = useRef<HTMLCanvasElement | null>(null);

  const level = LEVELS[levelIndex];
  const isLast = levelIndex === LEVELS.length - 1;

  const resetGuesses = () => {
    setComposition(new Set());
    setVelocityGuess(0);
    setTempGuess(5000);
    setClassGuess(null);
    setDepthGuess(0.3);
    setPeriodGuess(1);
    setAmpGuess(10);
    setWobblePeriodGuess(3);
    setSynthClassGuess(null);
    setHabitableGuess(null);
  };

  useEffect(() => {
    resetGuesses();
    setShowHint(false);
  }, [levelIndex]);

  const toggleComposition = (key: string) => {
    setComposition((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ---------------------------------------------------------------- solving

  const solved = useMemo(() => {
    switch (level.kind) {
      case 'spectral':
        return isSpectralSolved(level, composition, velocityGuess);
      case 'temperature':
        return isTemperatureSolved(level, classGuess);
      case 'transit':
        return isTransitSolved(level, depthGuess, periodGuess);
      case 'wobble':
        return isWobbleSolved(level, ampGuess, wobblePeriodGuess);
      case 'synthesis':
        return isSynthesisSolved(level, synthClassGuess, habitableGuess);
      default:
        return false;
    }
  }, [level, composition, velocityGuess, classGuess, depthGuess, periodGuess, ampGuess, wobblePeriodGuess, synthClassGuess, habitableGuess]);

  useEffect(() => {
    if (solved) onSolve(levelIndex);
  }, [solved, levelIndex, onSolve]);

  // ------------------------------------------------------- live partial fit

  const spectralProgress = useMemo(() => {
    if (level.kind !== 'spectral') return null;
    const observed = observedLines(level);
    let matched = 0;
    let total = 0;
    for (const key of composition) {
      total += ELEMENT_LINES[key].lines.length;
      matched += matchedLineCount(key, velocityGuess, observed);
    }
    return { matched, total };
  }, [level, composition, velocityGuess]);

  // ------------------------------------------------------------- rendering

  useEffect(() => {
    if (level.kind !== 'spectral' || !spectrumRef.current) return;
    drawSpectrum(spectrumRef.current, level, composition, velocityGuess);
  }, [level, composition, velocityGuess]);

  const transitData = useMemo(() => (level.kind === 'transit' ? generateTransitData(level) : []), [level]);
  useEffect(() => {
    if (level.kind !== 'transit' || !transitRef.current) return;
    drawTransitChart(transitRef.current, level, transitData, depthGuess, periodGuess);
  }, [level, transitData, depthGuess, periodGuess]);

  const wobbleData = useMemo(() => (level.kind === 'wobble' ? generateWobbleData(level) : []), [level]);
  useEffect(() => {
    if (level.kind !== 'wobble' || !wobbleRef.current) return;
    drawWobbleChart(wobbleRef.current, level, wobbleData, ampGuess, wobblePeriodGuess);
  }, [level, wobbleData, ampGuess, wobblePeriodGuess]);

  const tempSwatch = useMemo(() => {
    if (level.kind !== 'temperature') return '#000';
    return rgbCss(wavelengthToRGB(clamp(wienPeakNm(level.trueTempK), 380, 700)));
  }, [level]);
  const guessSwatch = useMemo(() => rgbCss(wavelengthToRGB(clamp(wienPeakNm(tempGuess), 380, 700))), [tempGuess]);
  const synthSwatch = useMemo(() => {
    if (level.kind !== 'synthesis') return '#000';
    return rgbCss(wavelengthToRGB(clamp(wienPeakNm(level.trueTempK), 380, 700)));
  }, [level]);

  // ----------------------------------------------------------------- render

  const solvedOverlay = (label: string) => (
    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-center px-6 rounded-2xl">
      <Trophy className="w-10 h-10 text-amber-400" />
      <h4 className="font-display font-bold text-xl text-emerald-400">{label}</h4>
      <div className="flex gap-2 pt-1">
        <button
          onClick={resetGuesses}
          className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer transition"
        >
          Do it again
        </button>
        {!isLast && (
          <button
            onClick={() => setLevelIndex((i) => i + 1)}
            className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-stone-950 cursor-pointer transition flex items-center gap-1"
          >
            Next level <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Level strip */}
      <div className="flex flex-wrap items-center gap-2">
        {LEVELS.map((lvl, i) => (
          <button
            key={lvl.title}
            onClick={() => setLevelIndex(i)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono border transition cursor-pointer flex items-center gap-1.5 ${
              i === levelIndex
                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {solvedLevels.includes(i) && <Trophy className="w-3 h-3 text-amber-400" />}
            {i + 1}. {lvl.title}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-display font-bold text-lg text-white">{level.title}</h4>
        <button
          onClick={() => setShowHint((s) => !s)}
          className="text-[11px] font-mono text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-1"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          {showHint ? 'Hide hint' : 'Hint'}
        </button>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed font-sans">{level.brief}</p>

      {showHint && (
        <p className="text-xs text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 font-sans leading-relaxed">
          {level.hint}
        </p>
      )}

      {/* ---------------------------------------------------------- spectral */}
      {level.kind === 'spectral' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {level.candidateElements.map((key) => {
              const spec = ELEMENT_LINES[key];
              const active = composition.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleComposition(key)}
                  className={`px-3 py-2 rounded-xl border text-left transition cursor-pointer min-w-[110px] ${
                    active ? 'bg-white/10 border-white/30' : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: spec.color }} />
                    <span className="font-mono text-xs text-white">{spec.name}</span>
                    {active && <Check className="w-3 h-3 text-emerald-400 ml-auto shrink-0" />}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{spec.lines.length} lines</div>
                </button>
              );
            })}
          </div>

          {level.hasDopplerSlider && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Doppler velocity</span>
                <span className={velocityGuess === 0 ? 'text-zinc-400' : velocityGuess > 0 ? 'text-red-400' : 'text-sky-400'}>
                  {velocityGuess > 0 ? '+' : ''}
                  {velocityGuess.toLocaleString()} km/s
                  {velocityGuess !== 0 && (velocityGuess > 0 ? ' (receding)' : ' (approaching)')}
                </span>
              </div>
              <input
                type="range"
                min={-20000}
                max={20000}
                step={50}
                value={velocityGuess}
                onChange={(e) => setVelocityGuess(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          )}

          <div className="relative rounded-2xl overflow-hidden border border-white/10">
            <canvas ref={spectrumRef} width={SPEC_W} height={SPEC_MARK_H + SPEC_BAND_H} className="w-full block" />
            {solved && solvedOverlay(`${level.title} solved!`)}
          </div>

          {spectralProgress && (
            <p
              className={`text-[11px] font-mono ${
                spectralProgress.total > 0 && spectralProgress.matched === spectralProgress.total
                  ? 'text-emerald-400'
                  : 'text-zinc-400'
              }`}
            >
              {spectralProgress.matched} of {spectralProgress.total} selected lines match the spectrum
            </p>
          )}
        </div>
      )}

      {/* ------------------------------------------------------- temperature */}
      {level.kind === 'temperature' && (
        <div className="relative space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-[#0d0d12] p-4 space-y-2">
              <p className="text-[11px] font-mono text-zinc-400">Observed star</p>
              <div className="h-16 rounded-xl" style={{ backgroundColor: tempSwatch }} />
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0d0d12] p-4 space-y-2">
              <p className="text-[11px] font-mono text-zinc-400">Your estimate — {tempGuess.toLocaleString()} K</p>
              <div className="h-16 rounded-xl" style={{ backgroundColor: guessSwatch }} />
              <input
                type="range"
                min={2500}
                max={35000}
                step={50}
                value={tempGuess}
                onChange={(e) => setTempGuess(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {SPECTRAL_CLASSES.map((c) => (
              <button
                key={c}
                onClick={() => setClassGuess(c)}
                className={`w-11 h-11 rounded-full font-display font-bold text-sm border cursor-pointer transition ${
                  classGuess === c
                    ? 'bg-violet-500/30 border-violet-400 text-white'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {solved && solvedOverlay('Class identified!')}
        </div>
      )}

      {/* ------------------------------------------------------------ transit */}
      {level.kind === 'transit' && (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden border border-white/10">
            <canvas ref={transitRef} width={CHART_W} height={CHART_H} className="w-full block" />
            {solved && solvedOverlay('Planet measured!')}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Dip depth</span>
                <span className="text-amber-300">{depthGuess.toFixed(2)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={3}
                step={0.02}
                value={depthGuess}
                onChange={(e) => setDepthGuess(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Period</span>
                <span className="text-amber-300">{periodGuess.toFixed(2)} days</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={level.periodDays * 2}
                step={0.05}
                value={periodGuess}
                onChange={(e) => setPeriodGuess(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- wobble */}
      {level.kind === 'wobble' && (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden border border-white/10">
            <canvas ref={wobbleRef} width={CHART_W} height={CHART_H} className="w-full block" />
            {solved && solvedOverlay('Hidden planet found!')}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Wobble speed</span>
                <span className="text-amber-300">{ampGuess.toFixed(0)} km/s</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={ampGuess}
                onChange={(e) => setAmpGuess(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Period</span>
                <span className="text-amber-300">{wobblePeriodGuess.toFixed(1)} days</span>
              </div>
              <input
                type="range"
                min={1}
                max={level.truePeriodDays * 3}
                step={0.1}
                value={wobblePeriodGuess}
                onChange={(e) => setWobblePeriodGuess(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------- synthesis */}
      {level.kind === 'synthesis' && (
        <div className="relative rounded-2xl border border-white/10 bg-[#0d0d12] p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-24 rounded-xl shrink-0" style={{ backgroundColor: synthSwatch }} />
            <p className="text-xs font-mono text-zinc-400">
              Orbital distance: <span className="text-white">{level.orbitalDistanceAU} AU</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] font-mono text-zinc-400 mb-1.5">Classify the star from its colour</p>
            <div className="flex flex-wrap gap-2">
              {SPECTRAL_CLASSES.map((c) => (
                <button
                  key={c}
                  onClick={() => setSynthClassGuess(c)}
                  className={`w-11 h-11 rounded-full font-display font-bold text-sm border cursor-pointer transition ${
                    synthClassGuess === c
                      ? 'bg-violet-500/30 border-violet-400 text-white'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-mono text-zinc-400 mb-1.5">Could liquid water survive there?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setHabitableGuess(true)}
                className={`px-4 py-2 rounded-full text-xs font-bold border cursor-pointer transition ${
                  habitableGuess === true
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                Habitable
              </button>
              <button
                onClick={() => setHabitableGuess(false)}
                className={`px-4 py-2 rounded-full text-xs font-bold border cursor-pointer transition ${
                  habitableGuess === false
                    ? 'bg-red-500/30 border-red-400 text-red-200'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                Not habitable
              </button>
            </div>
          </div>
          {solved && solvedOverlay('Verdict confirmed!')}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-zinc-400">
        <span>Click a card to add it to your reading · sliders carry every guess</span>
        <button
          onClick={resetGuesses}
          className="flex items-center gap-1.5 hover:text-white cursor-pointer transition"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset guesses
        </button>
      </div>
    </div>
  );
}
