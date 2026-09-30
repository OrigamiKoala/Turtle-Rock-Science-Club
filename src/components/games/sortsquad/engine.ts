/**
 * Sort Squad's canvas engine.
 *
 * A port of the standalone `sort_squad.html`: an immediate-mode game where every
 * screen is redrawn each frame and the buttons are drawn (and hit-tested) on the
 * canvas itself. That structure is kept on purpose — it is what made the
 * original small and dependable — and wrapped in `createSortSquad` so the React
 * shell can mount and unmount it cleanly.
 *
 * All game state lives in this closure, NOT in React. `VirtualLab` rebuilds the
 * `onSolve` callback on every render, so an effect that depended on it would
 * tear the game down and restart it at the menu the instant the XP update
 * re-rendered the parent — right after a win. The shell therefore creates the
 * engine once and hands it callbacks that read the latest props through refs.
 *
 * Added on top of the original: the five "Robot Puzzles" (Who's That Robot? and
 * Which Robot Wins?), which are the only screens that award XP. Hand-sorting and
 * watching a robot stay as free play.
 */

import { ALG, ALG_COUNT, ALGO_NAME, ALGO_LABEL, ALGO_DESC, ALGO_LESSON, ALGO_CLUE, MIN_N, MAX_N, PUZZLES,
  bitsFor, buildSteps, evaluateBest, factorial, inversions, isSorted, makeBestList, makeMysteryRound,
  randomUnsorted, whyNot } from './logic';
import type { AlgId, BestOutcome, BestPuzzle, MysteryPuzzle, MysteryRound, Step } from './logic';

export interface EngineCallbacks {
  /** A puzzle was solved. `levelIndex` is its index in `PUZZLES`. */
  onSolve: (levelIndex: number) => void;
  /** Puzzle indices already solved (for the ticks on the menu and level select). */
  getSolved: () => number[];
}
export interface Engine { destroy: () => void }

type RGB = [number, number, number];
type State = 'menu' | 'play' | 'win' | 'pick' | 'guess' | 'watch' | 'done'
  | 'puzzles' | 'mystery' | 'mysteryEnd' | 'best' | 'bestEnd';
interface Bar { val: number; x: number }
interface Particle { x: number; y: number; vx: number; vy: number; c: string }

/* ---------- constants ---------- */
const SW = 1000, SH = 650;
const BASE_Y = 470, MAXBAR_H = 272;
const FONT = '"Nunito","Trebuchet MS","Segoe UI",system-ui,-apple-system,Arial,sans-serif';

/* The sibling games are always-dark instrument panels (STYLE.md §11), so the
   palette is the original's, re-inked for a dark ground. */
const BG: RGB = [13, 13, 18];            // #0d0d12 — the panel colour the other games use
const INK: RGB = [228, 228, 231];        // zinc-200
const MUTED: RGB = [161, 161, 170];      // zinc-400
const CARD: RGB = [24, 24, 32];
const FLOOR: RGB = [92, 92, 104];
const BLUE: RGB = [66, 116, 226], GREEN: RGB = [38, 150, 82], ORANGE: RGB = [222, 120, 24],
      PURPLE: RGB = [132, 88, 214], BTN: RGB = [84, 88, 116], YELLOW: RGB = [250, 200, 20],
      RED: RGB = [226, 68, 68], WHITE: RGB = [255, 255, 255];
const ALGO_COLOR: (RGB | null)[] = [null, BLUE, ORANGE, [46, 160, 84], PURPLE, [30, 160, 170],
  [220, 80, 150], [200, 150, 20], RED];

const css = (c: RGB, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const lighten = (c: RGB, f: number): RGB =>
  [c[0] + (255 - c[0]) * f, c[1] + (255 - c[1]) * f, c[2] + (255 - c[2]) * f].map(Math.round) as RGB;

export function createSortSquad(canvas: HTMLCanvasElement, cb: EngineCallbacks): Engine {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { destroy() { /* nothing was started */ } };
  const g: CanvasRenderingContext2D = ctx;

  /* ---------- state ---------- */
  let nbars = 8, sandboxBars = 8, slotW = 100, startX = 100, barW = 76, unitH = 34, radixPasses = 4;
  let bars: Bar[] = [];
  let state: State = 'menu';
  let T = 0, DT = 0.016;

  /* hand-sorting */
  let moves = 0, par = 0, sel = -1;

  /* watching a robot (free play) */
  let wSteps: Step[] = [], wIdx = 0, wTimer = 0, wStepTime = 0.6;
  let looks = 0, wmoves = 0, tries = 0;
  let hi1 = -1, hi2 = -1, hiType = 0, curStep: Step | null = null;
  let algo = 0, guess = 8, paused = false, turbo = false;

  /* Who's That Robot? */
  let mIdx = 0, mRound: MysteryRound | null = null, mStepIdx = 0, mSeen = 0, mTimer = 0, mStepTime = 0.4;
  let mPaused = false, mStepReq = false, mGuessesLeft = 2, mWrong: AlgId[] = [], mMsg = '';
  let mHint = false, mSolved = false, mStars = 0;
  let mHi1 = -1, mHi2 = -1, mHiType = 0, mLooks = 0, mSwaps = 0, mWrites = 0;

  /* Which Robot Wins? */
  let bIdx = 0, bList: number[] = [], bSel: AlgId | 0 = 0, bHint = false, bOutcome: BestOutcome | null = null;
  let bAnim = 0, bAttempts = 0, bCorrect = false, bStars = 0;

  let conf: Particle[] = [];

  /* ---------- input ---------- */
  const mouse = { x: -1000, y: -1000, down: false, pressed: false };
  let escPressed = false, wantPointer = false;
  /** A lifted finger leaves no hover, but the position may only be cleared AFTER the frame
      that sees the tap — a quick tap can press and release within one frame. */
  let clearPosAfterTick = false;

  function setPos(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) * SW) / (r.width || 1);
    mouse.y = ((e.clientY - r.top) * SH) / (r.height || 1);
  }
  const onPointerDown = (e: PointerEvent) => {
    setPos(e);
    mouse.down = true;
    mouse.pressed = true;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    canvas.focus({ preventScroll: true });   // so Escape reaches THIS game only
    e.preventDefault();
  };
  const onPointerUp = (e: PointerEvent) => {
    mouse.down = false;
    if (e.pointerType === 'touch') clearPosAfterTick = true;        // no hover on touch screens
  };
  const onPointerCancel = () => { mouse.down = false; };
  /* Escape is scoped to the focused canvas, not the window: the Join and Sign-up
     modals also close on Escape, and one keypress must not do both. */
  const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { escPressed = true; e.stopPropagation(); } };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', setPos);
  canvas.addEventListener('keydown', onKeyDown);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);

  /* ---------- drawing helpers ---------- */
  function text(t: string, x: number, y: number, fs: number, color: RGB, align: CanvasTextAlign = 'center') {
    g.font = `bold ${fs}px ${FONT}`;
    g.fillStyle = css(color);
    g.textAlign = align;
    g.textBaseline = 'top';
    g.fillText(t, x, y);
  }
  function textLines(t: string, cx: number, y: number, fs: number, lh: number, color: RGB) {
    t.split('\n').forEach((line, k) => text(line, cx, y + k * lh, fs, color));
  }
  function wrapLines(t: string, maxW: number, fs: number): string[] {
    g.font = `bold ${fs}px ${FONT}`;
    const out: string[] = [];
    for (const para of t.split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        const test = line ? `${line} ${word}` : word;
        if (line && g.measureText(test).width > maxW) { out.push(line); line = word; }
        else line = test;
      }
      out.push(line);
    }
    return out;
  }
  /** Word-wrapped, centred paragraph. Returns the number of lines drawn. */
  function paragraph(t: string, cx: number, y: number, fs: number, lh: number, color: RGB, maxW: number): number {
    const lines = wrapLines(t, maxW, fs);
    lines.forEach((line, k) => text(line, cx, y + k * lh, fs, color));
    return lines.length;
  }
  function rrPath(x: number, y: number, w: number, h: number, r: number) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function fillRR(x: number, y: number, w: number, h: number, r: number, color: string) {
    rrPath(x, y, w, h, r); g.fillStyle = color; g.fill();
  }
  function fillRect(x: number, y: number, w: number, h: number, color: RGB) {
    g.fillStyle = css(color); g.fillRect(x, y, w, h);
  }
  function fillTri(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, color: RGB) {
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(cx, cy); g.closePath();
    g.fillStyle = css(color); g.fill();
  }
  function drawStar(cx: number, cy: number, r: number, color: RGB) {
    g.beginPath();
    for (let k = 0; k < 10; k++) {
      const ang = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 === 0 ? r : r * 0.42;
      const px = cx + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr;
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.fillStyle = css(color); g.fill();
  }
  function drawStars(cx: number, cy: number, r: number, gap: number, earned: number) {
    for (let s = 0; s < 3; s++) drawStar(cx + (s - 1) * gap, cy, r, s < earned ? YELLOW : [58, 58, 68]);
  }
  const inside = (x: number, y: number, w: number, h: number) =>
    mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;

  function fitSize(label: string, fs: number, maxW: number): number {   // shrink text so it always fits its button
    g.font = `bold ${fs}px ${FONT}`;
    const w = g.measureText(label).width;
    return w > maxW ? Math.floor((fs * maxW) / w) : fs;
  }
  function button(x: number, y: number, w: number, h: number, label: string, color: RGB, fs: number, enabled = true): boolean {
    fs = fitSize(label, fs, w - 16);
    const hot = enabled && inside(x, y, w, h);
    if (hot) wantPointer = true;
    g.globalAlpha = enabled ? 1 : 0.35;
    fillRR(x, y + 4, w, h, 12, 'rgba(0,0,0,0.45)');
    fillRR(x, y, w, h, 12, css(hot ? lighten(color, 0.2) : color));
    text(label, x + w / 2, y + (h - fs) / 2 - fs * 0.05, fs, WHITE);
    g.globalAlpha = 1;
    if (hot && mouse.pressed) { mouse.pressed = false; return true; }
    return false;
  }
  /* like button(), but keeps firing while held down (id must be unique per button) */
  let heldId = 0, holdT = 0;
  function buttonRepeat(id: number, x: number, y: number, w: number, h: number, label: string, color: RGB, fs: number): boolean {
    let fire = button(x, y, w, h, label, color, fs);
    if (inside(x, y, w, h) && mouse.down) {
      if (heldId !== id) { if (fire) { heldId = id; holdT = 0; } }
      else { holdT += DT; if (holdT > 0.4) { holdT -= 0.06; fire = true; } }
    } else if (heldId === id) heldId = 0;
    return fire;
  }
  function backButton(label = 'Menu'): boolean {
    const clicked = button(20, 15, 100, 40, label, BTN, 22);
    return clicked || escPressed;
  }
  function header(info?: string) {
    text('SORT SQUAD', SW / 2, 15, 32, INK);
    if (info) text(info, SW / 2, 60, 26, INK);
  }
  function hintButton(shown: boolean): boolean {
    return button(SW - 130, 15, 110, 40, shown ? 'Hide hint' : 'Hint', BTN, 20);
  }

  function confettiInit() {
    conf = [];
    for (let i = 0; i < 150; i++) {
      conf.push({ x: Math.random() * SW, y: -Math.random() * 600, vx: Math.random() * 80 - 40,
        vy: 120 + Math.random() * 180, c: `hsl(${Math.floor(Math.random() * 360)},90%,60%)` });
    }
  }
  function confettiDraw(dt: number) {
    g.globalAlpha = 0.6;                       // a backdrop: it must never fight the text on top
    for (const p of conf) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y > SH) p.y = -10;
      g.fillStyle = p.c; g.fillRect(p.x, p.y, 8, 12);
    }
    g.globalAlpha = 1;
  }

  /* ---------- layout for the current bar count ---------- */
  function layoutBars() {
    const avail = nbars <= 8 ? 800 : 900;
    slotW = Math.floor(avail / nbars);
    if (slotW > 100) slotW = 100;                        // don't let few bars get fat
    barW = slotW * 0.76;
    unitH = MAXBAR_H / nbars;
    startX = Math.floor((SW - nbars * slotW) / 2);
    radixPasses = bitsFor(nbars);
  }
  const slotX = (i: number) => startX + i * slotW + (slotW - barW) / 2;

  /* ---------- bar logic ---------- */
  const values = () => bars.map((b) => b.val);
  function setBars(vals: number[]) { bars = vals.map((val, i) => ({ val, x: slotX(i) })); }
  function swapBars(i: number, j: number) { const t = bars[i]; bars[i] = bars[j]; bars[j] = t; }
  function newRound() { setBars(randomUnsorted(nbars, Math.random)); }
  function setSandboxBars(v: number) {
    sandboxBars = Math.max(MIN_N, Math.min(MAX_N, v));
    nbars = sandboxBars;
    layoutBars();
    newRound();
    guess = nbars;
  }
  /** Back to the menu; puzzles borrow their own bar count, so hand the player's back. */
  function goMenu() {
    state = 'menu';
    if (nbars !== sandboxBars) setSandboxBars(sandboxBars);
  }
  function updateBars(dt: number) {
    const k = Math.min(1, 10 * dt);
    for (let i = 0; i < bars.length; i++) bars[i].x += (slotX(i) - bars[i].x) * k;
  }
  const barColor = (val: number) => `hsl(${((val - 1) * 300) / Math.max(1, nbars - 1)},80%,62%)`;
  const oddsText = () => { const f = factorial(nbars); return f < 1e9 ? String(Math.round(f)) : f.toExponential(2); };

  /** lift = index of a lifted bar (or -1); o1/o2 = highlighted bars */
  function drawBars(lift: number, o1: number, o2: number, ocol: RGB) {
    fillRect(startX - 20, BASE_Y, nbars * slotW + 40, 6, FLOOR);
    let fs = Math.floor(barW * 0.42); if (fs > 26) fs = 26;                  // numbers shrink with bar width
    let adv = Math.floor((slotW - 4) / radixPasses); if (adv > 16) adv = 16; // binary digit width
    const showBinary = algo === ALG.RADIX && adv >= 7 && (state === 'guess' || state === 'watch');
    const outline = barW < 30 ? 2 : 4;
    const tri = Math.min(barW / 2, 12);

    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const h = b.val * unitH;
      const y = BASE_Y - h - (i === lift ? 16 : 0);
      const cx = b.x + barW / 2;
      fillRR(b.x, y, barW, h, Math.min(10, barW * 0.2), barColor(b.val));

      if (fs >= 12) {
        if (h >= fs + 6) text(String(b.val), cx, y + 6, fs, BG);
        else             text(String(b.val), cx, y - fs - 2, fs, INK);       // too short: label above
      }
      if (i === o1 || i === o2 || i === lift) {
        const c = i === lift ? BLUE : ocol;
        g.strokeStyle = css(c); g.lineWidth = outline;
        g.strokeRect(b.x - outline / 2, y - outline / 2, barW + outline, h + outline);
        fillTri(cx, BASE_Y + 20, cx - tri, BASE_Y + 42, cx + tri, BASE_Y + 42, c);
      }
      if (showBinary) {                                                       // binary digits under each bar
        for (let k = 0; k < radixPasses; k++) {
          const bit = radixPasses - 1 - k;
          const active = state === 'watch' && curStep !== null && curStep.type === 2 && curStep.b - 1 === bit;
          text((b.val >> bit) & 1 ? '1' : '0', cx - (radixPasses * adv) / 2 + k * adv + adv / 2,
            BASE_Y + 50, Math.floor(adv * 1.35), active ? RED : MUTED);
        }
      }
    }
  }
  function slotAt(): number {
    if (mouse.y < BASE_Y - MAXBAR_H - 20 || mouse.y > BASE_Y + 60 || mouse.x < startX) return -1;
    const i = Math.floor((mouse.x - startX) / slotW);
    return i >= 0 && i < nbars ? i : -1;
  }

  /** Apply one recorded step to the on-screen bars. */
  function applyToBars(s: Step) {
    if (s.type === 1) swapBars(s.i, s.j);
    else if (s.type === 2) bars[s.i].val = s.a;
  }
  const typeColor = (t: number): RGB => (t === 0 ? YELLOW : t === 1 ? RED : GREEN);
  const stepTimeFor = (n: number) => Math.max(0.03, Math.min(0.6, (0.6 * 64) / (n * n)));

  /* ---------- free play: hand-sorting ---------- */
  function startPlay() {
    newRound();
    par = inversions(values()); moves = 0; sel = -1; state = 'play';
  }

  /* ---------- free play: watching a robot ---------- */
  const bogoShuffle = () => { for (let i = nbars - 1; i > 0; i--) swapBars(i, Math.floor(Math.random() * (i + 1))); };
  function applyWatchStep() {
    const s = wSteps[wIdx++];
    curStep = s; hiType = s.type;
    hi1 = s.i; hi2 = s.type === 2 ? -1 : s.j;
    if (s.type === 0) looks++; else wmoves++;
    applyToBars(s);
  }
  function startWatch() {
    wSteps = algo !== ALG.BOGO ? buildSteps(algo as AlgId, values()) : [];
    wIdx = 0; looks = wmoves = tries = 0;
    hi1 = hi2 = -1; curStep = null;
    wTimer = 0; paused = false; turbo = false;
    wStepTime = stepTimeFor(nbars);          // more bars = more steps, so start faster
    state = 'watch';
  }

  /* ---------- Robot Puzzles ---------- */
  function enterPuzzle(idx: number) {
    if (PUZZLES[idx].kind === 'mystery') enterMystery(idx); else enterBest(idx, false);
  }
  /* Who's That Robot? */
  function resetPlayback() {
    if (!mRound) return;
    setBars(mRound.start);
    mStepIdx = 0; mTimer = 0; mPaused = false; mStepReq = false;
    mHi1 = mHi2 = -1; mHiType = 0; mLooks = mSwaps = mWrites = 0;
  }
  function enterMystery(idx: number) {
    const p = PUZZLES[idx] as MysteryPuzzle;
    mIdx = idx;
    nbars = p.n; layoutBars();
    mRound = makeMysteryRound(p, Math.random);
    resetPlayback();
    mSeen = 0; mGuessesLeft = 2; mWrong = []; mMsg = ''; mHint = false; mSolved = false; mStars = 0;
    mStepTime = Math.max(0.12, stepTimeFor(p.n) * 0.6);
    state = 'mystery';
  }
  function applyMysteryStep() {
    if (!mRound) return;
    const s = mRound.steps[mStepIdx++];
    mSeen = Math.max(mSeen, mStepIdx);
    mHiType = s.type; mHi1 = s.i; mHi2 = s.type === 2 ? -1 : s.j;
    if (s.type === 0) mLooks++; else if (s.type === 1) mSwaps++; else mWrites++;
    applyToBars(s);
  }
  /** Show the finished run, whatever the player got to see. */
  function finishMystery() {
    if (!mRound) return;
    setBars(mRound.start);
    for (const s of mRound.steps) applyToBars(s);
    mHi1 = mHi2 = -1;
  }
  function guessRobot(a: AlgId) {
    if (!mRound) return;
    if (a === mRound.alg) {
      const frac = mSeen / mRound.steps.length;
      mStars = Math.max(1, 3 - mWrong.length - (frac > 0.6 ? 1 : 0));
      mSolved = true;
      finishMystery();
      confettiInit();
      state = 'mysteryEnd';
      cb.onSolve(mIdx);
      return;
    }
    mWrong.push(a);
    mGuessesLeft--;
    mMsg = whyNot(a, mRound.steps.slice(0, mSeen), mRound.start)
      ?? `Nothing you've seen rules ${ALGO_NAME[a]} out yet — but it isn't that one. Watch for what tells them apart.`;
    if (mGuessesLeft <= 0) {
      mSolved = false;
      finishMystery();
      state = 'mysteryEnd';
    }
  }
  const neutralStatus = (s: Step) =>
    s.type === 0 ? `Is ${s.a} bigger than ${s.b}?` : s.type === 1 ? 'Swap!' : `Places a ${s.a} into slot ${s.i + 1}`;
  function tapeText(): string {
    if (!mRound || mStepIdx === 0) return 'Press Faster or Step to start watching…';
    const parts: string[] = [];
    for (let k = Math.max(0, mStepIdx - 5); k < mStepIdx; k++) {
      const s = mRound.steps[k];
      parts.push(s.type === 0 ? `look ${s.i + 1}·${s.j + 1}` : s.type === 1 ? `swap ${s.i + 1}·${s.j + 1}` : `place → ${s.i + 1}`);
    }
    return `Last steps:  ${parts.join('  ›  ')}`;
  }

  /* Which Robot Wins? */
  function enterBest(idx: number, keepAttempts: boolean) {
    const p = PUZZLES[idx] as BestPuzzle;
    bIdx = idx;
    nbars = p.n; layoutBars();
    bList = makeBestList(p, Math.random);
    setBars(bList);
    bSel = 0; bHint = false; bOutcome = null; bAnim = 0; bCorrect = false; bStars = 0;
    if (!keepAttempts) bAttempts = 0;
    state = 'best';
  }
  function race() {
    const p = PUZZLES[bIdx] as BestPuzzle;
    bOutcome = evaluateBest(p, bList);
    bAttempts++;
    bAnim = 0;
    bCorrect = bSel === bOutcome.winner;
    state = 'bestEnd';
    if (bCorrect) {
      bStars = bAttempts === 1 ? 3 : bAttempts === 2 ? 2 : 1;
      confettiInit();
      cb.onSolve(bIdx);
    }
  }

  /* ---------- screens: menu and free play ---------- */
  function screenMenu() {
    text('SORT SQUAD', SW / 2, 44, 80, INK);
    text('Learn how computers put things in order!', SW / 2, 135, 26, MUTED);

    const solved = new Set(cb.getSolved().filter((i) => i >= 0 && i < PUZZLES.length)).size;
    if (button(300, 185, 400, 72, 'Robot Puzzles', GREEN, 32)) state = 'puzzles';
    text(`${solved} of ${PUZZLES.length} solved — these earn XP`, SW / 2, 263, 18, MUTED);

    if (button(300, 295, 400, 60, 'You sort the bars!', BLUE, 28)) startPlay();
    if (button(300, 367, 400, 60, 'Watch a robot sort', PURPLE, 28)) state = 'pick';

    /* how many bars? (hold the button to change quickly) */
    if (buttonRepeat(5, 335, 445, 55, 50, '-', BTN, 34)) setSandboxBars(sandboxBars - 1);
    text(`${sandboxBars} bars`, SW / 2, 452, 34, INK);
    if (buttonRepeat(6, 610, 445, 55, 50, '+', BTN, 34)) setSandboxBars(sandboxBars + 1);
    text('Free play — only Robot Puzzles earn XP', SW / 2, 500, 16, MUTED);

    /* bobbing rainbow bars for decoration (always 8, whatever the setting) */
    for (let i = 0; i < 8; i++) {
      const h = (i + 1) * 13 + Math.sin(T * 2.5 + i * 0.7) * 6;
      fillRR(180 + i * 80 + 10, 630 - h, 60, h, 10, `hsl(${(i * 300) / 7},80%,62%)`);
    }
  }

  function screenPlay() {
    header(`Swaps: ${moves}      Par: ${par}`);
    text('Click a bar, then click its neighbor to swap them. Sort short to tall!', SW / 2, 105, 22, MUTED);

    const i = slotAt();
    if (i >= 0) wantPointer = true;
    if (mouse.pressed && i >= 0) {
      mouse.pressed = false;
      if (sel >= 0 && Math.abs(i - sel) === 1) {
        swapBars(sel, i); moves++; sel = -1;
        if (isSorted(values())) { state = 'win'; confettiInit(); }
      } else {
        sel = i === sel ? -1 : i;
      }
    }
    drawBars(sel, -1, -1, BLUE);
    text('Par = the fewest swaps possible. Can you match it?', SW / 2, 530, 22, MUTED);
    if (backButton()) goMenu();
  }

  function screenWin() {
    confettiDraw(DT);
    text('SORTED!', SW / 2, 55, 48, [70, 200, 110]);
    const stars = moves === par ? 3 : moves <= par + 3 ? 2 : 1;
    drawStars(SW / 2, 140, 24, 60, stars);
    drawBars(-1, -1, -1, BLUE);
    text(`You used ${moves} swaps. Par was ${par}.`, SW / 2, 495, 26, INK);
    text('Each swap of neighbors fixes only ONE flipped pair, so par is the minimum!', SW / 2, 530, 20, MUTED);

    if (button(300, 575, 190, 55, 'Play again', BLUE, 26)) startPlay();
    if (button(510, 575, 190, 55, 'Menu', BTN, 26)) goMenu();
  }

  function screenPick() {
    header(`Pick a sorting robot  (${nbars} bars)`);
    for (let a = 1; a < ALG_COUNT; a++) {
      const col = (a - 1) % 4, row = Math.floor((a - 1) / 4);
      const x = 30 + col * 240, y = 100 + row * 265;
      fillRR(x, y, 220, 250, 18, css(CARD));
      if (button(x + 15, y + 12, 190, 55, ALGO_LABEL[a], ALGO_COLOR[a] as RGB, 26)) {
        algo = a; newRound(); guess = nbars;
        if (a === ALG.BOGO) startWatch();        // nothing to guess: it's luck!
        else state = 'guess';
      }
      textLines(ALGO_DESC[a], x + 110, y + 85, 18, 22, INK);
    }
    if (backButton()) goMenu();
  }

  function screenGuess() {
    header(ALGO_NAME[algo]);
    text('How many MOVES will the robot make?  (a move = a swap or a placement)', SW / 2, 105, 22, MUTED);
    drawBars(-1, -1, -1, BLUE);

    if (buttonRepeat(1, 170, 555, 80, 60, '-10', BTN, 30)) guess -= 10;
    if (buttonRepeat(2, 260, 555, 60, 60, '-', BTN, 40)) guess -= 1;
    text(String(guess), 410, 560, 56, INK);
    if (buttonRepeat(3, 500, 555, 60, 60, '+', BTN, 40)) guess += 1;
    if (buttonRepeat(4, 570, 555, 80, 60, '+10', BTN, 30)) guess += 10;
    guess = Math.max(0, Math.min(999, guess));

    if (button(690, 555, 220, 60, 'Start robot!', GREEN, 28)) startWatch();
    if (backButton('Back')) state = 'pick';
  }

  function screenWatch(dt: number) {
    const bogo = algo === ALG.BOGO;
    header(bogo ? `${ALGO_NAME[algo]}      Shuffles: ${tries}`
                : `${ALGO_NAME[algo]}      Looks: ${looks}      Moves: ${wmoves}`);

    /* ---- advance the robot ---- */
    if (bogo) {
      if (!paused) {
        if (turbo) {
          for (let k = 0; k < 4000 && !isSorted(values()); k++) { bogoShuffle(); tries++; }
        } else {
          wTimer += dt;
          if (wTimer >= wStepTime) { wTimer = 0; bogoShuffle(); tries++; }
        }
        if (isSorted(values())) { state = 'done'; turbo = false; confettiInit(); }
      }
    } else if (!paused) {
      wTimer += dt;
      let guard = 0;
      while (wTimer >= wStepTime && guard++ < 200) {        // several steps per frame when fast
        wTimer -= wStepTime;
        if (wIdx < wSteps.length) applyWatchStep();
        else { state = 'done'; hi1 = hi2 = -1; if (guess === wmoves) confettiInit(); break; }
      }
      if (wTimer > wStepTime) wTimer = 0;
    }

    /* ---- status line ---- */
    let status: string, sc: RGB = INK;
    if (bogo) {
      status = tries ? 'Sorted yet? Nope! Shuffling again...' : 'Here we go!';
      text(`Odds of getting lucky on each shuffle: 1 in ${oddsText()}`, SW / 2, 140, 20, MUTED);
    } else if (!curStep) {
      status = 'Here we go!';
    } else if (curStep.type === 0) {
      status = algo === ALG.QUICK ? `Is the pivot (${curStep.a}) bigger than ${curStep.b}?`
                                  : `Is ${curStep.a} bigger than ${curStep.b}?`;
    } else if (curStep.type === 1) {
      status = 'Yes! Swap them!'; sc = [255, 110, 110];
    } else {
      status = algo === ALG.RADIX ? `Pass ${curStep.b} of ${radixPasses} (0s first, then 1s): placing ${curStep.a}`
                                  : `Placing ${curStep.a} into slot ${curStep.i + 1}`;
      sc = [90, 210, 130];
    }
    text(status, SW / 2, 105, 26, sc);

    drawBars(-1, hi1, hi2, typeColor(hiType));

    /* ---- controls ---- */
    const slower = () => { if (wStepTime < 1.5) wStepTime *= 1.4; };
    const faster = () => { wStepTime = Math.max(0.004, wStepTime / 1.4); };
    if (bogo) {
      if (button(120, 570, 170, 55, paused ? 'Resume' : 'Pause', BLUE, 26)) paused = !paused;
      if (button(320, 570, 170, 55, 'Slower', BTN, 26)) slower();
      if (button(520, 570, 170, 55, 'Faster', BTN, 26)) faster();
      if (button(720, 570, 170, 55, turbo ? 'Turbo: ON' : 'Turbo: OFF', RED, 26)) turbo = !turbo;
    } else {
      if (button(200, 570, 180, 55, paused ? 'Resume' : 'Pause', BLUE, 26)) paused = !paused;
      if (button(410, 570, 180, 55, 'Slower', BTN, 26)) slower();
      if (button(620, 570, 180, 55, 'Faster', BTN, 26)) faster();
    }
    if (backButton()) goMenu();
  }

  function screenDone(dt: number) {
    const bogo = algo === ALG.BOGO;
    if (bogo || guess === wmoves) confettiDraw(dt);
    let info: string, res: string, rc: RGB = INK;
    if (bogo) {
      info = `${ALGO_NAME[algo]} finished!      Shuffles: ${tries}`;
      if (tries < factorial(nbars)) { res = `Lucky! Faster than the average of ${oddsText()} shuffles.`; rc = [90, 210, 130]; }
      else                          { res = `Unlucky! Slower than the average of ${oddsText()} shuffles.`; rc = [255, 110, 110]; }
    } else {
      info = `${ALGO_NAME[algo]} finished!      Looks: ${looks}      Moves: ${wmoves}`;
      if (guess === wmoves) { res = `You guessed ${guess} moves - EXACTLY RIGHT!`; rc = [90, 210, 130]; }
      else res = `You guessed ${guess} moves - off by ${Math.abs(guess - wmoves)}.`;
    }
    header(info);
    text(res, SW / 2, 105, 28, rc);
    drawBars(-1, -1, -1, BLUE);
    textLines(ALGO_LESSON[algo], SW / 2, 490, 22, 28, INK);

    if (button(210, 575, 280, 55, 'Try another robot', PURPLE, 26)) state = 'pick';
    if (button(510, 575, 280, 55, 'Menu', BTN, 26)) goMenu();
  }

  /* ---------- screens: Robot Puzzles ---------- */
  function screenPuzzles() {
    header('Robot Puzzles');
    text('Think it through. Solve a puzzle to earn XP.', SW / 2, 100, 22, MUTED);
    const solved = cb.getSolved();
    const cw = 176, gap = 15, x0 = (SW - (PUZZLES.length * cw + (PUZZLES.length - 1) * gap)) / 2;

    PUZZLES.forEach((p, i) => {
      const x = x0 + i * (cw + gap), y = 150, h = 350;
      const mystery = p.kind === 'mystery';
      const fam: RGB = mystery ? PURPLE : ORANGE;
      const hot = inside(x, y, cw, h);
      if (hot) wantPointer = true;

      fillRR(x, y, cw, h, 18, css(hot ? [34, 34, 46] : CARD));
      rrPath(x, y, cw, h, 18); g.strokeStyle = css(hot ? fam : [58, 58, 68]); g.lineWidth = 2; g.stroke();

      g.beginPath(); g.arc(x + cw / 2, y + 44, 24, 0, Math.PI * 2); g.fillStyle = css(fam); g.fill();
      text(String(i + 1), x + cw / 2, y + 44 - 14, 28, WHITE);

      text(mystery ? "WHO'S THAT ROBOT?" : 'WHICH ROBOT WINS?', x + cw / 2, y + 84, 14, lighten(fam, 0.45));
      const tl = paragraph(p.title, x + cw / 2, y + 110, 22, 26, INK, cw - 24);
      paragraph(p.blurb, x + cw / 2, y + 110 + tl * 26 + 10, 16, 20, MUTED, cw - 28);

      const done = solved.includes(i);
      text(done ? 'Solved ✓' : `+${10 + 5 * i} XP`, x + cw / 2, y + h - 44, 20, done ? [90, 210, 130] : MUTED);

      if (hot && mouse.pressed) { mouse.pressed = false; enterPuzzle(i); }
    });
    if (backButton()) goMenu();
  }

  function screenMystery(dt: number) {
    if (!mRound) return;
    const p = PUZZLES[mIdx] as MysteryPuzzle;
    const total = mRound.steps.length;
    const finished = mStepIdx >= total;
    header(`Who's That Robot?  ·  ${p.title}`);

    /* ---- advance the robot ---- */
    if (!mPaused && !finished) {
      mTimer += dt;
      let guard = 0;
      while (mTimer >= mStepTime && mStepIdx < total && guard++ < 200) { mTimer -= mStepTime; applyMysteryStep(); }
      if (mTimer > mStepTime) mTimer = 0;
    } else if (mPaused && mStepReq && !finished) {
      applyMysteryStep();
    }
    mStepReq = false;

    /* ---- what the player is allowed to see: never the robot's name or style ---- */
    const cur = mStepIdx > 0 ? mRound.steps[mStepIdx - 1] : null;
    text(cur ? neutralStatus(cur) : 'Watch closely…', SW / 2, 100, 24, cur ? INK : MUTED);
    text(`Looks: ${mLooks}     Swaps: ${mSwaps}     Placements: ${mWrites}`, SW / 2, 134, 20, MUTED);
    text(`Which robot is it?    Tries left: ${mGuessesLeft}`, SW / 2, 164, 20, INK);

    drawBars(-1, mHi1, mHi2, typeColor(mHiType));

    /* ---- hint, or feedback on the last wrong guess, or the recent-steps tape ---- */
    if (mHint) paragraph(p.hint, SW / 2, 514, 16, 20, [255, 213, 90], 900);
    else if (mMsg) paragraph(mMsg, SW / 2, 514, 17, 21, [255, 150, 150], 900);
    else text(tapeText(), SW / 2, 516, 16, MUTED);

    /* ---- guess row ---- */
    const pool = p.pool.slice().sort((a, b) => a - b);
    const k = pool.length, gw = Math.min(150, Math.floor((940 - (k - 1) * 10) / k));
    const gx0 = (SW - (k * gw + (k - 1) * 10)) / 2;
    pool.forEach((a, n) => {
      const wrong = mWrong.includes(a);
      if (button(gx0 + n * (gw + 10), 558, gw, 40, wrong ? `✗ ${ALGO_LABEL[a]}` : ALGO_LABEL[a],
        ALGO_COLOR[a] as RGB, 20, !wrong && mGuessesLeft > 0 && mSeen >= 1)) guessRobot(a);
    });

    /* ---- controls ---- */
    const slower = () => { if (mStepTime < 1.5) mStepTime *= 1.4; };
    const faster = () => { mStepTime = Math.max(0.03, mStepTime / 1.4); };
    if (finished) {
      if (button(190, 606, 150, 36, 'Watch again', BLUE, 19)) resetPlayback();
    } else if (button(190, 606, 150, 36, mPaused ? 'Resume' : 'Pause', BLUE, 19)) mPaused = !mPaused;
    if (button(350, 606, 150, 36, 'Step', BTN, 19, mPaused && !finished)) mStepReq = true;
    if (button(510, 606, 150, 36, 'Slower', BTN, 19)) slower();
    if (button(670, 606, 150, 36, 'Faster', BTN, 19)) faster();

    if (hintButton(mHint)) mHint = !mHint;
    if (backButton('Puzzles')) state = 'puzzles';
  }

  function screenMysteryEnd(dt: number) {
    if (!mRound) return;
    if (mSolved) confettiDraw(dt);
    header(`Who's That Robot?  ·  ${(PUZZLES[mIdx] as MysteryPuzzle).title}`);
    if (mSolved) {
      text(`It's ${ALGO_NAME[mRound.alg]}!`, SW / 2, 100, 32, [90, 210, 130]);
      drawStars(SW / 2, 160, 18, 48, mStars);
    } else {
      text(`Out of tries — it was ${ALGO_NAME[mRound.alg]}.`, SW / 2, 100, 30, [255, 130, 130]);
    }
    drawBars(-1, -1, -1, BLUE);
    paragraph(ALGO_CLUE[mRound.alg], SW / 2, 490, 19, 25, INK, 880);

    const nxt = mIdx + 1 < PUZZLES.length && mSolved ? mIdx + 1 : -1;
    const row: [string, RGB, () => void][] = [];
    if (nxt >= 0) row.push(['Next puzzle', GREEN, () => enterPuzzle(nxt)]);
    else if (!mSolved) row.push(['Try again', BLUE, () => enterMystery(mIdx)]);
    else row.push(['Play again', BLUE, () => enterMystery(mIdx)]);
    row.push(['Puzzles', PURPLE, () => { state = 'puzzles'; }]);
    row.push(['Menu', BTN, goMenu]);
    const bw = 200, bg = 20, bx0 = (SW - (row.length * bw + (row.length - 1) * bg)) / 2;
    row.forEach(([label, color, fn], n) => { if (button(bx0 + n * (bw + bg), 588, bw, 50, label, color, 24)) fn(); });
  }

  function screenBest() {
    const p = PUZZLES[bIdx] as BestPuzzle;
    header(`Which Robot Wins?  ·  ${p.title}`);
    text('Which robot finishes with the FEWEST steps on this list?', SW / 2, 100, 24, INK);
    text('One step = one look, one swap, or one placement.', SW / 2, 134, 18, MUTED);
    drawBars(-1, -1, -1, BLUE);

    if (bHint) paragraph(p.hint, SW / 2, 480, 16, 19, [255, 213, 90], 900);

    const k = p.candidates.length, cw = Math.min(200, Math.floor((900 - (k - 1) * 16) / k));
    const cx0 = (SW - (k * cw + (k - 1) * 16)) / 2;
    p.candidates.forEach((a, n) => {
      const x = cx0 + n * (cw + 16);
      if (button(x, 522, cw, 52, ALGO_LABEL[a], ALGO_COLOR[a] as RGB, 24)) bSel = a;
      if (bSel === a) {
        rrPath(x - 5, 517, cw + 10, 62, 16); g.strokeStyle = css(WHITE); g.lineWidth = 3; g.stroke();
      }
    });
    if (button(370, 590, 260, 48, bSel ? `Race them! (${ALGO_LABEL[bSel]})` : 'Pick a robot first', GREEN, 24, bSel !== 0)) race();

    if (hintButton(bHint)) bHint = !bHint;
    if (backButton('Puzzles')) state = 'puzzles';
  }

  function screenBestEnd(dt: number) {
    if (!bOutcome) return;
    const p = PUZZLES[bIdx] as BestPuzzle;
    header(`Which Robot Wins?  ·  ${p.title}`);
    bAnim = Math.min(1, bAnim + dt / 1.7);
    const ease = 1 - Math.pow(1 - bAnim, 3);
    const done = bAnim >= 1;
    if (bCorrect && done) confettiDraw(dt);

    /* legend */
    fillRect(300, 104, 16, 16, YELLOW); text('Looks', 324, 101, 18, MUTED, 'left');
    fillRect(420, 104, 16, 16, [90, 210, 130]); text('Swaps and placements', 444, 101, 18, MUTED, 'left');

    const maxTotal = Math.max(...bOutcome.results.map((r) => r.total));
    const scale = 560 / maxTotal;
    bOutcome.results.forEach((r, n) => {
      const y = 150 + n * 84;
      const win = done && r.alg === bOutcome!.winner;
      text(ALGO_LABEL[r.alg], 190, y + 6, 26, ALGO_COLOR[r.alg] as RGB, 'right');
      const lw = r.looks * scale * ease, mw = r.moves * scale * ease;
      if (lw > 0) { g.fillStyle = css(YELLOW); g.fillRect(210, y, lw, 44); }
      if (mw > 0) { g.fillStyle = css([90, 210, 130]); g.fillRect(210 + lw, y, mw, 44); }
      const shown = Math.round(r.total * ease);
      text(`${shown}`, 210 + lw + mw + 12, y + 8, 26, win ? [255, 213, 90] : INK, 'left');
      if (win) {
        rrPath(203, y - 6, lw + mw + 92, 56, 12); g.strokeStyle = css([255, 213, 90]); g.lineWidth = 3; g.stroke();
      }
      if (done && r.alg === bSel) text('◀ your pick', 970, y + 10, 18, MUTED, 'right');
    });

    if (done) {
      const w = bOutcome.results.find((r) => r.alg === bOutcome!.winner)!;
      const mine = bOutcome.results.find((r) => r.alg === bSel)!;
      if (bCorrect) {
        text(`Right! ${ALGO_NAME[w.alg]} needed the fewest steps (${w.total}).`, SW / 2, 462, 26, [90, 210, 130]);
        drawStars(900, 126, 14, 36, bStars);
      } else {
        text(`Not quite — ${ALGO_NAME[w.alg]} did it in ${w.total}; ${ALGO_NAME[mine.alg]} took ${mine.total}.`, SW / 2, 462, 24, [255, 130, 130]);
      }
      paragraph(bestLesson(p, bOutcome), SW / 2, 502, 18, 23, INK, 900);

      const row: [string, RGB, () => void][] = [];
      const nxt = bCorrect && bIdx + 1 < PUZZLES.length ? bIdx + 1 : -1;
      if (nxt >= 0) row.push(['Next puzzle', GREEN, () => enterPuzzle(nxt)]);
      else if (!bCorrect) row.push(['Try again', BLUE, () => enterBest(bIdx, true)]);
      else row.push(['Play again', BLUE, () => enterBest(bIdx, false)]);
      row.push(['Puzzles', PURPLE, () => { state = 'puzzles'; }]);
      row.push(['Menu', BTN, goMenu]);
      const bw = 190, bg = 20, bx0 = (SW - (row.length * bw + (row.length - 1) * bg)) / 2;
      row.forEach(([label, color, fn], n) => { if (button(bx0 + n * (bw + bg), 592, bw, 46, label, color, 22)) fn(); });
    }
    if (backButton('Puzzles')) state = 'puzzles';
  }

  /** The verdict's explanation. Only ever shown once the answer is locked in. */
  function bestLesson(p: BestPuzzle, o: BestOutcome): string {
    return p.lesson || ALGO_LESSON[o.winner];
  }

  /* ---------- main loop ---------- */
  let cssW = 0;
  function fitCanvas() {
    const w = canvas.clientWidth || SW;
    if (w === cssW) return;
    cssW = w;
    const ratio = Math.max(1, Math.min(3, (w / SW) * (window.devicePixelRatio || 1)));
    canvas.width = Math.round(SW * ratio);
    canvas.height = Math.round(SH * ratio);
  }

  function tick(dt: number) {
    DT = dt; T += dt;
    fitCanvas();
    const ratio = canvas.width / SW;
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    fillRect(0, 0, SW, SH, BG);
    wantPointer = false;
    updateBars(dt);

    switch (state) {
      case 'menu':       screenMenu(); break;
      case 'play':       screenPlay(); break;
      case 'win':        screenWin(); break;
      case 'pick':       screenPick(); break;
      case 'guess':      screenGuess(); break;
      case 'watch':      screenWatch(dt); break;
      case 'done':       screenDone(dt); break;
      case 'puzzles':    screenPuzzles(); break;
      case 'mystery':    screenMystery(dt); break;
      case 'mysteryEnd': screenMysteryEnd(dt); break;
      case 'best':       screenBest(); break;
      case 'bestEnd':    screenBestEnd(dt); break;
    }
    mouse.pressed = false; escPressed = false;
    if (clearPosAfterTick && !mouse.down) { mouse.x = mouse.y = -1000; clearPosAfterTick = false; }
    canvas.style.cursor = wantPointer ? 'pointer' : 'default';
  }

  let last = 0, raf = 0, alive = true;
  function frame(ts: number) {
    if (!alive) return;
    const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016);
    last = ts;
    tick(dt);
    raf = requestAnimationFrame(frame);
  }

  /* ---------- start ---------- */
  layoutBars();
  setSandboxBars(sandboxBars);
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', setPos);
      canvas.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    }
  };
}
