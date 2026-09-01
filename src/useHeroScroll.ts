import { useEffect, useRef, useState } from 'react';
import { useMotionValue } from 'motion/react';
import { HERO_STOPS, HERO_TRANSITIONS } from './components/Hero';

// The sequence is measured in *moments*, not pixels: `u` runs 0 → STEPS, an
// integer is a resting moment, and a fraction is that far through the
// hand-off leading into the next one. The long holds Hero.tsx choreographs
// between hand-offs have zero width on this axis — see `progressAt`.
const STEPS = HERO_TRANSITIONS.length;

// Scroll, in px, that covers one moment — so the whole sequence is ~2940px,
// about three and a half screen-heights. **This is the resistance dial**:
// raise it and the sequence takes more scrolling to get through, lower it and
// less. It is the only one — `CATCH_UP` is lag, not resistance, and
// `MAX_STEPS_PER_SEC` caps pace, not effort. Walked up on direct request in
// deliberately shrinking steps, 260 → 300 → 380 → 420, each one asked for
// after trying the last: this is a value being converged on by feel, so
// prefer another small step over a fresh guess. For scale, the scrub model
// this hook replaced asked for 13788px, which is where "too slow to scroll
// through" came from. Nothing caps how far one gesture may travel: keep
// scrolling and you keep going.
const WHEEL_PER_STEP = 420;
// The touch equivalent, smaller because a finger's travel is bounded by the
// screen where a wheel's is not. Kept at the ratio the two were tuned
// together at (~0.365), so raising the wheel figure alone doesn't quietly
// leave phones feeling looser than desktops.
const TOUCH_PER_STEP = 155;
// Trackpads emit tiny stray deltas (including from horizontal drift) that
// should not count as scrolling at all.
const WHEEL_MIN_DELTA = 2;

// How much of the gap between where the visitor has scrolled to and where the
// sequence is actually drawn closes per 60fps-equivalent frame. This is the
// trailing lag that makes motion glide to a stop instead of stopping dead
// with the gesture — plain exponential decay rather than a spring, because a
// spring can overshoot and a scrub never should.
const CATCH_UP = 0.16;
const FRAME_MS = 1000 / 60;
// Longest frame the loop will believe. Motion is delta-time normalised so it
// runs at the same real-world speed whatever the refresh rate — but that also
// means a single dropped frame advances everything by however long it took,
// which is exactly what a skipped-looking jump is. Capping the belief at two
// frames turns a janky stretch into a slight slow-down instead of a series of
// lurches. It was 64ms (four frames), which is enough to see.
const MAX_FRAME_MS = 34;
// A ceiling on how fast the drawn position may travel, in moments per second,
// whatever the visitor does. Exponential catch-up alone would cross a whole
// moment in the first two frames of a hard flick; this is what turns that into
// a fast, readable sweep instead of a blur. It is also the only thing pacing
// a long flick — the reach is deliberately uncapped, so the pace is what
// keeps every moment actually visible on the way past. Divided by the
// transition's own weight below, so a busy hand-off takes proportionally
// longer in real time than a simple one.
//
// Together with CATCH_UP these two set the whole feel, and they were picked
// by simulating the loop rather than by eye: one moment from a standing start
// is 90% travelled at 367ms and fully settled at 583ms, ranging 300ms for a
// spotlight roll to 467ms for the finale. Decisive, with a soft landing — and
// unlike the tween this replaced, the first ~300ms of it is the visitor's own
// gesture rather than a canned curve. Raising CATCH_UP shortens the tail;
// raising this makes the whole move quicker without touching the tail.
const MAX_STEPS_PER_SEC = 2.8;
// Close enough to stop chasing, in moments.
const SETTLE_EPSILON = 0.0015;

// Quiet time after the last scroll event before the sequence settles onto the
// nearest moment. Long enough not to fire between the events of a trackpad's
// momentum tail, short enough that letting go feels immediately answered.
const IDLE_MS = 120;
// How far into a hand-off counts as committing to it. At 0.35, a third of the
// way through in the direction you were travelling settles forward; less than
// that eases back where you came from. Biased by direction rather than
// rounding to nearest, so a deliberate short scroll still advances instead of
// springing back for being a shade under halfway.
const SNAP_BIAS = 0.35;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Maps the moment axis onto the raw 0→1 `progress` Hero.tsx's transforms are
 * written against, skipping the holds. Each hand-off's own window
 * (`HERO_TRANSITIONS[i]`) is stretched across a whole unit of `u`, so a unit
 * of scrolling always buys a unit of *visible* motion — the dead beats either
 * side of a hand-off cost nothing to cross.
 *
 * That leaves a discontinuity at each integer: approached from below, `u = i`
 * lands on `HERO_TRANSITIONS[i - 1].to`, which is exactly `HERO_STOPS[i]`;
 * leaving it upward, progress starts at `HERO_TRANSITIONS[i].from` instead,
 * some way further along. The skip between the two is invisible because it
 * lies inside a hold, where by construction every transform in Hero.tsx is
 * flat. A new keyframe that spans a hold would break that and show up as a
 * jump the instant a visitor starts scrolling away from a moment.
 */
function progressAt(u: number) {
  if (u <= 0) return HERO_STOPS[0];
  if (u >= STEPS) return HERO_STOPS[STEPS];
  const i = Math.floor(u);
  const f = u - i;
  if (f === 0) return HERO_STOPS[i];
  const w = HERO_TRANSITIONS[i];
  return w.from + (w.to - w.from) * f;
}

const weightAt = (u: number) => HERO_TRANSITIONS[clamp(Math.floor(u), 0, STEPS - 1)].weight;

const settleTo = (u: number, dir: 1 | -1) =>
  clamp(dir === 1 ? Math.ceil(u - SNAP_BIAS) : Math.floor(u + SNAP_BIAS), 0, STEPS);

/**
 * Drives the landing intro from scroll input, scrubbed and then settled.
 * While `enabled` and the intro hasn't finished, this locks the document
 * (`overflow: hidden`, so the page visually never moves) and turns scroll
 * input into travel along the moment axis described above: motion tracks the
 * gesture the whole time it is happening, and when the gesture stops the
 * sequence eases onto the nearest moment rather than parking wherever the
 * scrolling happened to end.
 *
 * **Both halves of that are load-bearing, and each one is the fix for a
 * symptom the other caused.** A pure scrub — every wheel event's deltaY
 * accumulating into a position the visuals chase — was the original design,
 * and its `LOCK_DISTANCE` was retuned some ten times without ever landing:
 * short, and one flick blew through the whole sequence; long, and getting
 * anywhere was a chore. Underneath both was a third fault no distance setting
 * touched, because a scrub can stop *anywhere*, including halfway through a
 * hand-off, leaving the visitor in front of two half-faded things at once.
 * Snapping to discrete moments fixed that and was tried on its own next —
 * but with input only ever tripping a threshold that then played an animation
 * at the visitor, nothing moved with the gesture and the whole thing read as
 * abrupt, which was reported directly.
 *
 * So: scrub for the feel, settle for the landing. Scrolling always moves
 * something, immediately and proportionally; letting go always resolves to a
 * composed frame. `MAX_STEPS_PER_SEC` is what keeps travelling far from
 * turning into a blur, since the reach itself is deliberately uncapped.
 *
 * The opening beat — bubbles rising, title lighting, Join button arriving —
 * is the first of those hand-offs, not a separate animation that plays on
 * mount. It was the latter briefly, while the sequence still snapped, and the
 * bubbles going up on their own was reported immediately; a scrub can rest
 * mid-beat, so it belongs on the axis with everything else.
 *
 * Once the sequence is settled at the last moment, one more forward gesture
 * unlocks and hands scrolling back to the browser untouched. Scrolling up
 * while still at the real top of the page re-locks and runs it backwards.
 */
export function useHeroScroll(enabled: boolean) {
  const progress = useMotionValue(HERO_STOPS[0]);

  const [locked, setLocked] = useState(true);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  // Where the visitor has scrolled to, and where the sequence is actually
  // drawn — the gap between them is the glide.
  const targetRef = useRef(0);
  const shownRef = useRef(0);
  const lastInputRef = useRef(0);
  const lastDirRef = useRef<1 | -1>(1);
  // The animation loop parks itself when there is nothing left to move, and
  // input wakes it. It used to run at 60fps for as long as the home tab was
  // mounted — including while sitting still on a moment, and including after
  // the sequence had unlocked and the visitor had scrolled well past the hero
  // to read the rest of the page. Every one of those frames pushed a value no
  // one had asked to change through ~30 `useTransform`s and back out as ~30
  // style writes, which is a real budget to be spending on nothing and is
  // most of why the home tab felt heavier than the others.
  const rafRef = useRef(0);
  const wakeRef = useRef<() => void>(() => {});
  const lastSetRef = useRef(Number.NaN);

  useEffect(() => {
    if (!enabled) return;

    const scrub = (delta: number, perStep: number) => {
      if (delta === 0) return;
      lastDirRef.current = delta > 0 ? 1 : -1;
      lastInputRef.current = performance.now();
      wakeRef.current();
      targetRef.current = clamp(
        targetRef.current + delta / (perStep * weightAt(targetRef.current)),
        0,
        STEPS
      );
    };

    // Only once the sequence has actually arrived at the end, so the finale
    // (and its sign-up button) can't be scrolled straight past.
    const atEnd = () => targetRef.current >= STEPS && shownRef.current >= STEPS - 0.01;

    const relock = () => {
      setLocked(true);
      lockedRef.current = true;
      targetRef.current = STEPS;
      shownRef.current = STEPS;
    };

    const onWheel = (e: WheelEvent) => {
      if (lockedRef.current) {
        e.preventDefault();
        if (Math.abs(e.deltaY) < WHEEL_MIN_DELTA) return;
        if (e.deltaY > 0 && atEnd()) {
          setLocked(false);
          return;
        }
        scrub(e.deltaY, WHEEL_PER_STEP);
      } else if (window.scrollY <= 0 && e.deltaY < 0) {
        e.preventDefault();
        if (Math.abs(e.deltaY) < WHEEL_MIN_DELTA) return;
        relock();
        scrub(e.deltaY, WHEEL_PER_STEP);
      }
    };

    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const delta = touchY - e.touches[0].clientY;
      touchY = e.touches[0].clientY;
      if (lockedRef.current) {
        e.preventDefault();
        if (delta > 0 && atEnd()) {
          setLocked(false);
          return;
        }
        scrub(delta, TOUCH_PER_STEP);
      } else if (window.scrollY <= 0 && delta < 0) {
        e.preventDefault();
        relock();
        scrub(delta, TOUCH_PER_STEP);
      }
    };

    // Keys are the one input with no "how hard" to read off them, so a press
    // asks for a whole moment rather than a slice of one. It still travels
    // there through the same glide, so it looks like any other move.
    const onKeyDown = (e: KeyboardEvent) => {
      if (!lockedRef.current) return;
      const forward = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ';
      const back = e.key === 'ArrowUp' || e.key === 'PageUp';
      if (!forward && !back) return;
      e.preventDefault();
      if (forward && atEnd()) {
        setLocked(false);
        return;
      }
      lastDirRef.current = forward ? 1 : -1;
      lastInputRef.current = performance.now();
      wakeRef.current();
      targetRef.current = clamp(Math.round(targetRef.current) + (forward ? 1 : -1), 0, STEPS);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(MAX_FRAME_MS, now - last);
      last = now;

      // Once scrolling has gone quiet, the target becomes the nearest moment,
      // and the same glide that was following the gesture carries it there —
      // settling is not a separate animation, which is why it never reads as
      // a snap on top of a scroll.
      if (now - lastInputRef.current > IDLE_MS) {
        targetRef.current = settleTo(targetRef.current, lastDirRef.current);
      }

      const gap = targetRef.current - shownRef.current;
      if (Math.abs(gap) <= SETTLE_EPSILON) {
        shownRef.current = targetRef.current;
      } else {
        const factor = 1 - Math.pow(1 - CATCH_UP, dt / FRAME_MS);
        const ceiling = (MAX_STEPS_PER_SEC / weightAt(shownRef.current)) * (dt / 1000);
        const move = gap * factor;
        shownRef.current += Math.abs(move) > ceiling ? Math.sign(move) * ceiling : move;
      }

      const next = progressAt(shownRef.current);
      if (next !== lastSetRef.current) {
        lastSetRef.current = next;
        progress.set(next);
      }

      // Park unless something is still moving, or a settle is still pending
      // (the target only becomes the nearest moment once input has been quiet
      // for IDLE_MS, so the loop has to stay awake at least that long past the
      // last event to perform it).
      const moving = Math.abs(targetRef.current - shownRef.current) > SETTLE_EPSILON;
      const settlePending = now - lastInputRef.current <= IDLE_MS;
      rafRef.current = moving || settlePending ? requestAnimationFrame(tick) : 0;
    };

    // Restarting from parked has to reset `last`, or the first frame back
    // would see the whole idle period as one enormous delta.
    const wake = () => {
      if (rafRef.current) return;
      last = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    };
    wakeRef.current = wake;
    wake();

    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [enabled, progress]);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.style.overflow = locked ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [enabled, locked]);

  return { progress, locked };
}
