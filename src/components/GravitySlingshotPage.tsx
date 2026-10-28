import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile } from '../types';
import { STAGES } from './slingshot/stages';
import {
  createLaunchState,
  stepSimulation,
  applyBurn,
  computeTelemetry
} from './slingshot/physics';
import {
  ProbeState,
  Vector2D,
  FlightTelemetryPoint,
  SlingshotProgress
} from './slingshot/types';
import SlingshotHeader from './slingshot/SlingshotHeader';
import SlingshotCanvas from './slingshot/SlingshotCanvas';
import TelemetryPanel from './slingshot/TelemetryPanel';
import { Sparkles, HelpCircle, AlertCircle, CheckCircle2, ChevronRight, RotateCcw } from 'lucide-react';

interface GravitySlingshotPageProps {
  userProfile: UserProfile;
  onUpdateXp: (xpToAdd: number, badgeToUnlock?: string) => void;
  onNavigateHome: () => void;
  onOpenJoin: () => void;
  onOpenLogin: () => void;
}

const STORAGE_KEY = 'tr_sc_slingshot_progress';

export default function GravitySlingshotPage({
  userProfile,
  onUpdateXp,
  onNavigateHome,
  onOpenJoin,
  onOpenLogin
}: GravitySlingshotPageProps) {
  // Load saved progress from localStorage
  const [progress, setProgress] = useState<SlingshotProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading slingshot progress', e);
    }
    return {
      completedStages: [],
      bestFuelUsage: {},
      unlockedSandbox: false
    };
  });

  // Save progress
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.error('Failed writing slingshot progress', e);
    }
  }, [progress]);

  // Stage selection
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const activeStage = STAGES[activeStageIndex] || STAGES[0];

  // Aiming parameters
  const [launchAngleDeg, setLaunchAngleDeg] = useState<number>(activeStage.defaultLaunchAngleDeg);
  const [launchSpeedKmS, setLaunchSpeedKmS] = useState<number>(activeStage.defaultLaunchSpeedKmS);

  // Probe simulation state
  const [probe, setProbe] = useState<ProbeState>(() =>
    createLaunchState(
      activeStage.planets.find((p) => p.id === activeStage.launchBodyId) || activeStage.planets[0],
      activeStage.planets,
      activeStage.defaultLaunchAngleDeg,
      activeStage.defaultLaunchSpeedKmS,
      activeStage.initialFuelKmS
    )
  );

  // Trails and flight history
  const [flightTrail, setFlightTrail] = useState<Vector2D[]>([]);
  const [previousTrail, setPreviousTrail] = useState<Vector2D[]>([]);
  const [flightLog, setFlightLog] = useState<FlightTelemetryPoint[]>([]);

  // Simulation execution state
  const [isFlying, setIsFlying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [timeWarp, setTimeWarp] = useState<number>(5);

  // Feedback and hints
  const [missMessage, setMissMessage] = useState<string | null>(null);
  const [stageSolved, setStageSolved] = useState<boolean>(false);
  const [unlockedHintLevel, setUnlockedHintLevel] = useState<number>(0);

  // Refs for requestAnimationFrame loop
  const animFrameRef = useRef<number | null>(null);
  const probeRef = useRef<ProbeState>(probe);
  probeRef.current = probe;

  const isFlyingRef = useRef<boolean>(isFlying);
  isFlyingRef.current = isFlying;

  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

  const timeWarpRef = useRef<number>(timeWarp);
  timeWarpRef.current = timeWarp;

  const flightTrailRef = useRef<Vector2D[]>(flightTrail);
  flightTrailRef.current = flightTrail;

  const flightLogRef = useRef<FlightTelemetryPoint[]>(flightLog);
  flightLogRef.current = flightLog;

  // Reset stage to pad
  const resetToPad = useCallback(
    (stage = activeStage) => {
      if (flightTrailRef.current.length > 2) {
        setPreviousTrail([...flightTrailRef.current]);
      }
      setIsFlying(false);
      setIsPaused(false);
      setStageSolved(false);
      setMissMessage(null);
      setFlightTrail([]);
      setFlightLog([]);

      const launchPlanet =
        stage.planets.find((p) => p.id === stage.launchBodyId) || stage.planets[0];

      const freshProbe = createLaunchState(
        launchPlanet,
        stage.planets,
        stage.defaultLaunchAngleDeg,
        stage.defaultLaunchSpeedKmS,
        stage.initialFuelKmS
      );

      setLaunchAngleDeg(stage.defaultLaunchAngleDeg);
      setLaunchSpeedKmS(stage.defaultLaunchSpeedKmS);
      setProbe(freshProbe);
    },
    [activeStage]
  );

  // Switch stage
  const handleSelectStage = (index: number) => {
    setActiveStageIndex(index);
    setUnlockedHintLevel(0);
    resetToPad(STAGES[index]);
  };

  // Launch probe
  const handleLaunch = () => {
    setMissMessage(null);
    setStageSolved(false);

    const launchPlanet =
      activeStage.planets.find((p) => p.id === activeStage.launchBodyId) || activeStage.planets[0];

    const launchedProbe = createLaunchState(
      launchPlanet,
      activeStage.planets,
      launchAngleDeg,
      launchSpeedKmS,
      activeStage.initialFuelKmS
    );

    setProbe(launchedProbe);
    setFlightTrail([{ x: launchedProbe.pos.x, y: launchedProbe.pos.y }]);
    setFlightLog([]);
    setIsFlying(true);
    setIsPaused(false);
  };

  // Apply burn
  const handleApplyBurn = (deltaVKmS: Vector2D) => {
    if (!isFlyingRef.current) return;
    setProbe((prev) => applyBurn(prev, deltaVKmS));
  };

  // Main 60fps simulation loop
  useEffect(() => {
    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      animFrameRef.current = requestAnimationFrame(loop);

      const elapsedMs = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      if (!isFlyingRef.current || isPausedRef.current) return;

      // Fixed physics substep dt = 0.0005 yr (~4.38 hours per substep)
      const baseDt = 0.0005;
      const substeps = Math.max(1, Math.min(60, Math.round((timeWarpRef.current * elapsedMs) / 30)));

      let cur = { ...probeRef.current };
      let newTrailPoints: Vector2D[] = [];
      let newLogEvents: FlightTelemetryPoint[] = [];

      for (let s = 0; s < substeps; s++) {
        const { nextState, event, eventBody } = stepSimulation(cur, activeStage.planets, baseDt);
        cur = nextState;

        if (s % 3 === 0) {
          newTrailPoints.push({ x: cur.pos.x, y: cur.pos.y });
        }

        if (event) {
          const telemetry = computeTelemetry(cur, activeStage.planets, activeStage.targetBodyId);
          newLogEvents.push({
            timeYr: cur.timeYr,
            x: cur.pos.x,
            y: cur.pos.y,
            speedKmS: telemetry.speedHeliocentricKmS,
            fuelKmS: cur.fuel,
            nearestPlanetId: telemetry.nearestPlanet?.id || null,
            nearestPlanetDistAU: telemetry.nearestPlanetDistAU,
            event
          });
        }

        // Check success
        const allLog = [...flightLogRef.current, ...newLogEvents];
        if (activeStage.checkSuccess(cur, allLog)) {
          setIsFlying(false);
          setStageSolved(true);

          // Update progress
          setProgress((prev) => {
            const already = prev.completedStages.includes(activeStage.id);
            if (!already) {
              onUpdateXp(15, 'Navigator');
              return {
                ...prev,
                completedStages: [...prev.completedStages, activeStage.id]
              };
            }
            return prev;
          });
          break;
        }

        // Check failure
        const failureReason = activeStage.checkFailure(cur, allLog);
        if (failureReason) {
          setIsFlying(false);
          setMissMessage(failureReason);
          break;
        }

        if (cur.status !== 'flying') {
          setIsFlying(false);
          if (cur.status === 'crashed_sun') {
            setMissMessage('The probe plunged into the Sun. Aim tangent to Earth’s orbit to stay in freefall.');
          } else if (cur.status === 'crashed_planet') {
            setMissMessage(`The probe crashed into ${cur.crashedBodyName || 'a planet'}. Give it more clearance.`);
          } else if (cur.status === 'lost_space') {
            setMissMessage('The probe escaped into deep space.');
          }
          break;
        }
      }

      setProbe(cur);
      if (newTrailPoints.length > 0) {
        setFlightTrail((prev) => [...prev, ...newTrailPoints]);
      }
      if (newLogEvents.length > 0) {
        setFlightLog((prev) => [...prev, ...newLogEvents]);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeStage, onUpdateXp]);

  // Expose test hook for verification and cold-read scripts (SKILL.md Phase 4 requirement)
  useEffect(() => {
    (window as unknown as { __sim: unknown }).__sim = {
      getState: () => ({
        stageIndex: activeStageIndex,
        probe: probeRef.current,
        isFlying: isFlyingRef.current,
        isPaused: isPausedRef.current,
        timeWarp: timeWarpRef.current,
        stageSolved,
        missMessage
      }),
      setState: (partial: Partial<ProbeState>) => {
        setProbe((prev) => ({ ...prev, ...partial }));
      },
      step: (dtYr: number = 0.001) => {
        const { nextState } = stepSimulation(probeRef.current, activeStage.planets, dtYr);
        setProbe(nextState);
        return nextState;
      },
      launch: handleLaunch,
      reset: () => resetToPad(activeStage)
    };
    return () => {
      delete (window as unknown as { __sim?: unknown }).__sim;
    };
  }, [activeStageIndex, activeStage, stageSolved, missMessage, handleLaunch, resetToPad]);

  // Compute live telemetry for display
  const telemetry = computeTelemetry(probe, activeStage.planets, activeStage.targetBodyId);
  const targetPlanet = activeStage.planets.find((p) => p.id === activeStage.targetBodyId) || null;

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col font-sans">
      {/* Top Header */}
      <SlingshotHeader
        onNavigateHome={onNavigateHome}
        userProfile={userProfile}
        onOpenJoin={onOpenJoin}
        onOpenLogin={onOpenLogin}
        activeStageIndex={activeStageIndex}
        onSelectStage={handleSelectStage}
        completedStages={progress.completedStages}
        onResetStage={() => resetToPad(activeStage)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">

        {/* Stage Objective & Prompt Bar */}
        <div className="bg-[#0d0d12] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-semibold border border-emerald-500/30">
                Stage {activeStage.number} of 5
              </span>
              <h2 className="font-display font-bold text-lg sm:text-xl text-zinc-100">
                {activeStage.title}
              </h2>
            </div>
            <p className="text-sm text-zinc-300 font-medium">
              {activeStage.prompt}
            </p>
          </div>

          {/* Hint Accordion Trigger */}
          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            {activeStage.hints.length > 0 && (
              <button
                id="slingshot-hint-btn"
                onClick={() => setUnlockedHintLevel((lvl) => Math.min(lvl + 1, activeStage.hints.length))}
                disabled={unlockedHintLevel >= activeStage.hints.length}
                className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition border border-white/15 text-zinc-300 hover:text-white hover:bg-white/5 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {unlockedHintLevel === 0
                    ? 'Get Hint'
                    : `Hint ${unlockedHintLevel}/${activeStage.hints.length}`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Revealed Hints Box */}
        {unlockedHintLevel > 0 && (
          <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3.5 space-y-2 text-xs font-mono text-amber-200 animate-fade-in">
            {activeStage.hints.slice(0, unlockedHintLevel).map((h, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="font-bold text-amber-400 shrink-0">H{i + 1}:</span>
                <span>{h.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Miss Message Feedback Banner */}
        {missMessage && (
          <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs font-mono text-red-200 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{missMessage}</span>
            </div>
            <button
              onClick={() => resetToPad(activeStage)}
              className="px-2.5 py-1 rounded-lg bg-red-900/40 hover:bg-red-800/40 text-red-100 border border-red-500/30 cursor-pointer shrink-0 transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Stage Solved / Naming Card */}
        {stageSolved && (
          <div className="bg-emerald-950/40 border-2 border-emerald-500/40 rounded-2xl p-5 sm:p-6 space-y-3 text-zinc-100 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-2.5 text-emerald-400 font-display font-bold text-lg">
              <CheckCircle2 className="w-6 h-6" />
              <span>Stage {activeStage.number} Complete: {activeStage.completionText.term}</span>
            </div>

            <p className="text-sm text-emerald-200/90 leading-relaxed font-sans">
              <strong>{activeStage.completionText.plain}</strong> {activeStage.completionText.detail}
            </p>

            <div className="pt-2 flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-emerald-300/80 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                +15 XP Earned
              </span>

              {activeStageIndex < STAGES.length - 1 ? (
                <button
                  id="slingshot-next-stage-btn"
                  onClick={() => handleSelectStage(activeStageIndex + 1)}
                  className="px-5 py-2 rounded-xl font-display font-bold text-xs sm:text-sm bg-[#6CC24A] text-[#14351F] hover:brightness-105 active:scale-95 shadow-[0_3px_0_#4C9A3A] transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>Continue to Stage {activeStageIndex + 2}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => handleSelectStage(4)}
                  className="px-5 py-2 rounded-xl font-display font-bold text-xs sm:text-sm bg-sky-500 text-slate-950 hover:brightness-105 transition cursor-pointer"
                >
                  Enter Deep Space Sandbox
                </button>
              )}
            </div>
          </div>
        )}

        {/* 2D Canvas Orbital Simulation */}
        <SlingshotCanvas
          planets={activeStage.planets}
          probe={probe}
          flightTrail={flightTrail}
          previousTrail={previousTrail}
          targetPlanetId={activeStage.targetBodyId}
          isFlying={isFlying}
          launchAngleDeg={launchAngleDeg}
          launchSpeedKmS={launchSpeedKmS}
          onAimChange={(angle, speed) => {
            setLaunchAngleDeg(angle);
            setLaunchSpeedKmS(speed);
          }}
          maxLaunchSpeedKmS={activeStage.maxLaunchSpeedKmS}
          minLaunchSpeedKmS={activeStage.minLaunchSpeedKmS}
        />

        {/* Live Telemetry & Control Panel */}
        <TelemetryPanel
          probe={probe}
          telemetry={telemetry}
          targetPlanet={targetPlanet}
          isFlying={isFlying}
          timeWarp={timeWarp}
          isPaused={isPaused}
          launchAngleDeg={launchAngleDeg}
          launchSpeedKmS={launchSpeedKmS}
          maxLaunchSpeedKmS={activeStage.maxLaunchSpeedKmS}
          minLaunchSpeedKmS={activeStage.minLaunchSpeedKmS}
          allowMidCourseBurn={activeStage.allowMidCourseBurn}
          onLaunch={handleLaunch}
          onReset={() => resetToPad(activeStage)}
          onAimChange={(angle, speed) => {
            setLaunchAngleDeg(angle);
            setLaunchSpeedKmS(speed);
          }}
          onApplyBurn={handleApplyBurn}
          onTogglePause={() => setIsPaused((p) => !p)}
          onSetTimeWarp={(w) => setTimeWarp(w)}
        />

      </main>
    </div>
  );
}
