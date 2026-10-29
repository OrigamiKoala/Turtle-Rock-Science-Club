import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Lock, Minus, Pause, Play, Plus, RotateCcw, Rocket, Crosshair } from 'lucide-react';
import { UserProfile } from '../types';
import { KMS_PER_AU_YR, Run, planetAt, sampleAt, simulate } from './slingshot/physics';
import { STAGES, StageDef, StageEval, auToKms, kmsToAu } from './slingshot/stages';
import SolarMap, { MapView } from './slingshot/SolarMap';
import Dial from './slingshot/Dial';
import { AttemptChart, SpeedGraph } from './slingshot/Charts';

interface Props {
  userProfile: UserProfile;
  onUpdateXp: (xp: number, badge?: string) => void;
  onNavigateHome: () => void;
  onOpenJoin?: () => void;
  onOpenLogin?: () => void;
}

const STORE = 'tr_sc_slingshot_progress';

const ink = '#e6ecff';
const muted = '#8fa0c4';
const panel = '#0f1626';
const line = '#1f2a44';
const amber = '#ffb54a';

type Guess = 'slower' | 'same' | 'faster';
const GUESS_LABEL: Record<Guess, string> = { slower: 'Slower', same: 'The same', faster: 'Faster' };

interface Attempt {
  run: Run;
  dir: number;
  mag: number;
}

function loadDone(): boolean[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (raw && Array.isArray(raw.done)) return STAGES.map((_, i) => raw.done[i] === true);
  } catch {
    /* storage unavailable */
  }
  return STAGES.map(() => false);
}

function saveDone(done: boolean[]) {
  try {
    localStorage.setItem(STORE, JSON.stringify({ done }));
  } catch {
    /* storage unavailable */
  }
}

const fmt = (n: number, d = 1) => n.toFixed(d);

function Stepper({
  label,
  value,
  min,
  max,
  step,
  unit,
  decimals,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  decimals: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const timer = useRef<number | undefined>(undefined);
  const valRef = useRef(value);
  valRef.current = value;
  const clampV = (v: number) => Math.min(max, Math.max(min, v));
  const nudge = (dir: number) => onChange(clampV(Math.round((valRef.current + dir * step) / step) * step));
  const stop = () => {
    window.clearTimeout(timer.current);
    window.clearInterval(timer.current);
  };
  const hold = (dir: number) => {
    nudge(dir);
    timer.current = window.setTimeout(() => {
      timer.current = window.setInterval(() => nudge(dir), 70);
    }, 350);
  };
  useEffect(() => stop, []);
  const btn: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: `1px solid ${line}`,
    background: '#16203a',
    color: ink,
    display: 'grid',
    placeItems: 'center',
    touchAction: 'none',
  };
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm" style={{ color: ink }}>
        <span>{label}</span>
        <span className="tabular-nums font-semibold">
          {value.toFixed(decimals)} {unit}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          style={btn}
          disabled={disabled}
          aria-label={`Decrease ${label}`}
          onPointerDown={() => hold(-1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
        >
          <Minus size={14} />
        </button>
        <input
          type="range"
          className="flex-1"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ accentColor: amber }}
        />
        <button
          type="button"
          style={btn}
          disabled={disabled}
          aria-label={`Increase ${label}`}
          onPointerDown={() => hold(1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

export default function GravitySlingshotPage({ userProfile, onUpdateXp, onNavigateHome }: Props) {
  const [done, setDone] = useState<boolean[]>(loadDone);
  const [stageIdx, setStageIdx] = useState(() => {
    const d = loadDone();
    const i = d.findIndex((x) => !x);
    return i === -1 ? STAGES.length - 1 : i;
  });
  const stage: StageDef = STAGES[stageIdx];

  const [dir, setDir] = useState(0);
  const [mag, setMag] = useState(0);
  const [run, setRun] = useState<Run | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [goalsMet, setGoalsMet] = useState<boolean[]>([false, false]);
  const [evalNow, setEvalNow] = useState<StageEval | null>(null);
  const [playing, setPlaying] = useState(false);
  const [mult, setMult] = useState(1);
  const [tShown, setTShown] = useState(0);
  const [view, setView] = useState<MapView>({ radius: stage.viewRadius, follow: false });
  const [measure, setMeasure] = useState('sun');
  const [guess, setGuess] = useState<Guess | null>(null);
  const [firstGuess, setFirstGuess] = useState<{ guess: Guess; vIn: number; vOut: number } | null>(null);
  const [hintShown, setHintShown] = useState(0);
  const [misses, setMisses] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [stageStart, setStageStart] = useState(() => Date.now());
  const [showNaming, setShowNaming] = useState(false);

  const tRef = useRef(0);
  const runRef = useRef<Run | null>(null);
  runRef.current = run;

  const resetStage = useCallback((i: number) => {
    const st = STAGES[i];
    setStageIdx(i);
    setDir(0);
    setMag(0);
    setRun(null);
    setAttempts([]);
    setGoalsMet([false, false]);
    setEvalNow(null);
    setPlaying(false);
    setView({ radius: st.viewRadius, follow: false });
    setMeasure('sun');
    setGuess(null);
    setFirstGuess(null);
    setHintShown(0);
    setMisses(0);
    setStageStart(Date.now());
    setShowNaming(false);
    tRef.current = 0;
    setTShown(0);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);

  // flight playback
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (nowMs: number) => {
      const r = runRef.current;
      if (r) {
        const dt = Math.min(0.05, (nowMs - last) / 1000);
        const end = r.samples[r.samples.length - 1].t;
        const s = sampleAt(r.samples, tRef.current);
        let slow = 1;
        for (const b of stage.world.bodies) {
          const [bx, by] = planetAt(b, tRef.current);
          const d = Math.hypot(s.x - bx, s.y - by);
          const reach = b.zone * 1.6;
          if (d < reach) slow = Math.min(slow, Math.max(0.06, d / reach));
        }
        const base = end / 12;
        tRef.current = Math.min(end, tRef.current + dt * base * mult * slow);
        acc += dt;
        if (acc > 0.06) {
          acc = 0;
          setTShown(tRef.current);
        }
        if (tRef.current >= end) {
          setTShown(end);
          setPlaying(false);
          return;
        }
      }
      last = nowMs;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, mult, stage]);

  const preview = useMemo(() => {
    if (!stage.preview || run) return null;
    return simulate(stage.world, stage.makeLaunch(dir, mag), { sampleEvery: 0.1 });
  }, [stage, dir, mag, run]);

  const changeDial = (d: number, m: number) => {
    setDir(d);
    setMag(Math.min(m, stage.tank));
    if (run) {
      setRun(null);
      setPlaying(false);
      setEvalNow(null);
      tRef.current = 0;
      setTShown(0);
    }
  };

  const needsGuess = stage.id === 3 && attempts.length === 0 && !guess;

  const launch = useCallback(() => {
    if (needsGuess) return;
    const r = simulate(stage.world, stage.makeLaunch(dir, mag), { sampleEvery: 0.02 });
    const prevMet = goalsMet;
    const ev = stage.evaluate(r, mag, prevMet);
    const nextMet = ev.goals.map((g, i) => g.met || prevMet[i]);
    setGoalsMet([nextMet[0] ?? false, nextMet[1] ?? false]);
    setEvalNow(ev);
    setRun(r);
    setAttempts((a) => [...a, { run: r, dir, mag }]);
    tRef.current = 0;
    setTShown(0);
    setPlaying(true);
    if (stage.id === 3 && attempts.length === 0 && guess) {
      const f = r.flybys.find((x) => x.complete);
      setFirstGuess({ guess, vIn: f ? f.vIn : 0, vOut: f ? f.vOut : 0 });
    }
    if (ev.done) {
      if (!done[stageIdx]) {
        const nd = done.map((x, i) => x || i === stageIdx);
        setDone(nd);
        saveDone(nd);
        if (userProfile && userProfile.level > 0) onUpdateXp(stage.xp);
      }
      setShowNaming(true);
    } else {
      setMisses((m) => m + 1);
    }
  }, [needsGuess, stage, dir, mag, goalsMet, attempts.length, guess, done, stageIdx, userProfile, onUpdateXp]);

  const tEnd = run ? run.samples[run.samples.length - 1].t : 0;
  const hasPlanets = stage.world.bodies.length > 0;
  const hintAvail =
    1 + (misses >= 1 || now - stageStart > 45000 ? 1 : 0) + (misses >= 2 ? 1 : 0);

  const displayAttempts = useMemo(
    () => attempts.map((a) => ({ kms: auToKms(a.mag), far: a.run.maxR })),
    [attempts],
  );

  // test hook
  useEffect(() => {
    (window as unknown as { __sim: unknown }).__sim = {
      getState: () => ({ stage: stage.id, dir, mag, done, goalsMet, runEnd: run?.end ?? null, maxR: run?.maxR ?? null }),
      setState: (s: { stage?: number; dir?: number; kms?: number; guess?: Guess }) => {
        if (s.stage) resetStage(s.stage - 1);
        if (s.dir !== undefined) setDir(s.dir);
        if (s.kms !== undefined) setMag(kmsToAu(s.kms));
        if (s.guess) setGuess(s.guess);
      },
      launch,
    };
  });

  const sunAngle =
    stage.id === 3 || stage.id === 1 || stage.id === 2 || stage.id === 4
      ? Math.atan2(-stage.origin[1], -stage.origin[0])
      : null;

  const card: React.CSSProperties = { background: panel, border: `1px solid ${line}`, borderRadius: 14 };
  const primaryBtn: React.CSSProperties = {
    background: amber,
    color: '#1a1204',
    borderRadius: 10,
    fontWeight: 700,
  };
  const ghostBtn: React.CSSProperties = {
    background: '#16203a',
    color: ink,
    border: `1px solid ${line}`,
    borderRadius: 10,
  };

  const f0 = run?.flybys.find((f) => f.complete);
  const noFlyby = stage.id === 3 && run && !f0 && run.end !== 'planet';

  return (
    <div className="min-h-screen" style={{ background: '#05080f', color: ink }}>
      <header className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-4">
        <button
          type="button"
          onClick={onNavigateHome}
          className="flex items-center gap-1.5 px-3 py-2 text-sm"
          style={ghostBtn}
        >
          <ArrowLeft size={16} /> Home
        </button>
        <h1 className="text-lg font-bold sm:text-xl">Gravity Slingshot</h1>
        <nav className="ml-auto flex flex-wrap gap-2" aria-label="Stages">
          {STAGES.map((s, i) => {
            const locked = i > 0 && !done[i - 1];
            const active = i === stageIdx;
            return (
              <button
                key={s.id}
                type="button"
                disabled={locked}
                onClick={() => resetStage(i)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
                style={{
                  borderRadius: 999,
                  border: `1px solid ${active ? amber : line}`,
                  background: active ? 'rgba(255,181,74,0.14)' : '#0f1626',
                  color: locked ? '#52607f' : ink,
                }}
              >
                {locked ? <Lock size={12} /> : done[i] ? <Check size={13} color="#5be3a1" /> : null}
                {s.id}. {s.tab}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 pb-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0">
          <div className="mb-3 p-4" style={card}>
            <p className="text-base font-semibold sm:text-lg">{stage.prompt}</p>
            {stage.caption && (
              <p className="mt-1 text-sm" style={{ color: muted }}>
                {stage.caption}
                {hasPlanets && " Planet gravity is stronger than real so flybys are easier to aim."}
              </p>
            )}
          </div>

          <div className="relative">
            <SolarMap
              stage={stage}
              run={run}
              preview={preview}
              ghosts={attempts.slice(-4, run ? -1 : undefined).map((a) => a.run)}
              view={view}
              tRef={tRef}
            />
            <div className="absolute right-2 top-2 flex flex-col gap-1.5">
              {[
                { label: 'Zoom in', icon: <Plus size={16} />, fn: () => setView((v) => ({ ...v, radius: Math.max(0.3, v.radius / 1.6) })) },
                { label: 'Zoom out', icon: <Minus size={16} />, fn: () => setView((v) => ({ ...v, radius: Math.min(60, v.radius * 1.6) })) },
              ].map((b) => (
                <button
                  key={b.label}
                  type="button"
                  aria-label={b.label}
                  onClick={b.fn}
                  className="grid h-9 w-9 place-items-center"
                  style={{ ...ghostBtn, background: 'rgba(15,22,38,0.9)' }}
                >
                  {b.icon}
                </button>
              ))}
              <button
                type="button"
                aria-label="Follow the probe"
                aria-pressed={view.follow}
                onClick={() => setView((v) => ({ ...v, follow: !v.follow }))}
                className="grid h-9 w-9 place-items-center"
                style={{
                  ...ghostBtn,
                  background: view.follow ? 'rgba(255,181,74,0.25)' : 'rgba(15,22,38,0.9)',
                  borderColor: view.follow ? amber : line,
                }}
              >
                <Crosshair size={16} />
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 p-3" style={card}>
            <button
              type="button"
              disabled={!run}
              onClick={() => {
                if (!run) return;
                if (tRef.current >= tEnd - 1e-6) {
                  tRef.current = 0;
                  setTShown(0);
                }
                setPlaying((p) => !p);
              }}
              className="grid h-10 w-10 place-items-center"
              style={{ ...ghostBtn, opacity: run ? 1 : 0.4 }}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <input
              type="range"
              className="min-w-[120px] flex-1"
              min={0}
              max={tEnd || 1}
              step={0.01}
              value={Math.min(tShown, tEnd || 1)}
              disabled={!run}
              aria-label="Time"
              style={{ accentColor: amber }}
              onChange={(e) => {
                const v = Number(e.target.value);
                tRef.current = v;
                setTShown(v);
                setPlaying(false);
              }}
            />
            <span className="w-24 text-right text-sm tabular-nums" style={{ color: muted }}>
              {run ? `Year ${fmt(tShown)}` : 'Not launched'}
            </span>
            <div className="flex gap-1">
              {[0.5, 1, 3].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMult(m)}
                  className="px-2 py-1 text-xs"
                  style={{
                    ...ghostBtn,
                    borderColor: mult === m ? amber : line,
                    background: mult === m ? 'rgba(255,181,74,0.16)' : '#16203a',
                  }}
                >
                  {m}×
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 p-4" style={card}>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Probe speed</h2>
              {hasPlanets && (
                <label className="flex items-center gap-2 text-xs" style={{ color: muted }}>
                  Measured from
                  <select
                    value={measure}
                    onChange={(e) => setMeasure(e.target.value)}
                    className="px-2 py-1 text-xs"
                    style={{ background: '#16203a', color: ink, border: `1px solid ${line}`, borderRadius: 8 }}
                  >
                    <option value="sun">the Sun</option>
                    {stage.world.bodies.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <SpeedGraph
              run={run ?? preview}
              measure={measure}
              bodies={stage.world.bodies}
              cursorT={run ? tShown : -1}
              tMax={stage.world.tMax}
            />
          </div>
        </section>

        <aside className="flex min-w-0 flex-col gap-4">
          <div className="p-4" style={card}>
            <div className="flex justify-center">
              <Dial
                tank={stage.tank}
                mag={mag}
                dir={dir}
                refAngle={stage.refAngle}
                sunAngle={sunAngle}
                refLabel={stage.refWord}
                onChange={changeDial}
              />
            </div>
            <div className="mt-3 flex flex-col gap-3">
              <Stepper
                label={stage.burnWord}
                value={Math.round(mag * KMS_PER_AU_YR * 100) / 100}
                min={0}
                max={Math.round(auToKms(stage.tank) * 100) / 100}
                step={0.01}
                unit="km/s"
                decimals={2}
                onChange={(v) => changeDial(dir, kmsToAu(v))}
              />
              <Stepper
                label="Direction"
                value={Math.round(((dir * 180) / Math.PI) * 10) / 10}
                min={-180}
                max={180}
                step={0.1}
                unit="°"
                decimals={1}
                onChange={(v) => changeDial((v * Math.PI) / 180, mag)}
              />
            </div>
            <p className="mt-2 text-xs" style={{ color: muted }}>
              Maximum {fmt(auToKms(stage.tank), 1)} km/s. The dashed line on the dial is direction 0°.
            </p>

            {stage.id === 3 && (
              <div className="mt-4">
                <p className="text-sm font-semibold">
                  After passing Jupiter, the probe’s speed from the Sun will be
                </p>
                <div className="mt-2 flex gap-2">
                  {(['slower', 'same', 'faster'] as Guess[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      disabled={attempts.length > 0}
                      onClick={() => setGuess(g)}
                      className="flex-1 px-2 py-2 text-sm"
                      style={{
                        ...ghostBtn,
                        borderColor: (firstGuess?.guess ?? guess) === g ? amber : line,
                        background: (firstGuess?.guess ?? guess) === g ? 'rgba(255,181,74,0.16)' : '#16203a',
                        opacity: attempts.length > 0 && (firstGuess?.guess ?? guess) !== g ? 0.5 : 1,
                      }}
                    >
                      {GUESS_LABEL[g]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={launch}
                disabled={needsGuess}
                className="flex flex-1 items-center justify-center gap-2 px-4 py-3 text-base"
                style={{ ...primaryBtn, opacity: needsGuess ? 0.45 : 1 }}
              >
                <Rocket size={18} /> Launch
              </button>
              <button
                type="button"
                onClick={() => {
                  setRun(null);
                  setPlaying(false);
                  setEvalNow(null);
                  tRef.current = 0;
                  setTShown(0);
                }}
                disabled={!run}
                className="flex items-center gap-2 px-4 py-3 text-sm"
                style={{ ...ghostBtn, opacity: run ? 1 : 0.4 }}
              >
                <RotateCcw size={16} /> Reset
              </button>
            </div>
            {needsGuess && (
              <p className="mt-2 text-xs" style={{ color: muted }}>
                Choose one answer to enable Launch.
              </p>
            )}
          </div>

          {stage.id === 2 && (
            <div className="p-4" style={card}>
              <h2 className="mb-1 text-sm font-semibold">Farthest distance for each launch</h2>
              <AttemptChart attempts={displayAttempts} tankKms={Math.round(auToKms(stage.tank))} target={30.07} />
            </div>
          )}

          <div className="p-4" style={card}>
            <h2 className="mb-2 text-sm font-semibold">Goal</h2>
            <ul className="flex flex-col gap-1.5 text-sm">
              {(evalNow?.goals ?? stage.evaluate(emptyRun(), 0, goalsMet).goals).map((g, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span
                    className="grid h-5 w-5 place-items-center"
                    style={{
                      borderRadius: 6,
                      border: `1px solid ${g.met || goalsMet[i] ? '#5be3a1' : line}`,
                      background: g.met || goalsMet[i] ? 'rgba(91,227,161,0.18)' : 'transparent',
                    }}
                  >
                    {(g.met || goalsMet[i]) && <Check size={13} color="#5be3a1" />}
                  </span>
                  {g.text}
                </li>
              ))}
            </ul>

            {run && evalNow && (
              <ul className="mt-3 flex flex-col gap-1 border-t pt-3 text-sm" style={{ borderColor: line, color: muted }}>
                {evalNow.readouts.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
                {noFlyby && <li>The probe never got close enough to Jupiter to be pulled.</li>}
                {stage.id === 3 && firstGuess && attempts.length >= 1 && f0 && attempts[0].run === run && (
                  <li style={{ color: ink }}>
                    You said {GUESS_LABEL[firstGuess.guess].toLowerCase()}. The speed went from{' '}
                    {fmt(auToKms(firstGuess.vIn))} to {fmt(auToKms(firstGuess.vOut))} km/s.
                  </li>
                )}
              </ul>
            )}

            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setHintShown((h) => Math.min(h + 1, hintAvail))}
                disabled={hintShown >= hintAvail}
                className="px-3 py-1.5 text-sm"
                style={{ ...ghostBtn, opacity: hintShown >= hintAvail ? 0.4 : 1 }}
              >
                Hint
              </button>
              <span className="text-xs" style={{ color: muted }}>
                {hintShown} of 3 shown
              </span>
            </div>
            {hintShown > 0 && (
              <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-sm">
                {stage.hints.slice(0, hintShown).map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ol>
            )}
          </div>

          {(showNaming || done[stageIdx]) && (
            <div className="p-4" style={{ ...card, borderColor: '#2f6f55' }}>
              <p className="text-sm leading-relaxed">{stage.naming}</p>
              {stageIdx < STAGES.length - 1 && (
                <button
                  type="button"
                  onClick={() => resetStage(stageIdx + 1)}
                  className="mt-3 px-4 py-2 text-sm"
                  style={primaryBtn}
                >
                  Next stage
                </button>
              )}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

function emptyRun(): Run {
  return { samples: [{ t: 0, x: 0, y: 0, vx: 0, vy: 0 }], flybys: [], end: 'time', maxR: 0, minR: 0, swept: 0 };
}
