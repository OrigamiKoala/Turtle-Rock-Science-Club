import React from 'react';
import { X, CheckCircle2, Circle, Compass, BookOpen } from 'lucide-react';
import {
  ELEMENTS,
  MOLECULES,
  QUEST_CHAPTERS,
  QuestChapter,
  REACTIONS,
} from './stoichiometryQuests';

interface QuestModalProps {
  activeModal: 'chapters' | 'fieldGuide' | null;
  onClose: () => void;
  currentChapterId: number;
  isSandbox: boolean;
  completedChapters: number[];
  onSelectChapter: (chapterId: number) => void;
  onEnterSandbox: () => void;
  chapter: QuestChapter;
  sandboxReactionId: string;
  onSelectSandboxReaction: (id: string) => void;
}

export const QuestModals: React.FC<QuestModalProps> = ({
  activeModal,
  onClose,
  currentChapterId,
  isSandbox,
  completedChapters,
  onSelectChapter,
  onEnterSandbox,
}) => {
  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/75 pointer-events-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            {activeModal === 'chapters' ? (
              <Compass className="w-4 h-4 text-sky-400" />
            ) : (
              <BookOpen className="w-4 h-4 text-sky-400" />
            )}
            <h2 className="text-base font-semibold tracking-tight text-white">
              {activeModal === 'chapters'
                ? `Stoichiometry Puzzles (${completedChapters.length}/${QUEST_CHAPTERS.length} Solved)`
                : 'Periodic & Molar Reference'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[74vh] overflow-y-auto space-y-4">
          {activeModal === 'chapters' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUEST_CHAPTERS.map((ch) => {
                  const isDone = completedChapters.includes(ch.id);
                  const isCurrent = !isSandbox && currentChapterId === ch.id;
                  const rxn = REACTIONS[ch.reactionId];
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        onSelectChapter(ch.id);
                        onClose();
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                        isCurrent
                          ? 'bg-slate-800/90 border-sky-500/60'
                          : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span className="font-semibold text-sky-400">
                            {ch.code}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{ch.act}</span>
                        </div>
                        <div className="text-xs font-semibold text-white mt-0.5 truncate">
                          {ch.title}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                          {rxn?.unbalancedDisplay}
                        </div>
                      </div>

                      <div className="shrink-0 mt-0.5">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Free Lab Sandbox Card */}
              <button
                onClick={() => {
                  onEnterSandbox();
                  onClose();
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-4 ${
                  isSandbox
                    ? 'bg-slate-800/90 border-sky-500/60'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-emerald-400">
                    Free Lab Sandbox
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Experiment with any of the 16 chemical reactions without constraints.
                  </p>
                </div>
                <span className="text-xs font-medium text-sky-400 shrink-0">
                  Open →
                </span>
              </button>
            </div>
          )}

          {activeModal === 'fieldGuide' && (
            <div className="space-y-5">
              {/* Core Formulas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-semibold text-sky-400">Molar Mass</div>
                  <div className="font-mono text-white mt-0.5">
                    moles = grams ÷ M (g/mol)
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-semibold text-emerald-400">
                    Percent Yield
                  </div>
                  <div className="font-mono text-white mt-0.5">
                    Actual = Theoretical × (% Yield)
                  </div>
                </div>
              </div>

              {/* Atomic Masses */}
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-2">
                  Atoms (CPK Colors & Atomic Mass in g/mol)
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 text-xs font-mono tabular-nums">
                  {Object.values(ELEMENTS).map((el) => (
                    <div
                      key={el.element}
                      className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: el.cssColor }}
                        />
                        <span className="font-bold text-white">
                          {el.element}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {el.atomicMass.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Molecules */}
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-2">
                  Molecules & Molar Masses
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.values(MOLECULES).map((m) => (
                    <div
                      key={m.id}
                      className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <span className="font-mono font-semibold text-white">
                        {m.displayFormula}{' '}
                        <span className="font-sans font-normal text-slate-400">
                          ({m.name})
                        </span>
                      </span>
                      <span className="font-mono tabular-nums text-sky-300">
                        {m.molarMass.toFixed(1)} g/mol
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
