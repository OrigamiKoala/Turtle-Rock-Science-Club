import React from 'react';
import { TitrationTrial } from './types';
import { BookOpen, Printer, Trash2, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { Latex, Chem } from '../Latex';

interface NotebookProps {
  trials: TitrationTrial[];
  onClearNotebook: () => void;
}

export default function Notebook({ trials, onClearNotebook }: NotebookProps) {
  const handlePrint = () => {
    window.print();
  };

  // Find concordant trials (pairs with |ΔV1 - ΔV2| <= 0.10 mL)
  const concordantPairs: [TitrationTrial, TitrationTrial][] = [];
  for (let i = 0; i < trials.length; i++) {
    for (let j = i + 1; j < trials.length; j++) {
      if (
        trials[i].sampleId === trials[j].sampleId &&
        Math.abs(trials[i].deliveredVolumeMl - trials[j].deliveredVolumeMl) <= 0.10
      ) {
        concordantPairs.push([trials[i], trials[j]]);
      }
    }
  }

  const hasConcordant = concordantPairs.length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Action Header Card */}
      <div className="rounded-[28px] border-2 border-[#1F3A42]/8 bg-white p-6 sm:p-8 shadow-[0_8px_24px_rgba(31,58,66,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-[#6CC24A]" />
            <span className="text-xs font-display font-bold uppercase tracking-widest text-[#4C9A3A]">
              Laboratory Records
            </span>
          </div>
          <h2 className="font-display font-bold text-2xl text-[#1F3A42]">
            Analytical Lab Notebook
          </h2>
          <p className="text-xs sm:text-sm font-sans text-[#4B6169]">
            Permanent record of all titration trials, volumetric titers, and calculated concentrations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-full font-display font-bold text-xs bg-[#6CC24A] text-[#14351F] shadow-[0_4px_0_#4C9A3A] hover:scale-[1.02] active:scale-95 transition cursor-pointer flex items-center gap-1.5"
            title="Print laboratory notebook sheet"
          >
            <Printer className="w-4 h-4" />
            <span>Print Notebook</span>
          </button>

          {trials.length > 0 && (
            <button
              onClick={onClearNotebook}
              className="px-4 py-2.5 rounded-full font-display font-bold text-xs border-2 border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer flex items-center gap-1.5"
              title="Clear all recorded trials"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Concordancy Badge Banner */}
      {hasConcordant && (
        <div className="p-4 rounded-2xl border-2 border-[#6CC24A]/40 bg-[#E4F5DA] flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-[#2E7D46] shrink-0" />
          <div className="text-xs font-sans text-[#1F3A42]">
            <strong className="text-[#2E7D46]">Concordant Titers Achieved!</strong> You have replicate trials within <Latex math="|V_1 - V_2| \le 0.10\text{ mL}" /> agreement, satisfying analytical precision standards.
          </div>
        </div>
      )}

      {/* Trials Table Card */}
      <div className="rounded-[28px] border-2 border-[#1F3A42]/8 bg-white p-6 shadow-[0_8px_24px_rgba(31,58,66,0.06)] overflow-hidden">
        
        {trials.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <BookOpen className="w-10 h-10 text-[#9AA6A6] mx-auto" />
            <h4 className="font-display font-bold text-base text-[#1F3A42]">No Trials Recorded Yet</h4>
            <p className="text-xs font-sans text-[#4B6169] max-w-sm mx-auto">
              Run a titration experiment and submit calculations to record trials in your analytical notebook.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead>
                <tr className="border-b-2 border-[#1F3A42]/10 text-[11px] font-extrabold uppercase tracking-wide text-[#4B6169]">
                  <th className="pb-3 pr-4">Sample / Time</th>
                  <th className="pb-3 px-3">Analyte / Titrant</th>
                  <th className="pb-3 px-3">Initial (<Latex math="V_i" />)</th>
                  <th className="pb-3 px-3">Final (<Latex math="V_f" />)</th>
                  <th className="pb-3 px-3">Titer (<Latex math="\Delta V" />)</th>
                  <th className="pb-3 px-3">Endpoint Color</th>
                  <th className="pb-3 px-3">Calculated (<Latex math="C" />)</th>
                  <th className="pb-3 px-3">Error %</th>
                  <th className="pb-3 pl-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F3A42]/8 text-[#1F3A42]">
                {trials.map((t) => (
                  <tr key={t.id} className="hover:bg-[#1F3A42]/5 transition">
                    <td className="py-3.5 pr-4 font-mono font-bold">
                      <span className="text-[#2E7D46]">{t.sampleId}</span>
                      <span className="text-[10px] text-[#4B6169] block font-sans font-normal">{t.timestamp}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-bold"><Chem formula={t.analyteFormula} /></span> vs <Chem formula={t.titrantFormula} />
                    </td>
                    <td className="py-3.5 px-3 font-mono"><Latex math={`${t.initialReadingMl.toFixed(2)}\\text{ mL}`} /></td>
                    <td className="py-3.5 px-3 font-mono"><Latex math={`${t.finalReadingMl.toFixed(2)}\\text{ mL}`} /></td>
                    <td className="py-3.5 px-3 font-mono font-bold text-[#2E7D46] bg-[#E4F5DA] rounded-lg">
                      <Latex math={`${t.deliveredVolumeMl.toFixed(2)}\\text{ mL}`} />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: t.endpointColorHex }}
                        />
                        <span className="text-[11px] truncate max-w-[100px]">{t.endpointColorName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold">
                      {t.studentCalculatedConc !== undefined ? <Latex math={`${t.studentCalculatedConc.toFixed(3)}\\text{ M}`} /> : '—'}
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      {t.errorPercent !== undefined ? <Latex math={`${t.errorPercent.toFixed(1)}\\%`} /> : '—'}
                    </td>
                    <td className="py-3.5 pl-3 text-right">
                      {t.passed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display font-bold bg-[#6CC24A] text-[#14351F]">
                          <CheckCircle className="w-3 h-3" />
                          <span>Passed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display font-bold bg-[#F2C94C] text-[#4A3900]">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Needs Review</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
