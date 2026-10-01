import React from 'react';
import { FastForward, Pause, Play, RotateCcw, Rewind, StepForward } from 'lucide-react';
import type { Playback } from './usePlayback';
import { BTN_SECONDARY, BTN_TERTIARY } from './ui';

/** Pause / step / speed controls for a robot's recorded run. */
export default function PlaybackControls({ pb }: { pb: Playback }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {pb.done ? (
        <button type="button" onClick={pb.restart} className={BTN_SECONDARY}>
          <RotateCcw className="w-3.5 h-3.5" /> Watch again
        </button>
      ) : (
        <button type="button" onClick={pb.toggle} className={BTN_SECONDARY}>
          {pb.playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {pb.playing ? 'Pause' : 'Resume'}
        </button>
      )}
      <button type="button" onClick={pb.stepOnce} disabled={pb.playing || pb.done} className={BTN_TERTIARY}>
        <StepForward className="w-3.5 h-3.5" /> Step
      </button>
      <button type="button" onClick={pb.slower} className={BTN_TERTIARY}>
        <Rewind className="w-3.5 h-3.5" /> Slower
      </button>
      <button type="button" onClick={pb.faster} className={BTN_TERTIARY}>
        <FastForward className="w-3.5 h-3.5" /> Faster
      </button>
    </div>
  );
}
