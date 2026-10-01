/**
 * The bar stage: a small canvas that draws ONLY the row of bars (plus the little
 * markers that point at them) and reports which slot was tapped.
 *
 * Everything else in Sort Squad — buttons, readouts, questions — is ordinary page
 * chrome, so it matches the other games, scales with the page, and can be reached
 * by keyboard and screen reader. The canvas is kept for the one thing it's good at:
 * bars that slide smoothly to their new slots.
 *
 * Bars are matched by VALUE when they move (`arrange`), so a swap or a flip makes
 * the very same bars glide to new places. `write` changes a bar's value in place
 * instead, which is what Merge, Timsort and Radix really do (and why duplicate
 * heights flash mid-pass, exactly as in the original game).
 */

import type { Step } from './logic';
import { bitsFor } from './logic';

export type HighlightKind = 'look' | 'swap' | 'place' | 'select';

export interface StageApi {
  /** Jump straight to these values (duplicates allowed). Clears highlights. */
  set(values: readonly number[]): void;
  /** Slide to this arrangement of the SAME bars. Falls back to `set` if they differ. */
  arrange(values: readonly number[]): void;
  /** Apply one recorded step and highlight what it touched. */
  applyStep(s: Step): void;
  highlight(a: number, b: number, kind: HighlightKind | null): void;
  /** Lift one bar to show it is selected; -1 for none. */
  lift(i: number): void;
  /** Outline bars 0..upTo (the part a flip would reverse); -1 for none. */
  range(upTo: number): void;
  /** Show each bar's binary digits (for Radix). */
  binary(on: boolean): void;
  onSlot(handler: ((slot: number) => void) | null): void;
  onHover(handler: ((slot: number) => void) | null): void;
  destroy(): void;
}

/* The stage draws into a fixed logical size and the CSS scales it, so the layout
   below never has to know how wide the page is. */
export const STAGE_W = 720;
export const STAGE_H = 290;
const BASE_Y = 228;
const MAXBAR_H = 196;

type RGB = [number, number, number];
const INK: RGB = [228, 228, 231];                       // zinc-200
const MUTED: RGB = [161, 161, 170];                     // zinc-400
const DARK: RGB = [13, 13, 18];                         // #0d0d12, the panel ground — used on bright bars
const FLOOR: RGB = [63, 63, 70];                        // zinc-700
const KIND_COLOR: Record<HighlightKind, RGB> = {        // the sibling games' semantic accents
  look: [251, 191, 36],                                 // amber-400  — looking / highlighted
  swap: [248, 113, 113],                                // red-400    — a swap
  place: [52, 211, 153],                                // emerald-400 — a placement
  select: [56, 189, 248]                                // sky-400    — selected
};
const css = (c: RGB, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const FONT = '"Nunito","Trebuchet MS","Segoe UI",system-ui,-apple-system,Arial,sans-serif';

interface Bar { val: number; x: number }

export function createStage(canvas: HTMLCanvasElement): StageApi {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const noop = () => { /* no canvas support: the page still works, just without the bars */ };
    return { set: noop, arrange: noop, applyStep: noop, highlight: noop, lift: noop, range: noop, binary: noop,
      onSlot: noop, onHover: noop, destroy: noop };
  }
  const g: CanvasRenderingContext2D = ctx;

  let bars: Bar[] = [];
  let n = 0, slotW = 60, barW = 46, unitH = 30, startX = 0;
  let hi1 = -1, hi2 = -1, hiKind: HighlightKind | null = null;
  let lifted = -1, rangeTo = -1;
  let showBinary = false, activeBit = -1;
  let slotHandler: ((slot: number) => void) | null = null;
  let hoverHandler: ((slot: number) => void) | null = null;

  const slotX = (i: number) => startX + i * slotW + (slotW - barW) / 2;

  function layout() {
    const avail = STAGE_W - 40;
    slotW = Math.min(90, Math.floor(avail / Math.max(1, n)));
    barW = slotW * 0.76;
    unitH = MAXBAR_H / Math.max(1, n);
    startX = Math.floor((STAGE_W - n * slotW) / 2);
  }

  function clearMarks() { hi1 = hi2 = -1; hiKind = null; lifted = -1; rangeTo = -1; activeBit = -1; }

  const api: StageApi = {
    set(values) {
      n = values.length;
      layout();
      bars = values.map((val, i) => ({ val, x: slotX(i) }));
      clearMarks();
    },
    arrange(values) {
      const byValue = new Map<number, Bar>();
      bars.forEach((b) => byValue.set(b.val, b));
      const next: Bar[] = [];
      for (const v of values) {
        const b = byValue.get(v);
        if (!b || values.length !== bars.length) { api.set(values); return; }
        byValue.delete(v);
        next.push(b);
      }
      bars = next;
    },
    applyStep(s) {
      if (s.type === 0) { hi1 = s.i; hi2 = s.j; hiKind = 'look'; }
      else if (s.type === 1) {
        const t = bars[s.i]; bars[s.i] = bars[s.j]; bars[s.j] = t;
        hi1 = s.i; hi2 = s.j; hiKind = 'swap';
      } else {
        bars[s.i].val = s.a;
        hi1 = s.i; hi2 = -1; hiKind = 'place'; activeBit = s.b - 1;
      }
    },
    highlight(a, b, kind) { hi1 = a; hi2 = b; hiKind = kind; },
    lift(i) { lifted = i; },
    range(upTo) { rangeTo = upTo; },
    binary(on) { showBinary = on; },
    onSlot(h) { slotHandler = h; },
    onHover(h) { hoverHandler = h; },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    }
  };

  /* ---------- input ---------- */
  function slotFromEvent(e: PointerEvent): number {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) * STAGE_W) / (r.width || 1);
    const i = Math.floor((x - startX) / slotW);
    return i >= 0 && i < n ? i : -1;
  }
  function onPointerDown(e: PointerEvent) {
    const i = slotFromEvent(e);
    if (i >= 0 && slotHandler) slotHandler(i);
  }
  function onPointerMove(e: PointerEvent) {
    if (e.pointerType === 'touch' || !hoverHandler) return;
    hoverHandler(slotFromEvent(e));
  }
  function onPointerLeave() { if (hoverHandler) hoverHandler(-1); }
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', onPointerLeave);

  /* ---------- drawing ---------- */
  function text(t: string, x: number, y: number, fs: number, color: RGB) {
    g.font = `bold ${fs}px ${FONT}`;
    g.fillStyle = css(color);
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.fillText(t, x, y);
  }
  function roundedRect(x: number, y: number, w: number, h: number, r: number) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  const barColor = (val: number) => `hsl(${((val - 1) * 300) / Math.max(1, n - 1)},78%,62%)`;

  function draw() {
    g.clearRect(0, 0, STAGE_W, STAGE_H);

    if (n === 0) return;
    g.fillStyle = css(FLOOR);
    g.fillRect(startX - 12, BASE_Y, n * slotW + 24, 4);

    if (rangeTo >= 0) {                                              // the part a flip would reverse
      const x0 = startX + 2, x1 = startX + (rangeTo + 1) * slotW - 2;
      roundedRect(x0, 14, x1 - x0, BASE_Y - 14 + 4, 12);
      g.fillStyle = css(KIND_COLOR.look, 0.09); g.fill();
      g.strokeStyle = css(KIND_COLOR.look, 0.55); g.lineWidth = 1.5; g.stroke();
    }

    let fs = Math.floor(barW * 0.45); if (fs > 24) fs = 24;          // numbers shrink with bar width
    let adv = Math.floor((slotW - 4) / Math.max(1, bitsFor(n))); if (adv > 14) adv = 14;
    const drawBinary = showBinary && adv >= 6;
    const outline = barW < 26 ? 2 : 3;
    const tri = Math.min(barW / 2, 10);

    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const h = Math.max(4, b.val * unitH);
      const y = BASE_Y - h - (i === lifted ? 14 : 0);
      const cx = b.x + barW / 2;
      roundedRect(b.x, y, barW, h, Math.min(8, barW * 0.2));
      g.fillStyle = barColor(b.val); g.fill();

      if (fs >= 10) {
        if (h >= fs + 6) text(String(b.val), cx, y + 5, fs, DARK);
        else             text(String(b.val), cx, y - fs - 2, fs, INK);   // too short: label above
      }

      const marked = i === hi1 || i === hi2;
      if ((marked && hiKind) || i === lifted) {
        const c = i === lifted ? KIND_COLOR.select : KIND_COLOR[hiKind as HighlightKind];
        g.strokeStyle = css(c); g.lineWidth = outline;
        g.strokeRect(b.x - outline / 2, y - outline / 2, barW + outline, h + outline);
        g.beginPath(); g.moveTo(cx, BASE_Y + 14); g.lineTo(cx - tri, BASE_Y + 14 + tri * 1.5); g.lineTo(cx + tri, BASE_Y + 14 + tri * 1.5);
        g.closePath(); g.fillStyle = css(c); g.fill();
      }

      if (drawBinary) {                                              // binary digits under each bar
        const bits = bitsFor(n);
        for (let k = 0; k < bits; k++) {
          const bit = bits - 1 - k;
          text(((b.val >> bit) & 1) ? '1' : '0', cx - (bits * adv) / 2 + k * adv + adv / 2, BASE_Y + 40,
            Math.floor(adv * 1.3), bit === activeBit ? KIND_COLOR.swap : MUTED);
        }
      }
    }
  }

  let cssW = 0;
  function fitCanvas() {
    const w = canvas.clientWidth || STAGE_W;
    if (w === cssW) return;
    cssW = w;
    const ratio = Math.max(1, Math.min(3, (w / STAGE_W) * (window.devicePixelRatio || 1)));
    canvas.width = Math.round(STAGE_W * ratio);
    canvas.height = Math.round(STAGE_H * ratio);
  }

  let last = 0, raf = 0, alive = true;
  function frame(ts: number) {
    if (!alive) return;
    const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016);
    last = ts;
    fitCanvas();
    const ratio = canvas.width / STAGE_W;
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    const k = Math.min(1, 10 * dt);                                  // bars ease toward their slots
    for (let i = 0; i < bars.length; i++) bars[i].x += (slotX(i) - bars[i].x) * k;
    draw();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return api;
}
