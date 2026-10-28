import React from 'react';
import { ProbeState, PlanetDef, Telemetry } from './types';
import { Play, Pause, FastForward, RotateCcw, Rocket, Flame, Compass, Gauge, Clock, Target } from 'lucide-react';

interface TelemetryPanelProps {
  probe: ProbeState;
  telemetry: {
    speedHeliocentricKmS: number;
    speedNearestPlanetKmS: number | null;
    nearestPlanet: PlanetDef | null;
    nearestPlanetDistAU: number | null;
    targetDistAU: number;
    targetReached: boolean;
    isPassingBehindNearest: boolean | null;
  };
  targetPlanet: PlanetDef | null;
  isFlying: boolean;
  timeWarp: number;
  isPaused: boolean;
  launchAngleDeg: number;
  launchSpeedKmS: number;
  maxLaunchSpeedKmS: number;
  minLaunchSpeedKmS: number;
  allowMidCourseBurn: boolean;
  onLaunch: () => void;
  onReset: () => void;
  onAimChange: (angle: number, speed: number) => void;
  onApplyBurn: (burnKmS: { x: number; y: number }) => void;
  onTogglePause: () => void;
  onSetTimeWarp: (warp: number) => void;
}

export default function TelemetryPanel({
  probe,
  telemetry,
  targetPlanet,
  isFlying,
  timeWarp,
  isPaused,
  launchAngleDeg,
  launchSpeedKmS,
  maxLaunchSpeedKmS,
  minLaunchSpeedKmS,
  allowMidCourseBurn,
  onLaunch,
  onReset,
  onAimChange,
  onApplyBurn,
  onTogglePause,
  onSetTimeWarp
}: TelemetryPanelProps) {
  const elapsedDays = Math.round(probe.timeYr * 365.25);
  const fuelPercent = probe.maxFuel > 0 ? (probe.fuel / probe.maxFuel) * 100 : 0;

  // Compute burn vectors relative to current probe heading
  const currentSpeed = Math.hypot(probe.vel.x, probe.vel.y);
  const headingUnitX = currentSpeed > 0 ? probe.vel.x / currentSpeed : 0;
  const headingUnitY = currentSpeed > 0 ? probe.vel.y / currentSpeed : 1;

  // Normal unit vector (perpendicular left)
  const normalUnitX = -headingUnitY;
  const normalUnitY = headingUnitX;

  const handleBurn = (type: 'prograde' | 'retrograde' | 'left' | 'right', magnitudeKmS: number = 0.5) => {
    let bx = 0;
    let by = 0;
    if (type === 'prograde') {
      bx = headingUnitX * magnitudeKmS;
      by = headingUnitY * magnitudeKmS;
    } else if (type === 'retrograde') {
      bx = -headingUnitX * magnitudeKmS;
      by = -headingUnitY * magnitudeKmS;
    } else if (type === 'left') {
      bx = normalUnitX * magnitudeKmS;
      by = normalUnitY * magnitudeKmS;
    } else if (type === 'right') {
      bx = -normalUnitX * magnitudeKmS;
      by = -normalUnitY * magnitudeKmS;
    }
    onApplyBurn({ x: bx, y: by });
  };

  return (
    <div className="w-full bg-[#0d0d12] border border-white/10 rounded-2xl p-4 sm:p-5 text-zinc-200 shadow-xl space-y-4">

      {/* Row 1: Primary Telemetry Readouts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">

        {/* Heliocentric Speed */}
        <div className="bg-zinc-900/80 border border-white/5 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span>Speed (Sun)</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-mono font-bold text-zinc-100">
              {telemetry.speedHeliocentricKmS.toFixed(1)}
            </span>
            <span className="text-xs text-zinc-400 font-mono">km/s</span>
          </div>
        </div>

        {/* Mission Time */}
        <div className="bg-zinc-900/80 border border-white/5 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Mission Time</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-mono font-bold text-zinc-100">
              {probe.timeYr.toFixed(2)}
            </span>
            <span className="text-xs text-zinc-400 font-mono">yr ({elapsedDays}d)</span>
          </div>
        </div>

        {/* Distance to Target */}
        <div className="bg-zinc-900/80 border border-white/5 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
            <Target className="w-3.5 h-3.5 text-indigo-400" />
            <span>Target Dist</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-mono font-bold text-zinc-100">
              {telemetry.targetDistAU < 99 ? telemetry.targetDistAU.toFixed(2) : '--'}
            </span>
            <span className="text-xs text-zinc-400 font-mono">AU</span>
          </div>
        </div>

        {/* Fuel Gauge */}
        <div className="bg-zinc-900/80 border border-white/5 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5">
              <Flame className={`w-3.5 h-3.5 ${probe.fuel > 0.5 ? 'text-emerald-400' : 'text-red-400'}`} />
              <span>Fuel Budget</span>
            </div>
            <span className="text-[11px]">{probe.fuel.toFixed(1)} km/s</span>
          </div>
          <div className="mt-2 w-full bg-zinc-800 rounded-full h-2 overflow-hidden border border-white/5">
            <div
              className={`h-full transition-all duration-200 ${
                fuelPercent > 40 ? 'bg-emerald-500' : fuelPercent > 15 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, fuelPercent))}%` }}
            />
          </div>
        </div>

      </div>

      {/* Row 2: Planetary Encounter Live Banner */}
      {telemetry.nearestPlanet && telemetry.nearestPlanetDistAU !== null && telemetry.nearestPlanetDistAU < 1.2 && (
        <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono transition-all animate-fade-in ${
          telemetry.isPassingBehindNearest === true
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : telemetry.isPassingBehindNearest === false
            ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            : 'bg-zinc-900/60 border-white/10 text-zinc-300'
        }`}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: telemetry.nearestPlanet.color }} />
            <span>
              Encountering <strong>{telemetry.nearestPlanet.name}</strong> ({telemetry.nearestPlanetDistAU.toFixed(3)} AU away)
            </span>
            {telemetry.speedNearestPlanetKmS !== null && (
              <span className="text-zinc-400 hidden md:inline">
                · Flyby Speed: {telemetry.speedNearestPlanetKmS.toFixed(1)} km/s
              </span>
            )}
          </div>

          <div className="font-semibold">
            {telemetry.isPassingBehindNearest === true && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Passing in Wake (+$\Delta v$ Boost)
              </span>
            )}
            {telemetry.isPassingBehindNearest === false && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Passing in Front ($-\Delta v$ Drag)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Row 3: Action Controls */}
      <div className="bg-zinc-900/90 border border-white/5 rounded-xl p-3.5 space-y-3">

        {!isFlying ? (
          /* Launch Controls */
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Launch Angle Slider */}
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs font-mono text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-zinc-300" />
                    Launch Heading
                  </span>
                  <span className="text-zinc-200 font-bold">{launchAngleDeg.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="0.5"
                  value={launchAngleDeg}
                  onChange={(e) => onAimChange(parseFloat(e.target.value), launchSpeedKmS)}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
              </div>

              {/* Launch Speed Slider */}
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs font-mono text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Rocket className="w-3.5 h-3.5 text-zinc-300" />
                    Burn Power
                  </span>
                  <span className="text-zinc-200 font-bold">{launchSpeedKmS.toFixed(1)} km/s</span>
                </div>
                <input
                  type="range"
                  min={minLaunchSpeedKmS}
                  max={maxLaunchSpeedKmS}
                  step="0.1"
                  value={launchSpeedKmS}
                  onChange={(e) => onAimChange(launchAngleDeg, parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
              </div>

              {/* Launch Button */}
              <button
                id="slingshot-launch-btn"
                onClick={onLaunch}
                className="px-6 py-2.5 rounded-xl font-display font-bold text-sm bg-[#6CC24A] text-[#14351F] hover:brightness-105 active:scale-95 shadow-[0_3px_0_#4C9A3A] transition cursor-pointer flex items-center justify-center gap-2 shrink-0"
              >
                <Rocket className="w-4 h-4" />
                <span>Launch Probe</span>
              </button>
            </div>
          </div>
        ) : (
          /* In-Flight Controls */
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">

            {/* Mid-course Burns */}
            {allowMidCourseBurn && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-zinc-400 font-mono mr-1">Nudge Thruster:</span>
                <button
                  onClick={() => handleBurn('prograde', 0.5)}
                  disabled={probe.fuel <= 0}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-emerald-300 border border-white/10 cursor-pointer transition"
                >
                  +Prograde (0.5 km/s)
                </button>
                <button
                  onClick={() => handleBurn('retrograde', 0.5)}
                  disabled={probe.fuel <= 0}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-amber-300 border border-white/10 cursor-pointer transition"
                >
                  -Brake (0.5 km/s)
                </button>
                <button
                  onClick={() => handleBurn('left', 0.5)}
                  disabled={probe.fuel <= 0}
                  className="px-2 py-1 rounded-lg text-xs font-mono bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 border border-white/10 cursor-pointer transition"
                >
                  ← Left
                </button>
                <button
                  onClick={() => handleBurn('right', 0.5)}
                  disabled={probe.fuel <= 0}
                  className="px-2 py-1 rounded-lg text-xs font-mono bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 border border-white/10 cursor-pointer transition"
                >
                  Right →
                </button>
              </div>
            )}

            {/* Playback Speed Controls */}
            <div className="flex items-center gap-1.5 self-end md:self-auto">
              <button
                onClick={onTogglePause}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 cursor-pointer transition"
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-zinc-300" />}
              </button>

              {[1, 5, 20, 100].map((warp) => (
                <button
                  key={warp}
                  onClick={() => onSetTimeWarp(warp)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                    timeWarp === warp
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-white/5'
                  }`}
                >
                  {warp}x
                </button>
              ))}

              <button
                onClick={onReset}
                title="Reset to launch pad"
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10 cursor-pointer transition flex items-center gap-1 ml-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
