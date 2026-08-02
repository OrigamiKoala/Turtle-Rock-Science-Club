import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RotateCcw,
  ChevronRight,
  Trophy,
  Lightbulb,
  Minus,
  Circle,
  CircleDashed,
  Square,
  Triangle,
  GitFork,
  Filter as FilterIcon,
  Waves
} from 'lucide-react';

/**
 * Lightbender
 * -----------
 * A laser fires from a fixed emitter. Mirrors, lenses, glass blocks and
 * prisms are dragged onto a grid to steer it into one or more targets. The
 * beam is genuinely ray-traced — Snell's law at every glass/prism surface,
 * a wavelength-dependent index of refraction for the prism (so white light
 * fans into a rainbow), and total internal reflection past the critical
 * angle. Nothing here is a scripted animation; every bounce and bend comes
 * out of the same handful of vector formulas run fresh every frame.
 */

// --------------------------------------------------------------- geometry

interface Vec {
  x: number;
  y: number;
}

const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;
const norm = (a: Vec): Vec => {
  const l = Math.hypot(a.x, a.y) || 1;
  return { x: a.x / l, y: a.y / l };
};
const fromAngle = (deg: number): Vec => {
  const r = (deg * Math.PI) / 180;
  return { x: Math.cos(r), y: Math.sin(r) };
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const CELL = 52;
const GRID_COLS = 12;
const GRID_ROWS = 9;
const BOARD_W = CELL * GRID_COLS;
const BOARD_H = CELL * GRID_ROWS;

const cellCenter = (cell: { x: number; y: number }): Vec => ({
  x: cell.x * CELL + CELL / 2,
  y: cell.y * CELL + CELL / 2
});
const pixelToCell = (p: Vec) => ({
  x: clamp(Math.floor(p.x / CELL), 0, GRID_COLS - 1),
  y: clamp(Math.floor(p.y / CELL), 0, GRID_ROWS - 1)
});

// -------------------------------------------------------------- wavelength

/**
 * Six bands standing in for red→violet. `n` is deliberately spread wider
 * than real glass dispersion so the prism level fans out visibly on a small
 * canvas — the *order* (violet bends most) is the real physics; the
 * magnitude is exaggerated for readability, same trade every optics toy
 * makes.
 */
const WAVELENGTHS = [
  { name: 'Red', hex: '#f43f5e', n: 1.44 },
  { name: 'Orange', hex: '#fb923c', n: 1.47 },
  { name: 'Yellow', hex: '#facc15', n: 1.5 },
  { name: 'Green', hex: '#4ade80', n: 1.53 },
  { name: 'Blue', hex: '#60a5fa', n: 1.57 },
  { name: 'Violet', hex: '#a78bfa', n: 1.62 }
];

const GLASS_INDEX = 1.5;
const PIPE_INDEX = 1.8;

// -------------------------------------------------------------- components

type ComponentType =
  | 'mirror'
  | 'splitter'
  | 'lensConvex'
  | 'lensConcave'
  | 'glass'
  | 'prism'
  | 'pipe'
  | 'filter';

type IconComp = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

const COMPONENT_META: Record<ComponentType, { label: string; icon: IconComp; color: string }> = {
  mirror: { label: 'Mirror', icon: Minus, color: '#e5e7eb' },
  splitter: { label: 'Splitter', icon: GitFork, color: '#fcd34d' },
  lensConvex: { label: 'Convex Lens', icon: Circle, color: '#93c5fd' },
  lensConcave: { label: 'Concave Lens', icon: CircleDashed, color: '#a5b4fc' },
  glass: { label: 'Glass Block', icon: Square, color: '#bfdbfe' },
  prism: { label: 'Prism', icon: Triangle, color: '#c4b5fd' },
  pipe: { label: 'Light Pipe', icon: Waves, color: '#67e8f9' },
  filter: { label: 'Filter', icon: FilterIcon, color: '#fca5a5' }
};

const TRAY_ORDER: ComponentType[] = [
  'mirror',
  'splitter',
  'lensConvex',
  'lensConcave',
  'glass',
  'prism',
  'pipe',
  'filter'
];

/** Half-length of the line-segment components (mirror/splitter/lens). */
const HALF_LEN = CELL * 0.34;
/** Glass/pipe rectangle: half-width along its face, half-depth (half thickness). */
const GLASS_HALF_W = CELL * 0.3;
const GLASS_HALF_D = CELL * 0.21;
const PIPE_HALF_D = CELL * 0.25;
const PRISM_RADIUS = CELL * 0.34;
const GATE_RADIUS = CELL * 0.22;
const LENS_FOCAL = CELL * 2.4;

interface PlacedComponent {
  id: number;
  type: ComponentType;
  cell: { x: number; y: number };
  angleDeg: number;
  /** Only meaningful for 'filter' — index into WAVELENGTHS. */
  filterWavelength?: number;
}

// ------------------------------------------------------------------ level

interface LevelTarget {
  x: number;
  y: number;
  r: number;
  /** Index into WAVELENGTHS the beam must carry; undefined = any color counts. */
  wavelength?: number;
}

interface LevelWall {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Level {
  name: string;
  brief: string;
  hint: string;
  emitter: { x: number; y: number; angleDeg: number; wavelengths?: number[] };
  targets: LevelTarget[];
  walls: LevelWall[];
  inventory: Partial<Record<ComponentType, number>>;
  par?: number;
}

const LEVELS: Level[] = [
  {
    name: 'First Bounce',
    brief: 'One mirror, one target. The beam leaves at the same angle it arrives.',
    hint: 'Rotate the mirror until the reflected beam climbs up and to the right, straight into the target.',
    emitter: { x: 26, y: 234, angleDeg: 0 },
    targets: [{ x: 442, y: 78, r: 20 }],
    walls: [],
    inventory: { mirror: 1 }
  },
  {
    name: 'Corner Pocket',
    brief: 'A wall blocks the straight shot. Route around it with two mirrors.',
    hint: 'Bounce the beam up and over the wall with the first mirror, then bounce it back sideways with the second so it clears the top of the wall entirely.',
    emitter: { x: 26, y: 130, angleDeg: 0 },
    targets: [{ x: 494, y: 78, r: 20 }],
    walls: [{ x: 312, y: 104, w: 52, h: 52 }],
    inventory: { mirror: 2 }
  },
  {
    name: 'Through the Glass',
    brief: "No mirror this time — the target sits off to the side of the straight path. You must refract, not reflect.",
    hint: 'Light entering glass at an angle bends toward the normal, then bends back the same amount leaving — but it exits parallel to how it went in, just shifted sideways. Angle the block to shift the beam onto the target.',
    emitter: { x: 26, y: 234, angleDeg: 0 },
    targets: [{ x: 520, y: 214, r: 16 }],
    walls: [],
    inventory: { glass: 1 }
  },
  {
    name: 'Split Decision',
    brief: 'Two targets, only one beam splitter. Send half the beam each way.',
    hint: 'The splitter sends part of the beam straight through — aim that half at one target by placing the splitter directly on the beam line. Use the mirror to steer the reflected half at the other.',
    emitter: { x: 26, y: 234, angleDeg: 0 },
    targets: [
      { x: 600, y: 234, r: 20 },
      { x: 494, y: 78, r: 20 }
    ],
    walls: [],
    inventory: { splitter: 1, mirror: 2 }
  },
  {
    name: 'Rainbow Gate',
    brief: 'A white beam, a red-only target and a violet-only target on opposite sides. Filters alone cannot reach both.',
    hint: "The prism bends every color by a different amount — violet the most, red the least — fanning the white beam into six separate rays. Only that fan can satisfy a red target and a violet target with a single shot.",
    emitter: { x: 26, y: 234, angleDeg: 0, wavelengths: [0, 1, 2, 3, 4, 5] },
    targets: [
      { x: 520, y: 210, r: 20, wavelength: 0 },
      { x: 560, y: 274, r: 20, wavelength: 5 }
    ],
    walls: [],
    inventory: { prism: 1, filter: 1, mirror: 1 }
  },
  {
    name: 'Light Pipe',
    brief: 'The target is around a corner, behind an opaque wall. A high-index block can trap light and steer it — but only at a shallow angle.',
    hint: 'Past the critical angle, light inside a dense block cannot escape at all — it reflects internally instead, like a hidden mirror. Send the beam in shallow (close to grazing) so it bounces along the block toward the target rather than punching straight through.',
    emitter: { x: 26, y: 234, angleDeg: 0 },
    targets: [{ x: 560, y: 390, r: 24 }],
    walls: [{ x: 300, y: 100, w: 56, h: 260 }],
    inventory: { mirror: 1, pipe: 2 }
  },
  {
    name: 'Observatory',
    brief: 'Three scattered targets, a full toolkit, and a par count. Plan the route before you place anything.',
    hint: 'One target takes any color, one wants pure red, one wants pure violet — that last pair means the prism is doing real work here, not just the mirrors. Solve it in par pieces or fewer for the bonus.',
    emitter: { x: 26, y: 234, angleDeg: 0, wavelengths: [0, 1, 2, 3, 4, 5] },
    targets: [
      { x: 300, y: 70, r: 20 },
      { x: 560, y: 120, r: 20, wavelength: 0 },
      { x: 560, y: 410, r: 20, wavelength: 5 }
    ],
    walls: [{ x: 400, y: 200, w: 50, h: 80 }],
    inventory: {
      mirror: 3,
      splitter: 1,
      lensConvex: 1,
      lensConcave: 1,
      glass: 1,
      prism: 1,
      pipe: 1,
      filter: 1
    },
    par: 6
  }
];

/** Read by `badges.ts` so the "solved everything" achievement tracks reality. */
export const LIGHTBENDER_LEVEL_COUNT = LEVELS.length;

// ------------------------------------------------------------ ray tracing

interface Surface {
  a: Vec;
  b: Vec;
  normal: Vec;
  center: Vec;
  kind: 'mirror' | 'splitter' | 'lens' | 'glass' | 'prism' | 'pipe';
  focal?: number;
  /** Shared id across a polygon's edges (glass/prism/pipe), used to know
   *  whether a ray is currently travelling inside that specific shape. */
  shapeId?: number;
}

interface Gate {
  center: Vec;
  radius: number;
  wavelength: number;
}

interface WallSeg {
  a: Vec;
  b: Vec;
}

interface TraceTarget {
  id: number;
  center: Vec;
  radius: number;
  wavelength?: number;
}

interface Segment {
  a: Vec;
  b: Vec;
  wavelength: number;
}

interface TraceCtx {
  surfaces: Surface[];
  gates: Gate[];
  walls: WallSeg[];
  targets: TraceTarget[];
  segments: Segment[];
  hits: Map<number, Set<number>>;
}

const T_EPS = 1e-4;
const NUDGE = 0.02;
const MAX_DEPTH = 30;
const FAR = 1400;

function intersectRaySegment(o: Vec, d: Vec, a: Vec, b: Vec): number | null {
  const e = sub(b, a);
  const denom = d.x * e.y - d.y * e.x;
  if (Math.abs(denom) < 1e-9) return null;
  const diff = sub(a, o);
  const t = (diff.x * e.y - diff.y * e.x) / denom;
  const s = (diff.x * d.y - diff.y * d.x) / denom;
  if (t > T_EPS && s >= -1e-6 && s <= 1 + 1e-6) return t;
  return null;
}

function intersectRayCircle(o: Vec, d: Vec, c: Vec, r: number): number | null {
  const oc = sub(o, c);
  const b = 2 * dot(oc, d);
  const cq = dot(oc, oc) - r * r;
  const disc = b * b - 4 * cq;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  const t1 = (-b - sq) / 2;
  const t2 = (-b + sq) / 2;
  if (t1 > T_EPS) return t1;
  if (t2 > T_EPS) return t2;
  return null;
}

function reflect(d: Vec, n: Vec): Vec {
  const dn = dot(d, n);
  return norm({ x: d.x - 2 * dn * n.x, y: d.y - 2 * dn * n.y });
}

/** Snell's law in vector form. Returns null on total internal reflection. */
function refract(d: Vec, surfaceNormal: Vec, eta: number): Vec | null {
  let n = surfaceNormal;
  let cosI = -dot(d, n);
  if (cosI < 0) {
    n = { x: -n.x, y: -n.y };
    cosI = -cosI;
  }
  const sin2T = eta * eta * (1 - cosI * cosI);
  if (sin2T > 1) return null;
  const cosT = Math.sqrt(1 - sin2T);
  return norm({
    x: eta * d.x + (eta * cosI - cosT) * n.x,
    y: eta * d.y + (eta * cosI - cosT) * n.y
  });
}

/**
 * Approximate thin-lens ray transfer: height at the lens plane is
 * unchanged (zero thickness), and the outgoing slope relative to the axis
 * is `slopeIn - h/focal`. Positive focal converges, negative diverges.
 * Not a physically exact non-paraxial model, but qualitatively correct —
 * rays above the axis bend toward it for a convex lens — which is what a
 * puzzle needs.
 */
function lensDeflect(d: Vec, hitPoint: Vec, center: Vec, axis: Vec, focal: number): Vec {
  const t = { x: -axis.y, y: axis.x };
  const dA = dot(d, axis);
  const dT = dot(d, t);
  if (Math.abs(dA) < 1e-6) return d;
  const forward = dA >= 0 ? 1 : -1;
  const slopeIn = dT / dA;
  const h = dot(sub(hitPoint, center), t);
  const slopeOut = slopeIn - h / focal;
  return norm({
    x: axis.x * forward + t.x * slopeOut * forward,
    y: axis.y * forward + t.y * slopeOut * forward
  });
}

function materialIndex(kind: Surface['kind'], wavelength: number): number {
  if (kind === 'prism') return WAVELENGTHS[wavelength].n;
  if (kind === 'pipe') return PIPE_INDEX;
  return GLASS_INDEX;
}

function traceRay(
  ctx: TraceCtx,
  origin: Vec,
  dir: Vec,
  wavelength: number,
  depth: number,
  insideShapeId: number | null
) {
  if (depth > MAX_DEPTH) return;

  let bestT = Infinity;
  let kind: 'wall' | 'target' | 'gate' | 'surface' | null = null;
  let hitSurface: Surface | null = null;
  let hitGate: Gate | null = null;
  let hitTargetIdx = -1;

  for (const seg of ctx.walls) {
    const t = intersectRaySegment(origin, dir, seg.a, seg.b);
    if (t !== null && t < bestT) {
      bestT = t;
      kind = 'wall';
    }
  }
  ctx.targets.forEach((tg, i) => {
    const t = intersectRayCircle(origin, dir, tg.center, tg.radius);
    if (t !== null && t < bestT) {
      bestT = t;
      kind = 'target';
      hitTargetIdx = i;
    }
  });
  for (const g of ctx.gates) {
    const t = intersectRayCircle(origin, dir, g.center, g.radius);
    if (t !== null && t < bestT) {
      bestT = t;
      kind = 'gate';
      hitGate = g;
    }
  }
  const candidates =
    insideShapeId !== null ? ctx.surfaces.filter((s) => s.shapeId === insideShapeId) : ctx.surfaces;
  for (const s of candidates) {
    const t = intersectRaySegment(origin, dir, s.a, s.b);
    if (t !== null && t < bestT) {
      bestT = t;
      kind = 'surface';
      hitSurface = s;
    }
  }

  if (kind === null) {
    ctx.segments.push({ a: origin, b: add(origin, scale(dir, FAR)), wavelength });
    return;
  }

  const hitPoint = add(origin, scale(dir, bestT));
  ctx.segments.push({ a: origin, b: hitPoint, wavelength });

  if (kind === 'wall') return;

  if (kind === 'target') {
    const tg = ctx.targets[hitTargetIdx];
    if (!ctx.hits.has(tg.id)) ctx.hits.set(tg.id, new Set());
    ctx.hits.get(tg.id)?.add(wavelength);
    return;
  }

  if (kind === 'gate' && hitGate) {
    if (hitGate.wavelength === wavelength) {
      traceRay(ctx, add(hitPoint, scale(dir, NUDGE)), dir, wavelength, depth + 1, insideShapeId);
    }
    return;
  }

  if (kind === 'surface' && hitSurface) {
    const s = hitSurface;

    if (s.kind === 'mirror' || s.kind === 'splitter') {
      const newDir = reflect(dir, s.normal);
      traceRay(ctx, add(hitPoint, scale(newDir, NUDGE)), newDir, wavelength, depth + 1, insideShapeId);
      if (s.kind === 'splitter') {
        traceRay(ctx, add(hitPoint, scale(dir, NUDGE)), dir, wavelength, depth + 1, insideShapeId);
      }
      return;
    }

    if (s.kind === 'lens') {
      const newDir = lensDeflect(dir, hitPoint, s.center, s.normal, s.focal ?? 999999);
      traceRay(ctx, add(hitPoint, scale(newDir, NUDGE)), newDir, wavelength, depth + 1, insideShapeId);
      return;
    }

    // glass / prism / pipe — the candidate filter above guarantees that
    // whenever insideShapeId is set, the only surfaces tested belong to
    // that shape, so this is always an exit; otherwise it's always an entry.
    const entering = insideShapeId !== (s.shapeId ?? null);
    const material = materialIndex(s.kind, wavelength);
    const eta = entering ? 1 / material : material;
    const refr = refract(dir, s.normal, eta);
    if (refr === null) {
      const newDir = reflect(dir, s.normal);
      traceRay(ctx, add(hitPoint, scale(newDir, NUDGE)), newDir, wavelength, depth + 1, insideShapeId);
    } else {
      const nextInside = entering ? s.shapeId ?? null : null;
      traceRay(ctx, add(hitPoint, scale(refr, NUDGE)), refr, wavelength, depth + 1, nextInside);
    }
  }
}

// --------------------------------------------------------------- geometry

function segmentFor(center: Vec, angleDeg: number, halfLen: number) {
  const dir = fromAngle(angleDeg);
  const a = { x: center.x - dir.x * halfLen, y: center.y - dir.y * halfLen };
  const b = { x: center.x + dir.x * halfLen, y: center.y + dir.y * halfLen };
  const normal = norm({ x: -dir.y, y: dir.x });
  return { a, b, normal };
}

function rectCorners(center: Vec, angleDeg: number, halfW: number, halfD: number): Vec[] {
  const t = fromAngle(angleDeg);
  const n = { x: -t.y, y: t.x };
  const p = (sw: number, sd: number): Vec => ({
    x: center.x + t.x * sw * halfW + n.x * sd * halfD,
    y: center.y + t.y * sw * halfW + n.y * sd * halfD
  });
  return [p(-1, -1), p(1, -1), p(1, 1), p(-1, 1)];
}

function triCorners(center: Vec, angleDeg: number, radius: number): Vec[] {
  return [0, 120, 240].map((offset) => {
    const dir = fromAngle(angleDeg + offset);
    return { x: center.x + dir.x * radius, y: center.y + dir.y * radius };
  });
}

function edgesFromPolygon(corners: Vec[]) {
  return corners.map((c, i) => {
    const b = corners[(i + 1) % corners.length];
    const dir = norm(sub(b, c));
    const normal = norm({ x: -dir.y, y: dir.x });
    return { a: c, b, normal };
  });
}

/** Builds the optical surfaces and filter gates for the current component layout. */
function buildScene(components: PlacedComponent[]): { surfaces: Surface[]; gates: Gate[] } {
  const surfaces: Surface[] = [];
  const gates: Gate[] = [];

  for (const c of components) {
    const center = cellCenter(c.cell);
    switch (c.type) {
      case 'mirror':
      case 'splitter': {
        const { a, b, normal } = segmentFor(center, c.angleDeg, HALF_LEN);
        surfaces.push({ a, b, normal, center, kind: c.type });
        break;
      }
      case 'lensConvex':
      case 'lensConcave': {
        const { a, b, normal } = segmentFor(center, c.angleDeg, HALF_LEN);
        surfaces.push({
          a,
          b,
          normal,
          center,
          kind: 'lens',
          focal: c.type === 'lensConvex' ? LENS_FOCAL : -LENS_FOCAL
        });
        break;
      }
      case 'glass':
      case 'pipe': {
        const halfD = c.type === 'glass' ? GLASS_HALF_D : PIPE_HALF_D;
        const corners = rectCorners(center, c.angleDeg, GLASS_HALF_W, halfD);
        for (const e of edgesFromPolygon(corners)) {
          surfaces.push({ ...e, center, kind: c.type, shapeId: c.id });
        }
        break;
      }
      case 'prism': {
        const corners = triCorners(center, c.angleDeg, PRISM_RADIUS);
        for (const e of edgesFromPolygon(corners)) {
          surfaces.push({ ...e, center, kind: 'prism', shapeId: c.id });
        }
        break;
      }
      case 'filter': {
        gates.push({ center, radius: GATE_RADIUS, wavelength: c.filterWavelength ?? 0 });
        break;
      }
    }
  }

  return { surfaces, gates };
}

function wallSegments(level: Level): WallSeg[] {
  const segs: WallSeg[] = [];
  for (const w of level.walls) {
    const p1 = { x: w.x, y: w.y };
    const p2 = { x: w.x + w.w, y: w.y };
    const p3 = { x: w.x + w.w, y: w.y + w.h };
    const p4 = { x: w.x, y: w.y + w.h };
    segs.push({ a: p1, b: p2 }, { a: p2, b: p3 }, { a: p3, b: p4 }, { a: p4, b: p1 });
  }
  return segs;
}

function traceAll(
  level: Level,
  surfaces: Surface[],
  gates: Gate[],
  walls: WallSeg[]
): { segments: Segment[]; hits: Map<number, Set<number>> } {
  const targets: TraceTarget[] = level.targets.map((t, i) => ({
    id: i,
    center: { x: t.x, y: t.y },
    radius: t.r,
    wavelength: t.wavelength
  }));
  const ctx: TraceCtx = { surfaces, gates, walls, targets, segments: [], hits: new Map() };
  const wavelengths = level.emitter.wavelengths ?? [0];
  const dir = fromAngle(level.emitter.angleDeg);
  const origin = { x: level.emitter.x, y: level.emitter.y };
  for (const wl of wavelengths) traceRay(ctx, origin, dir, wl, 0, null);
  return { segments: ctx.segments, hits: ctx.hits };
}

function targetSatisfied(hits: Map<number, Set<number>>, index: number, target: LevelTarget): boolean {
  const set = hits.get(index);
  if (!set) return false;
  return target.wavelength === undefined ? set.size > 0 : set.has(target.wavelength);
}

function isLevelSolved(level: Level, components: PlacedComponent[]): boolean {
  const { surfaces, gates } = buildScene(components);
  const { hits } = traceAll(level, surfaces, gates, wallSegments(level));
  return level.targets.every((t, i) => targetSatisfied(hits, i, t));
}

// ------------------------------------------------------------- placement

/** Placement rule: never on the emitter, a target, a wall, or another piece. */
function isValidDropCell(
  level: Level,
  cell: { x: number; y: number },
  comps: PlacedComponent[],
  excludeId: number | null
): boolean {
  if (cell.x < 0 || cell.x >= GRID_COLS || cell.y < 0 || cell.y >= GRID_ROWS) return false;
  const c = cellCenter(cell);
  const KEEPOUT = CELL * 0.55;
  if (Math.hypot(c.x - level.emitter.x, c.y - level.emitter.y) < KEEPOUT) return false;
  for (const t of level.targets) {
    if (Math.hypot(c.x - t.x, c.y - t.y) < KEEPOUT) return false;
  }
  const pad = CELL * 0.3;
  for (const w of level.walls) {
    if (c.x > w.x - pad && c.x < w.x + w.w + pad && c.y > w.y - pad && c.y < w.y + w.h + pad) return false;
  }
  for (const comp of comps) {
    if (excludeId !== null && comp.id === excludeId) continue;
    if (comp.cell.x === cell.x && comp.cell.y === cell.y) return false;
  }
  return true;
}

function rotateOrCycle(c: PlacedComponent): PlacedComponent {
  if (c.type === 'filter') {
    return { ...c, filterWavelength: ((c.filterWavelength ?? 0) + 1) % WAVELENGTHS.length };
  }
  return { ...c, angleDeg: (c.angleDeg + 15) % 360 };
}

interface DragState {
  kind: 'new' | 'move';
  type: ComponentType;
  id: number;
  cell: { x: number; y: number };
  filterWavelength?: number;
  valid: boolean;
  overCanvas: boolean;
  moved: boolean;
  startClientX: number;
  startClientY: number;
}

// -------------------------------------------------------------- component

interface LightbenderProps {
  solvedLevels: number[];
  onSolve: (levelIndex: number) => void;
}

export default function Lightbender({ solvedLevels, onSolve }: LightbenderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const nextId = useRef(1);

  const [levelIndex, setLevelIndex] = useState(0);
  const [components, setComponents] = useState<PlacedComponent[]>([]);
  const [showHint, setShowHint] = useState(false);

  const componentsRef = useRef<PlacedComponent[]>([]);
  useEffect(() => {
    componentsRef.current = components;
  }, [components]);

  const level = LEVELS[levelIndex];
  const wallSegs = useMemo(() => wallSegments(level), [level]);

  useEffect(() => {
    setComponents([]);
    setShowHint(false);
    dragRef.current = null;
  }, [levelIndex]);

  const solved = useMemo(() => isLevelSolved(level, components), [level, components]);
  useEffect(() => {
    if (solved) onSolve(levelIndex);
  }, [solved, levelIndex, onSolve]);

  const remaining = useCallback(
    (type: ComponentType) => {
      const total = level.inventory[type] ?? 0;
      const used = components.filter((c) => c.type === type).length;
      return total - used;
    },
    [level, components]
  );

  // -------------------------------------------------------------- pointer

  const canvasPointFromEvent = useCallback((clientX: number, clientY: number): Vec => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * BOARD_W,
      y: ((clientY - rect.top) / rect.height) * BOARD_H
    };
  }, []);

  const isOverCanvas = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }, []);

  const handleChipPointerDown = useCallback(
    (type: ComponentType) => (e: React.PointerEvent) => {
      if (remaining(type) <= 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const p = canvasPointFromEvent(e.clientX, e.clientY);
      dragRef.current = {
        kind: 'new',
        type,
        id: -1,
        cell: pixelToCell(p),
        filterWavelength: type === 'filter' ? 0 : undefined,
        valid: false,
        overCanvas: isOverCanvas(e.clientX, e.clientY),
        moved: false,
        startClientX: e.clientX,
        startClientY: e.clientY
      };
    },
    [remaining, canvasPointFromEvent, isOverCanvas]
  );

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = canvasPointFromEvent(e.clientX, e.clientY);
    const cell = pixelToCell(p);
    const hit = componentsRef.current.find((c) => c.cell.x === cell.x && c.cell.y === cell.y);
    if (!hit) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      kind: 'move',
      type: hit.type,
      id: hit.id,
      cell: hit.cell,
      filterWavelength: hit.filterWavelength,
      valid: true,
      overCanvas: true,
      moved: false,
      startClientX: e.clientX,
      startClientY: e.clientY
    };
  }, [canvasPointFromEvent]);

  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dist = Math.hypot(e.clientX - drag.startClientX, e.clientY - drag.startClientY);
      if (dist > 4) drag.moved = true;
      const over = isOverCanvas(e.clientX, e.clientY);
      drag.overCanvas = over;
      const p = canvasPointFromEvent(e.clientX, e.clientY);
      drag.cell = pixelToCell(p);
      drag.valid = over && isValidDropCell(level, drag.cell, componentsRef.current, drag.kind === 'move' ? drag.id : null);
    },
    [canvasPointFromEvent, isOverCanvas, level]
  );

  const handleDragEnd = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    if (drag.kind === 'move') {
      if (!drag.moved) {
        setComponents((prev) => prev.map((c) => (c.id === drag.id ? rotateOrCycle(c) : c)));
      } else if (!drag.overCanvas) {
        setComponents((prev) => prev.filter((c) => c.id !== drag.id));
      } else if (drag.valid) {
        setComponents((prev) => prev.map((c) => (c.id === drag.id ? { ...c, cell: drag.cell } : c)));
      }
    } else if (drag.valid) {
      const id = nextId.current++;
      setComponents((prev) => [
        ...prev,
        { id, type: drag.type, cell: drag.cell, angleDeg: 0, filterWavelength: drag.filterWavelength }
      ]);
    }
  }, []);

  const handleDragCancel = useCallback(() => {
    dragRef.current = null;
  }, []);

  // -------------------------------------------------------------- drawing

  function liveComponentsForDraw(): PlacedComponent[] {
    const drag = dragRef.current;
    const base = componentsRef.current;
    if (!drag) return base;
    if (drag.kind === 'move') {
      if (!drag.moved) return base;
      if (!drag.overCanvas) return base.filter((c) => c.id !== drag.id);
      return base.map((c) => (c.id === drag.id ? { ...c, cell: drag.cell } : c));
    }
    return [
      ...base,
      { id: -1, type: drag.type, cell: drag.cell, angleDeg: 0, filterWavelength: drag.filterWavelength }
    ];
  }

  function drawComponent(ctx: CanvasRenderingContext2D, c: PlacedComponent, isGhost: boolean, valid: boolean) {
    const center = cellCenter(c.cell);
    const tint = isGhost && !valid ? '#ef4444' : null;
    ctx.save();
    ctx.globalAlpha = isGhost ? (valid ? 0.6 : 0.4) : 1;

    switch (c.type) {
      case 'mirror':
      case 'splitter': {
        const { a, b } = segmentFor(center, c.angleDeg, HALF_LEN);
        ctx.strokeStyle = tint ?? COMPONENT_META[c.type].color;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        if (c.type === 'splitter') ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      case 'lensConvex':
      case 'lensConcave': {
        const { a, b } = segmentFor(center, c.angleDeg, HALF_LEN);
        ctx.strokeStyle = tint ?? '#60a5fa';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(center.x, center.y, c.type === 'lensConvex' ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = tint ?? COMPONENT_META[c.type].color;
        ctx.fill();
        break;
      }
      case 'glass':
      case 'pipe': {
        const halfD = c.type === 'glass' ? GLASS_HALF_D : PIPE_HALF_D;
        const corners = rectCorners(center, c.angleDeg, GLASS_HALF_W, halfD);
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
        ctx.closePath();
        ctx.fillStyle = tint ? `${tint}55` : c.type === 'glass' ? 'rgba(147,197,253,0.28)' : 'rgba(103,232,249,0.32)';
        ctx.fill();
        ctx.strokeStyle = tint ?? COMPONENT_META[c.type].color;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      }
      case 'prism': {
        const corners = triCorners(center, c.angleDeg, PRISM_RADIUS);
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
        ctx.closePath();
        ctx.fillStyle = tint ? `${tint}55` : 'rgba(196,181,253,0.32)';
        ctx.fill();
        ctx.strokeStyle = tint ?? COMPONENT_META.prism.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      }
      case 'filter': {
        const wl = WAVELENGTHS[c.filterWavelength ?? 0];
        ctx.beginPath();
        ctx.arc(center.x, center.y, GATE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = tint ? `${tint}55` : `${wl.hex}33`;
        ctx.fill();
        ctx.strokeStyle = tint ?? wl.hex;
        ctx.lineWidth = 3;
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, BOARD_W, BOARD_H);
    ctx.fillStyle = '#0a0a10';
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 1; x < GRID_COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, BOARD_H);
      ctx.stroke();
    }
    for (let y = 1; y < GRID_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(BOARD_W, y * CELL);
      ctx.stroke();
    }

    for (const w of level.walls) {
      ctx.fillStyle = '#27272a';
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
    }

    const drag = dragRef.current;
    if (drag && drag.moved) {
      const c = cellCenter(drag.cell);
      ctx.fillStyle = drag.valid ? 'rgba(52,211,153,0.16)' : 'rgba(239,68,68,0.16)';
      ctx.fillRect(c.x - CELL / 2, c.y - CELL / 2, CELL, CELL);
    }

    const comps = liveComponentsForDraw();
    const { surfaces, gates } = buildScene(comps);
    const { segments, hits } = traceAll(level, surfaces, gates, wallSegs);

    const ghostId = drag ? (drag.kind === 'new' ? -1 : drag.moved ? drag.id : null) : null;
    for (const c of comps) {
      drawComponent(ctx, c, c.id === ghostId, drag?.valid ?? true);
    }

    ctx.globalCompositeOperation = 'lighter';
    for (const seg of segments) {
      const color = WAVELENGTHS[seg.wavelength].hex;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(seg.a.x, seg.a.y);
      ctx.lineTo(seg.b.x, seg.b.y);
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    level.targets.forEach((t, i) => {
      const satisfied = targetSatisfied(hits, i, t);
      const ringColor = t.wavelength !== undefined ? WAVELENGTHS[t.wavelength].hex : '#e5e7eb';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.strokeStyle = satisfied ? '#34d399' : ringColor;
      ctx.lineWidth = satisfied ? 3.5 : 2.5;
      ctx.stroke();
      if (satisfied) {
        ctx.fillStyle = 'rgba(52,211,153,0.3)';
        ctx.fill();
      } else if (t.wavelength !== undefined) {
        ctx.fillStyle = `${ringColor}22`;
        ctx.fill();
      }
    });

    const emitterDir = fromAngle(level.emitter.angleDeg);
    const ep = { x: level.emitter.x, y: level.emitter.y };
    ctx.beginPath();
    ctx.arc(ep.x, ep.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ep.x, ep.y);
    ctx.lineTo(ep.x + emitterDir.x * 22, ep.y + emitterDir.y * 22);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [level, wallSegs]);

  useEffect(() => {
    const loop = () => {
      draw();
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [draw]);

  // ------------------------------------------------------------------ ui

  const trayTypes = TRAY_ORDER.filter((t) => (level.inventory[t] ?? 0) > 0);
  const isLast = levelIndex === LEVELS.length - 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {LEVELS.map((lvl, i) => (
          <button
            key={lvl.name}
            onClick={() => setLevelIndex(i)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono border transition cursor-pointer flex items-center gap-1.5 ${
              i === levelIndex
                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {solvedLevels.includes(i) && <Trophy className="w-3 h-3 text-amber-400" />}
            {i + 1}. {lvl.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-display font-bold text-lg text-white">
          {level.name}{' '}
          <span className="text-zinc-500 font-sans font-normal text-sm">— {level.brief}</span>
        </h4>
        <button
          onClick={() => setShowHint((s) => !s)}
          className="text-[11px] font-mono text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-1 shrink-0"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          {showHint ? 'Hide hint' : 'Hint'}
        </button>
      </div>

      {showHint && (
        <p className="text-xs text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 font-sans leading-relaxed">
          {level.hint}
        </p>
      )}

      <div
        className="flex flex-col lg:flex-row gap-4"
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragCancel}
      >
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a10] flex-1">
          <canvas
            ref={canvasRef}
            width={BOARD_W}
            height={BOARD_H}
            onPointerDown={handleCanvasPointerDown}
            className="w-full block touch-none select-none cursor-pointer"
          />

          {solved && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-center px-6">
              <Trophy className="w-10 h-10 text-amber-400" />
              <h4 className="font-display font-bold text-xl text-emerald-400">{level.name} solved!</h4>
              {level.par !== undefined && (
                <p className="text-xs text-zinc-300 font-mono">
                  {components.length} piece{components.length === 1 ? '' : 's'} used
                  {components.length <= level.par ? ' — under par!' : ` (par ${level.par})`}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setComponents([])}
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer transition"
                >
                  Rebuild
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
          )}
        </div>

        <div className="lg:w-52 shrink-0 space-y-2">
          <h5 className="text-[11px] font-mono uppercase tracking-wide text-zinc-500">Inventory</h5>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
            {trayTypes.map((type) => {
              const meta = COMPONENT_META[type];
              const Icon = meta.icon;
              const left = remaining(type);
              const total = level.inventory[type] ?? 0;
              const disabled = left <= 0;
              return (
                <button
                  key={type}
                  onPointerDown={handleChipPointerDown(type)}
                  disabled={disabled}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition touch-none select-none ${
                    disabled
                      ? 'bg-white/5 border-white/5 text-zinc-600 cursor-not-allowed'
                      : 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10 cursor-grab active:cursor-grabbing'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: disabled ? undefined : meta.color }} />
                  <span className="text-[11px] font-sans flex-1">{meta.label}</span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {left}/{total}
                  </span>
                </button>
              );
            })}
          </div>
          {level.par !== undefined && (
            <p className="text-[10px] font-mono text-zinc-500 pt-1">
              Par: {level.par} pieces · placed: {components.length}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-zinc-400">
        <span>Drag a piece onto the grid · click a placed piece to rotate · drag it off the grid to remove</span>
        <button
          onClick={() => setComponents([])}
          className="flex items-center gap-1.5 hover:text-white cursor-pointer transition"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Clear grid
        </button>
      </div>
    </div>
  );
}
