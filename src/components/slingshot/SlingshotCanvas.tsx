import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PlanetDef, ProbeState, Vector2D } from './types';
import { getPlanetState, AU_YR_TO_KM_S, predictTrajectory } from './physics';
import { ZoomIn, ZoomOut, Maximize2, Crosshair } from 'lucide-react';

interface SlingshotCanvasProps {
  planets: PlanetDef[];
  probe: ProbeState;
  flightTrail: Vector2D[];
  previousTrail: Vector2D[];
  targetPlanetId: string;
  isFlying: boolean;
  launchAngleDeg: number;
  launchSpeedKmS: number;
  onAimChange: (angleDeg: number, speedKmS: number) => void;
  maxLaunchSpeedKmS: number;
  minLaunchSpeedKmS: number;
}

export default function SlingshotCanvas({
  planets,
  probe,
  flightTrail,
  previousTrail,
  targetPlanetId,
  isFlying,
  launchAngleDeg,
  launchSpeedKmS,
  onAimChange,
  maxLaunchSpeedKmS,
  minLaunchSpeedKmS
}: SlingshotCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Pan & Zoom state
  const [scale, setScale] = useState<number>(35); // Pixels per AU
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Aim drag state (on probe at Earth)
  const [isAiming, setIsAiming] = useState<boolean>(false);

  // Follow probe camera mode
  const [followProbe, setFollowProbe] = useState<boolean>(false);

  // Auto-fit scale to planets on stage change
  useEffect(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const maxAU = Math.max(...planets.map((p) => p.radiusAU), 1.0);
    // Fit maxAU within 40% of viewport
    const targetScale = Math.min(clientWidth, clientHeight) * 0.42 / maxAU;
    setScale(Math.max(12, Math.min(targetScale, 90)));
    setPan({ x: 0, y: 0 });
    setFollowProbe(false);
  }, [planets]);

  // World to Screen coordinates
  const worldToScreen = useCallback(
    (wx: number, wy: number, width: number, height: number): { x: number; y: number } => {
      const cx = width / 2 + pan.x;
      const cy = height / 2 + pan.y;
      return {
        x: cx + wx * scale,
        y: cy - wy * scale
      };
    },
    [pan, scale]
  );

  // Screen to World coordinates
  const screenToWorld = useCallback(
    (sx: number, sy: number, width: number, height: number): { x: number; y: number } => {
      const cx = width / 2 + pan.x;
      const cy = height / 2 + pan.y;
      return {
        x: (sx - cx) / scale,
        y: -(sy - cy) / scale
      };
    },
    [pan, scale]
  );

  // Zoom handlers
  const handleZoom = (factor: number) => {
    setScale((prev) => Math.max(8, Math.min(prev * factor, 180)));
  };

  const handleResetView = () => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const maxAU = Math.max(...planets.map((p) => p.radiusAU), 1.0);
    const targetScale = Math.min(clientWidth, clientHeight) * 0.42 / maxAU;
    setScale(Math.max(12, Math.min(targetScale, 90)));
    setPan({ x: 0, y: 0 });
    setFollowProbe(false);
  };

  // Follow probe update
  useEffect(() => {
    if (followProbe && containerRef.current && isFlying) {
      setPan({
        x: -probe.pos.x * scale,
        y: probe.pos.y * scale
      });
    }
  }, [followProbe, isFlying, probe.pos.x, probe.pos.y, scale]);

  // Mouse / Pointer interactions
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (!isFlying) {
      // Check if clicked near probe at Earth to start aiming
      const probeScreen = worldToScreen(probe.pos.x, probe.pos.y, canvas.width, canvas.height);
      const distToProbe = Math.hypot(sx - probeScreen.x, sy - probeScreen.y);
      if (distToProbe < 36) {
        setIsAiming(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
    }

    // Otherwise pan the camera
    setIsDraggingPan(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (isAiming && !isFlying) {
      const probeScreen = worldToScreen(probe.pos.x, probe.pos.y, canvas.width, canvas.height);
      const dx = sx - probeScreen.x;
      const dy = -(sy - probeScreen.y); // invert Y for celestial
      let angleRad = Math.atan2(dy, dx);
      let angleDeg = (angleRad * 180) / Math.PI;
      if (angleDeg < 0) angleDeg += 360;

      const dragDist = Math.hypot(dx, dy);
      // Map drag distance (0 - 150px) to speed (minLaunch - maxLaunch)
      const speedNorm = Math.min(1.0, Math.max(0.0, (dragDist - 15) / 130));
      const speedKmS = minLaunchSpeedKmS + speedNorm * (maxLaunchSpeedKmS - minLaunchSpeedKmS);

      onAimChange(Math.round(angleDeg * 10) / 10, Math.round(speedKmS * 10) / 10);
      return;
    }

    if (isDraggingPan) {
      setFollowProbe(false);
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsAiming(false);
    setIsDraggingPan(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setScale((prev) => Math.max(8, Math.min(prev * zoomFactor, 180)));
  };

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Deep space dark background
    ctx.fillStyle = '#07080d';
    ctx.fillRect(0, 0, width, height);

    // Subtle background starfield grid
    const sunScreen = worldToScreen(0, 0, width, height);

    // 1. Draw Planetary Orbit Rings
    for (const planet of planets) {
      const orbitRadiusPx = planet.radiusAU * scale;
      ctx.beginPath();
      ctx.arc(sunScreen.x, sunScreen.y, orbitRadiusPx, 0, 2 * Math.PI);
      ctx.strokeStyle = planet.id === targetPlanetId ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = planet.id === targetPlanetId ? 1.5 : 1;
      ctx.setLineDash(planet.id === targetPlanetId ? [4, 4] : [2, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Orbit label
      ctx.fillStyle = planet.id === targetPlanetId ? '#818cf8' : 'rgba(255, 255, 255, 0.25)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        `${planet.name} (${planet.radiusAU} AU)`,
        sunScreen.x + orbitRadiusPx + 6,
        sunScreen.y - 2
      );
    }

    // 2. Draw Sun at Origin (0, 0)
    const sunRadiusPx = Math.max(8, 0.12 * scale);
    const sunGlow = ctx.createRadialGradient(
      sunScreen.x,
      sunScreen.y,
      sunRadiusPx * 0.2,
      sunScreen.x,
      sunScreen.y,
      sunRadiusPx * 3.2
    );
    sunGlow.addColorStop(0, '#fef08a');
    sunGlow.addColorStop(0.3, '#f59e0b');
    sunGlow.addColorStop(0.7, 'rgba(245, 158, 11, 0.25)');
    sunGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');

    ctx.beginPath();
    ctx.arc(sunScreen.x, sunScreen.y, sunRadiusPx * 3.2, 0, 2 * Math.PI);
    ctx.fillStyle = sunGlow;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(sunScreen.x, sunScreen.y, sunRadiusPx, 0, 2 * Math.PI);
    ctx.fillStyle = '#fef08a';
    ctx.fill();

    // 3. Draw Planets
    for (const planet of planets) {
      const { pos: pPos, vel: pVel } = getPlanetState(planet, probe.timeYr);
      const pScreen = worldToScreen(pPos.x, pPos.y, width, height);
      const isTarget = planet.id === targetPlanetId;

      // Planet gravitational influence bubble
      const soiRadiusPx = Math.max(planet.physicalRadiusAU * 4 * scale, 18);
      ctx.beginPath();
      ctx.arc(pScreen.x, pScreen.y, soiRadiusPx, 0, 2 * Math.PI);
      ctx.fillStyle = planet.glowColor;
      ctx.fill();

      // Target reticle
      if (isTarget) {
        ctx.beginPath();
        ctx.arc(pScreen.x, pScreen.y, soiRadiusPx + 8, 0, 2 * Math.PI);
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Planet body
      const bodyRadiusPx = Math.max(4, Math.min(14, planet.physicalRadiusAU * scale * 1.5));
      ctx.beginPath();
      ctx.arc(pScreen.x, pScreen.y, bodyRadiusPx, 0, 2 * Math.PI);
      ctx.fillStyle = planet.color;
      ctx.fill();

      // Saturn Rings
      if (planet.id === 'saturn') {
        ctx.beginPath();
        ctx.ellipse(pScreen.x, pScreen.y, bodyRadiusPx * 2.2, bodyRadiusPx * 0.75, Math.PI / 6, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Direction of motion indicator (subtle arrow ahead along orbit)
      const pSpeed = Math.hypot(pVel.x, pVel.y);
      if (pSpeed > 0) {
        const velDirX = pVel.x / pSpeed;
        const velDirY = -pVel.y / pSpeed; // invert Y
        const arrowDist = bodyRadiusPx + 10;
        ctx.beginPath();
        ctx.moveTo(pScreen.x + velDirX * (arrowDist - 4), pScreen.y + velDirY * (arrowDist - 4));
        ctx.lineTo(pScreen.x + velDirX * (arrowDist + 6), pScreen.y + velDirY * (arrowDist + 6));
        ctx.strokeStyle = planet.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Planet Name
      ctx.fillStyle = '#e4e4e7';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(planet.name, pScreen.x, pScreen.y - bodyRadiusPx - 6);
    }

    // 4. Previous Run Comparison Ghost Trail
    if (previousTrail.length > 1) {
      ctx.beginPath();
      const first = worldToScreen(previousTrail[0].x, previousTrail[0].y, width, height);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < previousTrail.length; i++) {
        const pt = worldToScreen(previousTrail[i].x, previousTrail[i].y, width, height);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = 'rgba(161, 161, 170, 0.28)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 5. Current Flight Trail
    if (flightTrail.length > 1) {
      ctx.beginPath();
      const first = worldToScreen(flightTrail[0].x, flightTrail[0].y, width, height);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < flightTrail.length; i++) {
        const pt = worldToScreen(flightTrail[i].x, flightTrail[i].y, width, height);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 6. Docked Aiming / Trajectory Prediction Ghost
    if (!isFlying) {
      // Predictive lookahead trajectory
      const ghostPoints = predictTrajectory(probe, planets, 900, 0.004);
      if (ghostPoints.length > 1) {
        ctx.beginPath();
        const first = worldToScreen(ghostPoints[0].x, ghostPoints[0].y, width, height);
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < ghostPoints.length; i++) {
          const pt = worldToScreen(ghostPoints[i].x, ghostPoints[i].y, width, height);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Launch Arrow
      const probeScreen = worldToScreen(probe.pos.x, probe.pos.y, width, height);
      const angleRad = (launchAngleDeg * Math.PI) / 180;
      const arrowLenPx = 30 + (launchSpeedKmS / maxLaunchSpeedKmS) * 75;
      const arrowEndX = probeScreen.x + Math.cos(angleRad) * arrowLenPx;
      const arrowEndY = probeScreen.y - Math.sin(angleRad) * arrowLenPx;

      ctx.beginPath();
      ctx.moveTo(probeScreen.x, probeScreen.y);
      ctx.lineTo(arrowEndX, arrowEndY);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Aim Handle Circle
      ctx.beginPath();
      ctx.arc(arrowEndX, arrowEndY, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 7. Probe Render
    const probeScreen = worldToScreen(probe.pos.x, probe.pos.y, width, height);
    ctx.save();
    ctx.translate(probeScreen.x, probeScreen.y);

    const speedKmS = Math.hypot(probe.vel.x, probe.vel.y) * AU_YR_TO_KM_S;
    const probeAngleRad = Math.atan2(-probe.vel.y, probe.vel.x);
    ctx.rotate(probeAngleRad);

    // Probe icon: sleek diamond/triangle
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -4);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-6, 4);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    // 8. Velocity Vector indicator (when flying)
    if (isFlying && speedKmS > 0.5) {
      const vDirX = probe.vel.x / (speedKmS / AU_YR_TO_KM_S);
      const vDirY = -probe.vel.y / (speedKmS / AU_YR_TO_KM_S);
      const vLen = Math.min(35, speedKmS * 1.5);

      ctx.beginPath();
      ctx.moveTo(probeScreen.x, probeScreen.y);
      ctx.lineTo(probeScreen.x + vDirX * vLen, probeScreen.y + vDirY * vLen);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }, [
    planets,
    probe,
    flightTrail,
    previousTrail,
    targetPlanetId,
    isFlying,
    launchAngleDeg,
    launchSpeedKmS,
    maxLaunchSpeedKmS,
    scale,
    pan,
    worldToScreen
  ]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[520px] sm:h-[580px] rounded-2xl overflow-hidden bg-[#07080d] border border-white/10 select-none touch-none shadow-2xl"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Floating HUD controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-zinc-900/85 backdrop-blur-md px-2 py-1.5 rounded-xl border border-white/10 text-zinc-300">
        <button
          onClick={() => handleZoom(1.25)}
          title="Zoom in"
          className="p-1 hover:text-white hover:bg-white/10 rounded cursor-pointer transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(0.8)}
          title="Zoom out"
          className="p-1 hover:text-white hover:bg-white/10 rounded cursor-pointer transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          title="Fit view to solar system"
          className="p-1 hover:text-white hover:bg-white/10 rounded cursor-pointer transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setFollowProbe((p) => !p)}
          title={followProbe ? 'Unfollow probe' : 'Follow probe'}
          className={`p-1 rounded cursor-pointer transition ${
            followProbe ? 'text-emerald-400 bg-emerald-500/20' : 'hover:text-white hover:bg-white/10'
          }`}
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas mode helper tag */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
        <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-zinc-900/80 backdrop-blur-md text-zinc-300 border border-white/10">
          Scale: {scale.toFixed(0)} px/AU
        </span>
        {!isFlying && (
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
            Drag probe to aim & power
          </span>
        )}
      </div>
    </div>
  );
}
