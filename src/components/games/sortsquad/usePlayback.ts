import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { Step } from './logic';
import type { StageApi } from './stage';

/** More bars = more steps, so start faster: 0.6s a step at 8 bars, floored so it never blurs. */
export const defaultStepTime = (n: number) => Math.max(0.03, Math.min(0.6, (0.6 * 64) / (n * n)));

export interface LoadOptions { autoplay?: boolean; stepTime?: number }

export interface Playback {
  /** Steps applied so far, and how many there are in all. */
  idx: number;
  total: number;
  playing: boolean;
  done: boolean;
  looks: number;
  swaps: number;
  writes: number;
  /** The step most recently applied, if any. */
  current: Step | null;
  load: (values: readonly number[], steps: readonly Step[], opts?: LoadOptions) => void;
  toggle: () => void;
  pause: () => void;
  stepOnce: () => void;
  faster: () => void;
  slower: () => void;
  /** Replay the same run from the start. */
  restart: () => void;
  /** Apply every remaining step at once. */
  finish: () => void;
}

/**
 * Plays a recorded run onto the stage, one step per tick, and exposes the running
 * counts. All the moving parts live in a ref (re-rendering 60 times a second would
 * thrash), with a version bump only when something the page shows has changed.
 */
export function usePlayback(stageRef: MutableRefObject<StageApi | null>): Playback {
  const r = useRef({
    values: [] as readonly number[],
    steps: [] as readonly Step[],
    idx: 0, looks: 0, swaps: 0, writes: 0,
    current: null as Step | null,
    stepTime: 0.4, timer: 0, last: 0, playing: false, raf: 0
  });
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const applyOne = () => {
    const s = r.current;
    const step = s.steps[s.idx];
    stageRef.current?.applyStep(step);
    s.idx++;
    s.current = step;
    if (step.type === 0) s.looks++; else if (step.type === 1) s.swaps++; else s.writes++;
  };

  const stop = () => {
    const s = r.current;
    s.playing = false;
    cancelAnimationFrame(s.raf);
  };

  const loop = (ts: number) => {
    const s = r.current;
    if (!s.playing) return;
    const dt = Math.min(0.05, s.last ? (ts - s.last) / 1000 : 0.016);
    s.last = ts;
    s.timer += dt;
    let guard = 0, moved = false;
    while (s.timer >= s.stepTime && s.idx < s.steps.length && guard++ < 200) {   // several steps a frame when fast
      s.timer -= s.stepTime;
      applyOne();
      moved = true;
    }
    if (s.timer > s.stepTime) s.timer = 0;
    if (s.idx >= s.steps.length) { s.playing = false; stageRef.current?.highlight(-1, -1, null); }
    if (moved || !s.playing) bump();
    if (s.playing) s.raf = requestAnimationFrame(loop);
  };

  const play = () => {
    const s = r.current;
    if (s.playing || s.idx >= s.steps.length) return;
    s.playing = true;
    s.last = 0;
    s.raf = requestAnimationFrame(loop);
    bump();
  };

  const load = (values: readonly number[], steps: readonly Step[], opts: LoadOptions = {}) => {
    stop();
    const s = r.current;
    s.values = values; s.steps = steps;
    s.idx = 0; s.looks = s.swaps = s.writes = 0; s.current = null; s.timer = 0;
    if (opts.stepTime !== undefined) s.stepTime = opts.stepTime;
    stageRef.current?.set(values);
    if (opts.autoplay) play(); else bump();
  };

  const finish = () => {
    const s = r.current;
    stop();
    while (s.idx < s.steps.length) applyOne();
    stageRef.current?.highlight(-1, -1, null);
    bump();
  };

  const stepOnce = () => {
    const s = r.current;
    stop();
    if (s.idx < s.steps.length) applyOne();
    if (s.idx >= s.steps.length) stageRef.current?.highlight(-1, -1, null);
    bump();
  };

  useEffect(() => () => { const s = r.current; s.playing = false; cancelAnimationFrame(s.raf); }, []);

  const s = r.current;
  return {
    idx: s.idx,
    total: s.steps.length,
    playing: s.playing,
    done: s.steps.length > 0 && s.idx >= s.steps.length,
    looks: s.looks, swaps: s.swaps, writes: s.writes,
    current: s.current,
    load,
    toggle: () => { if (s.playing) { stop(); bump(); } else play(); },
    pause: () => { stop(); bump(); },
    stepOnce,
    faster: () => { s.stepTime = Math.max(0.004, s.stepTime / 1.4); bump(); },
    slower: () => { if (s.stepTime < 1.5) s.stepTime *= 1.4; bump(); },
    restart: () => load(s.values, s.steps, { autoplay: true }),
    finish
  };
}
