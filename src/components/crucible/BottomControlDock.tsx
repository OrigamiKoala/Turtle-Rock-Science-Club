import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ArrowRight,
  Minus,
  Plus,
  HelpCircle,
  EyeOff,
  Eye,
} from 'lucide-react';
import {
  QuestChapter,
  REACTIONS,
  StoichiometryAnalysis,
} from './stoichiometryQuests';

interface BottomControlDockProps {
  chapter: QuestChapter;
  isSandbox: boolean;
  analysis: StoichiometryAnalysis;
  inputUnit: 'moles' | 'grams';
  onToggleInputUnit: (unit: 'moles' | 'grams') => void;
  onChangeMolesA: (moles: number) => void;
  onChangeMolesB: (moles: number) => void;
  onSelectSandboxReaction: (reactionId: string) => void;
  selectedQuizOption: string | null;
  onSelectQuizOption: (optionId: string) => void;
  onRunSynthesis: () => void;
  onResetChamber: () => void;
  hasSynthesized: boolean;
  chapterCompleted: boolean;
  onNextChapter: () => void;
  statusBanner: {
    type: 'neutral' | 'success' | 'warning';
    message: string;
  };
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  chapter,
  isSandbox,
  analysis,
  inputUnit,
  onToggleInputUnit,
  onChangeMolesA,
  onChangeMolesB,
  onSelectSandboxReaction,
  selectedQuizOption,
  onSelectQuizOption,
  onRunSynthesis,
  onResetChamber,
  hasSynthesized,
  chapterCompleted,
  onNextChapter,
  statusBanner,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Reset hint visibility when switching chapters
  React.useEffect(() => {
    setShowHint(false);
  }, [chapter.id, isSandbox]);

  // Keyboard shortcut 'H' to collapse/expand HUD
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === 'h' &&
        document.activeElement?.tagName !== 'INPUT'
      ) {
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const { reaction, molA, molB, molesA, molesB, gramsA, gramsB } = analysis;
  const predQ = !isSandbox ? chapter.targetCondition.predictionQuestion : undefined;

  return (
    <div
      style={{
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 'min(680px, 92vw)',
      }}
      className="fixed z-20 w-full pointer-events-auto"
    >
      {/* Subtle Hint Popover (Only when requested by player) */}
      {!collapsed && showHint && !isSandbox && (
        <div className="mb-2.5 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-slate-800 text-xs text-slate-300 leading-relaxed shadow-lg">
          <span className="font-semibold text-sky-400 mr-1.5">Clue:</span>
          {chapter.subtleHint}
        </div>
      )}

      {/* Post-Synthesis Feedback Banner */}
      {!collapsed && hasSynthesized && (
        <div className="mb-2.5 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-slate-800 flex items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-center gap-2 text-slate-200">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{statusBanner.message}</span>
          </div>

          {chapterCompleted && !isSandbox && (
            <button
              onClick={onNextChapter}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Next Puzzle</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main Minimalist Control Bar */}
      {!collapsed ? (
        <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl px-4 py-3 shadow-2xl flex flex-col gap-3">
          {/* Optional Prediction Question Row (Puzzle 4) */}
          {predQ && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
              <span className="text-xs text-slate-300 font-medium">
                {predQ.prompt}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {predQ.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => onSelectQuizOption(opt.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                      selectedQuizOption === opt.id
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Core Single-Row Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Reactant Steppers */}
            <div className="flex items-center gap-3">
              {/* Reactant A Stepper */}
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800/90 rounded-xl px-2.5 py-1.5">
                <button
                  onClick={() =>
                    onChangeMolesA(Math.max(1, molesA - chapter.stepSize))
                  }
                  disabled={chapter.lockReactantInputs || molesA <= 1}
                  aria-label={`Decrease ${molA.displayFormula}`}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="text-center min-w-[88px] font-mono tabular-nums">
                  <div className="text-xs font-semibold text-sky-300">
                    {inputUnit === 'moles'
                      ? `${molesA} mol ${molA.displayFormula}`
                      : `${gramsA.toFixed(1)} g ${molA.displayFormula}`}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {inputUnit === 'moles'
                      ? `${gramsA.toFixed(1)} g`
                      : `M = ${molA.molarMass.toFixed(1)} g/mol`}
                  </div>
                </div>
                <button
                  onClick={() =>
                    onChangeMolesA(
                      Math.min(chapter.maxMoles, molesA + chapter.stepSize)
                    )
                  }
                  disabled={
                    chapter.lockReactantInputs || molesA >= chapter.maxMoles
                  }
                  aria-label={`Increase ${molA.displayFormula}`}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="text-slate-600 font-mono text-sm">+</span>

              {/* Reactant B Stepper */}
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800/90 rounded-xl px-2.5 py-1.5">
                <button
                  onClick={() =>
                    onChangeMolesB(Math.max(1, molesB - chapter.stepSize))
                  }
                  disabled={chapter.lockReactantInputs || molesB <= 1}
                  aria-label={`Decrease ${molB.displayFormula}`}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="text-center min-w-[88px] font-mono tabular-nums">
                  <div className="text-xs font-semibold text-rose-300">
                    {inputUnit === 'moles'
                      ? `${molesB} mol ${molB.displayFormula}`
                      : `${gramsB.toFixed(1)} g ${molB.displayFormula}`}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {inputUnit === 'moles'
                      ? `${gramsB.toFixed(1)} g`
                      : `M = ${molB.molarMass.toFixed(1)} g/mol`}
                  </div>
                </div>
                <button
                  onClick={() =>
                    onChangeMolesB(
                      Math.min(chapter.maxMoles, molesB + chapter.stepSize)
                    )
                  }
                  disabled={
                    chapter.lockReactantInputs || molesB >= chapter.maxMoles
                  }
                  aria-label={`Increase ${molB.displayFormula}`}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right Controls: Unit Toggle, Hint, React/Reset */}
            <div className="flex items-center gap-2">
              {isSandbox && (
                <select
                  value={reaction.id}
                  onChange={(e) => onSelectSandboxReaction(e.target.value)}
                  aria-label="Select Reaction"
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono cursor-pointer"
                >
                  {Object.values(REACTIONS).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.unbalancedDisplay}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={() =>
                  onToggleInputUnit(inputUnit === 'moles' ? 'grams' : 'moles')
                }
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Switch between Moles and Grams"
              >
                {inputUnit === 'moles' ? 'mol' : 'g'}
              </button>

              {!isSandbox && (
                <button
                  onClick={() => setShowHint((h) => !h)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    showHint
                      ? 'bg-sky-500/20 border-sky-400/60 text-sky-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Toggle Puzzle Clue"
                  aria-label="Toggle Puzzle Clue"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              )}

              {hasSynthesized && (
                <button
                  onClick={onResetChamber}
                  className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Reset Trays"
                  aria-label="Reset Trays"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={onRunSynthesis}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>React</span>
              </button>

              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                title="Hide Controls (H)"
                aria-label="Hide Controls"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center">
          <button
            onClick={() => setCollapsed(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/95 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white shadow-lg transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            <span>Show Controls (H)</span>
          </button>
        </div>
      )}
    </div>
  );
};
