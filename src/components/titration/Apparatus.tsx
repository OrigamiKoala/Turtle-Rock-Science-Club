import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../useTheme';
import { getIndicatorColor } from './chem';

interface ApparatusProps {
  currentVolumeMl: number;
  initialReadingMl: number;
  isStreaming: boolean;
  deliveryMode: 'closed' | 'drop' | 'stream';
  onStartStream: () => void;
  onStopStream: () => void;
  onAddDrop: () => void;
  onSwirl: () => void;
  isSwirling: boolean;
  unmixedStreakRatio: number;
  totalVolumeMl: number;
  pH: number;
  indicatorId: string;
  titrantName: string;
  titrantFormula: string;
  analyteName: string;
  analyteFormula: string;
  showProbe: boolean;
}

export default function Apparatus({
  currentVolumeMl,
  isStreaming,
  deliveryMode,
  onStartStream,
  onStopStream,
  onAddDrop,
  onSwirl,
  isSwirling,
  unmixedStreakRatio,
  totalVolumeMl,
  pH,
  indicatorId,
  showProbe
}: ApparatusProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isHoveringStopcock, setIsHoveringStopcock] = useState(false);
  const [isHoveringFlask, setIsHoveringFlask] = useState(false);
  const streamTimerRef = useRef<number | null>(null);
  const isHoldingRef = useRef<boolean>(false);

  // Flask grab-and-shake physics state
  const [isGrabbingFlask, setIsGrabbingFlask] = useState(false);
  const [flaskOffset, setFlaskOffset] = useState({ x: 0, y: 0 });
  const [flaskTilt, setFlaskTilt] = useState(0);
  const [sloshWave, setSloshWave] = useState(0);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const accumulatedDistRef = useRef<number>(0);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Indicator color
  const indData = getIndicatorColor(indicatorId, pH);
  const liquidColor = indData.colorHex;

  // Burette dimensions & coordinates
  // Tube X = 176 to 204 (width 28, center 190)
  // Graduation 0.00 mL at Y = 45, 50.00 mL at Y = 425 (380px for 50mL = 7.6px / mL)
  const topY = 45;
  const bottomY = 425;
  const pixelsPerMl = (bottomY - topY) / 50.0;
  const liquidY = topY + Math.min(50.0, currentVolumeMl) * pixelsPerMl;

  // Stopcock angle: 0 (closed/horizontal), 45 (drop), 90 (streaming/vertical)
  const stopcockAngle = deliveryMode === 'stream' || isStreaming ? 90 : deliveryMode === 'drop' ? 45 : 0;

  // TALL ERLENMEYER FLASK PROPORTIONS (Authentic laboratory 250 mL flask geometry):
  // Base at Y = 620 (width = 124, from X = 128 to 252)
  // Conical body spreads from Y = 540 down to Y = 616
  // Neck from Y = 506 to 540 (width = 34, from X = 173 to 207)
  // Flared lip at Y = 502 (width = 38, from X = 171 to 209)
  // Total height = 118px
  const clampedTotalVol = Math.max(10, Math.min(100, totalVolumeMl));
  // Liquid fill height: 25 mL fills ~34px, 50 mL fills ~48px, 75 mL fills ~62px
  const flaskLiquidHeight = 18 + (clampedTotalVol / 100) * 58;
  const flaskLiquidTopY = 618 - flaskLiquidHeight;
  const flaskHalfWidth = 17 + (618 - flaskLiquidTopY) * 0.58;
  const flaskLeftX = 190 - flaskHalfWidth;
  const flaskRightX = 190 + flaskHalfWidth;

  // Theme styling
  const standColor = isDark ? '#334155' : '#475569';
  const standHighlight = isDark ? '#64748B' : '#94A3B8';
  const clampColor = isDark ? '#4B5563' : '#334155';
  const glassStroke = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(31,58,66,0.4)';
  const glassFill = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.45)';
  const tickColor = isDark ? 'rgba(255,255,255,0.85)' : '#1F3A42';
  const buretteLiquidFill = isDark ? 'rgba(108,194,74,0.2)' : 'rgba(108,194,74,0.22)';
  const buretteLiquidBorder = isDark ? 'rgba(108,194,74,0.7)' : 'rgba(76,154,58,0.75)';

  // Major ticks (every 5 mL) and minor ticks (every 1 mL)
  const majorTicks: { y: number; ml: number }[] = [];
  for (let ml = 0; ml <= 50; ml += 5) {
    majorTicks.push({ y: topY + ml * pixelsPerMl, ml });
  }

  const allTicks: { y: number; isMajor: boolean; isMid: boolean }[] = [];
  for (let ml = 0; ml <= 50; ml += 1) {
    allTicks.push({
      y: topY + ml * pixelsPerMl,
      isMajor: ml % 5 === 0,
      isMid: ml % 1 === 0
    });
  }

  // Handle Stopcock mouse interaction (distinguish quick click for drop vs hold for stream)
  const handleStopcockMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isHoldingRef.current = false;
    if (streamTimerRef.current) clearTimeout(streamTimerRef.current);

    // If held for > 180ms, initiate continuous streaming flow
    streamTimerRef.current = window.setTimeout(() => {
      isHoldingRef.current = true;
      onStartStream();
    }, 180);
  };

  const handleStopcockMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    if (isHoldingRef.current || isStreaming) {
      isHoldingRef.current = false;
      onStopStream();
    } else {
      // Quick tap / click delivers a single drop
      onAddDrop();
    }
  };

  const handleStopcockMouseLeave = () => {
    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    if (isHoldingRef.current || isStreaming) {
      isHoldingRef.current = false;
      onStopStream();
    }
    setIsHoveringStopcock(false);
  };

  // Handle Flask Drag & Shake Swirl
  const handleFlaskGrabStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsGrabbingFlask(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartPos.current = { x: clientX, y: clientY };
    lastPosRef.current = { x: clientX, y: clientY };
    lastTimeRef.current = performance.now();
    accumulatedDistRef.current = 0;
  };

  useEffect(() => {
    if (!isGrabbingFlask) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const now = performance.now();

      if (lastPosRef.current && dragStartPos.current) {
        const deltaX = clientX - lastPosRef.current.x;
        const deltaY = clientY - lastPosRef.current.y;
        const dt = Math.max(1, now - lastTimeRef.current);
        const dist = Math.hypot(deltaX, deltaY);
        const speed = (dist / dt) * 1000;

        const totalDx = clientX - dragStartPos.current.x;
        const totalDy = clientY - dragStartPos.current.y;
        const clampedX = Math.max(-28, Math.min(28, totalDx * 0.35));
        const clampedY = Math.max(-12, Math.min(12, totalDy * 0.35));
        const tilt = Math.max(-14, Math.min(14, clampedX * 0.5));

        setFlaskOffset({ x: clampedX, y: clampedY });
        setFlaskTilt(tilt);

        const slosh = Math.max(-8, Math.min(8, deltaX * 0.3));
        setSloshWave(slosh);

        accumulatedDistRef.current += dist;

        if (speed > 70 || accumulatedDistRef.current > 25) {
          onSwirl();
          accumulatedDistRef.current = 0;
        }
      }

      lastPosRef.current = { x: clientX, y: clientY };
      lastTimeRef.current = now;
    };

    const handleMouseUp = () => {
      setIsGrabbingFlask(false);
      dragStartPos.current = null;
      lastPosRef.current = null;
      setFlaskOffset({ x: 0, y: 0 });
      setFlaskTilt(0);
      setSloshWave(0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isGrabbingFlask, onSwirl]);

  // Loupe vertical tracking (clamps between top and bottom)
  const loupeY = Math.max(topY + 24, Math.min(bottomY - 24, liquidY));

  return (
    <div className="relative flex flex-col items-center justify-center p-4 sm:p-6 rounded-[28px] border-2 border-[#1F3A42]/8 bg-white shadow-[0_8px_24px_rgba(31,58,66,0.06)] select-none">
      
      <div className="relative w-full max-w-md flex items-center justify-center">
        <svg
          viewBox="0 0 380 660"
          className="w-full h-[560px] sm:h-[620px]"
          role="img"
          aria-label={`Titration apparatus with burette containing ${currentVolumeMl.toFixed(2)} mL delivered and receiving flask containing ${totalVolumeMl.toFixed(1)} mL solution`}
        >
          <defs>
            {/* Glass shine gradient */}
            <linearGradient id="glassReflectGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="white" stopOpacity="0.45" />
              <stop offset="25%" stopColor="white" stopOpacity="0.1" />
              <stop offset="75%" stopColor="white" stopOpacity="0.05" />
              <stop offset="100%" stopColor="white" stopOpacity="0.35" />
            </linearGradient>

            {/* Burette Titrant liquid gradient */}
            <linearGradient id="buretteLiquidGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={buretteLiquidBorder} />
              <stop offset="50%" stopColor={buretteLiquidFill} />
              <stop offset="100%" stopColor={buretteLiquidBorder} />
            </linearGradient>

            {/* Flask solution radial gradient */}
            <radialGradient id="flaskLiquidRadial" cx="50%" cy="70%" r="65%">
              <stop offset="0%" stopColor={liquidColor} stopOpacity="0.9" />
              <stop offset="75%" stopColor={liquidColor} stopOpacity="0.75" />
              <stop offset="100%" stopColor={liquidColor} stopOpacity="0.6" />
            </radialGradient>

            {/* Burette glass tube clip path */}
            <clipPath id="buretteTubeClip">
              <rect x="178" y="30" width="24" height="425" rx="1.5" />
            </clipPath>

            {/* Tall Flask glass body clip path */}
            <clipPath id="flaskBodyClip">
              <path d="M 173 506 L 207 506 L 207 540 L 252 616 Q 190 624 128 616 L 173 540 Z" />
            </clipPath>
          </defs>

          {/* ===== RETORT STAND & CLAMP ===== */}
          {/* Heavy Base Plate */}
          <rect x="40" y="620" width="300" height="16" rx="4" fill={standColor} stroke={standHighlight} strokeWidth="1" />
          <rect x="44" y="622" width="292" height="3" rx="1.5" fill={standHighlight} opacity="0.4" />
          
          {/* White Porcelain Base Tile for viewing color */}
          <rect x="120" y="618" width="140" height="4" rx="1" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />

          {/* Vertical Retort Rod */}
          <rect x="76" y="16" width="10" height="604" rx="3" fill={standColor} stroke={standHighlight} strokeWidth="1" />
          <rect x="78" y="18" width="3" height="600" rx="1" fill={standHighlight} opacity="0.5" />

          {/* Upper Clamp Assembly (Y = 145) */}
          <g>
            <rect x="70" y="137" width="22" height="18" rx="2" fill={clampColor} />
            <circle cx="81" cy="146" r="4" fill={standHighlight} />
            <path d="M 86 146 L 178 146" stroke={clampColor} strokeWidth="5" strokeLinecap="round" />
            {/* Clamp jaws around burette */}
            <path d="M 174 135 Q 190 130 206 135 L 206 157 Q 190 162 174 157 Z" fill={clampColor} opacity="0.95" />
            <circle cx="190" cy="146" r="2" fill="#E2E8F0" />
          </g>

          {/* Lower Clamp Assembly (Y = 340) */}
          <g>
            <rect x="70" y="332" width="22" height="18" rx="2" fill={clampColor} />
            <circle cx="81" cy="341" r="4" fill={standHighlight} />
            <path d="M 86 341 L 178 341" stroke={clampColor} strokeWidth="5" strokeLinecap="round" />
            {/* Clamp jaws */}
            <path d="M 174 330 Q 190 325 206 330 L 206 352 Q 190 357 174 352 Z" fill={clampColor} opacity="0.95" />
            <circle cx="190" cy="341" r="2" fill="#E2E8F0" />
          </g>

          {/* ===== BURETTE GLASSWARE ===== */}
          {/* Top funnel lip */}
          <path d="M 173 22 L 207 22 L 202 32 L 178 32 Z" fill={glassFill} stroke={glassStroke} strokeWidth="1.5" />

          {/* Liquid Column inside Burette */}
          <g clipPath="url(#buretteTubeClip)">
            {liquidY < bottomY + 30 && (
              <rect
                x="178"
                y={liquidY}
                width="24"
                height={Math.max(0, bottomY + 35 - liquidY)}
                fill="url(#buretteLiquidGrad)"
              />
            )}
            {/* Curved Concave Meniscus */}
            {liquidY <= bottomY + 20 && (
              <path
                d={`M 178 ${liquidY} Q 190 ${liquidY + 3.5} 202 ${liquidY}`}
                stroke={buretteLiquidBorder}
                strokeWidth="2.5"
                fill="none"
              />
            )}
          </g>

          {/* Glass Tube Body */}
          <rect
            x="178"
            y="30"
            width="24"
            height="425"
            fill="url(#glassReflectGrad)"
            stroke={glassStroke}
            strokeWidth="2"
            rx="1.5"
          />

          {/* Graduation Ticks & Labels */}
          {allTicks.map((tick, i) => (
            <line
              key={`tick-${i}`}
              x1={tick.isMajor ? 178 : tick.isMid ? 180 : 182}
              y1={tick.y}
              x2={186}
              y2={tick.y}
              stroke={tickColor}
              strokeWidth={tick.isMajor ? 1.5 : 1}
              opacity={tick.isMajor ? 0.9 : 0.6}
            />
          ))}

          {majorTicks.map((m, i) => (
            <text
              key={`label-${i}`}
              x="173"
              y={m.y + 3.5}
              fontSize="9"
              fontFamily="Nunito, sans-serif"
              fontWeight="800"
              textAnchor="end"
              fill={tickColor}
              opacity="0.9"
            >
              {m.ml}
            </text>
          ))}

          {/* Reticle connection to magnifier loupe */}
          <line
            x1="202"
            y1={liquidY}
            x2="225"
            y2={loupeY}
            stroke="#6CC24A"
            strokeWidth="1.5"
            strokeDasharray="2 2"
            opacity="0.85"
          />

          {/* ===== STOPCOCK VALVE ASSEMBLY ===== */}
          <g
            transform="translate(190, 460)"
            className="cursor-pointer group"
            onMouseDown={handleStopcockMouseDown}
            onMouseUp={handleStopcockMouseUp}
            onMouseLeave={handleStopcockMouseLeave}
            onTouchStart={handleStopcockMouseDown}
            onTouchEnd={handleStopcockMouseUp}
            onMouseEnter={() => setIsHoveringStopcock(true)}
            role="button"
            tabIndex={0}
            aria-label="Burette Stopcock Valve (Click for 1 drop, hold to stream titrant)"
          >
            {/* Glass neck into valve */}
            <rect x="-4" y="-12" width="8" height="12" fill={glassFill} stroke={glassStroke} strokeWidth="1.5" />

            {/* Valve Outer Body */}
            <circle
              cx="0"
              cy="0"
              r="12"
              fill={isHoveringStopcock ? '#1F3A42' : '#2D525D'}
              stroke="#6CC24A"
              strokeWidth={isHoveringStopcock ? '2.5' : '1.5'}
              className="transition-colors"
            />

            {/* Rotating Stopcock Handle */}
            <g transform={`rotate(${stopcockAngle}, 0, 0)`} className="transition-transform duration-200">
              {/* Handle wings */}
              <rect
                x="-22"
                y="-4"
                width="44"
                height="8"
                rx="4"
                fill={isStreaming ? '#E4574B' : '#6CC24A'}
                stroke="#14351F"
                strokeWidth="1.5"
                className="transition-colors"
              />
              <circle cx="0" cy="0" r="4.5" fill="#14351F" />
            </g>

            {/* Glass Dispensing Tip */}
            <path
              d="M -3 10 L -1 30 L 1 30 L 3 10 Z"
              fill={glassFill}
              stroke={glassStroke}
              strokeWidth="1.5"
            />
          </g>

          {/* ===== FALLING DROPLETS / STREAM ===== */}
          {(isStreaming || deliveryMode === 'stream') && (
            <g transform="translate(190, 490)">
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="25"
                stroke="#6CC24A"
                strokeWidth="2.5"
                strokeDasharray="4 2"
                className="animate-pulse"
              />
            </g>
          )}

          {deliveryMode === 'drop' && !isStreaming && (
            <g transform="translate(190, 490)">
              <ellipse
                cx="0"
                cy="14"
                rx="2.5"
                ry="4.5"
                fill="#6CC24A"
                className="animate-bounce"
              />
            </g>
          )}

          {/* ===== TALL RECEIVING ERLENMEYER FLASK ===== */}
          <g
            transform={`translate(${flaskOffset.x}, ${flaskOffset.y}) rotate(${flaskTilt}, 190, 580)`}
            className={`select-none ${isGrabbingFlask ? 'cursor-grabbing' : 'cursor-grab'} group transition-transform ${isGrabbingFlask ? 'duration-75' : 'duration-300 ease-out'}`}
            onMouseDown={handleFlaskGrabStart}
            onTouchStart={handleFlaskGrabStart}
            onClick={() => onSwirl()}
            onMouseEnter={() => setIsHoveringFlask(true)}
            onMouseLeave={() => setIsHoveringFlask(false)}
            role="button"
            tabIndex={0}
            aria-label="Receiving flask (Hold and shake mouse around to swirl solution)"
          >
            {/* Liquid inside Flask */}
            <g clipPath="url(#flaskBodyClip)">
              <path
                d={`
                  M ${flaskLeftX} ${flaskLiquidTopY - sloshWave}
                  Q 190 ${flaskLiquidTopY - (isSwirling || isGrabbingFlask ? 5 : 0) + sloshWave} ${flaskRightX} ${flaskLiquidTopY + sloshWave}
                  L 252 616
                  Q 190 624 128 616
                  Z
                `}
                fill="url(#flaskLiquidRadial)"
                className="transition-colors duration-300"
              />

              {/* Transient Unmixed Streak / Plume (Static, non-pulsing) */}
              {unmixedStreakRatio > 0.04 && (
                <g opacity={Math.min(1.0, unmixedStreakRatio * 1.6)}>
                  <ellipse
                    cx="190"
                    cy={flaskLiquidTopY + 8}
                    rx={14 * unmixedStreakRatio}
                    ry={6 * unmixedStreakRatio}
                    fill={pH < 7 ? '#E91E63' : '#1976D2'}
                    opacity="0.8"
                  />
                  <path
                    d={`M 186 ${flaskLiquidTopY} Q 190 ${flaskLiquidTopY + 18} 194 ${flaskLiquidTopY} Z`}
                    fill={pH < 7 ? '#E91E63' : '#1976D2'}
                    opacity="0.65"
                  />
                </g>
              )}

              {/* Liquid Surface Meniscus */}
              <path
                d={`M ${flaskLeftX} ${flaskLiquidTopY - sloshWave} Q 190 ${flaskLiquidTopY + 2 + (isSwirling || isGrabbingFlask ? 4 : 0) + sloshWave} ${flaskRightX} ${flaskLiquidTopY + sloshWave}`}
                stroke={liquidColor}
                strokeWidth="2"
                fill="none"
                opacity="0.9"
              />
            </g>

            {/* Submerged pH Electrode Probe (if enabled) */}
            {showProbe && (
              <g transform="translate(198, 480)">
                <rect x="0" y="0" width="5" height={Math.max(45, flaskLiquidTopY - 455)} rx="1.5" fill="#475569" stroke={glassStroke} strokeWidth="1" />
                <rect x="1" y={Math.max(40, flaskLiquidTopY - 460)} width="3" height="8" rx="1" fill="#6CC24A" />
                <path d="M 2.5 0 L 2.5 -12 L -60 -12" stroke="#475569" strokeWidth="1.5" fill="none" />
              </g>
            )}

            {/* Flask Glass Outline (Tall Erlenmeyer Shape) */}
            <path
              d="M 171 502 L 209 502 L 209 508 L 207 508 L 207 540 L 252 616 Q 190 624 128 616 L 173 540 L 173 508 L 171 508 Z"
              fill="url(#glassReflectGrad)"
              stroke={isHoveringFlask || isGrabbingFlask ? '#6CC24A' : glassStroke}
              strokeWidth={isHoveringFlask || isGrabbingFlask ? '2.5' : '2'}
              strokeLinejoin="round"
              className="transition-all"
            />



            {/* Swirl Pulse Ring */}
            {(isSwirling || isGrabbingFlask) && (
              <circle
                cx="190"
                cy="580"
                r="38"
                fill="none"
                stroke="#6CC24A"
                strokeWidth="2"
                className="animate-ping"
                opacity="0.7"
              />
            )}
          </g>

          {/* ===== ENLARGED PRECISION MENISCUS MAGNIFIER (PURE VISUAL READING) ===== */}
          <g transform={`translate(225, ${loupeY - 70})`}>
            {/* Magnifier Lens Outer Bezel Frame */}
            <rect
              x="0"
              y="0"
              width="145"
              height="140"
              rx="20"
              fill={isDark ? '#0F172A' : '#FFFFFF'}
              stroke="#6CC24A"
              strokeWidth="2.5"
              filter="drop-shadow(0 6px 16px rgba(31,58,66,0.18))"
            />

            {/* Magnified Optical Chamber */}
            <g transform="translate(8, 8)">
              {/* Lens Interior Background */}
              <rect
                x="0"
                y="0"
                width="129"
                height="124"
                rx="14"
                fill={isDark ? '#1E293B' : '#FBF7EC'}
                stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(31,58,66,0.15)'}
              />

              {/* Magnified Burette Glass Column Interior */}
              <rect
                x="45"
                y="2"
                width="76"
                height="120"
                rx="2"
                fill={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)'}
                stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(31,58,66,0.2)'}
                strokeWidth="1.5"
              />

              {/* Magnified Liquid Column (fills from center meniscus y=62 down) */}
              <rect
                x="46"
                y="62"
                width="74"
                height="59"
                fill="url(#buretteLiquidGrad)"
                opacity="0.85"
              />

              {/* Magnified Graduation Ticks & Labels */}
              {(() => {
                const ticks = [];
                const base = Math.round(currentVolumeMl * 20) / 20;
                for (let i = -18; i <= 18; i++) {
                  const val = Math.round((base + i * 0.05) * 100) / 100;
                  if (val < 0 || val > 50) continue;

                  const yPos = 62 + (val - currentVolumeMl) * 70;
                  if (yPos < 6 || yPos > 118) continue;

                  const isWhole = Math.abs(val - Math.round(val)) < 0.001;
                  const isHalf = Math.abs((val * 10) % 5) < 0.001 && !isWhole;
                  const isTenth = Math.abs((val * 10) % 1) < 0.001 && !isWhole && !isHalf;

                  const tickLen = isWhole ? 28 : isHalf ? 20 : isTenth ? 14 : 8;
                  const strokeW = isWhole ? 1.75 : isHalf ? 1.25 : 1;

                  ticks.push(
                    <g key={`mag-${val.toFixed(2)}`}>
                      <line
                        x1={45}
                        y1={yPos}
                        x2={45 + tickLen}
                        y2={yPos}
                        stroke={isDark ? '#E2E8F0' : '#1F3A42'}
                        strokeWidth={strokeW}
                        strokeOpacity={isWhole ? 0.95 : isHalf ? 0.8 : isTenth ? 0.6 : 0.4}
                      />
                      {(isWhole || isHalf) && (
                        <text
                          x={40}
                          y={yPos + 3.5}
                          fontSize={isWhole ? '10' : '9'}
                          fontFamily="Nunito, sans-serif"
                          fontWeight="800"
                          textAnchor="end"
                          fill={isDark ? '#F1F5F9' : '#1F3A42'}
                        >
                          {val.toFixed(1)}
                        </text>
                      )}
                    </g>
                  );
                }
                return ticks;
              })()}

              {/* Magnified Meniscus Fluid Concave Curve (Bottom of curve aligns with current volume at y=62) */}
              <path
                d="M 46 54 Q 83 62 120 54"
                stroke={buretteLiquidBorder}
                strokeWidth="3"
                fill="none"
              />

              {/* Subtle glass glare highlight */}
              <rect x="110" y="4" width="8" height="116" rx="2" fill="white" opacity={isDark ? '0.08' : '0.4'} />
            </g>
          </g>
        </svg>
      </div>

    </div>
  );
}
