import React, { useState } from 'react';
import { ModuleDef, ModuleTrack, TitrationTrial, CurvePoint } from './types';
import CurvePlot from './CurvePlot';
import { CheckCircle, AlertCircle, Award, Sparkles, BookOpen, RotateCcw, ArrowRight, Save } from 'lucide-react';

interface AnalysisProps {
  module: ModuleDef;
  track: ModuleTrack;
  initialReadingMl: number;
  finalReadingMl: number;
  deliveredVolumeMl: number;
  finalPh: number;
  endpointColorHex: string;
  endpointColorName: string;
  curvePoints: CurvePoint[];
  trueConcentration: number;
  sampleVolumeMl: number;
  sampleId: string;
  onSaveTrial: (trial: TitrationTrial) => void;
  onNextModule: () => void;
  onRetryTrial: () => void;
}

export default function Analysis({
  module,
  track,
  initialReadingMl,
  finalReadingMl,
  deliveredVolumeMl,
  finalPh,
  endpointColorHex,
  endpointColorName,
  curvePoints,
  trueConcentration,
  sampleVolumeMl,
  sampleId,
  onSaveTrial,
  onNextModule,
  onRetryTrial
}: AnalysisProps) {
  // Stoichiometric ratio:
  // For citric acid (triprotic) vs NaOH: 1:3 ratio (1 analyte : 3 titrant)
  // For carbonate (diprotic) vs HCl: 1:2 ratio (1 analyte : 2 titrant)
  // For sulfuric acid vs NaOH: 1:2 ratio
  // For monoprotic: 1:1
  let stoichRatio = 1.0;
  if (module.setup.analyte.id === 'citric' && module.setup.titrant.category === 'strong_base') {
    stoichRatio = 3.0; // 3 titrant per analyte
  } else if (module.setup.analyte.id === 'carbonate' && module.setup.titrant.category === 'strong_acid') {
    stoichRatio = 2.0; // 2 HCl per Na2CO3
  } else if (module.setup.analyte.id === 'h2so4' && module.setup.titrant.category === 'strong_base') {
    stoichRatio = 2.0;
  }

  // Exact true calculated values for hints/validation
  const titrantMolarity = module.setup.titrantConc;
  const theoreticalEquivalenceVol = (trueConcentration * sampleVolumeMl * stoichRatio) / titrantMolarity;

  // Student calculation inputs
  const [deltaVInput, setDeltaVInput] = useState<string>(deliveredVolumeMl.toFixed(2));
  const [titrantMolesInput, setTitrantMolesInput] = useState<string>('');
  const [analyteMolesInput, setAnalyteMolesInput] = useState<string>('');
  const [calculatedConcInput, setCalculatedConcInput] = useState<string>('');

  const [isGraded, setIsGraded] = useState<boolean>(false);
  const [hasSaved, setHasSaved] = useState<boolean>(false);

  // Auto-compute student molarity from their inputs or delivered volume
  const studentConcNumber = parseFloat(calculatedConcInput) || 0;
  const errorPercent = trueConcentration > 0
    ? Math.abs(studentConcNumber - trueConcentration) / trueConcentration * 100
    : 0;

  // Tolerance: ±5% on Basic, ±2% on Go Deeper
  const tolerance = track === 'deeper' ? 2.0 : 5.0;
  const isPassed = errorPercent <= tolerance && studentConcNumber > 0;

  const handleGradeCalculation = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGraded(true);

    const trial: TitrationTrial = {
      id: `trial-${Date.now()}`,
      moduleId: module.id,
      sampleId,
      analyteName: module.setup.analyte.name,
      analyteFormula: module.setup.analyte.formula,
      titrantName: module.setup.titrant.name,
      titrantFormula: module.setup.titrant.formula,
      indicatorName: module.setup.defaultIndicatorId,
      initialReadingMl,
      finalReadingMl,
      deliveredVolumeMl,
      finalPh,
      endpointColorHex,
      endpointColorName,
      studentCalculatedConc: studentConcNumber,
      trueConc: trueConcentration,
      errorPercent: Number(errorPercent.toFixed(2)),
      passed: isPassed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    onSaveTrial(trial);
    setHasSaved(true);
  };

  // Pre-fill helper for younger students on basic path
  const handleAutoFillCalculation = () => {
    const dV = deliveredVolumeMl;
    const nTitrant = (titrantMolarity * dV) / 1000;
    const nAnalyte = nTitrant / stoichRatio;
    const conc = nAnalyte / (sampleVolumeMl / 1000);

    setDeltaVInput(dV.toFixed(2));
    setTitrantMolesInput(nTitrant.toExponential(3));
    setAnalyteMolesInput(nAnalyte.toExponential(3));
    setCalculatedConcInput(conc.toFixed(3));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-[28px] border-2 border-[#1F3A42]/8 bg-white p-6 sm:p-8 shadow-[0_8px_24px_rgba(31,58,66,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full text-xs font-display font-bold bg-[#E4F5DA] text-[#2E7D46]">
              Step 3: Quantitative Analysis
            </span>
            <span className="text-xs font-display font-bold text-[#4C9A3A]">
              Sample {sampleId}
            </span>
          </div>
          <h2 className="font-display font-bold text-2xl text-[#1F3A42]">
            Calculate Analyte Concentration
          </h2>
          <p className="text-xs sm:text-sm font-sans text-[#4B6169]">
            Convert your burette readings and stoichiometry into the final molarity (mol/L).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRetryTrial}
            className="px-4 py-2.5 rounded-full font-display font-bold text-xs transition border-2 border-[#1F3A42]/15 bg-white text-[#1F3A42] hover:bg-[#1F3A42]/5 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Repeat Trial</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Scaffolded Calculation Form */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Trial Raw Observations Card */}
          <div className="rounded-[28px] border-2 border-[#1F3A42]/8 bg-white p-6 shadow-[0_8px_24px_rgba(31,58,66,0.06)] space-y-3">
            <h4 className="font-display font-bold text-xs uppercase tracking-widest text-[#1F3A42] flex items-center justify-between">
              <span>Trial Laboratory Observations</span>
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm"
                style={{ backgroundColor: endpointColorHex }}
              />
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-[#FBF7EC] border border-[#1F3A42]/8">
                <span className="text-[10px] text-[#4B6169] block font-sans">Initial Reading (Vᵢ)</span>
                <span className="font-display font-bold text-sm text-[#1F3A42]">{initialReadingMl.toFixed(2)} mL</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FBF7EC] border border-[#1F3A42]/8">
                <span className="text-[10px] text-[#4B6169] block font-sans">Final Reading (V𝒻)</span>
                <span className="font-display font-bold text-sm text-[#1F3A42]">{finalReadingMl.toFixed(2)} mL</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#E4F5DA] border border-[#6CC24A]/40">
                <span className="text-[10px] text-[#2E7D46] block font-sans">Delivered (ΔV)</span>
                <span className="font-display font-bold text-sm text-[#2E7D46]">{deliveredVolumeMl.toFixed(2)} mL</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FBF7EC] border border-[#1F3A42]/8">
                <span className="text-[10px] text-[#4B6169] block font-sans">Endpoint pH</span>
                <span className="font-display font-bold text-sm text-[#1F3A42]">{finalPh.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-[11px] text-[#4B6169] font-sans">
              Endpoint visual color: <strong className="text-[#1F3A42]">{endpointColorName}</strong>.
            </p>
          </div>

          {/* Scaffolded Arithmetic Form */}
          <form
            onSubmit={handleGradeCalculation}
            className="rounded-[28px] border-2 border-[#1F3A42]/8 bg-white p-6 shadow-[0_8px_24px_rgba(31,58,66,0.06)] space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-sm text-[#1F3A42]">
                Step-by-Step Calculation
              </h4>
              <button
                type="button"
                onClick={handleAutoFillCalculation}
                className="text-[11px] font-bold text-[#2E7D46] hover:underline cursor-pointer"
              >
                Help me calculate (Auto-fill)
              </button>
            </div>

            {/* Step 1: Titrant volume */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#4B6169] block">
                1. Net Titrant Volume Delivered (ΔV in mL):
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={deltaVInput}
                onChange={(e) => setDeltaVInput(e.target.value)}
                placeholder="e.g. 24.85"
                className="w-full p-2.5 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white text-[#1F3A42] focus:outline-none font-mono"
              />
            </div>

            {/* Step 2: Moles of Titrant */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#4B6169] block">
                2. Moles of Titrant Added (n = C_titrant × ΔV / 1000):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titrantMolesInput}
                  onChange={(e) => setTitrantMolesInput(e.target.value)}
                  placeholder={`e.g. ${((titrantMolarity * deliveredVolumeMl) / 1000).toExponential(3)}`}
                  className="w-full p-2.5 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white text-[#1F3A42] focus:outline-none font-mono"
                />
                <span className="text-xs text-[#4B6169] shrink-0">mol</span>
              </div>
            </div>

            {/* Step 3: Stoichiometric Ratio Info */}
            <div className="p-3 rounded-xl bg-[#FBF7EC] border border-[#1F3A42]/8 text-xs font-sans space-y-1">
              <span className="font-bold text-[#1F3A42]">
                3. Balanced Equation Stoichiometry:
              </span>
              <p className="text-[#4B6169]">
                Mole Ratio (Titrant : Analyte) = <strong>{stoichRatio} : 1</strong>
              </p>
            </div>

            {/* Step 4: Final Calculated Concentration */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#4B6169] block">
                4. Analyte Molar Concentration (M = moles / sample_volume):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.001"
                  required
                  value={calculatedConcInput}
                  onChange={(e) => setCalculatedConcInput(e.target.value)}
                  placeholder="e.g. 0.100"
                  className="w-full p-2.5 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white text-[#1F3A42] focus:outline-none font-mono font-bold"
                />
                <span className="text-xs text-[#4B6169] shrink-0">M (mol/L)</span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3 border-t border-[#1F3A42]/8">
              <button
                type="submit"
                className="w-full py-3 rounded-full font-display font-bold text-sm transition-all duration-300 hover:scale-[1.01] active:scale-95 cursor-pointer bg-[#6CC24A] text-[#14351F] shadow-[0_4px_0_#4C9A3A]"
              >
                Submit & Grade Analysis
              </button>
            </div>

          </form>

          {/* Graded Results Banner */}
          {isGraded && (
            <div className={`p-6 rounded-[28px] border-2 shadow-lg space-y-4 animate-fade-in ${
              isPassed
                ? 'border-[#6CC24A] bg-[#E4F5DA]'
                : 'border-red-400 bg-red-50 dark:bg-red-950/40'
            }`}>
              <div className="flex items-start gap-3">
                {isPassed ? (
                  <CheckCircle className="w-7 h-7 text-[#2E7D46] shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-7 h-7 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className={`font-display font-bold text-lg ${isPassed ? 'text-[#2E7D46]' : 'text-red-900 dark:text-red-200'}`}>
                    {isPassed ? 'Excellent Analytical Precision!' : 'Titration Inaccuracy Detected'}
                  </h3>
                  <p className="text-xs sm:text-sm font-sans mt-0.5 text-[#1F3A42]">
                    {isPassed
                      ? `Your calculated molarity of ${studentConcNumber.toFixed(3)} M is within ±${tolerance}% of the true concentration!`
                      : `Your calculated molarity had an error of ${errorPercent.toFixed(1)}% (allowed: ±${tolerance}%).`}
                  </p>
                </div>
              </div>

              {/* Accuracy Comparison Matrix */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 rounded-xl bg-white border border-[#1F3A42]/10">
                  <span className="text-[10px] text-[#4B6169] block">Your Answer</span>
                  <span className="font-display font-bold text-sm text-[#1F3A42]">{studentConcNumber.toFixed(3)} M</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#1F3A42]/10">
                  <span className="text-[10px] text-[#4B6169] block">True Value</span>
                  <span className="font-display font-bold text-sm text-[#2E7D46]">{trueConcentration.toFixed(3)} M</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#1F3A42]/10">
                  <span className="text-[10px] text-[#4B6169] block">Percent Error</span>
                  <span className={`font-display font-bold text-sm ${isPassed ? 'text-[#2E7D46]' : 'text-red-600'}`}>
                    {errorPercent.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Next Module / Reward CTA */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs font-display font-bold text-[#4C9A3A] flex items-center gap-1">
                  <Award className="w-4 h-4 text-[#F2C94C]" />
                  <span>+{module.xpReward} Discovery XP Earned</span>
                </span>

                <button
                  onClick={onNextModule}
                  className="w-full sm:w-auto px-8 py-3 rounded-full font-display font-bold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer bg-[#1F3A42] text-white shadow-[0_4px_0_#14282e] flex items-center justify-center gap-1.5"
                >
                  <span>Next Module →</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Annotated Curve & Chemical Insights */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Annotated Titration Curve */}
          <CurvePlot
            points={curvePoints}
            currentVolumeMl={deliveredVolumeMl}
            currentPh={finalPh}
            showAnnotations={true}
            equivalenceVolumeMl={theoreticalEquivalenceVol}
            equivalencePh={finalPh}
            halfEquivalenceVolumeMl={theoreticalEquivalenceVol / 2.0}
            pKaValue={module.setup.analyte.pKa[0]}
            indicatorId={module.setup.defaultIndicatorId}
          />

          {/* Chemical Insight Card */}
          <div className="rounded-[28px] border-2 border-[#1F3A42]/8 bg-white p-6 shadow-[0_8px_24px_rgba(31,58,66,0.06)] space-y-3">
            <h4 className="font-display font-bold text-xs uppercase tracking-widest text-[#2E7D46] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Scientific Review & Insights</span>
            </h4>

            <p className="text-xs font-sans text-[#1F3A42] leading-relaxed">
              At equivalence, exactly <strong>{theoreticalEquivalenceVol.toFixed(2)} mL</strong> of titrant neutralized all acidic protons. Notice how the inflection point aligns with the transition interval of <strong>{module.setup.defaultIndicatorId}</strong>.
            </p>

            {module.deeperNotes && (
              <div className="p-3 rounded-xl bg-[#FBF7EC] border border-[#1F3A42]/8 text-xs font-sans space-y-1">
                <span className="font-bold text-[#1F3A42]">{module.deeperNotes.title}</span>
                <p className="text-[#4B6169]">{module.deeperNotes.content}</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
