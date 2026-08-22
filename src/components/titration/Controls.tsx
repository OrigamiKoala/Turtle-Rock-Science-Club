import React from 'react';
import { Droplet, Play, Square, Sparkles, Activity, RotateCcw, Calculator, ArrowDown } from 'lucide-react';

interface ControlsProps {
  onStartStream: () => void;
  onStopStream: () => void;
  onAddDrop: () => void;
  onSwirl: () => void;
  onResetTrial: () => void;
  onProceedToAnalysis: () => void;
  isStreaming: boolean;
  isDelivering: boolean;
  showProbe: boolean;
  allowProbeToggle: boolean;
  onToggleProbe: () => void;
  deliveredVolumeMl: number;
  unmixedStreakRatio: number;
}

export default function Controls({
  onStartStream,
  onStopStream,
  onAddDrop,
  onSwirl,
  onResetTrial,
  onProceedToAnalysis,
  isStreaming,
  isDelivering,
  showProbe,
  allowProbeToggle,
  onToggleProbe,
  deliveredVolumeMl,
  unmixedStreakRatio
}: ControlsProps) {
  return (
    <div className="p-4 rounded-[28px] border-2 border-[#1F3A42]/8 bg-white shadow-[0_8px_24px_rgba(31,58,66,0.06)] space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-display font-bold text-sm text-[#1F3A42]">
          Laboratory Controls
        </h4>
        <div className="flex items-center gap-2">
          {allowProbeToggle && (
            <button
              onClick={onToggleProbe}
              className={`px-3 py-1 rounded-full text-xs font-display font-bold transition cursor-pointer flex items-center gap-1.5 border-2 ${
                showProbe
                  ? 'bg-[#E4F5DA] text-[#2E7D46] border-transparent'
                  : 'bg-white text-[#4B6169] border-[#1F3A42]/15 hover:bg-[#1F3A42]/5'
              }`}
              title="Toggle digital pH meter probe"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>pH Probe: {showProbe ? 'ON' : 'OFF'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Stopcock Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Single Drop Button */}
        <button
          id="btn-single-drop"
          onClick={onAddDrop}
          disabled={deliveredVolumeMl >= 50.0}
          className="px-4 py-3 rounded-full font-display font-bold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer bg-white hover:bg-[#1F3A42]/5 text-[#1F3A42] border-2 border-[#1F3A42]/15 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Deliver single 0.05 mL drop (Shortcut: Down Arrow)"
        >
          <Droplet className="w-4 h-4 text-[#6CC24A]" />
          <span>Add 1 Drop</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F3A42]/10 text-[#4B6169]">↓</kbd>
        </button>

        {/* Hold to Stream Button */}
        <button
          id="btn-hold-stream"
          onMouseDown={onStartStream}
          onMouseUp={onStopStream}
          onMouseLeave={onStopStream}
          onTouchStart={onStartStream}
          onTouchEnd={onStopStream}
          disabled={deliveredVolumeMl >= 50.0}
          className={`px-4 py-3 rounded-full font-display font-bold text-sm transition-all duration-300 active:scale-95 cursor-pointer flex items-center justify-center gap-2 select-none shadow-[0_4px_0_#4C9A3A] disabled:opacity-40 disabled:cursor-not-allowed ${
            isStreaming
              ? 'bg-[#E4574B] text-white shadow-[0_4px_0_#b71c1c]'
              : 'bg-[#6CC24A] text-[#14351F]'
          }`}
          title="Press & hold to open stopcock stream (Shortcut: Hold Spacebar)"
        >
          {isStreaming ? (
            <>
              <Square className="w-4 h-4" />
              <span>Streaming… (Release)</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Hold to Stream</span>
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-black/15 text-inherit">Space</kbd>
            </>
          )}
        </button>

        {/* Swirl Flask Button */}
        <button
          id="btn-swirl"
          onClick={onSwirl}
          className={`px-4 py-3 rounded-full font-display font-bold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-2 border-2 ${
            unmixedStreakRatio > 0.15
              ? 'bg-[#E4F5DA] text-[#2E7D46] border-[#6CC24A] animate-pulse'
              : 'bg-white hover:bg-[#1F3A42]/5 text-[#1F3A42] border-[#1F3A42]/15'
          }`}
          title="Swirl the solution in the flask to mix (Shortcut: S)"
        >
          <Sparkles className="w-4 h-4 text-[#6CC24A]" />
          <span>Swirl Flask</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F3A42]/10 text-[#4B6169]">S</kbd>
        </button>

      </div>

      {/* Trial Actions & Next Step CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t-2 border-[#1F3A42]/8">
        
        {/* Reset Trial */}
        <button
          onClick={onResetTrial}
          className="text-xs font-sans font-bold text-[#4B6169] hover:text-[#1F3A42] flex items-center gap-1.5 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Discard & Start Fresh Trial</span>
        </button>

        {/* Complete & Proceed to Calculation */}
        <button
          onClick={onProceedToAnalysis}
          disabled={deliveredVolumeMl < 0.1}
          className="w-full sm:w-auto px-6 py-2.5 rounded-full font-display font-bold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer bg-[#1F3A42] text-white shadow-[0_4px_0_#14282e] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <Calculator className="w-4 h-4" />
          <span>Calculate Concentration →</span>
        </button>

      </div>

    </div>
  );
}
