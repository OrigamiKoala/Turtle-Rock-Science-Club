import React, { useState } from 'react';
import { ModuleDef, ModuleTrack } from './types';
import { BookOpen, CheckCircle, HelpCircle, ArrowRight, Award, Sparkles, Beaker } from 'lucide-react';

interface BriefingProps {
  module: ModuleDef;
  track: ModuleTrack;
  onSetTrack: (track: ModuleTrack) => void;
  onStartTitration: () => void;
}

export default function Briefing({
  module,
  track,
  onSetTrack,
  onStartTitration
}: BriefingProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  const handleSelectOption = (optId: string) => {
    setSelectedOptionId(optId);
    setHasAnswered(true);
  };

  const selectedOpt = module.predict.options.find((o) => o.id === selectedOptionId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Module Banner Card */}
      <div className="rounded-[28px] border-2 border-[#1F3A42]/8 bg-white p-6 sm:p-8 shadow-[0_8px_24px_rgba(31,58,66,0.06)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-display font-bold bg-[#6CC24A] text-[#14351F]">
              Module {module.number}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-display font-bold bg-[#E4F5DA] text-[#2E7D46]">
              {module.difficulty}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-display font-bold bg-[#F2C94C] text-[#4A3900] flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              <span>+{module.xpReward} XP</span>
            </span>
          </div>

          {/* Track Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-white border-2 border-[#1F3A42]/10">
            <button
              onClick={() => onSetTrack('basic')}
              className={`px-3 py-1 rounded-full text-xs font-display font-bold transition cursor-pointer ${
                track === 'basic'
                  ? 'bg-[#6CC24A] text-[#14351F] shadow-sm'
                  : 'text-[#4B6169] hover:text-[#1F3A42]'
              }`}
            >
              Basic Path
            </button>
            <button
              onClick={() => onSetTrack('deeper')}
              className={`px-3 py-1 rounded-full text-xs font-display font-bold transition cursor-pointer flex items-center gap-1 ${
                track === 'deeper'
                  ? 'bg-[#1F3A42] text-white shadow-sm'
                  : 'text-[#4B6169] hover:text-[#1F3A42]'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#F2C94C]" />
              <span>Go Deeper</span>
            </button>
          </div>
        </div>

        <div>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#1F3A42] tracking-tight">
            {module.title}
          </h2>
          <p className="text-sm sm:text-base font-sans text-[#4B6169] mt-1">
            {module.subtitle}
          </p>
        </div>

        <p className="text-sm font-sans text-[#1F3A42] leading-relaxed">
          {module.description}
        </p>

        {/* Learning Objectives */}
        <div className="p-4 rounded-2xl border-2 border-[#1F3A42]/8 bg-[#FBF7EC] space-y-2">
          <h4 className="font-display font-bold text-xs uppercase tracking-widest text-[#1F3A42] flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#6CC24A]" />
            <span>Learning Objectives</span>
          </h4>
          <ul className="space-y-1.5 text-xs font-sans text-[#4B6169]">
            {module.learningGoals.map((goal, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-[#6CC24A] shrink-0 mt-0.5" />
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Go Deeper Advanced Theory Card (if Deeper track enabled) */}
        {track === 'deeper' && module.deeperNotes && (
          <div className="p-4 rounded-2xl border-2 border-[#6CC24A]/40 bg-[#E4F5DA] space-y-2">
            <h4 className="font-display font-bold text-xs uppercase tracking-widest text-[#2E7D46] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{module.deeperNotes.title}</span>
            </h4>
            <p className="text-xs font-sans text-[#1F3A42] leading-relaxed">
              {module.deeperNotes.content}
            </p>
            {module.deeperNotes.keyEquation && (
              <div className="p-2 rounded-xl bg-white border border-[#6CC24A]/40 text-center font-mono text-xs font-bold text-[#2E7D46]">
                {module.deeperNotes.keyEquation}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Predict Step Card */}
      <div className="rounded-[28px] border-2 border-[#1F3A42]/8 bg-white p-6 sm:p-8 shadow-[0_8px_24px_rgba(31,58,66,0.06)] space-y-5">
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#F2C94C] text-[#4A3900] font-display font-bold text-xs flex items-center justify-center">
              ?
            </span>
            <span className="text-xs font-display font-bold uppercase tracking-widest text-[#4C9A3A]">
              Step 1: Predict & Hypothesize
            </span>
          </div>
          <h3 className="font-display font-bold text-lg sm:text-xl text-[#1F3A42]">
            {module.predict.question}
          </h3>
          <p className="text-xs font-sans text-[#4B6169]">
            {module.predict.context}
          </p>
        </div>

        {/* Multiple Choice Options */}
        <div className="space-y-2.5">
          {module.predict.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleSelectOption(opt.id)}
                className={`w-full p-4 rounded-2xl border-2 text-left font-sans transition-all cursor-pointer flex items-start gap-3 ${
                  isSelected
                    ? opt.isCorrect
                      ? 'border-[#6CC24A] bg-[#E4F5DA] text-[#2E7D46]'
                      : 'border-red-400 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-300'
                    : 'border-[#1F3A42]/10 bg-white hover:border-[#1F3A42]/20 hover:bg-[#1F3A42]/5 text-[#1F3A42]'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                  isSelected
                    ? opt.isCorrect ? 'border-[#2E7D46] bg-[#6CC24A]' : 'border-red-500 bg-red-400'
                    : 'border-[#1F3A42]/20 bg-white'
                }`}>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold leading-snug">{opt.label}</p>
                  {isSelected && (
                    <p className={`text-xs mt-2 leading-relaxed ${opt.isCorrect ? 'text-[#2E7D46]' : 'text-red-600 dark:text-red-400'}`}>
                      {opt.explanation}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t-2 border-[#1F3A42]/8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#4B6169] font-sans">
            {hasAnswered
              ? 'Hypothesis recorded! You can now proceed to the apparatus.'
              : 'Select your prediction before entering the lab.'}
          </p>
          <button
            onClick={onStartTitration}
            disabled={!hasAnswered}
            className="w-full sm:w-auto px-8 py-3 rounded-full font-display font-bold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer bg-[#6CC24A] text-[#14351F] shadow-[0_4px_0_#4C9A3A] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Beaker className="w-4 h-4" />
            <span>Enter Laboratory & Titrate →</span>
          </button>
        </div>

      </div>

    </div>
  );
}
