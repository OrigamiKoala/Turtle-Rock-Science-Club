import React, { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { UserProfile } from '../types';
import {
  computeStoichiometry,
  QUEST_CHAPTERS,
  QuestChapter,
} from './crucible/stoichiometryQuests';
import {
  CameraPresetId,
  InspectedObjectInfo,
  StoichiometryViewport,
} from './crucible/StoichiometryViewport';
import { BottomControlDock } from './crucible/BottomControlDock';
import { QuestModals } from './crucible/Modals';
import { soundEngine } from './crucible/soundEffects';

interface Props {
  userProfile: UserProfile;
  onUpdateXp: (xp: number, badge?: string) => void;
  onNavigateHome: () => void;
  onOpenJoin?: () => void;
  onOpenLogin?: () => void;
}

const STORE = 'tr_sc_crucible_progress';

function loadCompleted(): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (raw && Array.isArray(raw.completed)) return raw.completed;
    if (Array.isArray(raw)) return raw;
  } catch {
    /* storage unavailable */
  }
  return [];
}

function saveCompleted(completed: number[]) {
  try {
    localStorage.setItem(STORE, JSON.stringify({ completed }));
  } catch {
    /* storage unavailable */
  }
}

export default function MolarCruciblePage({
  userProfile,
  onUpdateXp,
  onNavigateHome,
  onOpenLogin,
}: Props) {
  const [completedChapters, setCompletedChapters] = useState<number[]>(loadCompleted);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [isSandbox, setIsSandbox] = useState<boolean>(false);
  const [sandboxReactionId, setSandboxReactionId] = useState<string>('oxyhydrogen');

  const currentChapter: QuestChapter =
    QUEST_CHAPTERS[currentChapterIndex] || QUEST_CHAPTERS[0];

  const [molesA, setMolesA] = useState<number>(currentChapter.initialMolesA);
  const [molesB, setMolesB] = useState<number>(currentChapter.initialMolesB);
  const [inputUnit, setInputUnit] = useState<'moles' | 'grams'>(
    currentChapter.inputUnitDefault
  );
  const [selectedQuizOption, setSelectedQuizOption] = useState<string | null>(null);

  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('overview');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  const [synthesisTriggerCount, setSynthesisTriggerCount] = useState<number>(0);
  const [resetTriggerCount, setResetTriggerCount] = useState<number>(0);
  const [hasSynthesized, setHasSynthesized] = useState<boolean>(false);

  const [activeModal, setActiveModal] = useState<'chapters' | 'fieldGuide' | null>(null);
  const [inspectedObject, setInspectedObject] = useState<InspectedObjectInfo | null>(null);

  const [statusBanner, setStatusBanner] = useState<{
    type: 'neutral' | 'success' | 'warning';
    message: string;
  }>({
    type: 'neutral',
    message: '',
  });

  // Keep completed chapters persisted
  useEffect(() => {
    saveCompleted(completedChapters);
  }, [completedChapters]);

  const activeReactionId = isSandbox
    ? sandboxReactionId
    : currentChapter.reactionId;
  const activeEfficiency = isSandbox
    ? 1.0
    : currentChapter.actualYieldEfficiency;

  const analysis = useMemo(
    () =>
      computeStoichiometry(
        activeReactionId,
        molesA,
        molesB,
        activeEfficiency
      ),
    [activeReactionId, molesA, molesB, activeEfficiency]
  );

  const isCurrentChapterSolved = completedChapters.includes(currentChapter.id);

  const loadChapter = (chapterId: number) => {
    const idx = QUEST_CHAPTERS.findIndex((c) => c.id === chapterId);
    if (idx === -1) return;
    const ch = QUEST_CHAPTERS[idx];
    setIsSandbox(false);
    setCurrentChapterIndex(idx);
    setMolesA(ch.initialMolesA);
    setMolesB(ch.initialMolesB);
    setInputUnit(ch.inputUnitDefault);
    setSelectedQuizOption(null);
    setHasSynthesized(false);
    setResetTriggerCount((c) => c + 1);
    setStatusBanner({ type: 'neutral', message: '' });
    soundEngine.playTick(1.1);
  };

  const enterSandbox = () => {
    setIsSandbox(true);
    setHasSynthesized(false);
    setResetTriggerCount((c) => c + 1);
    setStatusBanner({ type: 'neutral', message: '' });
    soundEngine.playTick(1.2);
  };

  const handleChangeMolesA = (val: number) => {
    setMolesA(val);
    setHasSynthesized(false);
    soundEngine.playTick(0.95);
  };

  const handleChangeMolesB = (val: number) => {
    setMolesB(val);
    setHasSynthesized(false);
    soundEngine.playTick(1.05);
  };

  const handleRunSynthesis = () => {
    soundEngine.playSynthesisSequence();
    setHasSynthesized(true);
    setSynthesisTriggerCount((c) => c + 1);
    setStatusBanner({
      type: 'neutral',
      message: 'Reacting molecules...',
    });
  };

  const handleResetChamber = () => {
    soundEngine.playTick(0.85);
    setHasSynthesized(false);
    setResetTriggerCount((c) => c + 1);
    setStatusBanner({ type: 'neutral', message: '' });
  };

  const handleSynthesisComplete = () => {
    const excessTotal = analysis.excessMolesA + analysis.excessMolesB;

    if (isSandbox) {
      setStatusBanner({
        type: 'success',
        message: `Formed ${analysis.actualMolesC.toFixed(1)} mol ${
          analysis.molC.displayFormula
        }${
          excessTotal > 0.01
            ? ` · ${excessTotal.toFixed(1)} mol unreacted excess remained on tray.`
            : ' · Exact stoichiometric balance.'
        }`,
      });
      return;
    }

    const cond = currentChapter.targetCondition;
    const molesMatch =
      Math.abs(molesA - cond.targetMolesA) < 0.05 &&
      Math.abs(molesB - cond.targetMolesB) < 0.05;
    const quizMatch =
      !cond.predictionQuestion ||
      selectedQuizOption === cond.predictionQuestion.correctId;

    if (molesMatch && quizMatch) {
      soundEngine.playQuestComplete();
      if (!completedChapters.includes(currentChapter.id)) {
        setCompletedChapters((prev) => [...prev, currentChapter.id]);
        if (userProfile && userProfile.level > 0) {
          onUpdateXp(15);
        }
      }
      setStatusBanner({
        type: 'success',
        message: `Solved: Formed ${analysis.actualMolesC.toFixed(
          1
        )} mol (${analysis.actualGramsC.toFixed(1)} g) ${
          analysis.molC.displayFormula
        }.`,
      });
    } else if (cond.predictionQuestion && !quizMatch) {
      setStatusBanner({
        type: 'warning',
        message: `Look closely at the trays: ${analysis.actualMolesC.toFixed(
          0
        )} mol ${
          analysis.molC.displayFormula
        } formed and ${excessTotal.toFixed(
          0
        )} mol excess remained. Update your prediction.`,
      });
    } else if (cond.requireZeroExcess && excessTotal > 0.01) {
      const leftoverMol =
        analysis.excessMolesA > 0.01
          ? `${analysis.excessMolesA.toFixed(0)} mol ${
              analysis.molA.displayFormula
            }`
          : `${analysis.excessMolesB.toFixed(0)} mol ${
              analysis.molB.displayFormula
            }`;
      setStatusBanner({
        type: 'warning',
        message: `Not quite: ${leftoverMol} was left unreacted on the tray. Adjust the ratio so zero atoms are wasted.`,
      });
    } else {
      setStatusBanner({
        type: 'warning',
        message: `Formed ${analysis.actualMolesC.toFixed(
          1
        )} mol (${analysis.actualGramsC.toFixed(0)} g) ${
          analysis.molC.displayFormula
        } with ${excessTotal.toFixed(
          0
        )} mol excess — check the target in the prompt.`,
      });
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < QUEST_CHAPTERS.length - 1) {
      loadChapter(QUEST_CHAPTERS[currentChapterIndex + 1].id);
    } else {
      enterSandbox();
    }
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      loadChapter(QUEST_CHAPTERS[currentChapterIndex - 1].id);
    }
  };

  const handleToggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    soundEngine.enabled = next;
    if (next) soundEngine.playTick(1.1);
  };

  return (
    <div
      className="relative w-screen h-screen bg-[#090d16] text-slate-100 overflow-hidden select-none flex flex-col"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      {/* TOP BAR */}
      <header className="relative z-20 flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b border-white/[0.06] shrink-0">
        {/* Left: Home & Wordmark */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
          <span
            onClick={() => setCameraPreset('overview')}
            className="text-sm sm:text-base font-semibold tracking-tight text-white whitespace-nowrap cursor-pointer"
          >
            Molar Crucible
          </span>
        </div>

        {/* Center: Navigation Links */}
        <nav className="flex items-center gap-4 sm:gap-6 text-xs font-medium text-slate-400">
          <button
            type="button"
            onClick={() => setActiveModal('chapters')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Puzzles ({completedChapters.length}/{QUEST_CHAPTERS.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveModal('fieldGuide')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Periodic Table
          </button>
          <button
            type="button"
            onClick={enterSandbox}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isSandbox ? 'text-sky-400 font-semibold' : ''
            }`}
          >
            Free Lab
          </button>
          <button
            type="button"
            onClick={handleToggleAudio}
            className="hidden sm:inline-block hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {audioEnabled ? 'Sound On' : 'Muted'}
          </button>
        </nav>

        {/* Right: User Status & Reset Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          {userProfile && userProfile.level > 0 ? (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs font-mono text-amber-300">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{userProfile.xp} XP</span>
            </div>
          ) : onOpenLogin ? (
            <button
              type="button"
              onClick={onOpenLogin}
              className="hidden sm:inline-block text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Log In
            </button>
          ) : null}

          <button
            type="button"
            onClick={() =>
              isSandbox ? enterSandbox() : loadChapter(currentChapter.id)
            }
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Reset
          </button>
        </div>
      </header>

      {/* 3D STAGE */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {/* Top-Center Puzzle Prompt */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center max-w-xl w-full px-4">
          <div className="inline-flex items-center gap-2 text-[11px] font-medium tracking-wide text-sky-400 pointer-events-auto">
            {!isSandbox && (
              <button
                type="button"
                onClick={handlePrevChapter}
                disabled={currentChapterIndex === 0}
                className="p-0.5 rounded hover:bg-white/10 disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                aria-label="Previous Puzzle"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveModal('chapters')}
              className="hover:underline underline-offset-4 cursor-pointer"
            >
              {isSandbox
                ? 'Free Lab Sandbox'
                : `${currentChapter.code} of ${QUEST_CHAPTERS.length} · ${currentChapter.title}`}
            </button>
            {!isSandbox && (
              <button
                type="button"
                onClick={handleNextChapter}
                disabled={currentChapterIndex === QUEST_CHAPTERS.length - 1}
                className="p-0.5 rounded hover:bg-white/10 disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                aria-label="Next Puzzle"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold text-white font-mono tracking-tight mt-0.5">
            {isSandbox || isCurrentChapterSolved
              ? analysis.reaction.equationDisplay
              : analysis.reaction.unbalancedDisplay}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 mt-1 text-balance leading-relaxed">
            {isSandbox
              ? 'Adjust reactants and click React to observe molecular synthesis.'
              : currentChapter.puzzlePrompt}
          </p>

          {/* Molecule Inspector Readout */}
          {inspectedObject && (
            <div className="mt-1.5 text-xs font-mono text-slate-400">
              {inspectedObject.title} · {inspectedObject.subtitle}
            </div>
          )}
        </div>

        {/* 3D WebGL Canvas */}
        <StoichiometryViewport
          analysis={analysis}
          cameraPreset={cameraPreset}
          synthesisTriggerCount={synthesisTriggerCount}
          resetTriggerCount={resetTriggerCount}
          onSynthesisComplete={handleSynthesisComplete}
          onInspectObject={setInspectedObject}
        />

        {/* Floating Bottom Control Dock */}
        <BottomControlDock
          chapter={currentChapter}
          isSandbox={isSandbox}
          analysis={analysis}
          inputUnit={inputUnit}
          onToggleInputUnit={setInputUnit}
          onChangeMolesA={handleChangeMolesA}
          onChangeMolesB={handleChangeMolesB}
          onSelectSandboxReaction={(rId) => {
            setSandboxReactionId(rId);
            setHasSynthesized(false);
            setResetTriggerCount((c) => c + 1);
          }}
          selectedQuizOption={selectedQuizOption}
          onSelectQuizOption={setSelectedQuizOption}
          onRunSynthesis={handleRunSynthesis}
          onResetChamber={handleResetChamber}
          hasSynthesized={hasSynthesized}
          chapterCompleted={isCurrentChapterSolved}
          onNextChapter={handleNextChapter}
          statusBanner={statusBanner}
        />
      </main>

      {/* Modals for Puzzle Selection & Periodic Table Reference */}
      <QuestModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        currentChapterId={currentChapter.id}
        isSandbox={isSandbox}
        completedChapters={completedChapters}
        onSelectChapter={loadChapter}
        onEnterSandbox={enterSandbox}
        chapter={currentChapter}
        sandboxReactionId={sandboxReactionId}
        onSelectSandboxReaction={(rId) => {
          setSandboxReactionId(rId);
          setHasSynthesized(false);
          setResetTriggerCount((c) => c + 1);
        }}
      />
    </div>
  );
}
