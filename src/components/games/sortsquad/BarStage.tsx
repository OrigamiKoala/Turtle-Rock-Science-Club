import React, { useEffect, useRef } from 'react';
import { createStage, STAGE_H, STAGE_W } from './stage';
import type { StageApi } from './stage';
import { STAGE_CARD } from './ui';

export interface BarStageProps {
  /** The bars to show. A new array replaces them (see `change`). */
  values: readonly number[];
  /** How a new `values` is shown: jump straight there, or slide the same bars. */
  change?: 'set' | 'arrange';
  lift?: number;
  range?: number;
  binary?: boolean;
  /** A slot was tapped (or chosen from the keyboard). */
  onSlot?: (slot: number) => void;
  onHover?: (slot: number) => void;
  /** Hands the imperative stage to a parent that plays recorded steps on it. */
  stageRef?: React.MutableRefObject<StageApi | null>;
  label: string;
}

/**
 * React wrapper around the canvas stage. The canvas only DRAWS; interaction has a
 * second, keyboard- and screen-reader-friendly route — one visually hidden button
 * per bar — so nothing in the game needs a mouse.
 */
export default function BarStage({ values, change = 'set', lift, range, binary, onSlot, onHover, stageRef, label }: BarStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const apiRef = useRef<StageApi | null>(null);
  /* The stage outlives every render, so handlers are read through refs. */
  const onSlotRef = useRef(onSlot);
  const onHoverRef = useRef(onHover);
  onSlotRef.current = onSlot;
  onHoverRef.current = onHover;
  const first = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const stage = createStage(canvas);
    apiRef.current = stage;
    if (stageRef) stageRef.current = stage;
    stage.set(values);
    stage.lift(lift ?? -1);
    stage.range(range ?? -1);
    stage.binary(!!binary);
    stage.onSlot((i) => onSlotRef.current?.(i));
    stage.onHover((i) => onHoverRef.current?.(i));
    return () => {
      stage.destroy();
      apiRef.current = null;
      if (stageRef) stageRef.current = null;
    };
    // created once; later changes arrive through the effects below
  }, []);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (change === 'arrange') apiRef.current?.arrange(values); else apiRef.current?.set(values);
  }, [values, change]);

  useEffect(() => { apiRef.current?.lift(lift ?? -1); }, [lift]);
  useEffect(() => { apiRef.current?.range(range ?? -1); }, [range]);
  useEffect(() => { apiRef.current?.binary(!!binary); }, [binary]);

  return (
    <div className={STAGE_CARD}>
      <canvas
        ref={canvasRef}
        width={STAGE_W}
        height={STAGE_H}
        role="img"
        aria-label={label}
        style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}
        className="w-full max-w-[720px] mx-auto block touch-pan-y select-none"
      />
      {onSlot && (
        <div className="sr-only">
          {values.map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSlot(i)}
              onFocus={() => onHover?.(i)}
              onBlur={() => onHover?.(-1)}
            >
              Slot {i + 1}, bar {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
