import {
  Body,
  KMS_PER_AU_YR,
  Launch,
  Run,
  World,
  planetAt,
  planetOmega,
  planetVel,
  sampleAt,
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

export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

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
  /** launch date slider (months), for stages that start from Earth among moving planets */
  windowMonths?: number;
  /** ring drawn around a planet, and the distance that counts as reaching it */
  target?: { id: string; r: number };
  hints: [string, string, string];
  naming: string;
  xp: number;
  makeLaunch: (dirRel: number, mag: number) => Launch;
  evaluate: (run: Run, mag: number, prev: boolean[], wait?: number) => StageEval;
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
  target: { id: 'neptune', r: NEPTUNE_TARGET_R },
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

// ---------- Stages 5-10 ----------

const MONTH = 1 / 12;
const EARTH_OMEGA = planetOmega(earth());

/**
 * Launching later is the same as launching now with the planets turned ahead:
 * the Sun's pull is the same in every direction, so everything is drawn with
 * Earth held at the starting point and each planet moved by its motion
 * relative to Earth.
 */
export const shiftBody = (b: Body, waitYears: number): Body =>
  b.id === 'earth' ? b : { ...b, phase: b.phase + (planetOmega(b) - EARTH_OMEGA) * waitYears };

export function stageAt(st: StageDef, waitYears: number): StageDef {
  if (!st.windowMonths || waitYears === 0) return st;
  return {
    ...st,
    world: { ...st.world, bodies: st.world.bodies.map((b) => shiftBody(b, waitYears)) },
    drawn: st.drawn.map((b) => shiftBody(b, waitYears)),
  };
}

export function closestToBody(run: Run, b: Body): number {
  let c = Infinity;
  for (const s of run.samples) {
    const [px, py] = planetAt(b, s.t);
    c = Math.min(c, Math.hypot(s.x - px, s.y - py));
  }
  return c;
}

const earthLaunch = (dirRel: number, mag: number): Launch => {
  const ang = Math.PI / 2 + dirRel;
  const [x, y] = planetAt(earth(), 0);
  const [vx, vy] = planetVel(earth(), 0);
  return { x, y, vx, vy, dvx: mag * Math.cos(ang), dvy: mag * Math.sin(ang), t0: 0 };
};

/** Probe that starts away from Earth on a given heading (km/s components, Sun at the origin). */
function fixedStart(x: number, vxKms: number, vyKms: number) {
  const vx = kmsToAu(vxKms);
  const vy = kmsToAu(vyKms);
  const refAngle = Math.atan2(vy, vx);
  return {
    refAngle,
    origin: [x, 0] as [number, number],
    makeLaunch: (dirRel: number, mag: number): Launch => ({
      x,
      y: 0,
      vx,
      vy,
      dvx: mag * Math.cos(refAngle + dirRel),
      dvy: mag * Math.sin(refAngle + dirRel),
      t0: 0,
    }),
  };
}

// 5: launch window
const J5 = jupiter(1.0);
const stage5: StageDef = {
  id: 5,
  tab: 'Launch date',
  prompt: 'Can you send the probe within 0.5 AU of Jupiter?',
  burnWord: 'Fuel used',
  refWord: "Earth's motion",
  world: { bodies: [J5], tMax: 25 },
  drawn: [earth(), J5],
  rings: [],
  tank: kmsToAu(8.9),
  preview: true,
  refAngle: Math.PI / 2,
  origin: [1, 0],
  viewRadius: 7,
  caption:
    'Earth and Jupiter keep moving. The date slider sets how many months from now the probe leaves Earth, and the planets are drawn where they will be on that date.',
  windowMonths: 13,
  target: { id: 'jupiter', r: 0.5 },
  hints: [
    'The dotted line is the path for the date and burn you have set. Move the date and watch it.',
    "The trip to Jupiter's orbit takes about three years. Compare where Jupiter is on the map with where the dotted line crosses its orbit.",
    'Keep a large burn in the direction of Earth\'s motion, then slide the date until the dotted line meets Jupiter.',
  ],
  naming:
    'The probe and the planet have to reach the same place at the same time. Launch dates that work come around again about every 13 months, when Earth and Jupiter return to the same positions. These are called launch windows.',
  xp: 30,
  makeLaunch: earthLaunch,
  evaluate: (run, _mag, prev) => {
    const f = run.flybys.find((x) => x.id === 'jupiter');
    const closest = f ? f.closest : Infinity;
    const met = closest <= 0.5 || prev[0];
    const lines: string[] = [];
    const e = endLine(run, [J5]);
    if (e) lines.push(e);
    if (f) lines.push(`Closest to Jupiter: ${fmt(f.closest, 2)} AU`);
    lines.push(`Farthest from the Sun: ${fmt(run.maxR)} AU`);
    return { goals: [{ text: 'Within 0.5 AU of Jupiter', met }], readouts: lines, done: met };
  },
};

// 6: a planet can also slow the probe down
const J6 = jupiter(1.5);
const start6 = fixedStart(-4, -12, -10);
export const MERCURY_A = 0.39;
const stage6: StageDef = {
  id: 6,
  tab: 'Falling in',
  prompt: "Can the probe get closer to the Sun than Mercury's orbit without hitting the Sun?",
  burnWord: 'Fuel used',
  refWord: "Probe's motion",
  world: { bodies: [J6], tMax: 40 },
  drawn: [J6],
  rings: [{ r: MERCURY_A, label: 'Mercury' }],
  tank: kmsToAu(1.5),
  preview: false,
  refAngle: start6.refAngle,
  origin: start6.origin,
  viewRadius: 7,
  caption: 'The probe starts 4 AU from the Sun with a small tank. Only Jupiter is shown.',
  hints: [
    'With no burn the probe never gets near Mercury. Look at what Jupiter does to the speed graph.',
    "A gravity assist can lower the probe's speed from the Sun as well as raise it. Try small burns in different directions and compare the two sides of Jupiter.",
    'Try passing Jupiter on the side it is heading toward.',
  ],
  naming:
    "Jupiter can take speed away as well as add it. Passing on the side Jupiter is heading toward slows the probe, and a slower probe falls closer to the Sun. Space agencies use this to send probes inward.",
  xp: 30,
  makeLaunch: start6.makeLaunch,
  evaluate: (run, _mag, prev) => {
    const met = (run.end !== 'sun' && run.minR <= MERCURY_A) || prev[0];
    const lines: string[] = [];
    const e = endLine(run, [J6]);
    if (e) lines.push(e);
    lines.push(...flybyLines(run, [J6]));
    lines.push(`Closest to the Sun: ${fmt(run.minR, 2)} AU`);
    return { goals: [{ text: 'Closer than 0.39 AU without hitting the Sun', met }], readouts: lines, done: met };
  },
};

// 7: escape
const J7 = jupiter(3.25);
const start7 = fixedStart(-3.5, -10, -14);
export const ESCAPE_R = 48;
const stage7: StageDef = {
  id: 7,
  tab: 'Escape',
  prompt: "Can the probe escape the Sun's pull?",
  burnWord: 'Fuel used',
  refWord: "Probe's motion",
  world: { bodies: [J7], tMax: 40 },
  drawn: [J7],
  rings: [],
  tank: kmsToAu(1.5),
  preview: false,
  refAngle: start7.refAngle,
  origin: start7.origin,
  viewRadius: 9,
  caption: 'The run ends after 40 years, or when the probe is 48 AU from the Sun. Zoom out to follow it.',
  hints: [
    'Zero fuel is not enough. The flyby readout shows the probe speed after Jupiter and the speed needed to leave.',
    'Small changes to the course change which side of Jupiter the probe passes.',
    "The probe has to leave Jupiter faster than the speed needed at that distance.",
  ],
  naming:
    'Far from the Sun, gravity gets weaker, so there is a speed that carries a probe away without slowing to a stop. Jupiter gave the probe enough speed to pass it. Pioneer 10 and 11 and Voyager 1 and 2 escaped the Sun this way.',
  xp: 35,
  makeLaunch: start7.makeLaunch,
  evaluate: (run, _mag, prev) => {
    const met = run.end === 'lost' || prev[0];
    const lines: string[] = [];
    const e = endLine(run, [J7]);
    if (e) lines.push(e);
    for (const f of run.flybys) {
      if (f.closest >= J7.zone || !f.complete) continue;
      const s = sampleAt(run.samples, f.tOut);
      const r = Math.hypot(s.x, s.y);
      const need = Math.sqrt((2 * 4 * Math.PI * Math.PI) / r);
      lines.push(
        `Jupiter: closest ${fmt(f.closest, 2)} AU. Speed from the Sun leaving Jupiter ${fmt(SPEED(f.vOut))} km/s, needed to leave from there ${fmt(SPEED(need))} km/s`,
      );
    }
    lines.push(`Farthest from the Sun: ${fmt(run.maxR)} AU`);
    return { goals: [{ text: 'Reach 48 AU from the Sun within 40 years', met }], readouts: lines, done: met };
  },
};

// 8-10: chains of planets, launched on a chosen date
const windowChain = (
  id: 8 | 9 | 10,
  tab: string,
  targetId: 'saturn' | 'uranus' | 'neptune',
  r: number,
  bodies: Body[],
  tank: number,
  copy: Pick<StageDef, 'prompt' | 'caption' | 'hints' | 'naming' | 'xp'>,
): StageDef => {
  const t = bodies.find((b) => b.id === targetId)!;
  return {
    id,
    tab,
    burnWord: 'Fuel used',
    refWord: "Earth's motion",
    world: { bodies, tMax: 45 },
    drawn: [earth(), ...bodies],
    rings: [],
    tank: kmsToAu(tank),
    preview: true,
    refAngle: Math.PI / 2,
    origin: [1, 0],
    viewRadius: id === 8 ? 12 : id === 9 ? 22 : 33,
    windowMonths: 24,
    target: { id: targetId, r },
    makeLaunch: earthLaunch,
    ...copy,
    evaluate: (run, _mag, prev, wait = 0) => {
      const tb = shiftBody(t, wait);
      const closest = closestToBody(run, tb);
      const met = closest <= r || prev[0];
      const lines: string[] = [];
      const e = endLine(run, bodies);
      if (e) lines.push(e);
      lines.push(...flybyLines(run, bodies));
      lines.push(`Closest to ${t.name}: ${fmt(closest)} AU`);
      return { goals: [{ text: `Within ${fmt(r)} AU of ${t.name}`, met }], readouts: lines, done: met };
    },
  };
};

const bodies8 = [jupiter(1.0), saturn(3.0)];
const stage8 = windowChain(8, 'Saturn', 'saturn', 1.5, bodies8, 9, {
  prompt: 'Can you get the probe within 1.5 AU of Saturn?',
  caption: 'Jupiter and Saturn pull on the probe. Set the launch date, direction and burn.',
  hints: [
    "Try the burn on its own first: the tank can't carry the probe as far as Saturn.",
    "Aim for Jupiter first, then look at where the dotted line goes after it. The date moves both planets.",
    "Fix the burn and direction that give a good Jupiter flyby, then change the date a little at a time.",
  ],
  naming:
    'Each flyby sets up the next one. Cassini reached Saturn by chaining flybys of several planets, each at the right date and angle.',
  xp: 40,
});

const bodies9 = [jupiter(1.0), saturn(3.0), uranus(0)];
const stage9 = windowChain(9, 'Uranus', 'uranus', 3, bodies9, 9.5, {
  prompt: 'Can you get the probe within 3 AU of Uranus?',
  caption: 'Three planets pull on the probe. The map is zoomed out to include Uranus.',
  hints: [
    'The speed graph rises each time the probe gets a push from a planet.',
    'A flyby that is too close bends the path a lot. A flyby that is wider bends it less. Use that to adjust where you end up.',
    'Change one thing at a time: date first, then direction, then burn.',
  ],
  naming:
    'Voyager 2 visited Jupiter, Saturn, Uranus and Neptune in one trip. That was possible because the four planets were lined up in a way that happens about once every 175 years.',
  xp: 45,
});

const bodies10 = [jupiter(1.0), saturn(3.0), uranus(0), neptune(3.5)];
const stage10 = windowChain(10, 'Grand tour', 'neptune', 4, bodies10, 9.5, {
  prompt: 'Can you get the probe within 4 AU of Neptune?',
  caption: 'All four giant planets pull on the probe. The dotted line shows the path for the date and burn you set.',
  hints: [
    'Work outward. Find a launch that gets a good push from Jupiter, then see where the dotted line goes next.',
    'More than one date can work. Try the whole range of the slider.',
    'If the dotted line almost reaches Neptune, change the date by a month or less.',
  ],
  naming:
    'You planned a path using the planets the way Voyager 2 did, where timing, direction and fuel all matter together.',
  xp: 60,
});

export const STAGES: StageDef[] = [stage1, stage2, stage3, stage4, stage5, stage6, stage7, stage8, stage9, stage10];
export const MONTH_YR = MONTH;
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
