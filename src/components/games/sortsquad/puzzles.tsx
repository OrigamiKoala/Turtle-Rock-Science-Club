/**
 * The seven kinds of Robot Puzzle, one panel each. A panel owns everything about its
 * own question (the round, the guesses, the outcome) and reports just one thing
 * upward: `onSolve(index)`. Which level you are on, and whether it has been solved
 * before, belongs to the shell — it re-mounts a panel (via `key`) on a level change.
 *
 * Commentary follows the site's live-note rule: nothing explains the answer until the
 * player has committed to one. Hints are the exception, and live behind the Hint link.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, FastForward, Play, RotateCcw, Shuffle, StepForward, Undo2 } from 'lucide-react';
import BarStage from './BarStage';
import PlaybackControls from './PlaybackControls';
import { defaultStepTime, usePlayback } from './usePlayback';
import type { StageApi } from './stage';
import {
  ALG, ALGO_CLUE, ALGO_NAME, PAR_SLACK, PASS_RULE, buildSteps, countSteps, evaluateRace, flipPrefix, isSorted,
  makeAfterPassRound, makeCountRound, makeFlipRound, makeIdentifyRound, makeRaceList, makeSwapRound, makeWorstRound,
  passEnd, starsForMoves, whyNot, worstInfo
} from './logic';
import type {
  AfterPassPuzzle, AlgId, CountPuzzle, FlipPuzzle, IdentifyPuzzle, IdentifyRound, RaceOutcome, RacePuzzle, Step,
  SwapAnyPuzzle, WorstPuzzle
} from './logic';
import {
  BTN_PRIMARY, BTN_SECONDARY, BTN_TERTIARY, Banner, HintRow, LABEL, MiniBars, READOUT, RobotChip, STAGE_CARD
} from './ui';
import type { Keyed } from './ui';

export interface PanelProps<P> extends Keyed {
  puzzle: P;
  index: number;
  isLast: boolean;
  /** The player solved this level. Called once per solve; the shell dedupes XP. */
  onSolve: (levelIndex: number) => void;
  onNext: () => void;
}

type Phase = 'play' | 'won' | 'lost';
const LETTERS = ['A', 'B', 'C', 'D'];

function NextButton({ isLast, onNext }: { isLast: boolean; onNext: () => void }) {
  if (isLast) return null;
  return (
    <button type="button" onClick={onNext} className={BTN_PRIMARY}>
      Next puzzle <ChevronRight className="w-3.5 h-3.5" />
    </button>
  );
}

/* ====================================================================== */
/* Who's That Robot?                                                        */
/* ====================================================================== */

/** What the player is allowed to see: never the robot's name, or wording that gives it away. */
const neutralStatus = (s: Step | null): string =>
  !s ? 'Watch closely…' : s.type === 0 ? `Is ${s.a} bigger than ${s.b}?` : s.type === 1 ? 'Swap!' : `Places a ${s.a} into slot ${s.i + 1}`;

const stepWord = (s: Step): string =>
  s.type === 0 ? `look ${s.i + 1}·${s.j + 1}` : s.type === 1 ? `swap ${s.i + 1}·${s.j + 1}` : `place → ${s.i + 1}`;

/**
 * A robot's opening moves are its fingerprint — they are exactly where the evidence
 * is — so they stay on screen, with the latest few beside them once the run is long.
 */
function tapeLines(steps: readonly Step[], upTo: number): string[] {
  if (upTo === 0) return ['Its first few moves will show up here.'];
  const lines = [`Opening moves: ${steps.slice(0, Math.min(6, upTo)).map(stepWord).join('  ›  ')}`];
  if (upTo > 6) lines.push(`Latest: ${steps.slice(Math.max(6, upTo - 5), upTo).map(stepWord).join('  ›  ')}`);
  return lines;
}

export function IdentifyPanel({ puzzle, index, isLast, onSolve, onNext }: PanelProps<IdentifyPuzzle>) {
  const stageRef = useRef<StageApi | null>(null);
  const pb = usePlayback(stageRef);
  const [round, setRound] = useState<IdentifyRound>(() => makeIdentifyRound(puzzle, Math.random));
  const [seen, setSeen] = useState(0);
  const [wrong, setWrong] = useState<AlgId[]>([]);
  const [msg, setMsg] = useState('');
  const [phase, setPhase] = useState<Phase>('play');
  const [stars, setStars] = useState(0);
  const pool = useMemo(() => puzzle.pool.slice().sort((a, b) => a - b), [puzzle]);

  useEffect(() => {
    pb.load(round.start, round.steps, { autoplay: true, stepTime: Math.max(0.12, defaultStepTime(puzzle.n) * 0.6) });
    setSeen(0);
    // a new round is the only thing that should restart the run
  }, [round]);
  useEffect(() => { setSeen((s) => Math.max(s, pb.idx)); }, [pb.idx]);

  const watched = Math.max(seen, pb.idx);
  const newRound = () => {
    setRound(makeIdentifyRound(puzzle, Math.random));
    setWrong([]); setMsg(''); setPhase('play'); setStars(0);
  };

  const guess = (a: AlgId) => {
    if (a === round.alg) {
      const frac = watched / round.steps.length;
      setStars(Math.max(1, 3 - wrong.length - (frac > 0.6 ? 1 : 0)));
      pb.finish();
      setPhase('won');
      onSolve(index);
      return;
    }
    const w = [...wrong, a];
    setWrong(w);
    setMsg(whyNot(a, round.steps.slice(0, watched), round.start)
      ?? `Nothing you've seen rules ${ALGO_NAME[a]} out yet, but it isn't that one. Watch for what tells them apart.`);
    if (w.length >= 2) { pb.finish(); setPhase('lost'); }
  };

  return (
    <div className="space-y-4">
      <HintRow brief={puzzle.brief} hint={puzzle.hint} />

      <BarStage values={round.start} stageRef={stageRef} label="A hidden robot sorting a row of bars" />

      <div className="space-y-1.5">
        <p className="text-xs font-mono text-zinc-200" aria-live="off">{neutralStatus(pb.current)}</p>
        <p className={READOUT}>
          Looks {pb.looks} · Swaps {pb.swaps} · Placements {pb.writes} · Tries left {2 - wrong.length}
        </p>
        {tapeLines(round.steps, pb.idx).map((line) => <p key={line} className={READOUT}>{line}</p>)}
      </div>

      {phase === 'play' && (
        <>
          <PlaybackControls pb={pb} />
          <div className="space-y-2">
            <p className={LABEL}>Which robot is it?</p>
            <div className="flex flex-wrap gap-1.5">
              {pool.map((a) => (
                <RobotChip key={a} alg={a} onClick={() => guess(a)} ruledOut={wrong.includes(a)}
                  disabled={wrong.includes(a) || watched < 1} />
              ))}
            </div>
          </div>
          {msg && <p className="text-xs text-red-300 font-sans leading-relaxed">{msg}</p>}
        </>
      )}

      {phase === 'won' && (
        <Banner tone="good" title={`It's ${ALGO_NAME[round.alg]}!`} stars={stars}
          actions={<><NextButton isLast={isLast} onNext={onNext} /><button type="button" onClick={newRound} className={BTN_SECONDARY}><Shuffle className="w-3.5 h-3.5" /> Another robot</button></>}>
          <p>{ALGO_CLUE[round.alg]}</p>
        </Banner>
      )}
      {phase === 'lost' && (
        <Banner tone="bad" title={`Out of tries. It was ${ALGO_NAME[round.alg]}.`}
          actions={<button type="button" onClick={newRound} className={BTN_PRIMARY}><RotateCcw className="w-3.5 h-3.5" /> Try again</button>}>
          <p>{ALGO_CLUE[round.alg]}</p>
        </Banner>
      )}
    </div>
  );
}

/* ====================================================================== */
/* Which Robot Wins?                                                        */
/* ====================================================================== */

export function RacePanel({ puzzle, index, isLast, onSolve, onNext }: PanelProps<RacePuzzle>) {
  const [list, setList] = useState(() => makeRaceList(puzzle, Math.random));
  const [sel, setSel] = useState<AlgId | 0>(0);
  const [outcome, setOutcome] = useState<RaceOutcome | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    if (!outcome) return;
    const t = setTimeout(() => setGrown(true), 40);      // let the bars start at 0, then grow
    return () => clearTimeout(t);
  }, [outcome]);

  const correct = outcome !== null && sel === outcome.winner;
  const stars = attempts <= 1 ? 3 : attempts === 2 ? 2 : 1;

  const race = () => {
    if (!sel) return;
    const o = evaluateRace(puzzle, list);
    setGrown(false);
    setOutcome(o);
    setAttempts((a) => a + 1);
    if (sel === o.winner) onSolve(index);
  };
  const again = () => {
    setList(makeRaceList(puzzle, Math.random));
    setOutcome(null); setSel(0); setGrown(false);
  };

  const maxTotal = outcome ? Math.max(...outcome.results.map((r) => r.total)) : 1;

  return (
    <div className="space-y-4">
      <HintRow brief={puzzle.brief} hint={puzzle.hint} />

      <BarStage values={list} label="The list the robots will sort" />

      <p className={READOUT}>One step = one look, one swap, or one placement.</p>

      {!outcome && (
        <div className="space-y-2">
          <p className={LABEL}>Which robot finishes with the fewest steps?</p>
          <div className="flex flex-wrap gap-1.5">
            {puzzle.candidates.map((a) => (
              <RobotChip key={a} alg={a} selected={sel === a} onClick={() => setSel(a)} />
            ))}
          </div>
          <div className="pt-1">
            <button type="button" onClick={race} disabled={!sel} className={BTN_PRIMARY}>
              <Play className="w-3.5 h-3.5" /> {sel ? `Race them! (${ALGO_NAME[sel]})` : 'Pick a robot first'}
            </button>
          </div>
        </div>
      )}

      {outcome && (
        <>
          <div className={`${STAGE_CARD} space-y-3`}>
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400/80" /> Looks</span>
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400/80" /> Swaps and placements</span>
            </div>
            {outcome.results.map((r) => {
              const win = r.alg === outcome.winner;
              return (
                <div key={r.alg} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${win && grown ? 'ring-1 ring-amber-400/50 bg-amber-400/5' : ''}`}>
                  <div className="w-24 shrink-0"><RobotChip alg={r.alg} /></div>
                  <div className="flex-1 h-6 rounded-md bg-white/5 overflow-hidden flex">
                    <div className="h-full bg-amber-400/80 transition-[width] duration-1000 ease-out" style={{ width: grown ? `${(r.looks / maxTotal) * 100}%` : '0%' }} />
                    <div className="h-full bg-emerald-400/80 transition-[width] duration-1000 ease-out" style={{ width: grown ? `${(r.moves / maxTotal) * 100}%` : '0%' }} />
                  </div>
                  <div className="w-32 shrink-0 text-right text-[11px] font-mono text-zinc-300">
                    {r.total} steps{grown && win ? ' ★' : ''}{grown && r.alg === sel ? ' (you)' : ''}
                  </div>
                </div>
              );
            })}
          </div>

          {grown && (
            correct ? (
              <Banner tone="good" title={`Right! ${ALGO_NAME[outcome.winner]} needed the fewest steps.`} stars={stars}
                actions={<><NextButton isLast={isLast} onNext={onNext} /><button type="button" onClick={again} className={BTN_SECONDARY}><Shuffle className="w-3.5 h-3.5" /> Another list</button></>}>
                <p>{puzzle.lesson}</p>
              </Banner>
            ) : (
              <Banner tone="bad" title={`Not quite. ${ALGO_NAME[outcome.winner]} did it in ${outcome.results.find((r) => r.alg === outcome.winner)!.total} steps.`}
                actions={<button type="button" onClick={again} className={BTN_PRIMARY}><RotateCcw className="w-3.5 h-3.5" /> Try again</button>}>
                <p>{puzzle.lesson}</p>
              </Banner>
            )
          )}
        </>
      )}
    </div>
  );
}

/* ====================================================================== */
/* After One Pass                                                           */
/* ====================================================================== */

export function AfterPassPanel({ puzzle, index, isLast, onSolve, onNext }: PanelProps<AfterPassPuzzle>) {
  const stageRef = useRef<StageApi | null>(null);
  const pb = usePlayback(stageRef);
  const [round, setRound] = useState(() => makeAfterPassRound(puzzle, Math.random));
  const [wrong, setWrong] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('play');
  const [msg, setMsg] = useState('');
  const steps = useMemo(() => buildSteps(round.alg, round.start), [round]);
  const end = useMemo(() => passEnd(round.alg, round.start, steps), [round, steps]);
  const answered = phase !== 'play';

  const pick = (i: number) => {
    if (answered || wrong.includes(i)) return;
    if (i === round.answer) { setPhase('won'); onSolve(index); return; }
    const w = [...wrong, i];
    setWrong(w);
    if (w.length >= 2) { setPhase('lost'); setMsg(`That was ${round.options[i].why}.`); }
    else setMsg(`Not that one: it's ${round.options[i].why}. Have another go.`);
  };
  const again = () => {
    setRound(makeAfterPassRound(puzzle, Math.random));
    setWrong([]); setPhase('play'); setMsg('');
  };
  const watchPass = () => pb.load(round.start, steps.slice(0, end), { autoplay: true, stepTime: Math.max(0.15, defaultStepTime(puzzle.n)) });

  const optionClass = (i: number) => {
    const base = 'rounded-xl border p-2.5 flex flex-col items-stretch gap-1.5 text-left transition';
    if (answered && i === round.answer) return `${base} border-emerald-500/50 bg-emerald-500/10`;
    if (wrong.includes(i)) return `${base} border-red-500/40 bg-red-500/10 opacity-70`;
    if (answered) return `${base} border-white/10 bg-white/5 opacity-60`;
    return `${base} border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 cursor-pointer`;
  };

  return (
    <div className="space-y-4">
      <HintRow brief={puzzle.brief} hint={puzzle.hint} />

      <div className="flex flex-wrap items-center gap-2">
        <RobotChip alg={round.alg} />
        <p className="text-xs text-sky-200/80 bg-sky-500/10 border border-sky-500/20 rounded-xl px-4 py-2.5 font-sans leading-relaxed flex-1 min-w-[16rem]">
          {PASS_RULE[round.alg]}
        </p>
      </div>

      <div className="space-y-2">
        <p className={LABEL}>The starting list</p>
        <BarStage values={round.start} binary={round.alg === ALG.RADIX} stageRef={stageRef}
          label="The starting list, before the robot's pass" />
      </div>

      <div className="space-y-2">
        <p className={LABEL}>Which picture shows the list right after the pass?</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {round.options.map((o, i) => (
            <button key={i} type="button" onClick={() => pick(i)} disabled={answered || wrong.includes(i)} className={optionClass(i)}>
              <MiniBars values={o.values} className="w-full h-14" />
              <span className="text-[10px] font-mono text-zinc-400">{LETTERS[i]}</span>
              {(answered || wrong.includes(i)) && <span className="text-[10px] text-zinc-400 font-sans leading-snug">{o.why}</span>}
            </button>
          ))}
        </div>
      </div>

      {phase === 'play' && msg && <p className="text-xs text-red-300 font-sans leading-relaxed">{msg}</p>}

      {phase === 'won' && (
        <Banner tone="good" title={`Right! That's ${ALGO_NAME[round.alg]}'s first pass.`} stars={wrong.length === 0 ? 3 : 2}
          actions={<><NextButton isLast={isLast} onNext={onNext} />
            <button type="button" onClick={watchPass} className={BTN_SECONDARY}><Play className="w-3.5 h-3.5" /> Watch the pass</button>
            <button type="button" onClick={again} className={BTN_TERTIARY}><Shuffle className="w-3.5 h-3.5" /> Another list</button></>}>
          <p>Each picture above says what it really is. Press Watch the pass to see the robot do it.</p>
        </Banner>
      )}
      {phase === 'lost' && (
        <Banner tone="bad" title="Not this time. The right one is highlighted."
          actions={<><button type="button" onClick={again} className={BTN_PRIMARY}><RotateCcw className="w-3.5 h-3.5" /> Try again</button>
            <button type="button" onClick={watchPass} className={BTN_SECONDARY}><Play className="w-3.5 h-3.5" /> Watch the pass</button></>}>
          <p>{msg} Press Watch the pass to see what the robot really does.</p>
        </Banner>
      )}
    </div>
  );
}

/* ====================================================================== */
/* Count the Swaps                                                          */
/* ====================================================================== */

export function CountPanel({ puzzle, index, isLast, onSolve, onNext }: PanelProps<CountPuzzle>) {
  const stageRef = useRef<StageApi | null>(null);
  const pb = usePlayback(stageRef);
  const [round, setRound] = useState(() => makeCountRound(puzzle, Math.random));
  const [value, setValue] = useState('');
  const [tries, setTries] = useState(2);
  const [phase, setPhase] = useState<Phase>('play');
  const [msg, setMsg] = useState('');
  const steps = useMemo(() => buildSteps(round.alg, round.start), [round]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phase !== 'play') return;
    const guess = Number.parseInt(value, 10);
    if (Number.isNaN(guess) || guess < 0) { setMsg('Type a whole number of swaps.'); return; }
    if (guess === round.answer) { setPhase('won'); setMsg(''); onSolve(index); return; }
    const left = tries - 1;
    setTries(left);
    if (left <= 0) { setPhase('lost'); setMsg(''); return; }
    setMsg(guess > round.answer ? 'Too many. Fewer pairs are the wrong way round than that.' : 'Too few. More pairs are the wrong way round than that.');
  };
  const again = () => {
    setRound(makeCountRound(puzzle, Math.random));
    setValue(''); setTries(2); setPhase('play'); setMsg('');
  };
  const watch = () => pb.load(round.start, steps, { autoplay: true, stepTime: 0.12 });

  return (
    <div className="space-y-4">
      <HintRow brief={puzzle.brief} hint={puzzle.hint} />

      <div className="flex flex-wrap items-center gap-2">
        <RobotChip alg={round.alg} />
        <span className="text-xs text-zinc-400 font-sans">will sort this list.</span>
      </div>

      <BarStage values={round.start} stageRef={stageRef} label="The list the robot will sort" />

      {phase === 'play' && (
        <form onSubmit={submit} className="space-y-2">
          <label htmlFor="sort-count-guess" className={LABEL}>How many swaps will it make?</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="sort-count-guess"
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
              className="w-24 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm font-mono text-white placeholder:text-zinc-600"
            />
            <button type="submit" disabled={value === ''} className={BTN_PRIMARY}>Check</button>
            <span className={READOUT}>Tries left {tries}</span>
          </div>
          {msg && <p className="text-xs text-red-300 font-sans leading-relaxed">{msg}</p>}
        </form>
      )}

      {phase !== 'play' && (
        <Banner
          tone={phase === 'won' ? 'good' : 'bad'}
          title={phase === 'won' ? `Yes, ${round.answer} swaps!` : `Out of tries. It makes ${round.answer} swaps.`}
          stars={phase === 'won' ? (tries === 2 ? 3 : 2) : undefined}
          actions={<>
            {phase === 'won' ? <NextButton isLast={isLast} onNext={onNext} /> : null}
            <button type="button" onClick={watch} className={BTN_SECONDARY}><Play className="w-3.5 h-3.5" /> Watch it run</button>
            <button type="button" onClick={again} className={phase === 'won' ? BTN_TERTIARY : BTN_PRIMARY}><Shuffle className="w-3.5 h-3.5" /> {phase === 'won' ? 'Another list' : 'Try again'}</button>
          </>}
        >
          <p>
            These {round.pairs.length} pairs have the taller bar on the left:{' '}
            <span className="font-mono text-zinc-200">{round.pairs.map(([a, b]) => `${a}>${b}`).join('  ')}</span>.
          </p>
          <p>Each swap fixes exactly one wrong-way pair, so {ALGO_NAME[round.alg]} makes exactly as many swaps as there are pairs.</p>
          {pb.total > 0 && <p className={READOUT}>Swaps so far: {pb.swaps}</p>}
        </Banner>
      )}
    </div>
  );
}

/* ====================================================================== */
/* Flip Flop and Swap Any Two: sort it yourself, in as few moves as you can  */
/* ====================================================================== */

export function MovesPanel({ puzzle, index, isLast, onSolve, onNext }: PanelProps<FlipPuzzle | SwapAnyPuzzle>) {
  const isFlip = puzzle.kind === 'flip';
  const noun = isFlip ? 'flip' : 'swap';
  const make = () => (isFlip ? makeFlipRound(puzzle as FlipPuzzle, Math.random) : makeSwapRound(puzzle as SwapAnyPuzzle, Math.random));
  const [round, setRound] = useState(make);
  const [values, setValues] = useState<number[]>(round.start);
  const [history, setHistory] = useState<number[][]>([]);
  const [picked, setPicked] = useState(-1);
  const [hover, setHover] = useState(-1);
  const [result, setResult] = useState<{ moves: number; ok: boolean } | null>(null);
  const sorted = isSorted(values);
  const moves = history.length;

  const play = (next: number[]) => {
    const m = moves + 1;
    setHistory([...history, values]);
    setValues(next);
    setPicked(-1);
    if (isSorted(next)) {
      const ok = m <= round.par + PAR_SLACK;
      setResult({ moves: m, ok });
      if (ok) onSolve(index);
    }
  };
  const onSlot = (s: number) => {
    if (sorted) return;
    if (isFlip) { if (s >= 1) play(flipPrefix(values, s + 1)); return; }
    if (picked < 0) { setPicked(s); return; }
    if (picked === s) { setPicked(-1); return; }
    const next = values.slice(); [next[picked], next[s]] = [next[s], next[picked]];
    play(next);
  };
  const undo = () => {
    if (!history.length) return;
    setValues(history[history.length - 1]);
    setHistory(history.slice(0, -1));
    setPicked(-1); setResult(null);
  };
  const reset = () => { setValues(round.start); setHistory([]); setPicked(-1); setResult(null); };
  const newList = () => {
    const r = make();
    setRound(r); setValues(r.start); setHistory([]); setPicked(-1); setResult(null);
  };

  return (
    <div className="space-y-4">
      <HintRow brief={puzzle.brief} hint={puzzle.hint} />

      <BarStage
        values={values}
        change="arrange"
        lift={isFlip ? -1 : picked}
        range={isFlip && !sorted ? hover : -1}
        onSlot={onSlot}
        onHover={isFlip ? (s) => setHover(s >= 1 ? s : -1) : undefined}
        label={isFlip ? 'Bars to sort by flipping. Choose a bar to flip it and every bar to its left.' : 'Bars to sort by swapping. Choose two bars to swap them.'}
      />

      <p className={READOUT}>
        {isFlip ? 'Flips' : 'Swaps'} {moves} · Par {round.par} (the fewest possible)
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={undo} disabled={!history.length} className={BTN_SECONDARY}><Undo2 className="w-3.5 h-3.5" /> Undo</button>
        <button type="button" onClick={reset} disabled={!history.length} className={BTN_TERTIARY}><RotateCcw className="w-3.5 h-3.5" /> Reset</button>
        <button type="button" onClick={newList} className={BTN_TERTIARY}><Shuffle className="w-3.5 h-3.5" /> New list</button>
      </div>

      {result && result.ok && (
        <Banner tone="good" title={`Sorted in ${result.moves} ${noun}${result.moves === 1 ? '' : 's'}!`} stars={starsForMoves(result.moves, round.par)}
          actions={<><NextButton isLast={isLast} onNext={onNext} /><button type="button" onClick={newList} className={BTN_SECONDARY}><Shuffle className="w-3.5 h-3.5" /> Another list</button></>}>
          <p>
            {isFlip
              ? `Par for this list is ${round.par}: nobody can do it in fewer flips. The trick is to fix the tallest bar first, then forget it and work on what is left.`
              : `Par for this list is ${round.par}. The fewest swaps is the number of bars minus the number of loops of bars that belong in each other's places: a loop of k bars needs only k − 1 swaps.`}
          </p>
        </Banner>
      )}
      {result && !result.ok && (
        <Banner tone="info" title={`Sorted, but it took ${result.moves} ${noun}s and par is ${round.par}.`}
          actions={<><button type="button" onClick={undo} className={BTN_SECONDARY}><Undo2 className="w-3.5 h-3.5" /> Undo</button><button type="button" onClick={reset} className={BTN_PRIMARY}><RotateCcw className="w-3.5 h-3.5" /> Reset and try again</button></>}>
          <p>Get it in {round.par + PAR_SLACK} or fewer to earn the trophy.</p>
        </Banner>
      )}
    </div>
  );
}

/* ====================================================================== */
/* Worst Day                                                                */
/* ====================================================================== */

const WORST_LESSON: Partial<Record<AlgId, string>> = {
  [ALG.BUBBLE]: 'A backwards list has every pair the wrong way round, so Bubble Sort has to make the most swaps it ever can: one for every pair.',
  [ALG.INSERTION]: 'A backwards list makes every bar slide all the way back past every bar before it, so Insertion Sort does the most work it ever can.',
  [ALG.QUICK]: 'Quick Sort pivots on the last bar. With the smallest bar last and the rest in order, the pivot never splits the list in two, so every pass does almost nothing and the robot has to start over again and again.'
};

export function WorstPanel({ puzzle, index, isLast, onSolve, onNext }: PanelProps<WorstPuzzle>) {
  const stageRef = useRef<StageApi | null>(null);
  const pb = usePlayback(stageRef);
  const [round, setRound] = useState(() => makeWorstRound(puzzle, Math.random));
  const [values, setValues] = useState<number[]>(round.start);
  const [picked, setPicked] = useState(-1);
  const [mode, setMode] = useState<'arrange' | 'running' | 'result'>('arrange');
  const [lastRun, setLastRun] = useState<{ total: number; looks: number; moves: number } | null>(null);
  const [best, setBest] = useState(0);
  const [won, setWon] = useState(false);
  const [runs, setRuns] = useState(0);

  const info = useMemo(() => worstInfo(round.alg, puzzle.n), [round.alg, puzzle.n]);
  const reachedMax = lastRun !== null && lastRun.total === round.max;
  const lastHit = lastRun !== null && lastRun.total >= round.goal;   // `won` is sticky (it gates XP); this run may still fall short

  const onSlot = (s: number) => {
    if (mode !== 'arrange') return;
    if (picked < 0) { setPicked(s); return; }
    if (picked === s) { setPicked(-1); return; }
    const next = values.slice(); [next[picked], next[s]] = [next[s], next[picked]];
    setValues(next); setPicked(-1);
  };

  const run = () => {
    const steps = buildSteps(round.alg, values);
    const c = countSteps(steps);
    setLastRun({ total: c.total, looks: c.looks, moves: c.moves });
    setBest((b) => Math.max(b, c.total));
    setRuns((n) => n + 1);
    setPicked(-1);
    setMode('running');
    pb.load(values, steps, { autoplay: true, stepTime: 0.06 });
  };

  useEffect(() => {
    if (mode !== 'running' || !pb.done || !lastRun) return;
    setMode('result');
    if (lastRun.total >= round.goal && !won) { setWon(true); onSolve(index); }
    // finishing a run is the only trigger
  }, [mode, pb.done]);

  const rearrange = () => { stageRef.current?.set(values); setMode('arrange'); };
  const newRound = () => {
    const r = makeWorstRound(puzzle, Math.random);
    setRound(r); setValues(r.start); setPicked(-1); setMode('arrange');
    setLastRun(null); setBest(0); setWon(false); setRuns(0);
    stageRef.current?.set(r.start);
  };

  return (
    <div className="space-y-4">
      <HintRow brief={puzzle.brief} hint={puzzle.hint} />

      <div className="flex flex-wrap items-center gap-2">
        <RobotChip alg={round.alg} />
        <span className="text-xs text-zinc-400 font-sans">
          Click two bars to swap them, as many times as you like. Then run the robot on your list.
        </span>
      </div>

      <BarStage
        values={values}
        change="arrange"
        lift={picked}
        onSlot={mode === 'arrange' ? onSlot : undefined}
        stageRef={stageRef}
        label="Bars to arrange into the worst possible list for the robot"
      />

      <p className={READOUT}>
        Goal: at least {round.goal} steps · Best so far {best || '–'} · Steps = looks + swaps + placements
      </p>

      {mode === 'arrange' && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={run} className={BTN_PRIMARY}><Play className="w-3.5 h-3.5" /> Run {ALGO_NAME[round.alg]}</button>
          <button type="button" onClick={() => { setValues(round.start); setPicked(-1); }} className={BTN_TERTIARY}><RotateCcw className="w-3.5 h-3.5" /> Start list</button>
        </div>
      )}
      {mode === 'running' && (
        <div className="space-y-2">
          <p className="text-xs font-mono text-zinc-300">
            Looks {pb.looks} · Moves {pb.swaps + pb.writes} · Steps so far {pb.looks + pb.swaps + pb.writes}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={pb.faster} className={BTN_TERTIARY}><FastForward className="w-3.5 h-3.5" /> Faster</button>
            <button type="button" onClick={pb.finish} className={BTN_SECONDARY}><StepForward className="w-3.5 h-3.5" /> Skip to the result</button>
          </div>
        </div>
      )}

      {mode === 'result' && lastRun && !lastHit && (
        <Banner tone="info" title={`That cost ${lastRun.total} steps (${lastRun.looks} looks, ${lastRun.moves} moves). You need ${round.goal}.`}
          actions={<button type="button" onClick={rearrange} className={BTN_PRIMARY}><Undo2 className="w-3.5 h-3.5" /> Rearrange and run again</button>}>
          {runs >= 1 && puzzle.algHints[round.alg] && <p>{puzzle.algHints[round.alg]}</p>}
        </Banner>
      )}
      {mode === 'result' && lastRun && lastHit && (
        <Banner tone="good" title={`${lastRun.total} steps. Goal reached!`} stars={reachedMax ? 3 : 2}
          actions={<><NextButton isLast={isLast} onNext={onNext} />
            <button type="button" onClick={rearrange} className={BTN_SECONDARY}><Undo2 className="w-3.5 h-3.5" /> Keep arranging</button>
            <button type="button" onClick={newRound} className={BTN_TERTIARY}><Shuffle className="w-3.5 h-3.5" /> Another robot</button></>}>
          <p>
            {reachedMax ? 'That is the very worst list there is. ' : `The very worst list costs ${info.max} steps. `}
            {WORST_LESSON[round.alg]}
          </p>
          <div className="flex items-center gap-3 pt-1">
            <MiniBars values={info.example} className="w-28 h-14 shrink-0" />
            <span className={READOUT}>A worst list: {info.example.join(' ')} ({info.max} steps)</span>
          </div>
        </Banner>
      )}
    </div>
  );
}
