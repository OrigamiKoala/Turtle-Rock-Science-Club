import React, { useState } from 'react';
import { useTheme } from '../../useTheme';
import { CurvePoint } from './types';
import { INDICATORS } from './chem';
import { LineChart, Sparkles } from 'lucide-react';
import { Latex } from '../Latex';

interface CurvePlotProps {
  points: CurvePoint[];
  currentVolumeMl: number;
  currentPh: number;
  showAnnotations?: boolean;
  equivalenceVolumeMl?: number;
  equivalencePh?: number;
  halfEquivalenceVolumeMl?: number;
  pKaValue?: number;
  indicatorId?: string;
  maxVolume?: number;
  className?: string;
}

export default function CurvePlot({
  points,
  currentVolumeMl,
  currentPh,
  showAnnotations = false,
  equivalenceVolumeMl,
  equivalencePh,
  halfEquivalenceVolumeMl,
  pKaValue,
  indicatorId,
  maxVolume = 50.0,
  className = ''
}: CurvePlotProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [hoverPoint, setHoverPoint] = useState<{ volume: number; pH: number; x: number; y: number } | null>(null);

  // SVG Chart dimensions
  const svgWidth = 460;
  const svgHeight = 260;
  const margin = { top: 20, right: 25, bottom: 35, left: 45 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;

  // Coordinate transforms
  const getX = (vol: number) => margin.left + (Math.max(0, Math.min(maxVolume, vol)) / maxVolume) * chartWidth;
  const getY = (pH: number) => margin.top + chartHeight - (Math.max(0, Math.min(14, pH)) / 14.0) * chartHeight;

  // Path data for recorded curve points
  let pathD = '';
  if (points.length > 0) {
    pathD = `M ${getX(points[0].volumeMl)} ${getY(points[0].pH)}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${getX(points[i].volumeMl)} ${getY(points[i].pH)}`;
    }
  }

  // Gridlines
  const xTicks = [0, 10, 20, 30, 40, 50].filter((v) => v <= maxVolume);
  const yTicks = [0, 2, 4, 6, 7, 8, 10, 12, 14];

  // Theme-aware strokes and fills
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(31,58,66,0.08)';
  const axisColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(31,58,66,0.25)';
  const textColor = isDark ? 'rgba(255,255,255,0.7)' : '#4B6169';
  const neutralLineColor = isDark ? 'rgba(108,194,74,0.3)' : 'rgba(76,154,58,0.25)';
  const curveColor = '#2E7D46';

  // Indicator transition range
  const ind = indicatorId ? INDICATORS[indicatorId] : null;
  const indLowerPh = ind ? ind.pKa - 1.0 : 0;
  const indUpperPh = ind ? ind.pKa + 1.0 : 0;

  // Mouse move handler for inspection
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgScale = svgWidth / rect.width;
    const xInSvg = mouseX * svgScale;

    // Find closest volume
    const volAtMouse = ((xInSvg - margin.left) / chartWidth) * maxVolume;
    let closest = points[0];
    let minDiff = Math.abs(closest.volumeMl - volAtMouse);

    for (let i = 1; i < points.length; i++) {
      const diff = Math.abs(points[i].volumeMl - volAtMouse);
      if (diff < minDiff) {
        minDiff = diff;
        closest = points[i];
      }
    }

    if (minDiff < 4) {
      setHoverPoint({
        volume: closest.volumeMl,
        pH: closest.pH,
        x: getX(closest.volumeMl),
        y: getY(closest.pH)
      });
    } else {
      setHoverPoint(null);
    }
  };

  return (
    <div className={`p-4 rounded-[28px] border-2 border-[#1F3A42]/8 bg-white shadow-[0_8px_24px_rgba(31,58,66,0.06)] flex flex-col justify-between ${className}`}>
      
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#E4F5DA] text-[#2E7D46]">
            <LineChart className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-display font-bold text-sm text-[#1F3A42]">
              Titration Curve
            </h4>
            <p className="text-[11px] text-[#4B6169]">
              <Latex math="\text{pH vs. } V_{\text{titrant}}\text{ (mL)}" />
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-display font-bold bg-[#E4F5DA] text-[#2E7D46]">
            <Latex math={`\\text{pH } ${currentPh.toFixed(2)}`} />
          </span>
        </div>
      </div>

      {/* SVG Plot Graphic */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverPoint(null)}
          role="img"
          aria-label="Titration pH curve plot"
        >
          {/* Indicator Transition Band (if active) */}
          {ind && showAnnotations && (
            <rect
              x={margin.left}
              y={getY(indUpperPh)}
              width={chartWidth}
              height={getY(indLowerPh) - getY(indUpperPh)}
              fill={ind.baseColorHex}
              fillOpacity="0.12"
            />
          )}

          {/* Neutrality line pH 7.00 */}
          <line
            x1={margin.left}
            y1={getY(7.0)}
            x2={margin.left + chartWidth}
            y2={getY(7.0)}
            stroke={neutralLineColor}
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          {/* Grid lines: Horizontal (pH) */}
          {yTicks.map((yVal) => (
            <g key={`y-${yVal}`}>
              <line
                x1={margin.left}
                y1={getY(yVal)}
                x2={margin.left + chartWidth}
                y2={getY(yVal)}
                stroke={gridColor}
                strokeWidth="1"
              />
              <text
                x={margin.left - 8}
                y={getY(yVal) + 3.5}
                fontSize="10"
                fontFamily="Nunito, sans-serif"
                fontWeight="700"
                textAnchor="end"
                fill={textColor}
              >
                {yVal}
              </text>
            </g>
          ))}

          {/* Grid lines: Vertical (mL) */}
          {xTicks.map((xVal) => (
            <g key={`x-${xVal}`}>
              <line
                x1={getX(xVal)}
                y1={margin.top}
                x2={getX(xVal)}
                y2={margin.top + chartHeight}
                stroke={gridColor}
                strokeWidth="1"
              />
              <text
                x={getX(xVal)}
                y={margin.top + chartHeight + 16}
                fontSize="10"
                fontFamily="Nunito, sans-serif"
                fontWeight="700"
                textAnchor="middle"
                fill={textColor}
              >
                {xVal}
              </text>
            </g>
          ))}

          {/* Axes Lines */}
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + chartHeight}
            stroke={axisColor}
            strokeWidth="1.5"
          />
          <line
            x1={margin.left}
            y1={margin.top + chartHeight}
            x2={margin.left + chartWidth}
            y2={margin.top + chartHeight}
            stroke={axisColor}
            strokeWidth="1.5"
          />

          {/* Axis Titles */}
          <text
            x={margin.left + chartWidth / 2}
            y={svgHeight - 4}
            fontSize="10"
            fontFamily="Nunito, sans-serif"
            fontWeight="800"
            textAnchor="middle"
            fill={textColor}
          >
            Titrant Volume (mL)
          </text>
          <text
            x={14}
            y={margin.top + chartHeight / 2}
            fontSize="10"
            fontFamily="Nunito, sans-serif"
            fontWeight="800"
            textAnchor="middle"
            fill={textColor}
            transform={`rotate(-90 14 ${margin.top + chartHeight / 2})`}
          >
            pH
          </text>

          {/* Analysis Annotations */}
          {showAnnotations && equivalenceVolumeMl !== undefined && equivalencePh !== undefined && (
            <g>
              {/* Equivalence Point Line */}
              <line
                x1={getX(equivalenceVolumeMl)}
                y1={margin.top}
                x2={getX(equivalenceVolumeMl)}
                y2={margin.top + chartHeight}
                stroke="#E4574B"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              {/* Equivalence Marker */}
              <circle
                cx={getX(equivalenceVolumeMl)}
                cy={getY(equivalencePh)}
                r="5"
                fill="#E4574B"
                stroke="white"
                strokeWidth="1.5"
              />
              <text
                x={getX(equivalenceVolumeMl) + 6}
                y={getY(equivalencePh) - 6}
                fontSize="9"
                fontFamily="Nunito, sans-serif"
                fontWeight="800"
                fill="#E4574B"
              >
                Eq: {equivalenceVolumeMl.toFixed(2)} mL (pH {equivalencePh.toFixed(2)})
              </text>
            </g>
          )}

          {/* Half-Equivalence / pKa Annotation */}
          {showAnnotations && halfEquivalenceVolumeMl !== undefined && pKaValue !== undefined && (
            <g>
              <line
                x1={getX(halfEquivalenceVolumeMl)}
                y1={margin.top + chartHeight}
                x2={getX(halfEquivalenceVolumeMl)}
                y2={getY(pKaValue)}
                stroke="#6CC24A"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(halfEquivalenceVolumeMl)}
                cy={getY(pKaValue)}
                r="4.5"
                fill="#6CC24A"
                stroke="white"
                strokeWidth="1.5"
              />
              <text
                x={getX(halfEquivalenceVolumeMl) + 6}
                y={getY(pKaValue) + 12}
                fontSize="9"
                fontFamily="Nunito, sans-serif"
                fontWeight="800"
                fill="#2E7D46"
              >
                ½ Eq: pH = pKa ({pKaValue.toFixed(2)})
              </text>
            </g>
          )}

          {/* Recorded Titration Curve Path */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={curveColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Current Live Point Dot */}
          {currentVolumeMl > 0 && (
            <g>
              <circle
                cx={getX(currentVolumeMl)}
                cy={getY(currentPh)}
                r="6"
                fill="#6CC24A"
                stroke="white"
                strokeWidth="2"
                className="animate-pulse"
              />
            </g>
          )}

          {/* Hover Inspection Reticle */}
          {hoverPoint && (
            <g>
              <line
                x1={hoverPoint.x}
                y1={margin.top}
                x2={hoverPoint.x}
                y2={margin.top + chartHeight}
                stroke="#4B6169"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.6"
              />
              <circle cx={hoverPoint.x} cy={hoverPoint.y} r="4" fill="#1F3A42" stroke="white" strokeWidth="1.5" />
            </g>
          )}
        </svg>

        {/* Hover Tooltip Readout */}
        {hoverPoint && (
          <div
            className="absolute z-10 px-2.5 py-1 rounded-lg bg-[#1F3A42] text-white text-[11px] font-sans font-bold shadow-md pointer-events-none -translate-x-1/2 -translate-y-8 flex items-center gap-1.5"
            style={{
              left: `${(hoverPoint.x / svgWidth) * 100}%`,
              top: `${(hoverPoint.y / svgHeight) * 100}%`
            }}
          >
            <span><Latex math={`${hoverPoint.volume.toFixed(2)}\\text{ mL}`} /></span>
            <span className="opacity-60">|</span>
            <span><Latex math={`\\text{pH } ${hoverPoint.pH.toFixed(2)}`} /></span>
          </div>
        )}
      </div>

      {/* Legend & Details */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-[#1F3A42]/8 text-[11px] font-sans text-[#4B6169]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D46]" />
            <span>Recorded Curve</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 border-b border-dashed border-[#6CC24A]" />
            <span>Neutral <Latex math="\text{pH } 7" /></span>
          </span>
          {showAnnotations && (
            <span className="flex items-center gap-1 text-[#E4574B] font-bold">
              <Sparkles className="w-3 h-3" />
              <span>Equivalence Point (<Latex math="V_{\text{eq}}" />)</span>
            </span>
          )}
        </div>
        <span>{points.length} data points recorded</span>
      </div>

    </div>
  );
}
