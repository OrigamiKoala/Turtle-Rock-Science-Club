import React from 'react';
import { useTheme } from '../../useTheme';
import { getIndicatorColor } from './chem';
import { Activity, Sparkles } from 'lucide-react';

interface FlaskProps {
  analyteName: string;
  analyteFormula: string;
  analyteVolumeMl: number;
  totalVolumeMl: number;
  pH: number;
  indicatorId: string;
  indicatorName: string;
  isSwirling: boolean;
  unmixedStreakRatio: number; // 0 (fully mixed) to 1.0 (strong unmixed entry streak)
  showProbe: boolean;
  onSwirl: () => void;
}

export default function Flask({
  analyteName,
  analyteFormula,
  totalVolumeMl,
  pH,
  indicatorId,
  indicatorName,
  isSwirling,
  unmixedStreakRatio,
  showProbe,
  onSwirl
}: FlaskProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Indicator color calculation
  const indicatorData = getIndicatorColor(indicatorId, pH);
  const liquidColor = indicatorData.colorHex;

  // Flask geometry in SVG coordinates:
  // Flask top neck: X = 75 to 125, Y = 30 to 70
  // Flask conical body: spreads from (75, 70) -> (25, 230) and (125, 70) -> (175, 230)
  // Flask base: X = 25 to 175, Y = 230 (width = 150)
  // Maximum total liquid volume = 100 mL
  // Liquid height scaling: at 25 mL, Y_top ≈ 185; at 50 mL, Y_top ≈ 150; at 75 mL, Y_top ≈ 120; at 100 mL, Y_top ≈ 90
  const clampedVol = Math.max(10, Math.min(100, totalVolumeMl));
  const liquidTopY = 230 - (clampedVol / 100) * 140; // scales from Y=195 (min) to Y=90 (100 mL)

  // Calculate width of cone at liquidTopY:
  // At Y=70, half-width = 25. At Y=230, half-width = 75.
  // Slope dx/dy = (75 - 25) / (230 - 70) = 50 / 160 = 0.3125
  const halfWidthAtLiquid = 25 + (230 - liquidTopY) * 0.3125;
  const liquidLeftX = 100 - halfWidthAtLiquid;
  const liquidRightX = 100 + halfWidthAtLiquid;

  // Swirl wave offset
  const waveOffset = isSwirling ? 4 : 0;

  // Glass colors based on theme
  const glassStroke = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(31,58,66,0.35)';
  const glassFill = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.5)';
  const tickColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(31,58,66,0.4)';

  return (
    <div className="flex flex-col items-center justify-between p-4 rounded-[28px] border-2 border-[#1F3A42]/8 bg-white shadow-[0_8px_24px_rgba(31,58,66,0.06)] relative overflow-hidden">
      
      {/* Flask Header Meta */}
      <div className="w-full flex items-center justify-between mb-2">
        <div>
          <span className="text-[11px] font-extrabold text-[#4B6169] uppercase tracking-wide">
            Receiving Flask
          </span>
          <h4 className="font-display font-bold text-sm text-[#1F3A42]">
            {analyteName} ({analyteFormula})
          </h4>
        </div>
        <div className="text-right">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-display font-bold bg-[#E4F5DA] text-[#2E7D46]">
            {totalVolumeMl.toFixed(2)} mL total
          </span>
        </div>
      </div>

      {/* SVG Flask Visualizer */}
      <div className="relative my-2 select-none">
        <svg
          viewBox="0 0 200 260"
          className={`w-52 h-64 transition-transform duration-300 ${isSwirling ? 'animate-pulse scale-[1.02]' : ''}`}
          role="img"
          aria-label={`Erlenmeyer flask containing ${totalVolumeMl.toFixed(1)} mL solution, color ${indicatorData.description}`}
        >
          <defs>
            {/* Glass shine gradient */}
            <linearGradient id="flaskShine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="white" stopOpacity="0.4" />
              <stop offset="30%" stopColor="white" stopOpacity="0.05" />
              <stop offset="70%" stopColor="white" stopOpacity="0.02" />
              <stop offset="100%" stopColor="white" stopOpacity="0.3" />
            </linearGradient>

            {/* Liquid radial gradient with indicator color */}
            <radialGradient id="flaskLiquidGrad" cx="50%" cy="70%" r="60%">
              <stop offset="0%" stopColor={liquidColor} stopOpacity="0.85" />
              <stop offset="70%" stopColor={liquidColor} stopOpacity="0.7" />
              <stop offset="100%" stopColor={liquidColor} stopOpacity="0.55" />
            </radialGradient>

            {/* Clip path inside flask body */}
            <clipPath id="flaskBodyClip">
              <path d="M 75 30 L 125 30 L 125 70 L 175 230 Q 100 240 25 230 L 75 70 Z" />
            </clipPath>
          </defs>

          {/* Liquid Polygon */}
          <g clipPath="url(#flaskBodyClip)">
            <path
              d={`
                M ${liquidLeftX} ${liquidTopY}
                Q 100 ${liquidTopY - waveOffset} ${liquidRightX} ${liquidTopY}
                L 178 235
                Q 100 245 22 235
                Z
              `}
              fill="url(#flaskLiquidGrad)"
              className="transition-colors duration-300"
            />

            {/* Transient Unmixed Entry Streak / Plume */}
            {unmixedStreakRatio > 0.05 && (
              <g opacity={Math.min(1.0, unmixedStreakRatio * 1.5)}>
                <ellipse
                  cx="100"
                  cy={liquidTopY + 12}
                  rx={16 * unmixedStreakRatio}
                  ry={8 * unmixedStreakRatio}
                  fill={pH < 7 ? '#E91E63' : '#1976D2'}
                  opacity="0.8"
                />
                <path
                  d={`M 96 ${liquidTopY} Q 100 ${liquidTopY + 25} 104 ${liquidTopY} Z`}
                  fill={pH < 7 ? '#E91E63' : '#1976D2'}
                  opacity="0.6"
                />
              </g>
            )}

            {/* Meniscus surface line */}
            <path
              d={`M ${liquidLeftX} ${liquidTopY} Q 100 ${liquidTopY + 3 + waveOffset} ${liquidRightX} ${liquidTopY}`}
              stroke={liquidColor}
              strokeWidth="2"
              fill="none"
              opacity="0.9"
            />
          </g>

          {/* Submerged pH Electrode Probe (if enabled) */}
          {showProbe && (
            <g transform="translate(115, 20)">
              <rect x="0" y="0" width="8" height={Math.max(120, liquidTopY + 35)} rx="2" fill="#4B6169" stroke={glassStroke} strokeWidth="1" />
              <rect x="2" y={Math.max(115, liquidTopY + 30)} width="4" height="12" rx="2" fill="#6CC24A" />
              <path d="M 4 0 L 4 -20 L -30 -20" stroke="#4B6169" strokeWidth="2" fill="none" />
            </g>
          )}

          {/* Flask Glass Outline & Neck */}
          <path
            d="M 72 26 L 128 26 L 128 32 L 125 32 L 125 70 L 175 230 Q 100 240 25 230 L 75 70 L 75 32 L 72 32 Z"
            fill="url(#flaskShine)"
            stroke={glassStroke}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Flask Graduation Tick Marks */}
          {[
            { ml: '25 mL', y: 195 },
            { ml: '50 mL', y: 155 },
            { ml: '75 mL', y: 125 },
            { ml: '100 mL', y: 95 }
          ].map((mark, i) => (
            <g key={i}>
              <line x1="140" y1={mark.y} x2="155" y2={mark.y} stroke={tickColor} strokeWidth="1.5" />
              <text
                x="135"
                y={mark.y + 3}
                fontSize="8"
                fontFamily="Nunito, sans-serif"
                fontWeight="700"
                textAnchor="end"
                fill={tickColor}
              >
                {mark.ml}
              </text>
            </g>
          ))}
        </svg>

        {/* Swirl Ripple Effect when active */}
        {isSwirling && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-24 h-24 rounded-full border-2 border-[#6CC24A]/40 animate-ping" />
          </div>
        )}
      </div>

      {/* Flask Indicator State Bar & Swirl Action */}
      <div className="w-full space-y-2 mt-2">
        <div className="p-3 rounded-2xl border-2 border-[#1F3A42]/8 bg-[#FBF7EC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-4 h-4 rounded-full border border-black/10 shadow-sm shrink-0"
              style={{ backgroundColor: liquidColor }}
            />
            <div className="text-left">
              <span className="text-[11px] font-bold text-[#1F3A42] block leading-tight">
                {indicatorData.description}
              </span>
              <span className="text-[10px] text-[#4B6169] block font-sans">
                Indicator: {indicatorName}
              </span>
            </div>
          </div>

          <button
            onClick={onSwirl}
            className="px-3 py-1.5 rounded-full text-xs font-display font-bold bg-[#6CC24A] text-[#14351F] shadow-[0_3px_0_#4C9A3A] hover:scale-[1.02] active:scale-95 transition cursor-pointer flex items-center gap-1"
            title="Swirl the flask (Shortcut: S)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Swirl (S)</span>
          </button>
        </div>

        {/* Transient streak alert if unmixed */}
        {unmixedStreakRatio > 0.2 && !isSwirling && (
          <p className="text-[10px] font-bold text-[#2E7D46] text-center animate-pulse">
            Transient streak visible — swirl the flask to mix thoroughly!
          </p>
        )}
      </div>

    </div>
  );
}
