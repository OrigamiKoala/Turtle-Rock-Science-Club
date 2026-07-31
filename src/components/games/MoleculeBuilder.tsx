import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, ChevronRight, Trophy, Lightbulb } from 'lucide-react';

/**
 * Molecule Builder
 * ----------------
 * A digital molecular modelling kit. Every atom has a real valence — the number
 * of bonds it must make — and you win only when *every* atom is exactly
 * satisfied and the whole structure hangs together in one piece.
 *
 * That constraint is what makes it a puzzle rather than a colouring exercise:
 * CO₂ cannot be solved with single bonds, N₂ forces a triple bond, and C₂H₄
 * only closes if the two carbons share a double bond.
 */

interface ElementSpec {
  symbol: string;
  name: string;
  valence: number;
  color: string;
  textColor: string;
  radius: number;
}

const ELEMENTS: Record<string, ElementSpec> = {
  H: { symbol: 'H', name: 'Hydrogen', valence: 1, color: '#e5e7eb', textColor: '#111827', radius: 17 },
  C: { symbol: 'C', name: 'Carbon', valence: 4, color: '#374151', textColor: '#ffffff', radius: 25 },
  N: { symbol: 'N', name: 'Nitrogen', valence: 3, color: '#3b82f6', textColor: '#ffffff', radius: 24 },
  O: { symbol: 'O', name: 'Oxygen', valence: 2, color: '#ef4444', textColor: '#ffffff', radius: 23 },
  Cl: { symbol: 'Cl', name: 'Chlorine', valence: 1, color: '#22c55e', textColor: '#052e16', radius: 26 }
};

interface Level {
  formula: string;
  common: string;
  atoms: string[];
  hint: string;
  /** Set when more than one valid structure exists for the same formula. */
  isomerNote?: string;
}

const LEVELS: Level[] = [
  {
    formula: 'H₂O',
    common: 'Water',
    atoms: ['O', 'H', 'H'],
    hint: 'Oxygen needs two bonds; each hydrogen needs exactly one.'
  },
  {
    formula: 'NH₃',
    common: 'Ammonia',
    atoms: ['N', 'H', 'H', 'H'],
    hint: 'Nitrogen wants three bonds — one to each hydrogen.'
  },
  {
    formula: 'CH₄',
    common: 'Methane',
    atoms: ['C', 'H', 'H', 'H', 'H'],
    hint: 'Carbon is the four-armed one. Give every arm a hydrogen.'
  },
  {
    formula: 'O₂',
    common: 'Oxygen gas',
    atoms: ['O', 'O'],
    hint: 'Only two atoms, each needing two bonds. Click the same pair twice to double the bond.'
  },
  {
    formula: 'N₂',
    common: 'Nitrogen gas',
    atoms: ['N', 'N'],
    hint: 'Three bonds each, and nothing else to bond to. Click the pair three times.'
  },
  {
    formula: 'CO₂',
    common: 'Carbon dioxide',
    atoms: ['C', 'O', 'O'],
    hint: 'Single bonds leave carbon starving. Both oxygens need to double up.'
  },
  {
    formula: 'C₂H₄',
    common: 'Ethene',
    atoms: ['C', 'C', 'H', 'H', 'H', 'H'],
    hint: 'Two hydrogens per carbon uses three of carbon’s four arms. The carbons share the rest.'
  },
  {
    formula: 'CH₃Cl',
    common: 'Chloromethane',
    atoms: ['C', 'H', 'H', 'H', 'Cl'],
    hint: 'Chlorine behaves like a heavy hydrogen — one bond only.'
  },
  {
    formula: 'C₂H₆O',
    common: 'Ethanol',
    atoms: ['C', 'C', 'O', 'H', 'H', 'H', 'H', 'H', 'H'],
    hint: 'Chain the two carbons, hang the oxygen off one end, then fill every gap with hydrogen.',
    isomerNote:
      'Two different molecules share this formula — ethanol and dimethyl ether. Both are chemically valid, so either one counts here.'
  }
];

interface Atom {
  id: number;
  element: string;
  x: number;
  y: number;
}

interface Bond {
  a: number;
  b: number;
  order: number;
}

const BOARD_W = 720;
const BOARD_H = 420;
const MAX_BOND_ORDER = 3;

function bondKey(a: number, b: number) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** Lay the starting atoms out on a ring so nothing overlaps at load. */
function initialAtoms(level: Level): Atom[] {
  const count = level.atoms.length;
  const cx = BOARD_W / 2;
  const cy = BOARD_H / 2;
  const radius = Math.min(150, 55 + count * 12);

  return level.atoms.map((element, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return {
      id: i,
      element,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius
    };
  });
}

interface MoleculeBuilderProps {
  onSolve: (levelIndex: number) => void;
}

export default function MoleculeBuilder({ onSolve }: MoleculeBuilderProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [levelIndex, setLevelIndex] = useState(0);
  const [atoms, setAtoms] = useState<Atom[]>(() => initialAtoms(LEVELS[0]));
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [solvedLevels, setSolvedLevels] = useState<boolean[]>(() => LEVELS.map(() => false));
  const [showHint, setShowHint] = useState(false);

  // Distinguishing a click (make a bond) from a drag (move an atom) needs a
  // little movement history, which would be pointless as React state.
  const dragRef = useRef<{ id: number; moved: boolean; dx: number; dy: number } | null>(null);

  const level = LEVELS[levelIndex];

  const reset = useCallback(
    (index: number) => {
      setAtoms(initialAtoms(LEVELS[index]));
      setBonds([]);
      setSelected(null);
      setShowHint(false);
    },
    []
  );

  useEffect(() => {
    reset(levelIndex);
  }, [levelIndex, reset]);

  /** Bonds currently made by each atom, counting a double bond as two. */
  const usedValence = useMemo(() => {
    const used = new Map<number, number>();
    for (const atom of atoms) used.set(atom.id, 0);
    for (const bond of bonds) {
      used.set(bond.a, (used.get(bond.a) ?? 0) + bond.order);
      used.set(bond.b, (used.get(bond.b) ?? 0) + bond.order);
    }
    return used;
  }, [atoms, bonds]);

  const isConnected = useMemo(() => {
    if (atoms.length === 0) return false;
    if (atoms.length === 1) return true;

    const neighbours = new Map<number, number[]>();
    for (const atom of atoms) neighbours.set(atom.id, []);
    for (const bond of bonds) {
      neighbours.get(bond.a)?.push(bond.b);
      neighbours.get(bond.b)?.push(bond.a);
    }

    const seen = new Set<number>([atoms[0].id]);
    const queue = [atoms[0].id];
    while (queue.length) {
      const current = queue.shift() as number;
      for (const next of neighbours.get(current) ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    return seen.size === atoms.length;
  }, [atoms, bonds]);

  const allSatisfied = useMemo(
    () => atoms.every((atom) => (usedValence.get(atom.id) ?? 0) === ELEMENTS[atom.element].valence),
    [atoms, usedValence]
  );

  const solved = allSatisfied && isConnected;

  useEffect(() => {
    if (!solved || solvedLevels[levelIndex]) return;
    setSolvedLevels((prev) => {
      const next = [...prev];
      next[levelIndex] = true;
      return next;
    });
    onSolve(levelIndex);
  }, [solved, solvedLevels, levelIndex, onSolve]);

  // ------------------------------------------------------------------ bonding

  const cycleBond = (a: number, b: number) => {
    const atomA = atoms.find((x) => x.id === a);
    const atomB = atoms.find((x) => x.id === b);
    if (!atomA || !atomB) return;

    const existing = bonds.find((bond) => bondKey(bond.a, bond.b) === bondKey(a, b));
    const currentOrder = existing?.order ?? 0;
    const nextOrder = currentOrder + 1;

    // Removing is always allowed; adding must respect both atoms' free slots.
    if (nextOrder > MAX_BOND_ORDER) {
      setBonds((prev) => prev.filter((bond) => bondKey(bond.a, bond.b) !== bondKey(a, b)));
      return;
    }

    const freeA = ELEMENTS[atomA.element].valence - (usedValence.get(a) ?? 0);
    const freeB = ELEMENTS[atomB.element].valence - (usedValence.get(b) ?? 0);
    if (freeA < 1 || freeB < 1) return;

    setBonds((prev) => {
      if (existing) {
        return prev.map((bond) =>
          bondKey(bond.a, bond.b) === bondKey(a, b) ? { ...bond, order: nextOrder } : bond
        );
      }
      return [...prev, { a, b, order: 1 }];
    });
  };

  const handleAtomPointerDown = (e: React.PointerEvent, atom: Atom) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const point = toBoard(e.clientX, e.clientY);
    dragRef.current = { id: atom.id, moved: false, dx: point.x - atom.x, dy: point.y - atom.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = toBoard(e.clientX, e.clientY);
    const targetX = point.x - drag.dx;
    const targetY = point.y - drag.dy;

    if (!drag.moved) {
      const atom = atoms.find((a) => a.id === drag.id);
      if (atom && Math.hypot(atom.x - targetX, atom.y - targetY) > 4) drag.moved = true;
    }
    if (!drag.moved) return;

    setAtoms((prev) =>
      prev.map((a) =>
        a.id === drag.id
          ? {
              ...a,
              x: clamp(targetX, 30, BOARD_W - 30),
              y: clamp(targetY, 30, BOARD_H - 30)
            }
          : a
      )
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    // A press that never moved is a click: select, or bond to the selection.
    if (!drag.moved) {
      e.stopPropagation();
      if (selected === null) {
        setSelected(drag.id);
      } else if (selected === drag.id) {
        setSelected(null);
      } else {
        cycleBond(selected, drag.id);
        setSelected(null);
      }
    }
  };

  const toBoard = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * BOARD_W,
      y: ((clientY - rect.top) / rect.height) * BOARD_H
    };
  };

  const isLast = levelIndex === LEVELS.length - 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {LEVELS.map((lvl, i) => (
          <button
            key={lvl.formula}
            onClick={() => setLevelIndex(i)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono border transition cursor-pointer flex items-center gap-1.5 ${
              i === levelIndex
                ? 'bg-red-500/20 border-red-500/40 text-red-300'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {solvedLevels[i] && <Trophy className="w-3 h-3 text-amber-400" />}
            {lvl.formula}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-display font-bold text-lg text-white">
          Build {level.formula}{' '}
          <span className="text-zinc-500 font-sans font-normal text-sm">({level.common})</span>
        </h4>
        <button
          onClick={() => setShowHint((s) => !s)}
          className="text-[11px] font-mono text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-1"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          {showHint ? 'Hide hint' : 'Hint'}
        </button>
      </div>

      {showHint && (
        <p className="text-xs text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 font-sans leading-relaxed">
          {level.hint}
          {level.isomerNote && <span className="block mt-1.5 text-amber-200/60">{level.isomerNote}</span>}
        </p>
      )}

      <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d12] relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
          className="w-full block touch-none select-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            dragRef.current = null;
          }}
          onClick={() => setSelected(null)}
        >
          {/* Bonds first so atoms sit on top of the line ends. */}
          {bonds.map((bond) => {
            const a = atoms.find((x) => x.id === bond.a);
            const b = atoms.find((x) => x.id === bond.b);
            if (!a || !b) return null;

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            // Offset parallel lines perpendicular to the bond axis.
            const nx = (-dy / len) * 5;
            const ny = (dx / len) * 5;
            const offsets =
              bond.order === 1 ? [0] : bond.order === 2 ? [-0.5, 0.5] : [-1, 0, 1];

            return (
              <g key={bondKey(bond.a, bond.b)}>
                {offsets.map((offset, i) => (
                  <line
                    key={i}
                    x1={a.x + nx * offset * 2}
                    y1={a.y + ny * offset * 2}
                    x2={b.x + nx * offset * 2}
                    y2={b.y + ny * offset * 2}
                    stroke="#94a3b8"
                    strokeWidth={4}
                    strokeLinecap="round"
                  />
                ))}
              </g>
            );
          })}

          {atoms.map((atom) => {
            const spec = ELEMENTS[atom.element];
            const used = usedValence.get(atom.id) ?? 0;
            const free = spec.valence - used;
            const isSelected = selected === atom.id;

            return (
              <g
                key={atom.id}
                onPointerDown={(e) => handleAtomPointerDown(e, atom)}
                className="cursor-pointer"
              >
                {isSelected && (
                  <circle
                    cx={atom.x}
                    cy={atom.y}
                    r={spec.radius + 8}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={3}
                    strokeDasharray="5 4"
                  />
                )}
                <circle
                  cx={atom.x}
                  cy={atom.y}
                  r={spec.radius}
                  fill={spec.color}
                  stroke={free === 0 ? '#34d399' : '#00000055'}
                  strokeWidth={free === 0 ? 3 : 2}
                />
                <text
                  x={atom.x}
                  y={atom.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={spec.radius * 0.85}
                  fontWeight="700"
                  fill={spec.textColor}
                  style={{ pointerEvents: 'none' }}
                >
                  {spec.symbol}
                </text>
                {/* Remaining free bonds — the core feedback of the puzzle. */}
                <text
                  x={atom.x}
                  y={atom.y + spec.radius + 13}
                  textAnchor="middle"
                  fontSize={11}
                  fontFamily="monospace"
                  fill={free === 0 ? '#34d399' : '#fbbf24'}
                  style={{ pointerEvents: 'none' }}
                >
                  {free === 0 ? '✓' : `${free} free`}
                </text>
              </g>
            );
          })}
        </svg>

        {solved && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-center px-6">
            <Trophy className="w-10 h-10 text-amber-400" />
            <h4 className="font-display font-bold text-xl text-emerald-400">
              {level.formula} complete!
            </h4>
            <p className="text-xs text-zinc-300 font-sans max-w-sm leading-relaxed">
              Every atom has exactly the number of bonds it wants, and the whole molecule is one
              connected piece.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => reset(levelIndex)}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer transition"
              >
                Rebuild
              </button>
              {!isLast && (
                <button
                  onClick={() => setLevelIndex((i) => i + 1)}
                  className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-stone-950 cursor-pointer transition flex items-center gap-1"
                >
                  Next molecule <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-zinc-400">
        <span>Tap two atoms to bond · tap the same pair again for double / triple · drag to move</span>
        <button
          onClick={() => reset(levelIndex)}
          className="flex items-center gap-1.5 hover:text-white cursor-pointer transition"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Clear bonds
        </button>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
