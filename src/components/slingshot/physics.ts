/**
 * Gravity Slingshot physics. Pure functions, no DOM.
 * Units: AU, years. Sun GM = 4π² AU³/yr². Planets move on exact circles;
 * the probe feels the Sun and every planet in the world.
 */

export const GM_SUN = 4 * Math.PI * Math.PI;
export const KMS_PER_AU_YR = 4.74047;
export const SUN_HIT_R = 0.03;
export const LOST_R = 48;

export interface Body {
  id: string;
  name: string;
  a: number;
  /** angle (rad) at t = 0 */
  phase: number;
  /** GM relative to the Sun's GM */
  massRatio: number;
  hitR: number;
  /** distance within which a flyby is measured */
  zone: number;
  color: string;
}

export interface World {
  bodies: Body[];
  tMax: number;
}

export interface Launch {
  /** start position (AU) */
  x: number;
  y: number;
  /** velocity (AU/yr) the burn is added to */
  vx: number;
  vy: number;
  /** burn in AU/yr */
  dvx: number;
  dvy: number;
  /** time (yr) the probe is released */
  t0: number;
}

export interface Sample {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Flyby {
  id: string;
  closest: number;
  tClosest: number;
  /** speed relative to the Sun, entering and leaving the zone (AU/yr) */
  vIn: number;
  vOut: number;
  /** speed relative to the planet, entering and leaving (AU/yr) */
  relIn: number;
  relOut: number;
  /** probe passes on the side the planet has already left */
  behind: boolean;
  complete: boolean;
  tIn: number;
  tOut: number;
}

export type EndReason = 'sun' | 'planet' | 'lost' | 'time';

export interface Run {
  samples: Sample[];
  flybys: Flyby[];
  end: EndReason;
  endBody?: string;
  /** farthest heliocentric distance reached */
  maxR: number;
  minR: number;
  /** total angle swept around the Sun */
  swept: number;
}

const planetGm = (b: Body) => GM_SUN * b.massRatio;
export const planetOmega = (b: Body) => (2 * Math.PI) / Math.pow(b.a, 1.5);

export function planetAt(b: Body, t: number): [number, number] {
  const th = b.phase + planetOmega(b) * t;
  return [b.a * Math.cos(th), b.a * Math.sin(th)];
}

export function planetVel(b: Body, t: number): [number, number] {
  const th = b.phase + planetOmega(b) * t;
  const v = b.a * planetOmega(b);
  return [-v * Math.sin(th), v * Math.cos(th)];
}

export const circularSpeed = (r: number) => Math.sqrt(GM_SUN / r);

const SOFT2 = 1e-6;

function accel(x: number, y: number, t: number, bodies: Body[]): [number, number] {
  const r2 = x * x + y * y + SOFT2;
  const k = -GM_SUN / (r2 * Math.sqrt(r2));
  let ax = k * x;
  let ay = k * y;
  for (const b of bodies) {
    const [px, py] = planetAt(b, t);
    const dx = x - px;
    const dy = y - py;
    const d2 = dx * dx + dy * dy + SOFT2;
    const kk = -planetGm(b) / (d2 * Math.sqrt(d2));
    ax += kk * dx;
    ay += kk * dy;
  }
  return [ax, ay];
}

function stepSize(x: number, y: number, t: number, bodies: Body[]): number {
  const eta = 0.02;
  let dt = 0.01;
  const rs = Math.hypot(x, y) + 1e-3;
  dt = Math.min(dt, eta * Math.sqrt((rs * rs * rs) / GM_SUN));
  for (const b of bodies) {
    const [px, py] = planetAt(b, t);
    const d = Math.hypot(x - px, y - py) + 1e-4;
    dt = Math.min(dt, eta * Math.sqrt((d * d * d) / planetGm(b)));
  }
  return Math.max(dt, 2e-6);
}

export interface RunOptions {
  /** record a sample at least this often (yr) */
  sampleEvery?: number;
  tMax?: number;
}

export function simulate(world: World, launch: Launch, opts: RunOptions = {}): Run {
  const sampleEvery = opts.sampleEvery ?? 0.02;
  const tEnd = opts.tMax ?? world.tMax;
  let x = launch.x;
  let y = launch.y;
  let vx = launch.vx + launch.dvx;
  let vy = launch.vy + launch.dvy;
  let t = launch.t0;
  const bodies = world.bodies;
  const samples: Sample[] = [{ t, x, y, vx, vy }];
  let lastSample = t;

  const fb = bodies.map<Flyby>((b) => ({
    id: b.id,
    closest: Infinity,
    tClosest: 0,
    vIn: 0,
    vOut: 0,
    relIn: 0,
    relOut: 0,
    behind: false,
    complete: false,
    tIn: 0,
    tOut: 0,
  }));
  const inside = bodies.map(() => false);
  const entered = bodies.map(() => false);

  let end: EndReason = 'time';
  let endBody: string | undefined;
  let maxR = Math.hypot(x, y);
  let minR = maxR;
  let swept = 0;
  let lastAng = Math.atan2(y, x);

  let a0 = accel(x, y, t, bodies);
  let guard = 0;
  while (t < tEnd && guard++ < 400000) {
    const dt = Math.min(stepSize(x, y, t, bodies), tEnd - t);
    vx += 0.5 * dt * a0[0];
    vy += 0.5 * dt * a0[1];
    x += dt * vx;
    y += dt * vy;
    t += dt;
    a0 = accel(x, y, t, bodies);
    vx += 0.5 * dt * a0[0];
    vy += 0.5 * dt * a0[1];

    const r = Math.hypot(x, y);
    if (r > maxR) maxR = r;
    if (r < minR) minR = r;
    const ang = Math.atan2(y, x);
    let da = ang - lastAng;
    if (da > Math.PI) da -= 2 * Math.PI;
    if (da < -Math.PI) da += 2 * Math.PI;
    swept += da;
    lastAng = ang;

    const speed = Math.hypot(vx, vy);
    let stop = false;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const [px, py] = planetAt(b, t);
      const d = Math.hypot(x - px, y - py);
      const f = fb[i];
      if (d < f.closest) {
        f.closest = d;
        f.tClosest = t;
        const [pvx, pvy] = planetVel(b, t);
        f.behind = (x - px) * pvx + (y - py) * pvy < 0;
      }
      const [pvx, pvy] = planetVel(b, t);
      const rel = Math.hypot(vx - pvx, vy - pvy);
      if (d < b.zone && !inside[i]) {
        inside[i] = true;
        if (!entered[i]) {
          entered[i] = true;
          f.vIn = speed;
          f.relIn = rel;
          f.tIn = t;
        }
      } else if (d >= b.zone && inside[i]) {
        inside[i] = false;
        if (!f.complete) {
          f.complete = true;
          f.vOut = speed;
          f.relOut = rel;
          f.tOut = t;
        }
      }
      if (d < b.hitR) {
        end = 'planet';
        endBody = b.id;
        stop = true;
      }
    }
    if (r < SUN_HIT_R) {
      end = 'sun';
      stop = true;
    } else if (r > LOST_R) {
      end = 'lost';
      stop = true;
    }

    const near = inside.some(Boolean);
    if (t - lastSample >= (near ? sampleEvery / 6 : sampleEvery) || stop || t >= tEnd) {
      samples.push({ t, x, y, vx, vy });
      lastSample = t;
    }
    if (stop) break;
  }

  // a flyby still in progress when the run stops is reported as it stands
  for (let i = 0; i < fb.length; i++) {
    if (entered[i] && !fb[i].complete) {
      fb[i].vOut = Math.hypot(vx, vy);
      fb[i].tOut = t;
    }
  }

  return { samples, flybys: fb.filter((f) => f.closest < Infinity), end, endBody, maxR, minR, swept };
}

/** Earth-launch helper: velocity of a body on its circle at time t. */
export function launchFromBody(b: Body, t0: number, dvx: number, dvy: number): Launch {
  const [x, y] = planetAt(b, t0);
  const [vx, vy] = planetVel(b, t0);
  return { x, y, vx, vy, dvx, dvy, t0 };
}

export function speedOf(s: Sample): number {
  return Math.hypot(s.vx, s.vy);
}

/** Interpolated sample at time t (samples are time-ordered). */
export function sampleAt(samples: Sample[], t: number): Sample {
  if (t <= samples[0].t) return samples[0];
  const last = samples[samples.length - 1];
  if (t >= last.t) return last;
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const u = (t - a.t) / (b.t - a.t || 1);
  return {
    t,
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
    vx: a.vx + (b.vx - a.vx) * u,
    vy: a.vy + (b.vy - a.vy) * u,
  };
}
