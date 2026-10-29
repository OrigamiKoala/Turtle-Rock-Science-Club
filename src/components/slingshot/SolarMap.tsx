import React, { useEffect, useRef } from 'react';
import { Run, SUN_HIT_R, planetAt, sampleAt } from './physics';
import { StageDef } from './stages';

export interface MapView {
  radius: number;
  follow: boolean;
}

interface Props {
  stage: StageDef;
  run: Run | null;
  preview: Run | null;
  ghosts: Run[];
  view: MapView;
  tRef: React.MutableRefObject<number>;
}

const PROBE = '#ffb54a';

export default function SolarMap({ stage, run, preview, ghosts, view, tRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef<Props>({ stage, run, preview, ghosts, view, tRef });
  propsRef.current = { stage, run, preview, ghosts, view, tRef };
  const sizeRef = useRef({ w: 600, h: 600, dpr: 1 });

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const w = Math.max(240, Math.floor(wrap.clientWidth));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { w, h: w, dpr };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(w * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${w}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    let raf = 0;
    const loop = () => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const { w, h, dpr } = sizeRef.current;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawScene(ctx, w, h, propsRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className="w-full">
      <canvas ref={canvasRef} className="block rounded-xl" style={{ background: '#070b14', touchAction: 'none' }} />
    </div>
  );
}

function drawPath(
  ctx: CanvasRenderingContext2D,
  run: Run,
  tx: (x: number) => number,
  ty: (y: number) => number,
  untilT: number,
) {
  ctx.beginPath();
  let started = false;
  for (const s of run.samples) {
    if (s.t > untilT) break;
    const px = tx(s.x);
    const py = ty(s.y);
    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else ctx.lineTo(px, py);
  }
  if (started && untilT < run.samples[run.samples.length - 1].t) {
    const s = sampleAt(run.samples, untilT);
    ctx.lineTo(tx(s.x), ty(s.y));
  }
  ctx.stroke();
}

function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, p: Props) {
  const { stage, run, preview, ghosts, view } = p;
  const t = run ? p.tRef.current : 0;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#070b14';
  ctx.fillRect(0, 0, w, h);

  const scale = (Math.min(w, h) / 2) / view.radius;
  let cx = 0;
  let cy = 0;
  if (view.follow && run) {
    const s = sampleAt(run.samples, t);
    cx = s.x;
    cy = s.y;
  }
  const tx = (x: number) => w / 2 + (x - cx) * scale;
  const ty = (y: number) => h / 2 - (y - cy) * scale;
  const sx = tx(0);
  const sy = ty(0);

  ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
  ctx.textBaseline = 'middle';

  // orbit rings
  ctx.lineWidth = 1;
  for (const b of stage.drawn) {
    ctx.strokeStyle = 'rgba(160,180,230,0.14)';
    ctx.beginPath();
    ctx.arc(sx, sy, b.a * scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([3, 5]);
  for (const r of stage.rings) {
    ctx.strokeStyle = 'rgba(160,180,230,0.28)';
    ctx.beginPath();
    ctx.arc(sx, sy, r.r * scale, 0, Math.PI * 2);
    ctx.stroke();
    const lx = sx + r.r * scale * Math.cos(-0.5) + 4;
    const ly = sy + r.r * scale * Math.sin(-0.5);
    ctx.fillStyle = 'rgba(160,180,230,0.7)';
    ctx.textAlign = 'left';
    ctx.fillText(/^\d/.test(r.label) && !r.label.includes('AU') ? `${r.label} AU` : r.label, lx, ly);
  }
  ctx.setLineDash([]);

  // target ring
  const tgt = stage.target ? stage.drawn.find((b) => b.id === stage.target!.id) : undefined;
  if (tgt && stage.target) {
    const [nx, ny] = planetAt(tgt, t);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(111,140,255,0.6)';
    ctx.beginPath();
    ctx.arc(tx(nx), ty(ny), stage.target.r * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Sun
  const sunR = Math.max(6, SUN_HIT_R * scale);
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sunR * 3);
  g.addColorStop(0, 'rgba(255,214,102,0.5)');
  g.addColorStop(1, 'rgba(255,214,102,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(sx, sy, sunR * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd666';
  ctx.beginPath();
  ctx.arc(sx, sy, sunR, 0, Math.PI * 2);
  ctx.fill();

  // gravity zones and planets
  for (const b of stage.drawn) {
    const [bx, by] = planetAt(b, t);
    const px = tx(bx);
    const py = ty(by);
    const pulls = stage.world.bodies.some((x) => x.id === b.id);
    if (pulls && b.zone * scale > 10) {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.arc(px, py, b.zone * scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(4, b.hitR * scale), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,230,255,0.85)';
    ctx.textAlign = 'left';
    ctx.fillText(b.name, px + 8, py - 8);
  }

  // earlier attempts
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255,181,74,0.22)';
  for (const gh of ghosts) drawPath(ctx, gh, tx, ty, Infinity);

  // preview
  if (preview && !run) {
    ctx.setLineDash([2, 5]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,181,74,0.85)';
    drawPath(ctx, preview, tx, ty, Infinity);
    ctx.setLineDash([]);
  }

  // current flight
  if (run) {
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = PROBE;
    drawPath(ctx, run, tx, ty, t);
    const s = sampleAt(run.samples, t);
    ctx.fillStyle = PROBE;
    ctx.beginPath();
    ctx.arc(tx(s.x), ty(s.y), 4.5, 0, Math.PI * 2);
    ctx.fill();
    const last = run.samples[run.samples.length - 1];
    if (t >= last.t - 1e-6 && run.end !== 'time' && run.end !== 'lost') {
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx(last.x), ty(last.y), 9, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    // starting point marker
    const [ox, oy] = stage.origin;
    const o = !stage.preview ? { x: tx(ox), y: ty(oy) } : null;
    if (o) {
      ctx.fillStyle = PROBE;
      ctx.beginPath();
      ctx.arc(o.x, o.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
