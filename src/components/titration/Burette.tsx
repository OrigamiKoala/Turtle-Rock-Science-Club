import React from 'react';
import { useTheme } from '../../useTheme';
import { Search, Info } from 'lucide-react';

interface BuretteProps {
  currentVolumeMl: number; // 0.00 to 50.00 mL delivered (liquid level is at currentVolumeMl)
  initialReadingMl: number;
  autoRead: boolean;
  onToggleAutoRead: () => void;
  isDelivering: boolean;
  deliveryMode: 'closed' | 'drop' | 'stream';
  titrantName: string;
  titrantFormula: string;
  titrantConc: number;
}

export default function Burette({
  currentVolumeMl,
  autoRead,
  onToggleAutoRead,
  isDelivering,
  deliveryMode,
  titrantName,
  titrantFormula,
  titrantConc
}: BuretteProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Total height of burette graduated column in SVG units
  // 0.00 mL is at Y = 40, 50.00 mL is at Y = 440 (height = 400px, 8px per mL)
  const topY = 40;
  const bottomY = 440;
  const pixelsPerMl = (bottomY - topY) / 50.0; // 8 px / mL

  const liquidY = topY + Math.min(50.0, currentVolumeMl) * pixelsPerMl;

  // Reading Loupe focus region: centered on current liquid level
  const loupeCenterVolume = currentVolumeMl;
  const loupeY = Math.max(topY + 30, Math.min(bottomY - 30, liquidY));

  // Generate tick marks (every 1 mL major, every 0.1 mL minor)
  const majorTicks: { y: number; ml: number }[] = [];
  for (let ml = 0; ml <= 50; ml += 5) {
    majorTicks.push({ y: topY + ml * pixelsPerMl, ml });
  }

  const allTicks: { y: number; isMajor: boolean; isMid: boolean }[] = [];
  for (let ml = 0; ml <= 50; ml += 1) {
    const isMajor = ml % 5 === 0;
    const isMid = ml % 1 === 0;
    allTicks.push({ y: topY + ml * pixelsPerMl, isMajor, isMid });
  }

  // Stopcock angle: 0 deg (closed/horizontal), 45 deg (drop), 90 deg (open/vertical)
  const stopcockAngle = deliveryMode === 'stream' ? 90 : deliveryMode === 'drop' ? 45 : 0;

  // Glass colors based on theme
  const glassStroke = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(31,58,66,0.35)';
  const glassFill = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)';
  const tickColor = isDark ? 'rgba(255,255,255,0.75)' : '#1F3A42';
  const liquidFill = isDark ? 'rgba(108,194,74,0.18)' : 'rgba(108,194,74,0.22)';
  const liquidBorder = isDark ? 'rgba(108,194,74,0.6)' : 'rgba(76,154,58,0.7)';
  const clampColor = isDark ? '#4B6169' : '#2D525D';
  const standColor = isDark ? '#2D3748' : '#718096';

  return (
    <div className="relative flex flex-col md:flex-row items-center justify-center gap-6 p-4 rounded-[28px] border-2 border-[#1F3A42]/8 bg-white shadow-[0_8px_24px_rgba(31,58,66,0.06)]">
      
      {/* Burette Graphic Section */}
      <div className="relative flex items-center justify-center">
        <svg
          viewBox="0 0 220 540"
          className="w-48 sm:w-56 h-[460px] select-none"
          role="img"
          aria-label={`Burette with ${currentVolumeMl.toFixed(2)} mL delivered`}
        >
          <defs>
            {/* Glass reflection gradient */}
            <linearGradient id="glassReflect" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="white" stopOpacity="0.4" />
              <stop offset="20%" stopColor="white" stopOpacity="0.1" />
              <stop offset="80%" stopColor="white" stopOpacity="0.05" />
              <stop offset="100%" stopColor="white" stopOpacity="0.3" />
            </linearGradient>

            {/* Liquid gradient */}
            <linearGradient id="buretteLiquid" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={liquidBorder} />
              <stop offset="50%" stopColor={liquidFill} />
              <stop offset="100%" stopColor={liquidBorder} />
            </linearGradient>

            {/* Clip path for burette tube */}
            <clipPath id="tubeClip">
              <rect x="90" y="30" width="28" height="420" rx="2" />
            </clipPath>
          </defs>

          {/* Stand and Clamps */}
          <rect x="25" y="10" width="8" height="520" fill={standColor} rx="2" />
          <rect x="10" y="520" width="90" height="14" fill={standColor} rx="3" />
          
          {/* Clamp rod */}
          <path d="M 29 180 L 90 180" stroke={clampColor} strokeWidth="5" strokeLinecap="round" />
          <path d="M 86 170 Q 104 165 122 170 L 122 190 Q 104 195 86 190 Z" fill={clampColor} opacity="0.9" />

          {/* Burette Top Funnel Lip */}
          <path d="M 85 24 L 123 24 L 118 35 L 90 35 Z" fill={glassFill} stroke={glassStroke} strokeWidth="1.5" />

          {/* Liquid in Burette (Fills from liquidY down to stopcock Y=450) */}
          <g clipPath="url(#tubeClip)">
            {liquidY < bottomY && (
              <rect
                x="90"
                y={liquidY}
                width="28"
                height={Math.max(0, bottomY + 10 - liquidY)}
                fill="url(#buretteLiquid)"
              />
            )}
            
            {/* Meniscus Curve */}
            {liquidY <= bottomY && (
              <path
                d={`M 90 ${liquidY} Q 104 ${liquidY + 4} 118 ${liquidY}`}
                stroke={liquidBorder}
                strokeWidth="2.5"
                fill="none"
              />
            )}
          </g>

          {/* Glass Burette Main Tube */}
          <rect
            x="90"
            y="30"
            width="28"
            height="420"
            fill="url(#glassReflect)"
            stroke={glassStroke}
            strokeWidth="2"
            rx="1"
          />

          {/* Graduation Ticks and Numbers on Tube */}
          {allTicks.map((tick, i) => (
            <line
              key={`tick-${i}`}
              x1={tick.isMajor ? 90 : tick.isMid ? 93 : 95}
              y1={tick.y}
              x2={100}
              y2={tick.y}
              stroke={tickColor}
              strokeWidth={tick.isMajor ? 1.5 : 1}
              opacity={tick.isMajor ? 0.9 : 0.6}
            />
          ))}

          {majorTicks.map((m, i) => (
            <text
              key={`label-${i}`}
              x="84"
              y={m.y + 3.5}
              fontSize="9"
              fontFamily="Nunito, sans-serif"
              fontWeight="700"
              textAnchor="end"
              fill={tickColor}
              opacity="0.85"
            >
              {m.ml}
            </text>
          ))}

          {/* Stopcock valve assembly (Y = 450 to 475) */}
          <g transform="translate(104, 460)">
            {/* Glass neck into stopcock */}
            <rect x="-4" y="-10" width="8" height="15" fill={glassFill} stroke={glassStroke} strokeWidth="1.5" />
            
            {/* Valve body */}
            <circle cx="0" cy="5" r="10" fill={clampColor} stroke={glassStroke} strokeWidth="1.5" />
            
            {/* Rotating Valve Handle */}
            <g transform={`rotate(${stopcockAngle}, 0, 5)`} className="transition-transform duration-300">
              <rect x="-18" y="2" width="36" height="6" rx="3" fill="#6CC24A" stroke="#4C9A3A" strokeWidth="1.5" />
              <circle cx="0" cy="5" r="4" fill="#14351F" />
            </g>

            {/* Burette Dispensing Tip */}
            <path
              d="M -3 15 L -1 35 L 1 35 L 3 15 Z"
              fill={glassFill}
              stroke={glassStroke}
              strokeWidth="1.5"
            />
          </g>

          {/* Droplet animation when delivering */}
          {isDelivering && (
            <g transform="translate(104, 500)">
              {deliveryMode === 'stream' ? (
                <line x1="0" y1="0" x2="0" y2="35" stroke="#6CC24A" strokeWidth="2.5" strokeDasharray="4 2" className="animate-pulse" />
              ) : (
                <ellipse cx="0" cy="12" rx="2.5" ry="4" fill="#6CC24A" className="animate-bounce" />
              )}
            </g>
          )}

          {/* Loupe targeting reticle line */}
          <line
            x1="120"
            y1={liquidY}
            x2="155"
            y2={loupeY}
            stroke="#6CC24A"
            strokeWidth="1.5"
            strokeDasharray="2 2"
            opacity="0.8"
          />
        </svg>

        {/* Floating Reading Loupe on Desktop */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-4 w-32 sm:w-36 p-2.5 rounded-2xl border-2 border-[#6CC24A]/40 bg-white shadow-lg flex flex-col items-center select-none"
          title="Reading Loupe (Magnifier)"
        >
          <div className="flex items-center gap-1 text-[11px] font-display font-bold text-[#2E7D46] mb-1">
            <Search className="w-3.5 h-3.5 text-[#6CC24A]" />
            <span>Meniscus Loupe</span>
          </div>

          {/* Magnified view simulation */}
          <div className="w-full h-20 relative rounded-xl border border-[#1F3A42]/10 bg-[#FBF7EC] overflow-hidden flex items-center justify-center">
            {/* Magnified ticks */}
            <div className="absolute inset-0 flex flex-col justify-between py-1 px-3">
              {[-0.2, -0.1, 0, 0.1, 0.2].map((offset, idx) => {
                const val = Math.max(0, Math.min(50, loupeCenterVolume + offset));
                const isCenter = offset === 0;
                return (
                  <div key={idx} className="flex items-center justify-between text-[10px] font-sans font-bold text-[#4B6169]">
                    <span className="w-6 text-right">{val.toFixed(1)}</span>
                    <div className={`h-0.5 ${isCenter ? 'w-6 bg-[#2E7D46]' : 'w-3 bg-[#1F3A42]/30'}`} />
                  </div>
                );
              })}
            </div>

            {/* Magnified meniscus curve */}
            <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 h-4 border-b-2 border-[#2E7D46] rounded-[50%] bg-[#6CC24A]/30 pointer-events-none" />
            
            {/* Red Hairline Target */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-red-500/70 pointer-events-none" />
          </div>

          <div className="mt-2 text-center">
            <span className="text-[10px] text-[#4B6169] block font-sans">Bottom of curve:</span>
            <span className="text-xs font-display font-bold text-[#1F3A42]">
              {autoRead ? `${currentVolumeMl.toFixed(2)} mL` : `~${currentVolumeMl.toFixed(1)}? mL`}
            </span>
          </div>
        </div>
      </div>

      {/* Burette Info & Readout Tile */}
      <div className="flex-1 w-full max-w-xs space-y-3">
        <div className="p-3.5 rounded-2xl border-2 border-[#1F3A42]/8 bg-[#FBF7EC] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold text-[#1F3A42]">Titrant in Burette</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-display font-bold bg-[#6CC24A] text-[#14351F]">
              50.00 mL
            </span>
          </div>

          <div className="space-y-1 text-xs font-sans">
            <p className="font-bold text-[#1F3A42] flex items-center justify-between">
              <span>{titrantName} ({titrantFormula})</span>
              <span className="text-[#2E7D46]">{titrantConc.toFixed(3)} M</span>
            </p>
            <p className="text-[11px] text-[#4B6169]">
              Standardized analytical titrant solution.
            </p>
          </div>
        </div>

        {/* Auto-Read vs Manual Reading Mode */}
        <div className="p-3.5 rounded-2xl border-2 border-[#1F3A42]/8 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#4B6169] uppercase tracking-wide">
              Burette Volume
            </span>
            <button
              onClick={onToggleAutoRead}
              className="text-[11px] font-bold text-[#2E7D46] hover:underline cursor-pointer"
            >
              {autoRead ? 'Switch to Manual' : 'Enable Auto-Read'}
            </button>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-display font-bold text-[#1F3A42]">
              {autoRead ? currentVolumeMl.toFixed(2) : currentVolumeMl.toFixed(1) + '…'}
            </span>
            <span className="text-xs font-display font-bold text-[#4B6169]">mL delivered</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#4B6169] leading-tight">
            <Info className="w-3.5 h-3.5 text-[#6CC24A] shrink-0" />
            <span>
              {autoRead
                ? 'Auto-read active (precise to 0.01 mL).'
                : 'Auto-read off. Estimate hundredths digit using the loupe.'}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
