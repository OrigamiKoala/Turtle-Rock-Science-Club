import {
  Body,
  KMS_PER_AU_YR,
  Launch,
  Run,
  World,
  planetAt,
  planetVel,
} from './physics';

/**
 * Planet gravity is drawn stronger than real so a flyby can be aimed with a
 * dial instead of a hair's width. Everything else is real: orbits, periods,
 * the Sun's pull, and how a moving planet hands speed to a probe.
 */
export const PLANET_GRAVITY_SCALE = 10;

const body = (
  id: string,
  name: string,
  a: number,
  phase: number,
  massRatio: number,
  hitR: number,
  zone: number,
  color: string,
): Body => ({ id, name, a, phase, massRatio: massRatio * PLANET_GRAVITY_SCALE, hitR, zone, color });

/** Earth has no pull on the probe: it only supplies the starting motion. */
const earth = (): Body => ({
  id: 'earth',
  name: 'Earth',
  a: 1,
  phase: 0,
  massRatio: 0,
  hitR: 0,
  zone: 0,
  color: '#5aa9ff',
});

const jupiter = (phase: number) => body('jupiter', 'Jupiter', 5.2026, phase, 9.5479e-4, 0.01, 0.8, '#e8b27a');
const saturn = (phase: number) => body('saturn', 'Saturn', 9.5549, phase, 2.8588e-4, 0.01, 0.8, '#e6d29b');
const uranus = (phase: number) => body('uranus', 'Uranus', 19.2184, phase, 4.366e-5, 0.006, 0.8, '#8fe0e6');
const neptune = (phase: number) => body('neptune', 'Neptune', 30.07, phase, 5.151e-5, 0.006, 1.0, '#6f8cff');

export const NEPTUNE_A = 30.07;
export const SATURN_A = 9.5549;
export const NEPTUNE_TARGET_R = 6;

export const kmsToAu = (kms: number) => kms / KMS_PER_AU_YR;
export const auToKms = (au: number) => au * KMS_PER_AU_YR;

export type StageId = 1 | 2 | 3 | 4;

export interface RingMark {
  r: number;
  label: string;
}

export interface GoalResult {
  text: string;
  met: boolean;
}

export interface StageEval {
  goals: GoalResult[];
  /** facts the screen shows after a run; never the answer */
  readouts: string[];
  /** every goal met in this run or earlier ones */
  done: boolean;
}

export interface StageDef {
  id: StageId;
  tab: string;
  prompt: string;
  /** word on the dial and sliders */
  burnWord: string;
  /** what the dial's zero direction means */
  refWord: string;
  /** bodies that pull on the probe */
  world: World;
  /** everything drawn */
  drawn: Body[];
  rings: RingMark[];
  /** tank / top speed on the dial, AU/yr */
  tank: number;
  /** show the path before launch */
  preview: boolean;
  /** direction (rad) that dial angle 0 points to */
  refAngle: number;
  /** point the burn starts from, for drawing */
  origin: [number, number];
  viewRadius: number;
  caption?: string;
  hints: [string, string, string];
  naming: string;
  xp: number;
  makeLaunch: (dirRel: number, mag: number) => Launch;
  evaluate: (run: Run, mag: number, prev: boolean[]) => StageEval;
}

const SPEED = auToKms;
const fmt = (n: number, d = 1) => n.toFixed(d);

function endLine(run: Run, bodies: Body[]): string | null {
  if (run.end === 'sun') return 'The probe hit the Sun.';
  if (run.end === 'planet') {
    const b = bodies.find((x) => x.id === run.endBody);
    return `The probe hit ${b ? b.name : 'a planet'}.`;
  }
  return null;
}

function flybyLines(run: Run, bodies: Body[]): string[] {
  return run.flybys
    .filter((f) => f.closest < (bodies.find((b) => b.id === f.id)?.zone ?? 0))
    .map((f) => {
      const b = bodies.find((x) => x.id === f.id)!;
      const speeds = f.complete ? `, speed from the Sun ${fmt(SPEED(f.vIn))} to ${fmt(SPEED(f.vOut))} km/s` : '';
      return `${b.name}: closest ${fmt(f.closest, 2)} AU${speeds}`;
    });
}

// ---------- Stage 1: falling and missing ----------

const stage1: StageDef = {
  id: 1,
  tab: 'Sideways',
  prompt: 'Can you send the probe once around the Sun without touching it?',
  burnWord: 'Speed',
  refWord: 'Counterclockwise',
  world: { bodies: [], tMax: 4 },
  drawn: [],
  rings: [{ r: 1, label: '1 AU' }],
  tank: kmsToAu(46),
  preview: false,
  refAngle: Math.PI / 2,
  origin: [1, 0],
  viewRadius: 1.9,
  caption: 'The probe starts at rest, 1 AU from the Sun. The dial sets its starting speed and direction.',
  hints: [
    'Drag the dot in the dial, or use the sliders, then press Launch.',
    'Compare the direction the probe moves with the direction of the Sun.',
    'Try a push at right angles to the line between the probe and the Sun.',
  ],
  naming:
    'The Sun pulls the probe all the time. With enough sideways speed the probe keeps missing it, and that is an orbit.',
  xp: 10,
  makeLaunch: (dirRel, mag) => {
    const ang = Math.PI / 2 + dirRel;
    return { x: 1, y: 0, vx: 0, vy: 0, dvx: mag * Math.cos(ang), dvy: mag * Math.sin(ang), t0: 0 };
  },
  evaluate: (run, _mag, prev) => {
    const lap = Math.abs(run.swept) >= 2 * Math.PI && run.end !== 'sun';
    const met = lap || prev[0];
    const lines: string[] = [];
    const e = endLine(run, []);
    if (e) lines.push(e);
    else if (run.end === 'lost') lines.push('The probe flew out of the picture.');
    lines.push(`Closest to the Sun: ${fmt(run.minR, 2)} AU`);
    return { goals: [{ text: 'One lap around the Sun', met }], readouts: lines, done: met };
  },
};

// ---------- Stage 2: the fuel wall ----------

const TANK_KMS = 10;

const stage2: StageDef = {
  id: 2,
  tab: 'The tank',
  prompt: "How far out can a full tank take the probe? Neptune's orbit is 30 AU from the Sun.",
  burnWord: 'Fuel used',
  refWord: "Earth's motion",
  world: { bodies: [], tMax: 40 },
  drawn: [earth()],
  rings: [
    { r: 5.2, label: '5' },
    { r: 10, label: '10' },
    { r: 20, label: '20' },
    { r: NEPTUNE_A, label: '30' },
  ],
  tank: kmsToAu(TANK_KMS),
  preview: true,
  refAngle: Math.PI / 2,
  origin: [1, 0],
  viewRadius: 33,
  caption: "The burn is added to Earth's own motion. Planets are left out of this stage.",
  hints: [
    "The outer ring of the dial is a full tank. Each launch adds a dot to the chart.",
    'Compare each dot on the chart with the 30 AU line.',
    'Use the whole tank at least once, in the direction you think is best.',
  ],
  naming:
    "Fuel buys speed, and a tank holds a fixed amount. This tank can't take a probe to Neptune on its own.",
  xp: 15,
  makeLaunch: (dirRel, mag) => {
    const ang = Math.PI / 2 + dirRel;
    const [x, y] = planetAt(earth(), 0);
    const [vx, vy] = planetVel(earth(), 0);
    return { x, y, vx, vy, dvx: mag * Math.cos(ang), dvy: mag * Math.sin(ang), t0: 0 };
  },
  evaluate: (run, mag, prev) => {
    const spent = mag >= kmsToAu(TANK_KMS) * 0.95;
    const reached = run.maxR >= NEPTUNE_A;
    const met = reached || spent || prev[0];
    const lines = [`Fuel used: ${fmt(SPEED(mag))} km/s`, `Farthest: ${fmt(run.maxR)} AU`];
    return {
      goals: [{ text: 'Use a full tank', met }],
      readouts: lines,
      done: met,
    };
  },
};

// ---------- Stage 3: the moving slingshot ----------

const J3 = jupiter(0.2);
const stage3: StageDef = {
  id: 3,
  tab: 'Jupiter',
  prompt: "Can the probe reach Saturn's orbit with the little fuel it has left?",
  burnWord: 'Fuel used',
  refWord: "Probe's motion",
  world: { bodies: [J3], tMax: 30 },
  drawn: [J3],
  rings: [{ r: SATURN_A, label: "Saturn's orbit" }],
  tank: kmsToAu(1.5),
  preview: false,
  refAngle: Math.atan2(-1.2367509996164836, -2.275231690194298),
  origin: [-3.3126136093153202, 1.7300686921161619],
  viewRadius: 11,
  caption: 'A small tank is left for course changes. Only Jupiter is shown.',
  hints: [
    "The dial turns the probe's course a little. Press Launch to see where it goes.",
    "Compare where Jupiter is with where the probe is when they meet. The graph shows speed measured from the Sun.",
    "A small burn changes when the probe arrives at Jupiter's orbit. Try arriving earlier, then later.",
  ],
  naming:
    "Jupiter pulled the probe along its own path. Measured from the Sun, the probe left faster than it arrived, with no fuel used. This is a gravity assist. Jupiter slows by a tiny amount that can't be measured.",
  xp: 25,
  makeLaunch: (dirRel, mag) => {
    const ang = stage3.refAngle + dirRel;
    return {
      x: -3.3126136093153202,
      y: 1.7300686921161619,
      vx: -2.275231690194298,
      vy: -1.2367509996164836,
      dvx: mag * Math.cos(ang),
      dvy: mag * Math.sin(ang),
      t0: 0,
    };
  },
  evaluate: (run, _mag, prev) => {
    const met = run.maxR >= SATURN_A || prev[0];
    const lines: string[] = [];
    const e = endLine(run, stage3.world.bodies);
    if (e) lines.push(e);
    lines.push(...flybyLines(run, stage3.world.bodies));
    lines.push(`Farthest from the Sun: ${fmt(run.maxR)} AU`);
    return { goals: [{ text: "Reach Saturn's orbit", met }], readouts: lines, done: met };
  },
};

// ---------- Stage 4: the grand tour ----------

const bodies4 = [jupiter(1.674), saturn(2.559), uranus(4.2), neptune(3.41)];
const stage4: StageDef = {
  id: 4,
  tab: 'Neptune',
  prompt: "Can you get the probe within 6 AU of Neptune using one tank?",
  burnWord: 'Fuel used',
  refWord: "Earth's motion",
  world: { bodies: bodies4, tMax: 40 },
  drawn: [earth(), ...bodies4],
  rings: [],
  tank: kmsToAu(TANK_KMS),
  preview: true,
  refAngle: Math.PI / 2,
  origin: [1, 0],
  viewRadius: 33,
  caption: 'The dotted line is the path your launch would take. The planets keep moving along it.',
  hints: [
    'The dotted line updates as you move the dial. Press Launch to fly it.',
    'On the speed graph, a rise near a planet means that planet gave the probe speed.',
    'Aim to cross a planet\'s path just after the planet has passed.',
  ],
  naming:
    'Voyager 2 flew this kind of path. It used Jupiter and Saturn to gain speed, and reached Neptune in 1989.',
  xp: 40,
  makeLaunch: (dirRel, mag) => {
    const ang = Math.PI / 2 + dirRel;
    const [x, y] = planetAt(earth(), 0);
    const [vx, vy] = planetVel(earth(), 0);
    return { x, y, vx, vy, dvx: mag * Math.cos(ang), dvy: mag * Math.sin(ang), t0: 0 };
  },
  evaluate: (run, _mag, prev) => {
    const n = bodies4[3];
    let closest = Infinity;
    for (const s of run.samples) {
      const [px, py] = planetAt(n, s.t);
      const d = Math.hypot(s.x - px, s.y - py);
      if (d < closest) closest = d;
    }
    const met = closest <= NEPTUNE_TARGET_R || prev[0];
    const lines: string[] = [];
    const e = endLine(run, bodies4);
    if (e) lines.push(e);
    lines.push(...flybyLines(run, bodies4));
    lines.push(`Closest to Neptune: ${fmt(closest)} AU`);
    return { goals: [{ text: 'Within 6 AU of Neptune', met }], readouts: lines, done: met };
  },
};

export const STAGES: StageDef[] = [stage1, stage2, stage3, stage4];
export const TANK_KMS_FULL = TANK_KMS;

export function neptuneClosest(run: Run): number {
  const n = bodies4[3];
  let c = Infinity;
  for (const s of run.samples) {
    const [px, py] = planetAt(n, s.t);
    c = Math.min(c, Math.hypot(s.x - px, s.y - py));
  }
  return c;
}
