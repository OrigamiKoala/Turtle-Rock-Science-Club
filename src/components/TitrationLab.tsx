import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile } from '../types';
import { MODULES } from './titration/modules';
import { REAGENTS, INDICATORS, calculateTitrationState, getIndicatorColor, makeUnknown, ReagentDef } from './titration/chem';
import { ModuleDef, ModuleTrack, TitrationTrial, CurvePoint, TitrationProgress } from './titration/types';
import Apparatus from './titration/Apparatus';
import CurvePlot from './titration/CurvePlot';
import Briefing from './titration/Briefing';
import Analysis from './titration/Analysis';
import Notebook from './titration/Notebook';
import { TestTube, Sparkles, Award, CheckCircle, BookOpen, Layers, Play, RotateCcw, Calculator } from 'lucide-react';

interface TitrationLabProps {
  userProfile: UserProfile;
  onUpdateXp: (xpToAdd: number, badgeToUnlock?: string) => void;
}

type LabView = 'briefing' | 'apparatus' | 'analysis' | 'notebook' | 'freebench';

const STORAGE_KEY = 'tr_sc_titration_progress';

export default function TitrationLab({ userProfile, onUpdateXp }: TitrationLabProps) {
  // Load progress from localStorage
  const [progress, setProgress] = useState<TitrationProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading titration progress from storage', e);
    }
    return {
      completedModules: [],
      solvedUnknownSeeds: [],
      bestErrorPercent: {},
      trials: [],
      lastActiveModuleId: 'module-1',
      track: 'basic'
    };
  });

  // Save progress
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.error('Failed saving titration progress', e);
    }
  }, [progress]);

  // Current active module
  const [activeModuleId, setActiveModuleId] = useState<string>(progress.lastActiveModuleId || 'module-1');
  const activeModule = MODULES.find((m) => m.id === activeModuleId) || MODULES[0];

  // Track (Basic vs Go Deeper)
  const [track, setTrack] = useState<ModuleTrack>(progress.track || 'basic');

  // Sub-view
  const [activeView, setActiveView] = useState<LabView>('briefing');

  // Mystery Sample Generator for module 9
  const [mysterySeed, setMysterySeed] = useState<number>(() => Math.floor(Math.random() * 8999) + 1000);
  const unknownSample = makeUnknown(mysterySeed);

  // Free bench state for module 10
  const [freeAnalyteId, setFreeAnalyteId] = useState<string>('citric');
  const [freeAnalyteConc, setFreeAnalyteConc] = useState<number>(0.05);
  const [freeAnalyteVol, setFreeAnalyteVol] = useState<number>(25.0);
  const [freeTitrantId, setFreeTitrantId] = useState<string>('naoh');
  const [freeTitrantConc, setFreeTitrantConc] = useState<number>(0.1);
  const [freeIndicatorId, setFreeIndicatorId] = useState<string>('phenolphthalein');

  // Effective reagents for current active session
  const isMystery = activeModule.setup.isMystery;
  const isFreeBench = activeModule.setup.isFreeBench;

  const currentAnalyte: ReagentDef = isMystery
    ? unknownSample.reagent
    : isFreeBench
      ? REAGENTS[freeAnalyteId] || REAGENTS.citric
      : activeModule.setup.analyte;

  const currentAnalyteConc: number = isMystery
    ? unknownSample.trueMolarity
    : isFreeBench
      ? freeAnalyteConc
      : activeModule.setup.analyteConc;

  const currentAnalyteVol: number = isMystery
    ? unknownSample.sampleVolumeMl
    : isFreeBench
      ? freeAnalyteVol
      : activeModule.setup.analyteVolumeMl;

  const currentTitrant: ReagentDef = isMystery
    ? unknownSample.titrant
    : isFreeBench
      ? REAGENTS[freeTitrantId] || REAGENTS.naoh
      : activeModule.setup.titrant;

  const currentTitrantConc: number = isMystery
    ? unknownSample.titrantMolarity
    : isFreeBench
      ? freeTitrantConc
      : activeModule.setup.titrantConc;

  const [currentIndicatorId, setCurrentIndicatorId] = useState<string>(activeModule.setup.defaultIndicatorId);

  // Update default indicator when active module changes
  useEffect(() => {
    if (isMystery) {
      setCurrentIndicatorId(unknownSample.recommendedIndicatorId);
    } else if (isFreeBench) {
      setCurrentIndicatorId(freeIndicatorId);
    } else {
      setCurrentIndicatorId(activeModule.setup.defaultIndicatorId);
    }
  }, [activeModuleId, isMystery, isFreeBench, freeIndicatorId, unknownSample.recommendedIndicatorId]);

  // Burette & Liquid simulation states
  const [initialReadingMl] = useState<number>(0.0);
  const [currentVolumeMl, setCurrentVolumeMl] = useState<number>(0.0);

  // Titration Detection Mode ('indicator' vs 'probe') - Visual Indicator is default
  const [titrationMode, setTitrationMode] = useState<'indicator' | 'probe'>('indicator');

  useEffect(() => {
    setTitrationMode('indicator');
  }, [activeModuleId]);

  // Ref to hold smooth volume during requestAnimationFrame streaming
  const volumeRef = useRef<number>(0.0);
  const isStreamingRef = useRef<boolean>(false);
  const [isStreamingState, setIsStreamingState] = useState<boolean>(false);
  const [deliveryMode, setDeliveryMode] = useState<'closed' | 'drop' | 'stream'>('closed');

  // Droplet streak and swirl states
  const [unmixedStreakRatio, setUnmixedStreakRatio] = useState<number>(0.0);
  const [isSwirling, setIsSwirling] = useState<boolean>(false);

  // Live Curve Points
  const [curvePoints, setCurvePoints] = useState<CurvePoint[]>([]);

  // Calculate current chemical equilibrium
  const deliveredVolumeMl = currentVolumeMl - initialReadingMl;
  const chemState = calculateTitrationState({
    analyte: currentAnalyte,
    analyteConc: currentAnalyteConc,
    analyteVolumeMl: currentAnalyteVol,
    titrant: currentTitrant,
    titrantConc: currentTitrantConc,
    titrantVolumeMl: deliveredVolumeMl
  });

  const currentPh = chemState.pH;
  const totalVolumeMl = chemState.totalVolumeMl;

  // Add curve point when volume changes
  const addCurvePoint = useCallback((vol: number) => {
    const calc = calculateTitrationState({
      analyte: currentAnalyte,
      analyteConc: currentAnalyteConc,
      analyteVolumeMl: currentAnalyteVol,
      titrant: currentTitrant,
      titrantConc: currentTitrantConc,
      titrantVolumeMl: vol
    });

    setCurvePoints((prev) => {
      // Append only if sufficiently spaced from last point
      if (prev.length > 0 && Math.abs(prev[prev.length - 1].volumeMl - vol) < 0.02) {
        return prev;
      }
      return [...prev, { volumeMl: Number(vol.toFixed(2)), pH: calc.pH, timestamp: Date.now() }];
    });
  }, [currentAnalyte, currentAnalyteConc, currentAnalyteVol, currentTitrant, currentTitrantConc]);

  // Initial zero-point curve record
  useEffect(() => {
    if (curvePoints.length === 0) {
      addCurvePoint(0.0);
    }
  }, [addCurvePoint, curvePoints.length]);

  // Streaming loop via requestAnimationFrame
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const streamLoop = (now: number) => {
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;

      if (isStreamingRef.current) {
        // Stream rate: ~1.2 mL per second
        const addAmount = 1.2 * deltaSec;
        const newVol = Math.min(50.0, volumeRef.current + addAmount);
        volumeRef.current = newVol;
        setCurrentVolumeMl(newVol);
        setUnmixedStreakRatio((r) => Math.min(1.0, r + 0.15));

        // Add curve point periodically
        addCurvePoint(newVol);

        if (newVol >= 50.0) {
          isStreamingRef.current = false;
          setIsStreamingState(false);
          setDeliveryMode('closed');
        }
      }

      animId = requestAnimationFrame(streamLoop);
    };

    animId = requestAnimationFrame(streamLoop);
    return () => cancelAnimationFrame(animId);
  }, [addCurvePoint]);

  // Stream controls
  const handleStartStream = useCallback(() => {
    if (volumeRef.current >= 50.0) return;
    isStreamingRef.current = true;
    setIsStreamingState(true);
    setDeliveryMode('stream');
  }, []);

  const handleStopStream = useCallback(() => {
    isStreamingRef.current = false;
    setIsStreamingState(false);
    setDeliveryMode('closed');
  }, []);

  // 1 Drop control (0.05 mL)
  const handleAddDrop = useCallback(() => {
    if (volumeRef.current >= 50.0) return;
    const newVol = Math.min(50.0, volumeRef.current + 0.05);
    volumeRef.current = newVol;
    setCurrentVolumeMl(newVol);
    setDeliveryMode('drop');
    setUnmixedStreakRatio((r) => Math.min(1.0, r + 0.25));
    addCurvePoint(newVol);

    setTimeout(() => {
      setDeliveryMode('closed');
    }, 250);
  }, [addCurvePoint]);

  // Swirl action
  const handleSwirl = useCallback(() => {
    setIsSwirling(true);
    setUnmixedStreakRatio(0.0);
    setTimeout(() => {
      setIsSwirling(false);
    }, 600);
  }, []);

  // Reset Trial
  const handleResetTrial = useCallback(() => {
    volumeRef.current = 0.0;
    setCurrentVolumeMl(0.0);
    setUnmixedStreakRatio(0.0);
    setIsSwirling(false);
    setCurvePoints([]);
    setDeliveryMode('closed');
  }, []);

  // Keyboard shortcut listeners (Space = stream, ArrowDown = drop, S = swirl)
  useEffect(() => {
    if (activeView !== 'apparatus') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!isStreamingRef.current) handleStartStream();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleAddDrop();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSwirl();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleStopStream();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeView, handleStartStream, handleStopStream, handleAddDrop, handleSwirl]);

  // Module change handler
  const handleSelectModule = (modId: string) => {
    setActiveModuleId(modId);
    setProgress((p) => ({ ...p, lastActiveModuleId: modId }));
    setActiveView('briefing');
    handleResetTrial();

    const selectedMod = MODULES.find((m) => m.id === modId);
    if (selectedMod?.setup.isMystery) {
      setMysterySeed(Math.floor(Math.random() * 8999) + 1000);
    }
  };

  // Roll new mystery sample
  const handleNewMysterySample = () => {
    const freshSeed = Math.floor(Math.random() * 8999) + 1000;
    setMysterySeed(freshSeed);
    handleResetTrial();
  };

  // Save completed trial
  const handleSaveTrial = (trial: TitrationTrial) => {
    setProgress((prev) => {
      const updatedTrials = [trial, ...prev.trials];
      const completedMods = prev.completedModules.includes(activeModule.id)
        ? prev.completedModules
        : [...prev.completedModules, activeModule.id];

      let solvedUnknowns = prev.solvedUnknownSeeds;
      if (isMystery && trial.passed && !solvedUnknowns.includes(mysterySeed)) {
        solvedUnknowns = [...solvedUnknowns, mysterySeed];
      }

      const bestErrors = { ...prev.bestErrorPercent };
      if (trial.errorPercent !== undefined) {
        const curBest = bestErrors[activeModule.id];
        if (curBest === undefined || trial.errorPercent < curBest) {
          bestErrors[activeModule.id] = trial.errorPercent;
        }
      }

      return {
        ...prev,
        completedModules: completedMods,
        solvedUnknownSeeds: solvedUnknowns,
        bestErrorPercent: bestErrors,
        trials: updatedTrials
      };
    });

    // Award XP and badges
    if (trial.passed) {
      if (isMystery) {
        // Award Analytical Chemist badge on mystery solve
        onUpdateXp(activeModule.xpReward, 'Analytical Chemist');
      } else {
        onUpdateXp(activeModule.xpReward);
      }
    }
  };

  // Next module progression
  const handleNextModule = () => {
    const nextIdx = activeModule.number; // number is 1-indexed, next is at index `number`
    if (nextIdx < MODULES.length) {
      handleSelectModule(MODULES[nextIdx].id);
    } else {
      setActiveView('notebook');
    }
  };

  const indData = getIndicatorColor(currentIndicatorId, currentPh);

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 font-sans text-[#1F3A42]">

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-[#1F3A42]/8 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full text-xs font-display font-bold bg-[#6CC24A] text-[#14351F]">
              Interactive Simulation Laboratory
            </span>
            <span className="text-xs font-display font-bold text-[#4C9A3A]">
              Physical Apparatus & Equilibria
            </span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#1F3A42] tracking-tight">
            Titration Lab
          </h1>
          <p className="text-sm font-sans text-[#4B6169] mt-1 max-w-2xl">
            A guided exploration of acid–base equilibria, volumetric glassware, and mystery unknown identification.
          </p>
        </div>

        {/* Global Action Chips */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveView('notebook')}
            className={`px-4 py-2 rounded-full text-xs font-display font-bold transition flex items-center gap-1.5 cursor-pointer border-2 ${activeView === 'notebook'
              ? 'bg-[#E4F5DA] text-[#2E7D46] border-transparent'
              : 'bg-white text-[#4B6169] border-[#1F3A42]/15 hover:bg-[#1F3A42]/5'
              }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Lab Notebook ({progress.trials.length})</span>
          </button>
        </div>
      </div>

      {/* Module Selector Rail (1 to 9) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-[#4B6169] uppercase tracking-wide">
            Curriculum Modules
          </span>
          <span className="text-xs font-display font-bold text-[#2E7D46]">
            {progress.completedModules.length} of {MODULES.length} Completed
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
          {MODULES.map((mod) => {
            const isCompleted = progress.completedModules.includes(mod.id);
            const isCurrent = mod.id === activeModuleId;
            return (
              <button
                key={mod.id}
                onClick={() => handleSelectModule(mod.id)}
                className={`p-2.5 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${isCurrent
                  ? 'border-[#6CC24A] bg-[#E4F5DA] text-[#2E7D46] shadow-sm'
                  : isCompleted
                    ? 'border-[#1F3A42]/15 bg-white hover:border-[#6CC24A]/40 text-[#1F3A42]'
                    : 'border-[#1F3A42]/8 bg-white hover:border-[#1F3A42]/15 text-[#4B6169]'
                  }`}
                title={mod.title}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-display font-bold">Mod {mod.number}</span>
                  {isCompleted && <CheckCircle className="w-3.5 h-3.5 text-[#2E7D46]" />}
                </div>
                <p className="text-xs font-display font-bold truncate mt-1">
                  {mod.title}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-View Navigation Tabs */}
      <div className="flex items-center justify-between border-b-2 border-[#1F3A42]/8 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveView('briefing')}
            className={`px-4 py-2 rounded-full text-xs font-display font-bold transition cursor-pointer flex items-center gap-1.5 border-2 ${activeView === 'briefing'
              ? 'bg-[#E4F5DA] text-[#2E7D46] border-transparent'
              : 'text-[#4B6169] border-transparent hover:bg-[#1F3A42]/5'
              }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>1. Briefing & Predict</span>
          </button>

          <button
            onClick={() => setActiveView('apparatus')}
            className={`px-4 py-2 rounded-full text-xs font-display font-bold transition cursor-pointer flex items-center gap-1.5 border-2 ${activeView === 'apparatus'
              ? 'bg-[#E4F5DA] text-[#2E7D46] border-transparent'
              : 'text-[#4B6169] border-transparent hover:bg-[#1F3A42]/5'
              }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>2. Apparatus Laboratory</span>
          </button>

          <button
            onClick={() => setActiveView('analysis')}
            disabled={deliveredVolumeMl < 0.05}
            className={`px-4 py-2 rounded-full text-xs font-display font-bold transition cursor-pointer flex items-center gap-1.5 border-2 disabled:opacity-40 disabled:cursor-not-allowed ${activeView === 'analysis'
              ? 'bg-[#E4F5DA] text-[#2E7D46] border-transparent'
              : 'text-[#4B6169] border-transparent hover:bg-[#1F3A42]/5'
              }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3. Quantitative Analysis</span>
          </button>
        </div>

        {/* Mystery Seed Roll button */}
        {isMystery && activeView === 'apparatus' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#2E7D46]">
              Sample: {unknownSample.sampleId}
            </span>
            <button
              onClick={handleNewMysterySample}
              className="px-3 py-1 rounded-full text-[11px] font-display font-bold bg-[#FBF7EC] border border-[#1F3A42]/15 text-[#1F3A42] hover:bg-[#1F3A42]/5 cursor-pointer"
            >
              Roll New Unknown
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: Briefing & Predict */}
      {activeView === 'briefing' && (
        <Briefing
          module={activeModule}
          track={track}
          onSetTrack={setTrack}
          onStartTitration={() => setActiveView('apparatus')}
        />
      )}

      {/* VIEW 2: Apparatus Laboratory */}
      {activeView === 'apparatus' && (
        <div className="space-y-6">
          {/* Titration Detection Method Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border-2 border-[#1F3A42]/8 bg-white shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-display font-bold text-[#1F3A42]">Titration Method:</span>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-full bg-[#1F3A42]/5 border border-[#1F3A42]/10">
              <button
                onClick={() => setTitrationMode('indicator')}
                className={`px-4 py-1.5 rounded-full text-xs font-display font-bold transition cursor-pointer flex items-center gap-1.5 ${titrationMode === 'indicator'
                  ? 'bg-[#6CC24A] text-[#14351F] shadow-sm'
                  : 'text-[#4B6169] hover:text-[#1F3A42]'
                  }`}
              >
                <span>Visual Indicator</span>
              </button>
              <button
                onClick={() => setTitrationMode('probe')}
                className={`px-4 py-1.5 rounded-full text-xs font-display font-bold transition cursor-pointer flex items-center gap-1.5 ${titrationMode === 'probe'
                  ? 'bg-[#1F3A42] text-white shadow-sm'
                  : 'text-[#4B6169] hover:text-[#1F3A42]'
                  }`}
              >
                <span>pH Probe & Curve</span>
              </button>
            </div>
          </div>

          {/* Laboratory Floor */}
          {titrationMode === 'probe' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Apparatus with Submerged pH Probe */}
              <div className="lg:col-span-6">
                <Apparatus
                  currentVolumeMl={currentVolumeMl}
                  initialReadingMl={initialReadingMl}
                  isStreaming={isStreamingState}
                  deliveryMode={deliveryMode}
                  onStartStream={handleStartStream}
                  onStopStream={handleStopStream}
                  onAddDrop={handleAddDrop}
                  onSwirl={handleSwirl}
                  isSwirling={isSwirling}
                  unmixedStreakRatio={unmixedStreakRatio}
                  totalVolumeMl={totalVolumeMl}
                  pH={currentPh}
                  indicatorId={currentIndicatorId}
                  titrantName={currentTitrant.name}
                  titrantFormula={currentTitrant.formula}
                  analyteName={currentAnalyte.name}
                  analyteFormula={currentAnalyte.formula}
                  showProbe={true}
                />
              </div>

              {/* Right: Live Titration Curve Plot & Benchmark Actions */}
              <div className="lg:col-span-6 space-y-6">
                <CurvePlot
                  points={curvePoints}
                  currentVolumeMl={deliveredVolumeMl}
                  currentPh={currentPh}
                  showAnnotations={false}
                  indicatorId={currentIndicatorId}
                />

                <div className="p-4 rounded-[28px] border-2 border-[#1F3A42]/8 bg-white shadow-[0_8px_24px_rgba(31,58,66,0.06)] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    onClick={handleResetTrial}
                    className="text-xs font-sans font-bold text-[#4B6169] hover:text-[#1F3A42] flex items-center gap-1.5 transition cursor-pointer"
                    title="Rinse burette and beaker for a new trial"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rinse & Reset Setup</span>
                  </button>

                  <button
                    onClick={() => setActiveView('analysis')}
                    disabled={deliveredVolumeMl < 0.05}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-full font-display font-bold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer bg-[#1F3A42] text-white shadow-[0_4px_0_#14282e] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                    title="Record data and perform analytical calculations"
                  >
                    <Calculator className="w-4 h-4" />
                    <span>Proceed to Calculations →</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Pure Glassware Setup without Probe or Curve */}
              <Apparatus
                currentVolumeMl={currentVolumeMl}
                initialReadingMl={initialReadingMl}
                isStreaming={isStreamingState}
                deliveryMode={deliveryMode}
                onStartStream={handleStartStream}
                onStopStream={handleStopStream}
                onAddDrop={handleAddDrop}
                onSwirl={handleSwirl}
                isSwirling={isSwirling}
                unmixedStreakRatio={unmixedStreakRatio}
                totalVolumeMl={totalVolumeMl}
                pH={currentPh}
                indicatorId={currentIndicatorId}
                titrantName={currentTitrant.name}
                titrantFormula={currentTitrant.formula}
                analyteName={currentAnalyte.name}
                analyteFormula={currentAnalyte.formula}
                showProbe={false}
              />

              <div className="p-4 rounded-[28px] border-2 border-[#1F3A42]/8 bg-white shadow-[0_8px_24px_rgba(31,58,66,0.06)] flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={handleResetTrial}
                  className="text-xs font-sans font-bold text-[#4B6169] hover:text-[#1F3A42] flex items-center gap-1.5 transition cursor-pointer"
                  title="Rinse burette and beaker for a new trial"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rinse & Reset Setup</span>
                </button>

                <button
                  onClick={() => setActiveView('analysis')}
                  disabled={deliveredVolumeMl < 0.05}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full font-display font-bold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer bg-[#1F3A42] text-white shadow-[0_4px_0_#14282e] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                  title="Record data and perform analytical calculations"
                >
                  <Calculator className="w-4 h-4" />
                  <span>Proceed to Calculations →</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: Quantitative Analysis */}
      {activeView === 'analysis' && (
        <Analysis
          module={activeModule}
          track={track}
          initialReadingMl={initialReadingMl}
          finalReadingMl={currentVolumeMl}
          deliveredVolumeMl={deliveredVolumeMl}
          finalPh={currentPh}
          endpointColorHex={indData.colorHex}
          endpointColorName={indData.description}
          curvePoints={curvePoints}
          trueConcentration={currentAnalyteConc}
          sampleVolumeMl={currentAnalyteVol}
          sampleId={isMystery ? unknownSample.sampleId : `MOD-${activeModule.number}`}
          onSaveTrial={handleSaveTrial}
          onNextModule={handleNextModule}
          onRetryTrial={() => {
            handleResetTrial();
            setActiveView('apparatus');
          }}
        />
      )}

      {/* VIEW 4: Lab Notebook */}
      {activeView === 'notebook' && (
        <Notebook
          trials={progress.trials}
          onClearNotebook={() => setProgress((p) => ({ ...p, trials: [] }))}
        />
      )}

    </section>
  );
}
