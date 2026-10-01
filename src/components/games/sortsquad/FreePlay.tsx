/**
 * The original Sort Squad's two modes, kept as free play: sort the bars yourself, or
 * watch a robot do it. Neither pays XP — hand-sorting has no strategy to discover
 * (swapping any out-of-order neighbour pair reaches par), so the thinking lives in
 * the Robot Puzzles.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Minus, Play, Plus, RotateCcw, Shuffle } from 'lucide-react';
import BarStage from './BarStage';
import { defaultStepTime, usePlayback } from './usePlayback';
import type { StageApi } from './stage';
import {
  ALG, ALGO_DESC, ALGO_LESSON, ALGO_NAME, MAX_N, MIN_N, bitsFor, buildSteps, factorial, inversions, isSorted, randomUnsorted
} from './logic';
import type { AlgId } from './logic';
import { BTN_PRIMARY, BTN_SECONDARY, BTN_TERTIARY, Banner, LABEL, NOTE, READOUT, RobotChip } from './ui';
import PlaybackControls from './PlaybackControls';

function Stepper({ label, value, min, max, onChange, disabled }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; disabled?: boolean }) {
  const btn = 'w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed';
  return (
    <div className="flex items-center gap-2">
      <span className={LABEL}>{label}</span>
      <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} className={btn} disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="text-xs font-mono text-zinc-200 w-6 text-center">{value}</span>
      <button type="button" aria-label={`More ${label.toLowerCase()}`} className={btn} disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

const oneLine = (t: string) => t.replace(/\n/g, ' ');

/* ====================================================================== */
/* Sort by hand                                                             */
/* ====================================================================== */

const freshHand = (n: number) => { const values = randomUnsorted(n, Math.random); return { values, par: inversions(values) }; };

export function HandSortPanel() {
  const [bars, setBars] = useState(8);
  const [round, setRound] = useState(() => freshHand(8));
  const [values, setValues] = useState<number[]>(round.values);
  const [moves, setMoves] = useState(0);
  const [sel, setSel] = useState(-1);
  const won = isSorted(values);

  const start = (n: number) => {
    const r = freshHand(n);
    setRound(r); setValues(r.values); setMoves(0); setSel(-1);
  };
  const changeBars = (n: number) => { setBars(n); start(n); };

  const onSlot = (i: number) => {
    if (won) return;
    if (sel >= 0 && Math.abs(i - sel) === 1) {
      const next = values.slice(); [next[sel], next[i]] = [next[i], next[sel]];
      setValues(next); setMoves((m) => m + 1); setSel(-1);
    } else {
      setSel(i === sel ? -1 : i);
    }
  };

  const stars = moves === round.par ? 3 : moves <= round.par + 3 ? 2 : 1;

  return (
    <div className="space-y-4">
      <p className={NOTE}>
        Click a bar, then click its neighbour to swap them. Sort short to tall. Par is the fewest swaps it can be done in:
        can you match it? Free play, so no XP.
      </p>

      <BarStage values={values} change="arrange" lift={sel} onSlot={onSlot} label="Bars to sort by hand. Choose a bar, then a neighbouring bar, to swap them." />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <p className={READOUT}>Swaps {moves} · Par {round.par}</p>
        <Stepper label="Bars" value={bars} min={MIN_N} max={MAX_N} onChange={changeBars} />
        <button type="button" onClick={() => start(bars)} className={BTN_TERTIARY}><Shuffle className="w-3.5 h-3.5" /> New round</button>
      </div>

      {won && (
        <Banner tone="good" title={`Sorted! You used ${moves} swaps. Par was ${round.par}.`} stars={stars}
          actions={<button type="button" onClick={() => start(bars)} className={BTN_PRIMARY}><RotateCcw className="w-3.5 h-3.5" /> Play again</button>}>
          <p>Each swap of neighbours fixes only ONE flipped pair, so par is the minimum.</p>
        </Banner>
      )}
    </div>
  );
}

/* ====================================================================== */
/* Watch a robot                                                            */
/* ====================================================================== */

type WatchPhase = 'pick' | 'watch' | 'done';
const ROBOTS: AlgId[] = [1, 2, 3, 4, 5, 6, 7, 8];

export function WatchPanel() {
  const stageRef = useRef<StageApi | null>(null);
  const pb = usePlayback(stageRef);
  const [bars, setBars] = useState(8);
  const [values, setValues] = useState<number[]>(() => randomUnsorted(8, Math.random));
  const [algo, setAlgo] = useState<AlgId | 0>(0);
  const [guess, setGuess] = useState(8);
  const [phase, setPhase] = useState<WatchPhase>('pick');

  /* Bogo Sort has no recorded run (it would never finish): it shuffles live. */
  const [tries, setTries] = useState(0);
  const [paused, setPaused] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const bogoValues = useRef<number[]>([]);
  const bogoTries = useRef(0);
  const bogoStepTime = useRef(0.6);
  const isBogo = algo === ALG.BOGO;

  const fresh = (n: number) => { setValues(randomUnsorted(n, Math.random)); };
  const changeBars = (n: number) => { setBars(n); setGuess(n); fresh(n); };

  const choose = (a: AlgId) => { setAlgo(a); };

  const start = () => {
    if (!algo) return;
    setPhase('watch');
    if (algo === ALG.BOGO) {
      bogoValues.current = values.slice();
      bogoTries.current = 0;
      bogoStepTime.current = 0.6;
      setTries(0); setPaused(false); setTurbo(false);
      stageRef.current?.set(values);
    } else {
      pb.load(values, buildSteps(algo, values), { autoplay: true, stepTime: defaultStepTime(bars) });
    }
  };
  const again = () => {                        // same list, same robot
    setPhase('watch');
    if (isBogo) { bogoValues.current = values.slice(); bogoTries.current = 0; setTries(0); setPaused(false); setTurbo(false); stageRef.current?.set(values); }
    else pb.restart();
  };
  const reset = () => { setPhase('pick'); setAlgo(0); fresh(bars); };

  useEffect(() => { if (phase === 'watch' && !isBogo && pb.done) setPhase('done'); }, [phase, isBogo, pb.done]);

  useEffect(() => {
    if (phase !== 'watch' || !isBogo || paused) return;
    let raf = 0, last = 0, acc = 0, alive = true;
    const shuffle = () => {
      const a = bogoValues.current;
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      bogoTries.current++;
    };
    const loop = (ts: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016);
      last = ts;
      const a = bogoValues.current;
      if (turbo) {
        for (let k = 0; k < 4000 && !isSorted(a); k++) shuffle();
      } else {
        acc += dt;
        if (acc >= bogoStepTime.current) { acc = 0; shuffle(); }
      }
      stageRef.current?.arrange(a);
      setTries(bogoTries.current);
      if (isSorted(a)) { setPhase('done'); setTurbo(false); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [phase, isBogo, paused, turbo]);

  const moves = pb.swaps + pb.writes;
  const odds = factorial(bars);
  const oddsText = odds < 1e9 ? String(Math.round(odds)) : odds.toExponential(2);
  const shuffles = `${tries} shuffle${tries === 1 ? '' : 's'}`;

  const status = (): string => {
    if (isBogo) return tries ? 'Sorted yet? Nope! Shuffling again...' : 'Here we go!';
    const c = pb.current;
    if (!c) return 'Here we go!';
    if (c.type === 0) return algo === ALG.QUICK ? `Is the pivot (${c.a}) bigger than ${c.b}?` : `Is ${c.a} bigger than ${c.b}?`;
    if (c.type === 1) return 'Yes! Swap them!';
    return algo === ALG.RADIX ? `Pass ${c.b} of ${bitsFor(bars)} (0s first, then 1s): placing ${c.a}` : `Placing ${c.a} into slot ${c.i + 1}`;
  };

  return (
    <div className="space-y-4">
      <p className={NOTE}>
        Pick a robot, guess how many MOVES it will make (a move is a swap or a placement), then watch it sort. Free play, so no XP.
      </p>

      <BarStage values={values} binary={algo === ALG.RADIX} stageRef={stageRef} label="A robot sorting a row of bars" />

      {phase === 'pick' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <p className={LABEL}>Pick a robot</p>
            <div className="flex flex-wrap gap-1.5">
              {ROBOTS.map((a) => <RobotChip key={a} alg={a} selected={algo === a} onClick={() => choose(a)} />)}
            </div>
            {algo !== 0 && <p className={NOTE}>{ALGO_NAME[algo]}: {oneLine(ALGO_DESC[algo])}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Stepper label="Bars" value={bars} min={MIN_N} max={MAX_N} onChange={changeBars} />
            {algo !== 0 && !isBogo && (
              <div className="flex items-center gap-2">
                <label htmlFor="sort-watch-guess" className={LABEL}>Your guess</label>
                <input
                  id="sort-watch-guess" type="number" inputMode="numeric" min={0} max={999} value={guess}
                  onChange={(e) => setGuess(Math.max(0, Math.min(999, Number.parseInt(e.target.value, 10) || 0)))}
                  className="w-20 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm font-mono text-white"
                />
                <span className={READOUT}>moves</span>
              </div>
            )}
          </div>

          <button type="button" onClick={start} disabled={!algo} className={BTN_PRIMARY}>
            <Play className="w-3.5 h-3.5" /> {algo ? `Start ${ALGO_NAME[algo]}` : 'Pick a robot first'}
          </button>
        </div>
      )}

      {phase !== 'pick' && algo !== 0 && (
        <div className="space-y-2">
          <p className="text-xs font-mono text-zinc-200">{phase === 'done' ? `${ALGO_NAME[algo]} finished!` : status()}</p>
          <p className={READOUT}>
            {isBogo ? `Shuffles ${tries} · Odds of getting lucky on each shuffle: 1 in ${oddsText}` : `Looks ${pb.looks} · Moves ${moves}`}
          </p>
        </div>
      )}

      {phase === 'watch' && algo !== 0 && (
        isBogo ? (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setPaused((p) => !p)} className={BTN_SECONDARY}>{paused ? 'Resume' : 'Pause'}</button>
            <button type="button" onClick={() => { if (bogoStepTime.current < 1.5) bogoStepTime.current *= 1.4; }} className={BTN_TERTIARY}>Slower</button>
            <button type="button" onClick={() => { bogoStepTime.current = Math.max(0.06, bogoStepTime.current / 1.4); }} className={BTN_TERTIARY}>Faster</button>
            <button type="button" onClick={() => setTurbo((t) => !t)} className={turbo ? BTN_PRIMARY : BTN_TERTIARY}>Turbo: {turbo ? 'on' : 'off'}</button>
          </div>
        ) : (
          <PlaybackControls pb={pb} />
        )
      )}

      {phase === 'done' && algo !== 0 && (
        <Banner
          tone={isBogo ? (tries < odds ? 'good' : 'info') : guess === moves ? 'good' : 'info'}
          title={isBogo
            ? (tries < odds ? `Lucky! ${shuffles} is faster than the average of ${oddsText}.` : `Unlucky! ${shuffles} is slower than the average of ${oddsText}.`)
            : guess === moves ? `You guessed ${guess} moves: exactly right!` : `You guessed ${guess} moves, off by ${Math.abs(guess - moves)}.`}
          actions={<>
            <button type="button" onClick={again} className={BTN_SECONDARY}><RotateCcw className="w-3.5 h-3.5" /> Watch again</button>
            <button type="button" onClick={reset} className={BTN_PRIMARY}><Shuffle className="w-3.5 h-3.5" /> Try another robot</button>
          </>}
        >
          <p>{oneLine(ALGO_LESSON[algo])}</p>
        </Banner>
      )}
    </div>
  );
}
