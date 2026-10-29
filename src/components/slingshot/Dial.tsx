import React, { useRef } from 'react';
import { KMS_PER_AU_YR } from './physics';

interface Props {
  tank: number;
  mag: number;
  dir: number;
  refAngle: number;
  /** direction from the launch point to the Sun, or null when not shown */
  sunAngle: number | null;
  refLabel: string;
  disabled?: boolean;
  onChange: (dir: number, mag: number) => void;
}

const C = 110;
const R = 84;

const wrap = (a: number) => {
  let x = a;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x <= -Math.PI) x += 2 * Math.PI;
  return x;
};

export default function Dial({ tank, mag, dir, refAngle, sunAngle, refLabel, disabled, onChange }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const world = refAngle + dir;
  const len = (mag / tank) * R;
  const hx = C + len * Math.cos(world);
  const hy = C - len * Math.sin(world);

  const fromEvent = (e: React.PointerEvent) => {
    const box = ref.current!.getBoundingClientRect();
    const k = 220 / box.width;
    const dx = (e.clientX - box.left) * k - C;
    const dy = (e.clientY - box.top) * k - C;
    const dist = Math.hypot(dx, dy);
    const m = Math.min(dist / R, 1) * tank;
    const kms = Math.round(m * KMS_PER_AU_YR * 100) / 100;
    const ang = Math.atan2(-dy, dx);
    const d = dist < 3 ? dir : Math.round(wrap(ang - refAngle) * 1800 / Math.PI) / 1800 * Math.PI;
    onChange(d, kms / KMS_PER_AU_YR);
  };

  const arrow = (a: number, r: number) => [C + r * Math.cos(a), C - r * Math.sin(a)] as const;
  const [rx, ry] = arrow(refAngle, R);
  const labelAnchor = Math.cos(refAngle) > 0.3 ? 'start' : Math.cos(refAngle) < -0.3 ? 'end' : 'middle';

  return (
    <svg
      ref={ref}
      viewBox="0 0 220 220"
      className="w-full max-w-[240px] select-none"
      style={{ touchAction: 'none', cursor: disabled ? 'default' : 'crosshair' }}
      onPointerDown={(e) => {
        if (disabled) return;
        (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        fromEvent(e);
      }}
      onPointerMove={(e) => {
        if (disabled || !(e.buttons & 1)) return;
        fromEvent(e);
      }}
      role="img"
      aria-label="Launch dial"
    >
      <circle cx={C} cy={C} r={R} fill="#0b1222" stroke="#2a3a5e" strokeWidth="1.5" />
      <circle cx={C} cy={C} r={R / 2} fill="none" stroke="#1b2745" strokeDasharray="2 4" />
      <line x1={C - R} y1={C} x2={C + R} y2={C} stroke="#16213b" />
      <line x1={C} y1={C - R} x2={C} y2={C + R} stroke="#16213b" />
      <line x1={C} y1={C} x2={rx} y2={ry} stroke="#5d6f99" strokeWidth="2" strokeDasharray="4 3" />
      <text
        x={arrow(refAngle, R + 6)[0]}
        y={arrow(refAngle, R + 6)[1] + (Math.sin(refAngle) > 0.3 ? -4 : 8)}
        fontSize="9"
        fill="#8fa0c4"
        textAnchor={labelAnchor}
      >
        {refLabel}
      </text>
      {sunAngle !== null && (
        <g>
          <circle cx={arrow(sunAngle, R - 12)[0]} cy={arrow(sunAngle, R - 12)[1]} r="6" fill="#ffd666" />
          <text
            x={arrow(sunAngle, R - 12)[0]}
            y={arrow(sunAngle, R - 12)[1] + 17}
            fontSize="9"
            fill="#ffd666"
            textAnchor="middle"
          >
            Sun
          </text>
        </g>
      )}
      <line x1={C} y1={C} x2={hx} y2={hy} stroke="#ffb54a" strokeWidth="3" strokeLinecap="round" />
      <circle cx={C} cy={C} r="3" fill="#ffb54a" />
      <circle cx={hx} cy={hy} r="8" fill="#ffb54a" stroke="#1a1204" strokeWidth="2" />
    </svg>
  );
}
