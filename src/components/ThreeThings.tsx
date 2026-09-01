import React, { useEffect, useState } from 'react';
import { motion, MotionValue, useMotionValue, useSpring, useTransform } from 'motion/react';
import learnPhoto from '../assets/three-things/learn.jpg';
import explorePhoto from '../assets/three-things/explore.jpg';
import joinPhoto from '../assets/three-things/join.jpg';

interface StepSpec {
  n: string;
  italic: string;
  normal: string;
  bg: string;
  ink: string;
  photo: string;
}

// Per the whiteboard reference, only the emphasis word/phrase is italic —
// the rest reads as a normal sentence. Card 3's bg/ink is Club Green/Deep
// Leaf rather than another pastel: a deliberate callback to the community
// moment this section follows, since "join a community" is the payoff of
// the whole scroll story so far. Real club photos (bundled the same way as
// the carousel's — see Hero.tsx's LOCAL_CAROUSEL_PHOTOS comment for the
// pattern) replace what used to be a generic placeholder icon here.
const STEPS: StepSpec[] = [
  { n: '01', italic: 'Learn', normal: 'about science.', bg: '#FBF7EC', ink: '#1F3A42', photo: learnPhoto },
  { n: '02', italic: 'Explore', normal: 'your interests in STEM.', bg: '#E4F5DA', ink: '#2E7D46', photo: explorePhoto },
  { n: '03', italic: 'Join a community', normal: 'of like minded people.', bg: '#6CC24A', ink: '#14351F', photo: joinPhoto }
];

// All three columns are visible the whole time — a rolling spotlight moves
// across them as you scroll (direct request, replacing an earlier stacked-
// cards design where only one was ever visible and the rest were hidden
// behind it, flicking offscreen to reveal the next). P1/P2 are where the
// spotlight hands off from one column to the next (thirds); FADE is how
// wide that handoff crossfade is, centered on each boundary, so the
// dim→lit swap is a smooth blend rather than an instant cut. Ends on column
// 3 (Join) lit and the other two dimmed, not all three lit together — the
// spotlight genuinely rolls through and rests on the payoff, it doesn't
// converge into a "reveal all" finale.
// Exported because Hero.tsx's scroll-snap table (HERO_STOPS/HERO_TRANSITIONS)
// needs the exact progress values at which each column finishes lighting up —
// the Learn/Explore/Join hand-offs are three of the seven snap moments, and
// re-deriving "one third, plus half a fade" over there by hand would go stale
// the moment either number is retuned here.
export const P1 = 1 / 3;
export const P2 = 2 / 3;
export const FADE = 0.08;
// Dim enough to clearly read as "not the focus right now" (direct request:
// "dims, so you can't really see them") without going fully invisible —
// the visitor should still be able to tell what the other two columns say.
const DIM_OPACITY = 0.18;
const DIM_GRAYSCALE = 0.85;
// Gap between columns, in px — kept as a real number (not a Tailwind gap
// class) so the width math below can subtract it exactly.
const COLUMN_GAP = 28;

// Plain data, not a hook — each column's own keyframe shape differs (column
// 2 has two handoffs, columns 1 and 3 only have one), so this returns
// whatever arrays that column needs rather than forcing one shared shape.
function spotlightKeyframes(index: number) {
  const half = FADE / 2;
  if (index === 0) {
    return {
      times: [0, P1 - half, P1 + half, 1],
      opacity: [1, 1, DIM_OPACITY, DIM_OPACITY],
      gray: [0, 0, DIM_GRAYSCALE, DIM_GRAYSCALE]
    };
  }
  if (index === 1) {
    return {
      times: [0, P1 - half, P1 + half, P2 - half, P2 + half, 1],
      opacity: [DIM_OPACITY, DIM_OPACITY, 1, 1, DIM_OPACITY, DIM_OPACITY],
      gray: [DIM_GRAYSCALE, DIM_GRAYSCALE, 0, 0, DIM_GRAYSCALE, DIM_GRAYSCALE]
    };
  }
  return {
    times: [0, P2 - half, P2 + half, 1],
    opacity: [DIM_OPACITY, DIM_OPACITY, 1, 1],
    gray: [DIM_GRAYSCALE, DIM_GRAYSCALE, 0, 0]
  };
}

const StepColumn: React.FC<{
  step: StepSpec;
  index: number;
  progress: MotionValue<number>;
  hoveredIndex: MotionValue<number | null>;
  columnWidth: number;
  columnHeight: number;
}> = ({ step, index, progress, hoveredIndex, columnWidth, columnHeight }) => {
  const { times, opacity, gray } = spotlightKeyframes(index);
  const scrollOpacity = useTransform(progress, times, opacity);
  const scrollGray = useTransform(progress, times, gray);
  // Hover takes over from the scroll-driven spotlight entirely while any
  // column is hovered (direct request: mouse control, not just scroll) —
  // this column lights fully, the other two dim, regardless of where the
  // scroll-driven spotlight currently sits. `hoveredIndex` is `null` for
  // "nothing hovered," which is the only case that falls back to
  // `scrollOpacity`/`scrollGray`. Both are real MotionValues (not plain
  // React state read via closure), so this multi-input `useTransform`
  // correctly re-evaluates on *either* input changing — scroll or hover —
  // not just whichever one happened to trigger the current render.
  const rawOpacity = useTransform([scrollOpacity, hoveredIndex], ([so, hi]: [number, number | null]) =>
    hi === null ? so : hi === index ? 1 : DIM_OPACITY
  );
  const rawGray = useTransform([scrollGray, hoveredIndex], ([sg, hi]: [number, number | null]) =>
    hi === null ? sg : hi === index ? 0 : DIM_GRAYSCALE
  );
  // A short spring smooths the hover case (an instant jump between "lit"
  // and "dim" on mouseenter/mouseleave would read as a hard flash, not a
  // glow) — the scroll-driven case is already smooth via Hero.tsx's own
  // catch-up lag on `progress`, so this adds only a small amount of extra
  // give there, not a second competing smoothing system.
  const columnOpacity = useSpring(rawOpacity, { duration: 0.25, bounce: 0 });
  const grayscaleAmount = useSpring(rawGray, { duration: 0.25, bounce: 0 });
  // The card's own dim/lit filter and the photo's grayscale are the exact
  // same underlying value — applied on the outer card, a `filter` set there
  // also grayscales/dims the photo along with everything else in it for
  // free, so the photo dims along with its column instead of staying
  // full-color while the text around it fades.
  const filter = useTransform(grayscaleAmount, (g) => `grayscale(${g})`);
  // Label/text sizes scale off the column's own width rather than fixed
  // breakpoint classes, same reasoning as the width itself — a step
  // function would look right at a couple of screen sizes and cramped or
  // oversized everywhere between them.
  const italicPx = Math.round(columnWidth * 0.11);
  const normalPx = Math.round(columnWidth * 0.065);

  return (
    <motion.div
      onMouseEnter={() => hoveredIndex.set(index)}
      onMouseLeave={() => hoveredIndex.set(null)}
      style={{
        opacity: columnOpacity,
        filter,
        background: step.bg,
        width: columnWidth,
        height: columnHeight
      }}
      className="relative shrink-0 rounded-[28px] shadow-[0_20px_45px_rgba(0,0,0,0.35)] flex flex-col items-center text-center px-6 py-8 cursor-pointer"
    >
      <span
        className="absolute top-5 right-6 text-sm font-sans font-bold tracking-widest z-10"
        style={{ color: step.ink, opacity: 0.35 }}
      >
        {step.n}
      </span>
      <div className="flex-1 w-full min-h-0 rounded-2xl overflow-hidden">
        <img src={step.photo} alt={step.italic} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
      <p
        className="font-hero italic font-extrabold leading-tight"
        style={{ color: step.ink, fontSize: italicPx }}
      >
        {step.italic}
      </p>
      <p className="font-hero mt-1" style={{ color: step.ink, fontSize: normalPx }}>
        {step.normal}
      </p>
    </motion.div>
  );
};

interface ThreeThingsProps {
  /** 0→1 progress local to just this moment (Hero.tsx maps its own
   * `[CARD_SEQUENCE_START, CARD_SEQUENCE_END]` slice of the shared 0→1
   * sequence progress down to this range before passing it in — this
   * component doesn't know or care where in the bigger sequence it sits). */
  progress: MotionValue<number>;
  /** Crossfades all three columns in together as "It's a community." (and
   * the carousel) fade out in the same spot, and never fades them back out
   * again — this is the sequence's final moment. */
  opacity: MotionValue<number>;
}

// The three things you gain from the club, per a hand-drawn reference
// (Reference_Photos/) — three columns, always all visible, with a rolling
// scroll-driven spotlight moving Learn → Explore → Join (see the big
// comment on P1/P2 above). Used to be a stacked deck where only the front
// card showed and the rest were hidden behind it until flicked away — direct
// request to scrap that for this side-by-side layout instead, and before
// that, a separate scrollable `<section>` with its own scroll-lock. It's
// just another moment inside Hero.tsx's own locked sequence now, sharing its
// `progress` (remapped to a local 0→1 range) and fading in via `opacity`
// exactly the way Science and Community already crossfade into each other.
export default function ThreeThings({ progress, opacity }: ThreeThingsProps) {
  // Shared by all three columns — set on mouseenter/mouseleave in
  // StepColumn, read there too (each column checks whether *it* is the
  // hovered one). Lives here, one level up, rather than as separate
  // per-column state, because hovering one column needs to dim the *other
  // two* as well, not just light up itself.
  const hoveredIndex = useMotionValue<number | null>(null);
  // Measured once on mount and on resize, so column size is a real function
  // of the actual screen — not a handful of fixed Tailwind breakpoints,
  // which read as "still too small" on anything between them (or past the
  // top one). Same technique Hero.tsx's carousel already uses for its own
  // card sizing.
  const [viewportWidth, setViewportWidth] = useState(0);
  useEffect(() => {
    const measure = () => setViewportWidth(window.innerWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  // Three columns should fill a genuinely large share of the screen, not
  // just look "sized up" relative to their old fixed values — 92% of the
  // viewport width, minus the two gaps between them, split three ways.
  // Capped at 380 so it doesn't get absurd on an ultra-wide monitor; no
  // floor beyond what the division naturally produces, so this also
  // shrinks correctly on narrow screens instead of overflowing them the
  // way a fixed per-column minimum would.
  const columnWidth =
    viewportWidth > 0 ? Math.min(380, (viewportWidth * 0.92 - COLUMN_GAP * 2) / 3) : 260;
  const columnHeight = columnWidth * 1.2;

  return (
    <motion.div style={{ opacity }} className="absolute inset-0 flex items-center justify-center px-4">
      <div className="flex items-center justify-center" style={{ gap: COLUMN_GAP }}>
        {STEPS.map((step, i) => (
          <StepColumn
            key={step.n}
            step={step}
            index={i}
            progress={progress}
            hoveredIndex={hoveredIndex}
            columnWidth={columnWidth}
            columnHeight={columnHeight}
          />
        ))}
      </div>
    </motion.div>
  );
}
