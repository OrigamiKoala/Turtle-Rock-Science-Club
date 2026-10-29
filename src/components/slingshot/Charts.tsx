import React, { useMemo } from 'react';
import { Run, KMS_PER_AU_YR, planetVel, speedOf, Body } from './physics';

const INK = '#8fa0c4';
const GRID = '#1d2a47';

interface GraphProps {
  run: Run | null;
  /** 'sun' or a body id */
  measure: string;
  bodies: Body[];
  cursorT: number;
  tMax: number;
}

export function SpeedGraph({ run, measure, bodies, cursorT, tMax }: GraphProps) {
  const W = 320;
  const H = 130;
  const L = 34;
  const B = 20;
  const T = 8;
  const data = useMemo(() => {
    if (!run) return null;
    const body = measure === 'sun' ? null : bodies.find((b) => b.id === measure) ?? null;
    const pts = run.samples.map((s) => {
      let v = speedOf(s);
      if (body) {
        const [pvx, pvy] = planetVel(body, s.t);
        v = Math.hypot(s.vx - pvx, s.vy - pvy);
      }
      return { t: s.t, v: v * KMS_PER_AU_YR };
    });
    const vmax = Math.max(10, ...pts.map((p) => p.v));
    const top = Math.ceil(vmax / 5) * 5;
    return { pts, top };
  }, [run, measure, bodies]);

  const end = run ? run.samples[run.samples.length - 1].t : tMax;
  const xs = (t: number) => L + (t / Math.max(end, 1e-6)) * (W - L - 6);
  const ys = (v: number, top: number) => H - B - (v / top) * (H - B - T);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Probe speed over time">
      <line x1={L} y1={H - B} x2={W - 6} y2={H - B} stroke={GRID} />
      <line x1={L} y1={T} x2={L} y2={H - B} stroke={GRID} />
      <text x={4} y={T + 8} fontSize="9" fill={INK}>
        km/s
      </text>
      <text x={W - 6} y={H - 4} fontSize="9" fill={INK} textAnchor="end">
        years
      </text>
      <text x={L} y={H - 4} fontSize="9" fill={INK} textAnchor="middle">
        0
      </text>
      {data && (
        <>
          <text x={L - 4} y={T + 4} fontSize="9" fill={INK} textAnchor="end">
            {data.top}
          </text>
          <text x={L - 4} y={H - B} fontSize="9" fill={INK} textAnchor="end">
            0
          </text>
          <text x={xs(end)} y={H - 4} fontSize="9" fill={INK} textAnchor="end" dx={-26}>
            {end.toFixed(0)}
          </text>
          {run!.flybys
            .filter((f) => f.tOut > f.tIn)
            .map((f) => {
              const nm = bodies.find((b) => b.id === f.id)?.name ?? '';
              return (
                <g key={f.id}>
                  <rect
                    x={xs(f.tIn)}
                    y={T}
                    width={Math.max(2, xs(f.tOut) - xs(f.tIn))}
                    height={H - B - T}
                    fill="rgba(255,255,255,0.08)"
                  />
                  <text x={xs(f.tIn)} y={T + 8} fontSize="9" fill={INK}>
                    {nm}
                  </text>
                </g>
              );
            })}
          <polyline
            fill="none"
            stroke="#ffb54a"
            strokeWidth="1.8"
            points={data.pts.map((p) => `${xs(p.t).toFixed(1)},${ys(p.v, data.top).toFixed(1)}`).join(' ')}
          />
          <line x1={xs(cursorT)} y1={T} x2={xs(cursorT)} y2={H - B} stroke="#cfd8f5" strokeOpacity="0.5" />
        </>
      )}
    </svg>
  );
}

interface Attempt {
  kms: number;
  far: number;
}

export function AttemptChart({ attempts, tankKms, target }: { attempts: Attempt[]; tankKms: number; target: number }) {
  const W = 320;
  const H = 150;
  const L = 34;
  const B = 24;
  const T = 8;
  const top = 32;
  const xs = (k: number) => L + (k / tankKms) * (W - L - 12);
  const ys = (d: number) => H - B - (Math.min(d, top) / top) * (H - B - T);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Farthest distance for each launch">
      <line x1={L} y1={H - B} x2={W - 6} y2={H - B} stroke={GRID} />
      <line x1={L} y1={T} x2={L} y2={H - B} stroke={GRID} />
      <line x1={xs(tankKms)} y1={T} x2={xs(tankKms)} y2={H - B} stroke="#5d6f99" strokeDasharray="3 3" />
      <text x={xs(tankKms) - 3} y={T + 8} fontSize="9" fill={INK} textAnchor="end">
        full tank
      </text>
      <line x1={L} y1={ys(target)} x2={W - 6} y2={ys(target)} stroke="#6f8cff" strokeDasharray="4 3" />
      <text x={L + 4} y={ys(target) - 4} fontSize="9" fill="#9db0ff">
        Neptune, 30 AU
      </text>
      <text x={4} y={T + 8} fontSize="9" fill={INK}>
        AU
      </text>
      <text x={L - 4} y={H - B} fontSize="9" fill={INK} textAnchor="end">
        0
      </text>
      <text x={L - 4} y={ys(10) + 3} fontSize="9" fill={INK} textAnchor="end">
        10
      </text>
      <text x={L - 4} y={ys(20) + 3} fontSize="9" fill={INK} textAnchor="end">
        20
      </text>
      <text x={(L + W) / 2} y={H - 4} fontSize="9" fill={INK} textAnchor="middle">
        fuel used, km/s
      </text>
      <text x={L} y={H - B + 10} fontSize="9" fill={INK} textAnchor="middle">
        0
      </text>
      <text x={xs(tankKms)} y={H - B + 10} fontSize="9" fill={INK} textAnchor="middle">
        {tankKms}
      </text>
      {attempts.map((a, i) => (
        <circle key={i} cx={xs(a.kms)} cy={ys(a.far)} r="3.5" fill="#ffb54a" fillOpacity="0.85" />
      ))}
    </svg>
  );
}
