import React, { useState, useEffect, useRef } from 'react';
import { ClubIdentity, UserProfile } from '../types';
import { 
  FlaskConical, 
  Sparkles, 
  Atom, 
  RotateCcw, 
  Play, 
  Plus, 
  Trophy, 
  Award, 
  Compass, 
  Flame, 
  Volume2, 
  Info,
  HelpCircle,
  TrendingUp
} from 'lucide-react';

interface VirtualLabProps {
  identity: ClubIdentity;
  userProfile: UserProfile;
  onUpdateXp: (xpToAdd: number, badgeToUnlock?: string) => void;
}

interface Bubble {
  id: number;
  y: number;
  x: number;
  size: number;
  speed: number;
  color: string;
}

export default function VirtualLab({
  identity,
  userProfile,
  onUpdateXp
}: VirtualLabProps) {
  const isTurtle = identity === 'turtlerock';

  const [activeExp, setActiveExp] = useState<'lava' | 'volcano' | 'stargazing'>('lava');

  // State for LAVA LAMP Simulator
  const [lavaColor, setLavaColor] = useState('#f59e0b'); // Amber
  const [fluidDensity, setFluidDensity] = useState(0.7); // Ratio
  const [tabletDropCount, setTabletDropCount] = useState(0);
  const [lavaBubbles, setLavaBubbles] = useState<Bubble[]>([]);
  const [isLavaReacting, setIsLavaReacting] = useState(false);

  // State for VOLCANO Chemical Blast
  const [bakingSoda, setBakingSoda] = useState(15); // grams
  const [vinegar, setVinegar] = useState(50); // ml
  const [lavaTone, setLavaTone] = useState<'red' | 'green' | 'purple'>('red');
  const [eruptionPower, setEruptionPower] = useState(0); // 0 to 100
  const [isErupting, setIsErupting] = useState(false);

  // State for STARGAZING Telescope
  const [skyRotation, setSkyRotation] = useState(0); // Degrees
  const [foundConstellation, setFoundConstellation] = useState<string | null>(null);

  // Timer loop for Lava Bubbles
  useEffect(() => {
    if (lavaBubbles.length === 0) return;

    const interval = setInterval(() => {
      setLavaBubbles((prev) => 
        prev
          .map((b) => ({
            ...b,
            y: b.y - b.speed * (1.5 - fluidDensity), // density affects speed
            x: b.x + Math.sin(b.y / 20) * 0.5 // wobble
          }))
          .filter((b) => b.y > -20) // remove popped
      );
    }, 40);

    return () => clearInterval(interval);
  }, [lavaBubbles, fluidDensity]);

  // Drop tablet effect
  const handleDropTablet = () => {
    setIsLavaReacting(true);
    setTabletDropCount((prev) => {
      const updated = prev + 1;
      // Triggers badges
      let badgeToUnlock: string | undefined;
      if (updated === 3 && !userProfile.unlockedBadges.includes('Lava Lamp Alchemist')) {
        badgeToUnlock = 'Lava Lamp Alchemist';
      }
      onUpdateXp(25, badgeToUnlock);
      return updated;
    });

    // Generate new bubbles
    const colors = [lavaColor, '#ffffff', lavaColor + 'dd'];
    const newBubbles: Bubble[] = Array.from({ length: 25 }).map((_, i) => ({
      id: Math.random() + i,
      y: 100,
      x: 10 + Math.random() * 80, // % width
      size: 5 + Math.random() * 15,
      speed: 0.8 + Math.random() * 1.5,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));

    setLavaBubbles((prev) => [...prev, ...newBubbles]);

    setTimeout(() => {
      setIsLavaReacting(false);
    }, 4000);
  };

  // Trigger Volcano Eruption
  const handleErupt = () => {
    setIsErupting(true);
    // Formula for eruption power
    const ratio = vinegar / bakingSoda; // sweet spot is around 3.0 to 4.5
    let calculatedPower = 0;
    if (ratio >= 2.5 && ratio <= 5) {
      calculatedPower = Math.min(100, (bakingSoda + vinegar) * 1.1);
    } else {
      calculatedPower = Math.max(20, (bakingSoda + vinegar) * 0.5);
    }
    setEruptionPower(calculatedPower);

    let badgeToUnlock: string | undefined;
    if (calculatedPower > 80 && !userProfile.unlockedBadges.includes('Volcano Catalyst')) {
      badgeToUnlock = 'Volcano Catalyst';
    }
    onUpdateXp(40, badgeToUnlock);

    setTimeout(() => {
      setIsErupting(false);
      setEruptionPower(0);
    }, 6000);
  };

  // Sky Chart calculation
  useEffect(() => {
    const angle = skyRotation % 360;
    // Orion is around 45 to 75 deg
    // Ursa Major is around 165 to 195 deg
    // Cassiopeia is around 285 to 315 deg
    if (angle >= 45 && angle <= 80) {
      setFoundConstellation('Orion');
    } else if (angle >= 165 && angle <= 200) {
      setFoundConstellation('Ursa Major');
    } else if (angle >= 285 && angle <= 320) {
      setFoundConstellation('Cassiopeia');
    } else {
      setFoundConstellation(null);
    }
  }, [skyRotation]);

  const handleClaimStargazerBadge = () => {
    if (foundConstellation) {
      let badgeToUnlock: string | undefined;
      if (!userProfile.unlockedBadges.includes('Stargazing Scout')) {
        badgeToUnlock = 'Stargazing Scout';
      }
      onUpdateXp(35, badgeToUnlock);
    }
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
      <div className="text-center space-y-3 mb-10">
        <h3 className="font-display font-bold text-3xl sm:text-4xl tracking-tighter text-white">
          Interactive Science Labs
        </h3>
        <p className="text-xs max-w-2xl mx-auto leading-relaxed text-zinc-400 font-sans">
          {isTurtle 
            ? 'Test real physical rules using our neighborhood virtual lab simulators! Achieve goals to earn experience points (XP) and unlock professional club badges.'
            : 'Formulate hypotheses and conduct dynamic virtual experiment iterations to validate physical laws.'}
        </p>

        {/* Experiment Navigation Tabs */}
        <div className="flex justify-center gap-1.5 p-1 max-w-md mx-auto rounded-full bg-zinc-900 border border-white/10 mt-6">
          <button
            id="exp-tab-lava"
            onClick={() => setActiveExp('lava')}
            className={`flex-1 py-2 text-[10px] font-bold font-mono uppercase tracking-wider rounded-full transition-all cursor-pointer ${
              activeExp === 'lava'
                ? 'bg-white/10 text-white border border-white/10 shadow-lg'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Lava Lamp Lab
          </button>
          <button
            id="exp-tab-volcano"
            onClick={() => setActiveExp('volcano')}
            className={`flex-1 py-2 text-[10px] font-bold font-mono uppercase tracking-wider rounded-full transition-all cursor-pointer ${
              activeExp === 'volcano'
                ? 'bg-white/10 text-white border border-white/10 shadow-lg'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Volcano Reaction
          </button>
          <button
            id="exp-tab-star"
            onClick={() => setActiveExp('stargazing')}
            className={`flex-1 py-2 text-[10px] font-bold font-mono uppercase tracking-wider rounded-full transition-all cursor-pointer ${
              activeExp === 'stargazing'
                ? 'bg-white/10 text-white border border-white/10 shadow-lg'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Star Coordinates
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Visual Simulated Output Panel (Left) */}
        <div className="lg:col-span-7 flex flex-col justify-center items-center rounded-[2rem] p-6 min-h-[420px] relative overflow-hidden border border-white/10 bg-zinc-900/40 backdrop-blur-md shadow-2xl text-white">
          <div className="absolute inset-0 bg-dot-pattern opacity-10 pointer-events-none" />
          
          {/* LAVA LAMP VISUALIZER */}
          {activeExp === 'lava' && (
            <div className="w-full flex flex-col items-center">
              <h4 className="font-mono text-xs tracking-wider uppercase text-yellow-500 mb-4 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Lava Cylinder Simulation v1.4
              </h4>

              {/* The Lamp Bottle */}
              <div className="w-40 h-72 rounded-t-[50px] rounded-b-2xl border-[3.5px] border-slate-700 bg-slate-900/40 relative overflow-hidden shadow-2xl flex flex-col justify-between">
                
                {/* Upper Cap */}
                <div className="h-6 bg-slate-800 border-b border-slate-700 text-center text-[8px] tracking-wide text-slate-400 font-mono flex items-center justify-center">
                  CAP
                </div>

                {/* Main Chamber with bubbling particles */}
                <div className="flex-1 relative w-full overflow-hidden">
                  
                  {/* Floating Bubbles */}
                  {lavaBubbles.map((bubble) => (
                    <div
                      key={bubble.id}
                      className="absolute rounded-full transition-all duration-300 pointer-events-none"
                      style={{
                        bottom: `${100 - bubble.y}%`,
                        left: `${bubble.x}%`,
                        width: `${bubble.size}px`,
                        height: `${bubble.size}px`,
                        backgroundColor: bubble.color,
                        boxShadow: `0 0 10px ${bubble.color}`,
                        opacity: bubble.y < 15 ? bubble.y / 15 : 1
                      }}
                    />
                  ))}

                  {/* Water base (bottom) */}
                  <div className="absolute bottom-0 left-0 right-0 h-10 bg-indigo-900/20 backdrop-blur-xs border-t border-indigo-500/10 pointer-events-none" />

                  {/* Active fizzing tablets floor */}
                  {isLavaReacting && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1.5 animate-bounce">
                      <div className="w-3 h-1.5 rounded-full bg-white opacity-90 animate-pulse" />
                      <div className="w-2 h-1 bg-white opacity-80" />
                    </div>
                  )}
                </div>

                {/* Base metal pedestal */}
                <div className="h-8 bg-slate-800 border-t border-slate-700 flex flex-col items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm animate-pulse" />
                </div>
              </div>

              {/* Status bar */}
              <div className="mt-5 font-mono text-[11px] text-slate-400 flex items-center gap-4">
                <span>Density: <strong className="text-white">{(fluidDensity * 10).toFixed(1)} cp</strong></span>
                <span>•</span>
                <span>Active Blobs: <strong className="text-white">{lavaBubbles.length}</strong></span>
              </div>
            </div>
          )}

          {/* VOLCANO ERUPTION VISUALIZER */}
          {activeExp === 'volcano' && (
            <div className="w-full flex flex-col items-center relative h-full">
              <h4 className="font-mono text-xs tracking-wider uppercase text-red-500 mb-2 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                Thermal Acid-Base Vent
              </h4>

              {/* Mountain Volcano Shape */}
              <div className="relative w-80 h-64 mt-6 flex items-end justify-center">
                
                {/* Eruption Froth Foam (Layered animations) */}
                {isErupting && (
                  <div className="absolute top-16 w-32 bottom-0 flex flex-col items-center z-20">
                    {/* Flowing lava stream */}
                    <div 
                      className="w-10 rounded-full animate-pulse transition-all duration-500"
                      style={{
                        height: `${eruptionPower}%`,
                        backgroundColor: lavaTone === 'red' ? '#ef4444' : lavaTone === 'green' ? '#22c55e' : '#a855f7',
                        boxShadow: `0 0 25px ${lavaTone === 'red' ? '#f87171' : lavaTone === 'green' ? '#4ade80' : '#c084fc'}`
                      }}
                    />
                    {/* Splash bubbles at peak */}
                    <div 
                      className="absolute -top-6 w-16 h-16 rounded-full animate-ping opacity-60"
                      style={{
                        backgroundColor: lavaTone === 'red' ? '#f87171' : lavaTone === 'green' ? '#4ade80' : '#c084fc'
                      }}
                    />
                  </div>
                )}

                {/* Main volcano cone frame */}
                <svg className="w-full h-full text-stone-800 fill-current z-10" viewBox="0 0 100 80">
                  <polygon points="50,15 20,80 80,80" />
                  {/* Inner conduit cup */}
                  <polygon points="46,15 54,15 52,30 48,30" className="text-stone-900 fill-current" />
                </svg>

                {/* Floor safety tray */}
                <div className="absolute bottom-0 w-full h-2 bg-stone-700 rounded-full" />
              </div>

              <p className="mt-4 font-mono text-[10px] text-stone-400">
                {isErupting 
                  ? `🔥 Eruption Intensity: ${(eruptionPower).toFixed(0)}%! Pressure peak attained.` 
                  : 'Ready. Adjust vinegar ratio and click Trigger.'}
              </p>
            </div>
          )}

          {/* STARGAZING TELESCOPE VISUALIZER */}
          {activeExp === 'stargazing' && (
            <div className="w-full flex flex-col items-center">
              <h4 className="font-mono text-xs tracking-wider uppercase text-indigo-400 mb-3 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 animate-spin-slow" />
                Celestron Optic Feed
              </h4>

              {/* The Star Chart Circular Viewfinder */}
              <div className="relative w-64 h-64 rounded-full border-4 border-slate-700 bg-black overflow-hidden shadow-inner flex items-center justify-center">
                
                {/* Sky Wheel with constellations */}
                <div 
                  className="absolute inset-0 w-full h-full transition-all duration-300"
                  style={{ transform: `rotate(${skyRotation}deg)` }}
                >
                  {/* Sky grid */}
                  <div className="absolute inset-0 border border-indigo-500/10 rounded-full" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border border-indigo-500/5 rounded-full" />
                    <div className="w-32 h-32 border border-indigo-500/5 rounded-full" />
                  </div>

                  {/* Constellation A: Orion (around 60 deg rotation) */}
                  <div className="absolute top-10 left-12 group">
                    <div className="relative">
                      {/* Star nodes */}
                      <span className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#fff]" />
                      <span className="absolute w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#fff] top-4 left-6" />
                      <span className="absolute w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#fff] top-8 left-12" />
                      {/* Belt */}
                      <span className="absolute w-1 h-1 rounded-full bg-cyan-300 top-12 left-6" />
                      <span className="absolute w-1 h-1 rounded-full bg-cyan-300 top-12 left-8" />
                      <span className="absolute w-1 h-1 rounded-full bg-cyan-300 top-12 left-10" />
                      {/* Rigel & Betelgeuse */}
                      <span className="absolute w-2 h-2 rounded-full bg-amber-400 top-2 left-10" />
                      <span className="absolute w-2 h-2 rounded-full bg-blue-400 top-20 left-4" />
                      {/* Connecting lines */}
                      <svg className="absolute top-0 left-0 w-24 h-24 text-indigo-400/40" viewBox="0 0 100 100">
                        <line x1="8" y1="8" x2="32" y2="24" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2" />
                        <line x1="32" y1="24" x2="56" y2="36" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2" />
                        <line x1="32" y1="52" x2="40" y2="52" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2" />
                        <line x1="40" y1="52" x2="48" y2="52" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2" />
                      </svg>
                    </div>
                  </div>

                  {/* Constellation B: Ursa Major (around 180 deg rotation) */}
                  <div className="absolute bottom-16 left-20">
                    <div className="relative">
                      <span className="absolute w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_#fff]" />
                      <span className="absolute w-2 h-2 rounded-full bg-white top-4 left-10" />
                      <span className="absolute w-1.5 h-1.5 rounded-full bg-white top-10 left-18" />
                      <span className="absolute w-1.5 h-1.5 rounded-full bg-white top-16 left-26" />
                      <span className="absolute w-2 h-2 rounded-full bg-white top-24 left-24" />
                      <span className="absolute w-2 h-2 rounded-full bg-white top-28 left-14" />
                      <span className="absolute w-2 h-2 rounded-full bg-white top-20 left-4" />
                    </div>
                  </div>

                  {/* Constellation C: Cassiopeia (around 300 deg rotation) */}
                  <div className="absolute top-16 right-16">
                    <div className="relative">
                      {/* W Shape stars */}
                      <span className="absolute w-2 h-2 rounded-full bg-white top-0 left-0" />
                      <span className="absolute w-2 h-2 rounded-full bg-white top-10 left-6" />
                      <span className="absolute w-1.5 h-1.5 rounded-full bg-white top-4 left-12" />
                      <span className="absolute w-2 h-2 rounded-full bg-white top-12 left-18" />
                      <span className="absolute w-2 h-2 rounded-full bg-white top-2 left-24" />
                    </div>
                  </div>

                </div>

                {/* Telescope Viewfinder Crosshair */}
                <div className="absolute inset-0 pointer-events-none border border-red-500/20 rounded-full flex items-center justify-center">
                  <div className="w-10 h-10 border border-dashed border-red-500/40 rounded-full" />
                  <div className="absolute w-full h-[1px] bg-red-500/20" />
                  <div className="absolute h-full w-[1px] bg-red-500/20" />
                </div>
              </div>

              {/* Angle rotation readout */}
              <div className="mt-4 text-center font-mono">
                <p className="text-xs">RA Angle: <strong className="text-indigo-400">{(skyRotation % 360).toFixed(0)}°</strong></p>
                {foundConstellation ? (
                  <div className="mt-2 space-y-2 animate-fade-in">
                    <p className="text-sm font-bold text-green-400 flex items-center justify-center gap-1">
                      <Sparkles className="w-4 h-4" />
                      Identified: {foundConstellation}!
                    </p>
                    <p className="text-[10px] text-slate-300 max-w-sm mx-auto leading-normal">
                      {foundConstellation === 'Orion' && 'The Hunter. One of the most recognizable constellations, containing bright Betelgeuse (red supergiant) and Rigel (blue supergiant).'}
                      {foundConstellation === 'Ursa Major' && 'The Great Bear. Contains the famous Big Dipper asterism, crucial for locating the North Star Polaris.'}
                      {foundConstellation === 'Cassiopeia' && 'The Queen. A beautiful, prominent circumpolar star grouping forming an easily visible W shape.'}
                    </p>
                    <button
                      id="claim-stargazer-badge-btn"
                      onClick={handleClaimStargazerBadge}
                      disabled={userProfile.unlockedBadges.includes('Stargazing Scout')}
                      className={`px-3 py-1 rounded-full text-[10px] font-semibold border ${
                        userProfile.unlockedBadges.includes('Stargazing Scout')
                          ? 'bg-slate-800 border-slate-700 text-slate-500'
                          : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
                      }`}
                    >
                      {userProfile.unlockedBadges.includes('Stargazing Scout') ? 'Badge Unlocked ✔' : 'Unlock Stargazing Scout Badge (+35 XP)'}
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1">Slowly drag slider below to align optical lenses with celestial targets.</p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Interactive Controls Panel (Right) */}
        <div className="lg:col-span-5 rounded-[2rem] p-6 border border-white/10 bg-zinc-900/40 backdrop-blur-md flex flex-col justify-between text-white shadow-2xl">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FlaskConical className="w-5 h-5 text-zinc-400" />
              <h4 className="font-display font-bold text-base tracking-tight text-white">
                {activeExp === 'lava' && 'Lava Bubble Calibrator'}
                {activeExp === 'volcano' && 'Eruption Reagent Proportions'}
                {activeExp === 'stargazing' && 'Star Alignment Deck'}
              </h4>
            </div>

            {/* LAVA LAMP CONTROLS */}
            {activeExp === 'lava' && (
              <div className="space-y-5">
                <p className="text-xs leading-normal text-zinc-400 font-sans">
                  Lava lamps function by heating water and colorful wax. The wax expands, decreases in density, and floats. As it cools near the cap, it contracts, increases in density, and falls.
                </p>

                {/* Color presets */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-500">Select Thermal Pigment</label>
                  <div className="flex gap-2">
                    {[
                      { code: '#ef4444', label: 'Ruby' },
                      { code: '#f59e0b', label: 'Amber' },
                      { code: '#10b981', label: 'Teal' },
                      { code: '#3b82f6', label: 'Royal' }
                    ].map((c) => (
                      <button
                        key={c.code}
                        onClick={() => setLavaColor(c.code)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          lavaColor === c.code ? 'border-white scale-105' : 'border-white/10'
                        }`}
                        style={{
                          backgroundColor: c.code,
                          color: '#fff',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                        }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Density slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-300">
                    <span>Specific Fluid Density</span>
                    <span className="font-bold">{fluidDensity.toFixed(2)} g/cm³</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="0.95"
                    step="0.05"
                    value={fluidDensity}
                    onChange={(e) => setFluidDensity(parseFloat(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                    <span>Loose Blobs (Fast)</span>
                    <span>Sticky Conglomerate (Slow)</span>
                  </div>
                </div>

                {/* Dropped Tablet stats */}
                <div className="p-3.5 rounded-2xl border border-white/10 bg-white/5 text-[11px] font-mono flex items-center justify-between text-zinc-300">
                  <span>Tablets Dropped:</span>
                  <span className="font-bold text-yellow-500">{tabletDropCount} / 3</span>
                </div>
              </div>
            )}

            {/* VOLCANO CHEMICAL CONTROLS */}
            {activeExp === 'volcano' && (
              <div className="space-y-5">
                <p className="text-xs leading-normal text-zinc-400 font-sans">
                  Acetic Acid (Vinegar) reacts dynamically with Sodium Bicarbonate (Baking Soda) to produce Carbon Dioxide (CO₂) gas, creating expanding bubbly froth!
                </p>

                {/* Sodium carbonate slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-300">
                    <span>Sodium Bicarbonate (Base)</span>
                    <span className="font-bold">{bakingSoda} grams</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={bakingSoda}
                    onChange={(e) => setBakingSoda(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                    <span>5g (Light fizz)</span>
                    <span>30g (Dense pile)</span>
                  </div>
                </div>

                {/* Acetic Acid slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-300">
                    <span>Acetic Acid (Vinegar)</span>
                    <span className="font-bold">{vinegar} ml</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="5"
                    value={vinegar}
                    onChange={(e) => setVinegar(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                    <span>20ml (Minor trickle)</span>
                    <span>100ml (High volume)</span>
                  </div>
                </div>

                {/* Foam visual hue */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-500">Select Color Agent</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'red', label: 'Magma Red', bg: '#ef4444' },
                      { id: 'green', label: 'Bio Green', bg: '#22c55e' },
                      { id: 'purple', label: 'Neon Purple', bg: '#a855f7' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setLavaTone(item.id as any)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          lavaTone === item.id ? 'border-white scale-105' : 'border-white/10'
                        }`}
                        style={{
                          backgroundColor: item.bg,
                          color: '#fff',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STARGAZING TELESCOPE CONTROLS */}
            {activeExp === 'stargazing' && (
              <div className="space-y-5">
                <p className="text-xs leading-normal text-zinc-400 font-sans">
                  Rotate the telescope tracking dials to shift Right Ascension degrees. Settle coordinates carefully to resolve Orion, Ursa Major, and Cassiopeia constellations.
                </p>

                {/* Rotation dial slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-300">
                    <span>RA Coordinate Position</span>
                    <span className="font-bold">{skyRotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={skyRotation}
                    onChange={(e) => setSkyRotation(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                    <span>0° North</span>
                    <span>180° South</span>
                    <span>360° North</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-white/10 bg-white/5 text-xs leading-normal font-mono text-zinc-300">
                  <h5 className="font-bold mb-1 text-yellow-500">Alignment Milestones:</h5>
                  <ul className="space-y-1 text-[11px] list-disc list-inside text-zinc-400">
                    <li>Orion: Align around 60°</li>
                    <li>Ursa Major: Align around 180°</li>
                    <li>Cassiopeia: Align around 300°</li>
                  </ul>
                </div>
              </div>
            )}

          </div>

          {/* Core Trigger CTA & Badge Tracker */}
          <div className="pt-6 border-t border-white/10 mt-6 space-y-4">
            {activeExp === 'lava' && (
              <button
                id="drop-tablet-btn"
                onClick={handleDropTablet}
                disabled={isLavaReacting}
                className={`w-full py-2.5 px-4 rounded-full font-mono font-bold text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                  isLavaReacting 
                    ? 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed'
                    : isTurtle 
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-emerald-500/10' 
                      : 'bg-blue-500 hover:bg-blue-400 text-stone-950 shadow-blue-500/10'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>{isLavaReacting ? 'Dissolving Tablet...' : 'Drop Effervescent Tablet'}</span>
              </button>
            )}

            {activeExp === 'volcano' && (
              <button
                id="erupt-volcano-btn"
                onClick={handleErupt}
                disabled={isErupting}
                className={`w-full py-2.5 px-4 rounded-full font-mono font-bold text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                  isErupting 
                    ? 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed'
                    : isTurtle 
                      ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-500/10' 
                      : 'bg-red-500 hover:bg-red-400 text-stone-950 shadow-red-500/10'
                }`}
              >
                <Flame className="w-4 h-4 animate-bounce" />
                <span>{isErupting ? 'Erupting Lava Foam...' : 'Trigger Eruption'}</span>
              </button>
            )}

            {/* Badges sidebar alert */}
            <div className="p-4 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-3.5 text-zinc-300">
              <div className="p-2 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400">
                <Trophy className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-left">
                <h5 className="font-mono font-bold text-[10px] uppercase tracking-wider text-white">Unlock scientist badges</h5>
                <p className="text-[10px] text-zinc-400 font-sans mt-0.5 leading-relaxed">Complete tasks to earn XP and showcase achievements on your profile page!</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
