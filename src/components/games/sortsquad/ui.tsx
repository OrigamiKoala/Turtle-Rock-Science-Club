/**
 * Shared pieces of Sort Squad's page chrome. Every class string here is lifted
 * from the sibling games (RobotProgrammer and friends) on purpose — STYLE.md §11
 * describes the vocabulary — so the game reads as part of the same family:
 * `rounded-full` action buttons, tinted `rounded-lg` chips, tiny mono labels,
 * the amber Hint link, and emerald for "correct".
 */

import React, { useState } from 'react';
import { Lightbulb, Star, Trophy } from 'lucide-react';
import { ALGO_LABEL } from './logic';
import type { AlgId } from './logic';

/**
 * React strips `key` before a component ever sees it, but this project has no
 * @types/react to say so (the older components dodge that by typing themselves
 * `React.FC<…>`, which resolves to `any` here). Components that are rendered in
 * lists, or re-mounted with a `key`, accept it explicitly so their other props
 * still get checked.
 */
export interface Keyed { key?: string | number }

const BTN_BASE = 'px-4 py-2 rounded-full text-xs font-bold cursor-pointer transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed';
export const BTN_PRIMARY = `${BTN_BASE} bg-emerald-500 hover:bg-emerald-400 text-stone-950`;
export const BTN_SECONDARY = `${BTN_BASE} bg-white/10 hover:bg-white/20 text-white`;
export const BTN_TERTIARY = `${BTN_BASE} bg-white/5 hover:bg-white/10 text-zinc-400`;

export const LABEL = 'text-[10px] font-mono uppercase tracking-widest text-zinc-500';
export const READOUT = 'text-[11px] font-mono text-zinc-500';
export const NOTE = 'text-xs text-zinc-400 font-sans leading-relaxed';
export const STAGE_CARD = 'rounded-2xl border border-white/10 bg-[#0d0d12] p-2 sm:p-3';

/** The tinted chip each robot wears wherever it is named or chosen. */
const ROBOT_TINT: Record<number, string> = {
  1: 'bg-sky-500/20 border-sky-500/40 text-sky-300',            // Bubble
  2: 'bg-amber-500/20 border-amber-500/40 text-amber-300',      // Selection
  3: 'bg-lime-500/20 border-lime-500/40 text-lime-300',         // Insertion
  4: 'bg-violet-500/20 border-violet-500/40 text-violet-300',   // Quick
  5: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',         // Merge
  6: 'bg-pink-500/20 border-pink-500/40 text-pink-300',         // Timsort
  7: 'bg-orange-500/20 border-orange-500/40 text-orange-300',   // Radix
  8: 'bg-red-500/20 border-red-500/40 text-red-300'             // Bogo
};

interface RobotChipProps extends Keyed {
  alg: AlgId;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  /** Crossed out: a guess already ruled out. */
  ruledOut?: boolean;
  label?: string;
}

export function RobotChip({ alg, onClick, disabled, selected, ruledOut, label }: RobotChipProps) {
  const text = label ?? ALGO_LABEL[alg];
  const cls = `px-3 py-2 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition ${ROBOT_TINT[alg]}`;
  if (!onClick) return <span className={cls}>{text}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`${cls} cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-125 ${selected ? 'ring-2 ring-white/70' : ''} ${ruledOut ? 'line-through' : ''}`}
    >
      {text}
    </button>
  );
}

/** A level's one-line prompt, with the amber Hint link and the hint box it opens. */
export function HintRow({ brief, hint }: { brief: string; hint: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-2xl">{brief}</p>
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          className="text-[11px] font-mono text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-1 shrink-0"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          {shown ? 'Hide hint' : 'Hint'}
        </button>
      </div>
      {shown && (
        <p className="text-xs text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 font-sans leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}

export function Stars({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${count} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <Star key={i} className={`w-4 h-4 ${i < count ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`} />
      ))}
    </span>
  );
}

type Tone = 'good' | 'bad' | 'info';
const TONE: Record<Tone, { box: string; title: string }> = {
  good: { box: 'border-emerald-500/30 bg-emerald-500/10', title: 'text-emerald-300' },
  bad: { box: 'border-red-500/30 bg-red-500/10', title: 'text-red-300' },
  info: { box: 'border-amber-500/20 bg-amber-500/10', title: 'text-amber-300' }
};

interface BannerProps {
  tone: Tone;
  title: string;
  stars?: number;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

/** The outcome of a level: what happened, why, and what to do next. Shown only AFTER an answer. */
export function Banner({ tone, title, stars, children, actions }: BannerProps) {
  const t = TONE[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 space-y-2.5 ${t.box}`} role="status">
      <div className="flex flex-wrap items-center gap-2">
        {tone === 'good' && <Trophy className="w-4 h-4 text-amber-400" />}
        <h4 className={`font-display font-bold text-sm ${t.title}`}>{title}</h4>
        {stars !== undefined && <Stars count={stars} />}
      </div>
      {children && <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-1.5">{children}</div>}
      {actions && <div className="flex flex-wrap items-center gap-2 pt-0.5">{actions}</div>}
    </div>
  );
}

const hue = (v: number, n: number) => `hsl(${((v - 1) * 300) / Math.max(1, n - 1)},78%,62%)`;

/** A tiny, static picture of a row of bars — used for the "which picture?" answers. */
export function MiniBars({ values, className = '' }: { values: readonly number[]; className?: string }) {
  const n = values.length, W = 100, H = 56, slot = W / n, bw = slot * 0.74;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`Bars in order: ${values.join(', ')}`}>
      <line x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} stroke="#3f3f46" strokeWidth="1" />
      {values.map((v, i) => {
        const h = (v / n) * (H - 4);
        return <rect key={i} x={i * slot + (slot - bw) / 2} y={H - 1 - h} width={bw} height={h} rx="1.5" fill={hue(v, n)} />;
      })}
    </svg>
  );
}

/** A level's pill, in the style every sibling uses (teal is Sort Squad's accent). */
export function Pill({ active, onClick, children }: Keyed & { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-full text-[11px] font-mono border transition cursor-pointer flex items-center gap-1.5 ${
        active
          ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
          : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
