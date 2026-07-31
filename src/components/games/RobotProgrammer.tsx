import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  RotateCcw,
  RotateCw,
  Play,
  Square,
  Trash2,
  Trophy,
  ChevronRight,
  Gem,
  Repeat,
  Lightbulb
} from 'lucide-react';

/**
 * Robot Programmer
 * ----------------
 * You do not drive the robot — you write its program first, then watch it run.
 * There is no undo mid-run, so a mistake means reading the trace and working out
 * *why* it went wrong.
 *
 * The main program is deliberately too short for the later mazes. The only way
 * to finish those is to put a repeating pattern into the F1 subroutine and call
 * it, including calling F1 from inside itself — which is genuine recursion.
 */

type Instruction = 'forward' | 'left' | 'right' | 'collect' | 'f1';

interface Level {
  name: string;
  brief: string;
  grid: string[];
  /** 0 = right, 1 = down, 2 = left, 3 = up. */
  facing: number;
  mainSlots: number;
  f1Slots: number;
  hint: string;
}

/** `#` wall · `.` floor · `*` sample · `R` robot start */
const LEVELS: Level[] = [
  {
    name: 'Hello, Robot',
    brief: 'Drive forward and pick up the sample. Build the program, then press Run.',
    grid: [
      '########',
      '#R...*.#',
      '########'
    ],
    facing: 0,
    mainSlots: 8,
    f1Slots: 0,
    hint: 'Four Forwards to stand on the gem, then one Collect.'
  },
  {
    name: 'Around the Corner',
    brief: 'The robot only moves in the direction it faces. Turn it.',
    grid: [
      '######',
      '#R...#',
      '####.#',
      '####*#',
      '######'
    ],
    facing: 0,
    mainSlots: 10,
    f1Slots: 0,
    hint: 'Forward three times, turn right, forward twice, then Collect.'
  },
  {
    name: 'Two of a Kind',
    brief: 'Two samples now. Collect both — order is up to you.',
    grid: [
      '########',
      '#R.*..*#',
      '########'
    ],
    facing: 0,
    mainSlots: 12,
    f1Slots: 0,
    hint: 'Forward twice, Collect, forward three times, Collect.'
  },
  {
    name: 'Repeat Yourself',
    brief:
      'Only four main slots for a long corridor. Put the repeating pattern in F1 and call it.',
    grid: [
      '##########',
      '#R.*.*.*.#',
      '##########'
    ],
    facing: 0,
    mainSlots: 4,
    f1Slots: 4,
    hint:
      'F1 = Forward, Forward, Collect, F1. A subroutine that calls itself repeats until the run ends.'
  },
  {
    name: 'The Spiral',
    brief: 'Tight main program, a maze with turns. Find the pattern that repeats.',
    grid: [
      '#######',
      '#R...*#',
      '#.###.#',
      '#*...*#',
      '#######'
    ],
    facing: 0,
    mainSlots: 6,
    f1Slots: 6,
    hint:
      'Sweep the top row, turn down the right side, then sweep back along the bottom. Reuse the "forward until you must turn" pattern in F1.'
  }
];

const CELL = 46;
const STEP_MS = 340;
const MAX_TRACE = 300;

const DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: -1 }
];

interface RobotState {
  x: number;
  y: number;
  facing: number;
  collected: string[];
  crashed: boolean;
}

interface TraceEntry {
  program: 'main' | 'f1';
  index: number;
  instruction: Instruction;
}

interface ParsedLevel {
  walls: Set<string>;
  samples: Set<string>;
  start: { x: number; y: number };
  width: number;
  height: number;
}

function cellKey(x: number, y: number) {
  return `${x},${y}`;
}

function parseLevel(level: Level): ParsedLevel {
  const walls = new Set<string>();
  const samples = new Set<string>();
  let start = { x: 0, y: 0 };

  level.grid.forEach((row, y) => {
    row.split('').forEach((char, x) => {
      if (char === '#') walls.add(cellKey(x, y));
      if (char === '*') samples.add(cellKey(x, y));
      if (char === 'R') start = { x, y };
    });
  });

  return {
    walls,
    samples,
    start,
    width: Math.max(...level.grid.map((r) => r.length)),
    height: level.grid.length
  };
}

/**
 * Flattens the main program and its F1 calls into the exact sequence of
 * instructions that will execute, so each animation step can point back at the
 * slot that produced it.
 */
function buildTrace(main: (Instruction | null)[], f1: (Instruction | null)[]): TraceEntry[] {
  const trace: TraceEntry[] = [];

  const run = (program: 'main' | 'f1', slots: (Instruction | null)[], depth: number) => {
    if (depth > 40 || trace.length >= MAX_TRACE) return;

    for (let i = 0; i < slots.length; i++) {
      const instruction = slots[i];
      if (!instruction) continue;
      if (trace.length >= MAX_TRACE) return;

      if (instruction === 'f1') {
        run('f1', f1, depth + 1);
        if (trace.length >= MAX_TRACE) return;
        continue;
      }

      trace.push({ program, index: i, instruction });
    }
  };

  run('main', main, 0);
  return trace;
}

function applyInstruction(
  state: RobotState,
  instruction: Instruction,
  parsed: ParsedLevel
): RobotState {
  if (instruction === 'left') {
    return { ...state, facing: (state.facing + 3) % 4 };
  }
  if (instruction === 'right') {
    return { ...state, facing: (state.facing + 1) % 4 };
  }
  if (instruction === 'collect') {
    const key = cellKey(state.x, state.y);
    if (parsed.samples.has(key) && !state.collected.includes(key)) {
      return { ...state, collected: [...state.collected, key] };
    }
    return state;
  }
  if (instruction === 'forward') {
    const dir = DIRECTIONS[state.facing];
    const nx = state.x + dir.dx;
    const ny = state.y + dir.dy;
    // Walking into a wall stops the run rather than silently doing nothing —
    // a failed program should be visibly wrong.
    if (parsed.walls.has(cellKey(nx, ny)) || nx < 0 || ny < 0) {
      return { ...state, crashed: true };
    }
    return { ...state, x: nx, y: ny };
  }
  return state;
}

const PALETTE: { id: Instruction; label: string; icon: typeof ArrowUp; color: string }[] = [
  { id: 'forward', label: 'Forward', icon: ArrowUp, color: 'bg-sky-500/20 border-sky-500/40 text-sky-300' },
  { id: 'left', label: 'Turn Left', icon: RotateCcw, color: 'bg-violet-500/20 border-violet-500/40 text-violet-300' },
  { id: 'right', label: 'Turn Right', icon: RotateCw, color: 'bg-violet-500/20 border-violet-500/40 text-violet-300' },
  { id: 'collect', label: 'Collect', icon: Gem, color: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' },
  { id: 'f1', label: 'Call F1', icon: Repeat, color: 'bg-amber-500/20 border-amber-500/40 text-amber-300' }
];

interface RobotProgrammerProps {
  onSolve: (levelIndex: number) => void;
}

export default function RobotProgrammer({ onSolve }: RobotProgrammerProps) {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = LEVELS[levelIndex];
  const parsed = useMemo(() => parseLevel(level), [level]);

  const [main, setMain] = useState<(Instruction | null)[]>(() => Array(level.mainSlots).fill(null));
  const [f1, setF1] = useState<(Instruction | null)[]>(() => Array(level.f1Slots).fill(null));
  const [cursor, setCursor] = useState<{ program: 'main' | 'f1'; index: number }>({
    program: 'main',
    index: 0
  });

  const [robot, setRobot] = useState<RobotState>(() => ({
    x: parsed.start.x,
    y: parsed.start.y,
    facing: level.facing,
    collected: [],
    crashed: false
  }));
  const [running, setRunning] = useState(false);
  const [traceIndex, setTraceIndex] = useState(-1);
  const [solvedLevels, setSolvedLevels] = useState<boolean[]>(() => LEVELS.map(() => false));
  const [showHint, setShowHint] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const traceRef = useRef<TraceEntry[]>([]);
  const stateRef = useRef<RobotState>(robot);

  const stopRun = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setRunning(false);
    setTraceIndex(-1);
  }, []);

  const resetLevel = useCallback(() => {
    stopRun();
    const fresh: RobotState = {
      x: parsed.start.x,
      y: parsed.start.y,
      facing: level.facing,
      collected: [],
      crashed: false
    };
    stateRef.current = fresh;
    setRobot(fresh);
    setMessage(null);
  }, [parsed, level, stopRun]);

  // A new level needs empty programs sized to that level's slot counts.
  useEffect(() => {
    stopRun();
    setMain(Array(level.mainSlots).fill(null));
    setF1(Array(level.f1Slots).fill(null));
    setCursor({ program: 'main', index: 0 });
    setShowHint(false);
    setMessage(null);
    const fresh: RobotState = {
      x: parsed.start.x,
      y: parsed.start.y,
      facing: level.facing,
      collected: [],
      crashed: false
    };
    stateRef.current = fresh;
    setRobot(fresh);
  }, [levelIndex, level, parsed, stopRun]);

  useEffect(() => () => stopRun(), [stopRun]);

  const solved =
    robot.collected.length === parsed.samples.size && parsed.samples.size > 0 && !robot.crashed;

  useEffect(() => {
    if (!solved || solvedLevels[levelIndex]) return;
    setSolvedLevels((prev) => {
      const next = [...prev];
      next[levelIndex] = true;
      return next;
    });
    onSolve(levelIndex);
  }, [solved, solvedLevels, levelIndex, onSolve]);

  // ---------------------------------------------------------------- execution

  const runProgram = () => {
    if (running) {
      stopRun();
      return;
    }

    const trace = buildTrace(main, f1);
    if (trace.length === 0) {
      setMessage('The program is empty — add some instructions first.');
      return;
    }

    resetLevel();
    traceRef.current = trace;
    setRunning(true);
    setMessage(null);

    let step = 0;
    const tick = () => {
      if (step >= traceRef.current.length) {
        setRunning(false);
        setTraceIndex(-1);
        const finalState = stateRef.current;
        if (finalState.collected.length < parsed.samples.size && !finalState.crashed) {
          setMessage(
            `Program finished with ${parsed.samples.size - finalState.collected.length} sample(s) still out there.`
          );
        }
        return;
      }

      const entry = traceRef.current[step];
      setTraceIndex(step);

      const next = applyInstruction(stateRef.current, entry.instruction, parsed);
      stateRef.current = next;
      setRobot(next);

      if (next.crashed) {
        setRunning(false);
        setTraceIndex(-1);
        setMessage('The robot drove into a wall. Check the turns in your program.');
        return;
      }

      if (next.collected.length === parsed.samples.size) {
        setRunning(false);
        setTraceIndex(-1);
        return;
      }

      step += 1;
      timerRef.current = window.setTimeout(tick, STEP_MS);
    };

    timerRef.current = window.setTimeout(tick, STEP_MS);
  };

  // ------------------------------------------------------------------ editing

  const placeInstruction = (instruction: Instruction) => {
    if (running) return;
    if (instruction === 'f1' && level.f1Slots === 0) return;

    const target = cursor.program === 'main' ? main : f1;
    const setter = cursor.program === 'main' ? setMain : setF1;
    if (cursor.index >= target.length) return;

    const next = [...target];
    next[cursor.index] = instruction;
    setter(next);

    // Advance to the next slot so you can type a program straight through.
    const nextIndex = cursor.index + 1;
    if (nextIndex < target.length) {
      setCursor({ ...cursor, index: nextIndex });
    } else if (cursor.program === 'main' && level.f1Slots > 0) {
      setCursor({ program: 'f1', index: 0 });
    }
  };

  const clearSlot = (program: 'main' | 'f1', index: number) => {
    if (running) return;
    const target = program === 'main' ? main : f1;
    const setter = program === 'main' ? setMain : setF1;
    const next = [...target];
    next[index] = null;
    setter(next);
    setCursor({ program, index });
  };

  const clearAll = () => {
    if (running) return;
    setMain(Array(level.mainSlots).fill(null));
    setF1(Array(level.f1Slots).fill(null));
    setCursor({ program: 'main', index: 0 });
    resetLevel();
  };

  const renderSlots = (program: 'main' | 'f1', slots: (Instruction | null)[]) => (
    <div className="flex flex-wrap gap-1.5">
      {slots.map((slot, i) => {
        const active = cursor.program === program && cursor.index === i;
        const executing =
          traceIndex >= 0 &&
          traceRef.current[traceIndex]?.program === program &&
          traceRef.current[traceIndex]?.index === i;
        const spec = PALETTE.find((p) => p.id === slot);
        const Icon = spec?.icon;

        return (
          <button
            key={i}
            onClick={() => (slot ? clearSlot(program, i) : setCursor({ program, index: i }))}
            className={`w-10 h-10 rounded-lg border flex items-center justify-center transition cursor-pointer ${
              executing
                ? 'bg-amber-400 border-amber-300 text-stone-950 scale-110'
                : slot && spec
                  ? `${spec.color}`
                  : active
                    ? 'bg-white/10 border-white/40 border-dashed'
                    : 'bg-white/[0.03] border-white/10 border-dashed hover:border-white/30'
            }`}
            title={slot ? `${spec?.label} — click to clear` : 'Empty slot'}
          >
            {Icon ? <Icon className="w-4 h-4" /> : <span className="text-[10px] text-zinc-600">{i + 1}</span>}
          </button>
        );
      })}
    </div>
  );

  const isLast = levelIndex === LEVELS.length - 1;
  const facingRotation = [90, 180, 270, 0][robot.facing];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {LEVELS.map((lvl, i) => (
          <button
            key={lvl.name}
            onClick={() => setLevelIndex(i)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono border transition cursor-pointer flex items-center gap-1.5 ${
              i === levelIndex
                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {solvedLevels[i] && <Trophy className="w-3 h-3 text-amber-400" />}
            {i + 1}. {lvl.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-2xl">{level.brief}</p>
        <button
          onClick={() => setShowHint((s) => !s)}
          className="text-[11px] font-mono text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-1 shrink-0"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          {showHint ? 'Hide hint' : 'Hint'}
        </button>
      </div>

      {showHint && (
        <p className="text-xs text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 font-sans leading-relaxed">
          {level.hint}
        </p>
      )}

      <div className="grid lg:grid-cols-[auto_1fr] gap-5 items-start">
        {/* Maze */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d12] p-3 relative overflow-x-auto">
          <div
            className="relative"
            style={{ width: parsed.width * CELL, height: parsed.height * CELL }}
          >
            {level.grid.map((row, y) =>
              row.split('').map((char, x) => {
                const isWall = char === '#';
                return (
                  <div
                    key={`${x}-${y}`}
                    className={`absolute rounded-md ${
                      isWall ? 'bg-zinc-800/70' : 'bg-white/[0.04] border border-white/5'
                    }`}
                    style={{
                      left: x * CELL + 2,
                      top: y * CELL + 2,
                      width: CELL - 4,
                      height: CELL - 4
                    }}
                  />
                );
              })
            )}

            {[...parsed.samples].map((key) => {
              const [sx, sy] = key.split(',').map(Number);
              const taken = robot.collected.includes(key);
              return (
                <div
                  key={key}
                  className="absolute flex items-center justify-center transition-all duration-300"
                  style={{
                    left: sx * CELL,
                    top: sy * CELL,
                    width: CELL,
                    height: CELL,
                    opacity: taken ? 0.15 : 1,
                    transform: taken ? 'scale(0.5)' : 'scale(1)'
                  }}
                >
                  <Gem className="w-5 h-5 text-emerald-400" />
                </div>
              );
            })}

            <div
              className="absolute flex items-center justify-center transition-all duration-300 ease-out"
              style={{
                left: robot.x * CELL,
                top: robot.y * CELL,
                width: CELL,
                height: CELL
              }}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 ${
                  robot.crashed ? 'bg-red-500' : 'bg-sky-400'
                }`}
                style={{ transform: `rotate(${facingRotation}deg)` }}
              >
                <ArrowUp className="w-4 h-4 text-stone-950" strokeWidth={3} />
              </div>
            </div>
          </div>

          {solved && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 text-center px-6">
              <Trophy className="w-9 h-9 text-amber-400" />
              <h4 className="font-display font-bold text-lg text-emerald-400">All samples collected!</h4>
              {!isLast && (
                <button
                  onClick={() => setLevelIndex((i) => i + 1)}
                  className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-stone-950 cursor-pointer transition flex items-center gap-1"
                >
                  Next maze <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Program editor */}
        <div className="space-y-4 min-w-0">
          <div className="space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              Instructions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PALETTE.filter((p) => p.id !== 'f1' || level.f1Slots > 0).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => placeInstruction(item.id)}
                    disabled={running}
                    className={`px-3 py-2 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-125 ${item.color}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              Main program
            </p>
            {renderSlots('main', main)}
          </div>

          {level.f1Slots > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-widest text-amber-500/80">
                F1 subroutine
              </p>
              {renderSlots('f1', f1)}
            </div>
          )}

          {message && (
            <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 font-sans">
              {message}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={runProgram}
              className={`px-5 py-2 rounded-full text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
                running
                  ? 'bg-red-500 hover:bg-red-400 text-stone-950'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
              }`}
            >
              {running ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {running ? 'Stop' : 'Run'}
            </button>
            <button
              onClick={resetLevel}
              disabled={running}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer transition flex items-center gap-1.5 disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset robot
            </button>
            <button
              onClick={clearAll}
              disabled={running}
              className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-400 cursor-pointer transition flex items-center gap-1.5 disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear program
            </button>
          </div>

          <p className="text-[11px] font-mono text-zinc-500">
            Samples: {robot.collected.length} / {parsed.samples.size}
          </p>
        </div>
      </div>
    </div>
  );
}
