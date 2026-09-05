import { useEffect, useRef, useState } from 'react';
import { useMotionValue } from 'motion/react';
import { HERO_STOPS, HERO_TRANSITIONS } from './components/Hero';

// The sequence is measured in *moments*, not pixels: `u` runs 0 → STEPS, an
// integer is a resting moment, and a fraction is that far through the
// hand-off leading into the next one.
const STEPS = HERO_TRANSITIONS.length;

// Minimum wheel / touch delta to trigger a transition.
// Low threshold allows advancing with only a light scroll.
const WHEEL_MIN_DELTA = 3;
const TOUCH_MIN_DELTA = 6;

// How much of the gap between target and shown position closes per frame.
const CATCH_UP = 0.20;
const FRAME_MS = 1000 / 60;
const MAX_FRAME_MS = 34;
// Speed ceiling in moments per second.
const MAX_STEPS_PER_SEC = 2.8;
// Close enough to stop chasing, in moments.
const SETTLE_EPSILON = 0.001;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Maps the moment axis onto the raw 0→1 `progress` Hero.tsx's transforms are
 * written against, skipping the holds.
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

/**
 * Drives the landing intro from scroll input, stepping and settling cleanly screen-by-screen.
 * A light scroll advances to the next screen and stops there.
 * Inertia tails from a single scroll cannot advance past multiple screens.
 */
export function useHeroScroll(enabled: boolean) {
  const progress = useMotionValue(HERO_STOPS[0]);

  const [locked, setLocked] = useState(true);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  const targetRef = useRef(0);
  const shownRef = useRef(0);

  const rafRef = useRef(0);
  const wakeRef = useRef<() => void>(() => {});
  const lastSetRef = useRef(Number.NaN);

  useEffect(() => {
    if (!enabled) return;

    // Per-gesture arming: each scroll gesture triggers exactly one screen step.
    // The trailing inertia events of the same gesture are locked out until
    // the gesture finishes or a new distinct swipe begins.
    const gestureArmedRef = { current: true };
    const lastDeltaRef = { current: 0 };
    const lastWheelTimeRef = { current: 0 };
    let idleTimer: number | null = null;
    let touchArmed = true;

    // Only once the sequence has actually arrived at the end, so the finale
    // can't be scrolled straight past.
    const atEnd = () => targetRef.current >= STEPS && shownRef.current >= STEPS - 0.01;

    const relock = () => {
      setLocked(true);
      lockedRef.current = true;
      targetRef.current = STEPS;
      shownRef.current = STEPS;
      gestureArmedRef.current = true;
    };

    const step = (delta: number) => {
      const dir: 1 | -1 = delta > 0 ? 1 : -1;
      wakeRef.current();
      const cur = Math.round(shownRef.current);
      targetRef.current = clamp(cur + dir, 0, STEPS);
    };

    const onWheel = (e: WheelEvent) => {
      if (lockedRef.current) {
        e.preventDefault();
        const absDelta = Math.abs(e.deltaY);
        if (absDelta < WHEEL_MIN_DELTA) return;

        if (e.deltaY > 0 && atEnd()) {
          setLocked(false);
          return;
        }

        const now = performance.now();
        const timeSince = now - lastWheelTimeRef.current;
        const dir: 1 | -1 = e.deltaY > 0 ? 1 : -1;
        const prevDir = lastDeltaRef.current > 0 ? 1 : -1;

        // Re-arm on direction reversal, pause between swipes (> 90ms),
        // or a sharp new swipe surge where delta accelerates significantly
        if (
          dir !== prevDir ||
          timeSince > 90 ||
          (absDelta > 14 && absDelta > Math.abs(lastDeltaRef.current) * 1.5)
        ) {
          gestureArmedRef.current = true;
        }

        lastDeltaRef.current = e.deltaY;
        lastWheelTimeRef.current = now;

        // Reset idle timer: re-arms after quiet period
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = window.setTimeout(() => {
          gestureArmedRef.current = true;
          lastDeltaRef.current = 0;
        }, 110);

        if (gestureArmedRef.current) {
          gestureArmedRef.current = false;
          step(e.deltaY);
        }
      } else if (window.scrollY <= 0 && e.deltaY < 0) {
        e.preventDefault();
        if (Math.abs(e.deltaY) < WHEEL_MIN_DELTA) return;
        relock();
        gestureArmedRef.current = false;
        step(e.deltaY);
      }
    };

    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
      touchArmed = true;
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
        if (touchArmed && Math.abs(delta) >= TOUCH_MIN_DELTA) {
          touchArmed = false;
          step(delta);
        }
      } else if (window.scrollY <= 0 && delta < 0) {
        e.preventDefault();
        relock();
        if (touchArmed && Math.abs(delta) >= TOUCH_MIN_DELTA) {
          touchArmed = false;
          step(delta);
        }
      }
    };
    const onTouchEnd = () => {
      touchArmed = true;
    };

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
      const dir: 1 | -1 = forward ? 1 : -1;
      wakeRef.current();
      const cur = Math.round(shownRef.current);
      targetRef.current = clamp(cur + dir, 0, STEPS);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(MAX_FRAME_MS, now - last);
      last = now;

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

      const moving = Math.abs(targetRef.current - shownRef.current) > SETTLE_EPSILON;
      rafRef.current = moving ? requestAnimationFrame(tick) : 0;
    };

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
