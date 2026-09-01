import React, { useEffect, useState } from 'react';
import { cubicBezier, motion, MotionValue, useMotionTemplate, useTransform } from 'motion/react';
import { GalleryPhoto } from '../types';
import ThreeThings, { P1 as SPOTLIGHT_P1, P2 as SPOTLIGHT_P2, FADE as SPOTLIGHT_FADE } from './ThreeThings';
import { ArrowRight, Image as ImageIcon } from 'lucide-react';
import coverPhoto from '../assets/hero/cover-photo.jpg';
import carousel01 from '../assets/carousel/carousel-01.jpg';
import carousel02 from '../assets/carousel/carousel-02.jpg';
import carousel03 from '../assets/carousel/carousel-03.jpg';
import carousel04 from '../assets/carousel/carousel-04.jpg';
import carousel05 from '../assets/carousel/carousel-05.jpg';
import carousel06 from '../assets/carousel/carousel-06.jpg';
import carousel07 from '../assets/carousel/carousel-07.jpg';
import carousel08 from '../assets/carousel/carousel-08.jpg';
import carousel09 from '../assets/carousel/carousel-09.jpg';
import carousel10 from '../assets/carousel/carousel-10.jpg';
import carousel11 from '../assets/carousel/carousel-11.jpg';
import carousel12 from '../assets/carousel/carousel-12.jpg';

// Used for every scroll-driven positional/scale deceleration in this file —
// see the big comment on titleGroupExitY below for why those transforms are
// eased at all. Originally a one-sided "ease-out-expo" shape
// (cubicBezier(0.16, 1, 0.3, 1) — replacing Motion's own built-in `easeOut`,
// cubic-bezier(0.33, 1, 0.68, 1), which read as too slow to settle over the
// large travel distances these transforms cover) — but that broke scrolling
// *backward*: `progress` moves in both directions (scroll up decreases it),
// and a fixed easing function has no notion of direction — it's evaluated
// at whatever position `progress` currently is, forward or back. An
// asymmetric ease-out curve run in reverse produces its mirror image
// (ease-in — slow start, fast finish), which is exactly the "goes slow to
// fast when scrolling up" bug reported directly. There is no fixed curve
// shape that reads as "fast then slow" in *both* directions — that would
// require opposite slopes at the same point depending on travel direction,
// which a pure function of position can't express. What every direction
// *can* share is decelerating into whichever end it's currently
// approaching: a symmetric ease-in-out (steep in the middle, shallow at
// both ends) does that going forward (0→1) and backward (1→0) alike. Kept
// steep/short at the ends (cubicBezier(0.76, 0, 0.24, 1), an aggressive
// "ease-in-out-expo" shape, not a gentle standard ease-in-out) specifically
// so the "ramps up" phase stays brief and this still reads as snappy rather
// than mushy — the "too slow" feedback that motivated the first version of
// this constant still applies, it's just no longer achievable by favoring
// one direction over the other.
const DECEL_EASE = cubicBezier(0.76, 0, 0.24, 1);

interface HeroProps {
  onOpenJoin: () => void;
  progress: MotionValue<number>;
  /** True until intro progress reaches 1. While locked the panel is
   * `fixed inset-0` (the document itself is scroll-locked by useHeroScroll,
   * so this never visibly moves); once unlocked it becomes a normal
   * full-height block so real scrolling can carry the visitor into it and
   * past it, into the rest of the page. */
  locked: boolean;
  /** The same Sheet-published Photos tab data `PhotoGallery` already shows
   * (`content.photos` in App.tsx) — this carousel is just a second consumer
   * of it, not a separate content source. A club organizer adds a photo the
   * same way regardless of which one they mean to update: add a row to the
   * Photos tab (Title, Image URL, Caption, Category, Submitted By) and hit
   * 🐢 Website ▸ Publish to Website. Once any are published, they take over
   * from the carousel's own bundled default photos entirely (see
   * LOCAL_CAROUSEL_PHOTOS below) — Sheet content always wins when present,
   * same as everywhere else on the site. */
  photos: GalleryPhoto[];
}

// One continuous locked panel plays six "moments" back to back, all off the
// same 0→1 progress (see useHeroScroll.ts's LOCK_DISTANCE) — not separate
// screens. The handoff *style* differs moment to moment, by direct request
// each time, not by accident:
//   0            → BUBBLE_END        bubbles rise, title/CTA dim→lit
//   TITLE_EXIT_*             title + Join button (and the cover photo,
//                             independently — see coverPhotoOpacity) slide
//                             up and out (titleGroupExitY) — a genuine
//                             "next slide" scroll, not a fade
//   SCIENCE_ENTER_*          "It's" + "more than just Science." slide up
//                             from below into the vacated spot
//                             (scienceGroupY), same "next slide" feel,
//                             overlapping the title's own exit window so
//                             nothing goes through a blank beat
//   (gap before MORPH_START) long, deliberately generous beat at the
//                             Science statement — this is the "I can't
//                             actually read it" gap that was widened
//   MORPH_*                  "It's" stays put; "more than just Science."
//                             and "a community." swap via a "focus pull"
//                             (scale + blur + opacity, not a flat crossfade
//                             or a slide) — see scienceLineOpacity/Scale/
//                             Blur and their community counterparts
//   (gap before COMMUNITY_EXIT_START) long, deliberately generous beat at
//                             the Community statement, same reasoning
//   COMMUNITY_EXIT_*         "It's a community." (and the carousel strip
//                             below it) fade out in place — and the
//                             Learn/Explore/Join card stack (ThreeThings.tsx)
//                             crossfades in over this exact same window, so
//                             cards arrive exactly as community leaves
//                             rather than after a gap
//   CARDS_FADE_*              the front card's own internal flip sequence
//                             (Learn → Explore → Join, see ThreeThings.tsx)
//                             finishes playing out, then the whole card
//                             stack fades back out (used to be the
//                             sequence's final moment, staying at opacity 1
//                             forever — no longer true, see Moment 7 below)
//   FINAL_BUBBLES_*/          Moment 7, the real final moment: the opening
//   FINAL_TEXT_*/             Bubbles reappear (ReturningBubble — same
//   FINAL_CTA_*               specs, rising up from below into rest instead
//                             of rising up and out), "Let's Explore" +
//                             italic "Science" fade/slide in using the exact
//                             same big-title formatting as Moment 1's
//                             "Turtle Rock" / "Science Club", and a
//                             "Sign Me Up!" button (sized to match Moment 1's
//                             "Join the Club" button) fades/slides in last —
//                             this is what actually stays at opacity 1
//                             forever once progress reaches 1
// ThreeThings.tsx used to be its own `<section>` in normal document flow,
// reached by ordinary scrolling and pinned via its own useSectionScroll.ts
// lock — direct request, twice: getting to the cards should read as this
// locked sequence continuing (whichever handoff style a given moment uses),
// not as the screen physically scrolling down into a second locked section
// underneath. It's gone from the document entirely now — folded in here as
// one more moment, sharing this file's own `progress` (remapped to a local
// 0→1 range, see cardsProgress below) instead of managing its own.
// The photo carousel's own horizontal motion is unrelated to all of this and
// driven by neither `progress` nor any of this choreography — it's a plain
// auto-playing CSS marquee (see CarouselTrack below), constant real-world
// speed regardless of scrolling.
// The background gradient crossfades during each matching text transition,
// not before or after it, and holds the Community/Cards gradient from
// MORPH_END through the rest of the sequence — ThreeThings.tsx no longer
// needs its own separate background for exactly that reason.
// Every constant below is a fraction of `LOCK_DISTANCE` (useHeroScroll.ts).
// LOCK_DISTANCE went 4890 → 10540 → 7290 → 13788 across three unrelated
// passes: the 4890→10540 jump widened the Community hold/exit 4x
// specifically to slow the carousel down (back when its sweep was still
// scroll-driven) — reverted at 7290 once the carousel became a time-driven
// auto-scroll and that widening stopped doing anything useful. The
// 7290→13788 jump is the same idea applied to the Learn/Explore/Join card
// stack: its rolling spotlight (COMMUNITY_EXIT_END→CARDS_FADE_START) used to
// share a fraction of the total sized for the Community-text handoff it
// happened to inherit, not for how long a 3-step spotlight actually needs —
// one scroll gesture could blow through all three cards, reported directly.
// That span alone was widened 3x (2394px → 7182px); every earlier constant
// was rescaled to preserve its exact absolute-pixel pacing (old-absolute-px
// ÷ new 13788 total), so nothing before the cards changed at all, and
// Moment 7's own internal spacing (relative to CARDS_FADE_START) is
// likewise unchanged in absolute terms — only its start got pushed out to
// make room.
const BUBBLE_END = 0.024;
const TITLE_LIT_END = 0.018;
const CTA_START = 0.008;
const CTA_END = 0.021;
// The "Scroll" hint used to fade out by 0.007 — i.e. the instant any scroll
// input arrived at all, which on a scrub means the moment the visitor so much
// as twitches the wheel. It now holds through the whole opening beat and the
// lit-title moment that follows, and leaves with the title itself, so it is
// still there while the invitation it makes is still the point.
const TITLE_EXIT_START = 0.029;
const TITLE_EXIT_END = 0.049;
// Both this and the title's exit are translate-based (see titleGroupExitY/
// scienceGroupY above), so "overlap" here means the same thing it always
// did for a translate: this window starts before TITLE_EXIT_END so the
// incoming slide and the outgoing one are actually both mid-motion at once,
// not just nominally scheduled to be.
const SCIENCE_ENTER_START = 0.032;
// The per-word cascade below (4 words, each WORD_STAGGER apart, last one
// needs its own WORD_ENTER_DURATION on top) has to fully finish before this
// — last word ends at SCIENCE_ENTER_START + 3*WORD_STAGGER +
// WORD_ENTER_DURATION = 0.032 + 0.021 + 0.016 = 0.069, inside 0.071.
const SCIENCE_ENTER_END = 0.071;
const WORD_STAGGER = 0.007;
const WORD_ENTER_DURATION = 0.016;
const MORPH_START = 0.156;
const MORPH_END = 0.218;
const COMMUNITY_EXIT_START = 0.311;
// Also where the card stack starts sliding in (see cardsEnterY below) —
// named for the Community side of that handoff since that's the meaning
// that matters to everything else keyed off it (scienceGroupY, carouselOpacity,
// the background gradient's last stop).
const COMMUNITY_EXIT_END = 0.355;
// Cards are fully visible by COMMUNITY_EXIT_END (crossfade complete); their
// own Learn→Explore→Join flip sequence plays out over the budget up to
// here — 3x wider than it used to be (see the LOCK_DISTANCE comment above),
// specifically so a visitor can't blow past all three cards in one scroll
// gesture. This used to be the sequence's hard ceiling (as CARD_SEQUENCE_END)
// before the 7th moment below existed; same value, renamed for what happens
// next.
const CARDS_FADE_START = 0.876;
// --- Moment 7: the bubbles return + "Let's explore science." + sign-up ---
// New budget added on top of everything above (see the LOCK_DISTANCE comment
// in useHeroScroll.ts) — direct request: once the card stack is done, the
// scene should feel like it's coming back around to where it started rather
// than just ending. Cards fade out (same crossfade-overlap technique as
// every other handoff in this file) while the opening Bubbles reappear —
// same specs, same look, but rising up from below into rest instead of
// rising up and out of frame — and "Let's explore science." + a final
// sign-up button fade/slide in on top, overlapping the bubbles' own arrival
// so nothing goes through a blank beat.
const CARDS_FADE_END = 0.902;
const FINAL_BUBBLES_START = 0.889;
const FINAL_BUBBLES_END = 0.941;
const FINAL_TEXT_START = 0.922;
const FINAL_TEXT_END = 0.964;
const FINAL_CTA_START = 0.948;
const FINAL_CTA_END = 0.987;
// The sequence's true hard ceiling now (CARD_SEQUENCE_END's old role).
const SEQUENCE_END = 1;

// --- Scroll-snap table (the only thing useHeroScroll.ts reads from here) ---
// The seven moments above are the sequence's resting frames. Scrolling
// scrubs continuously between them and settles onto the nearest one when the
// gesture stops — see useHeroScroll.ts, which is the only reader of these
// two tables.
//
// Two tables, because a stop and the animation that leads to it are not the
// same span. Every hand-off in this file is a short active window with a long
// deliberate *hold* on either side of it (the "generous beat" the comments
// above keep referring to). If scrolling covered the whole span between two
// stops, most of it would be spent inside those holds, where by construction
// nothing moves — scrolling would feel like a pause, a brief flurry, then
// another pause. So `HERO_TRANSITIONS[i]` names only the sub-range that
// actually animates, and useHeroScroll.ts stretches that window across a
// whole unit of scrolling while the holds cost nothing to cross. That skip is
// invisible precisely *because* it lands inside a hold: every transform in
// this file is flat across it. Adding a transform that isn't flat there
// breaks the guarantee (sceneOpacity was exactly this bug — see its comment
// below), and shows up as a jump the instant a visitor scrolls away from a
// moment. Keep new keyframes inside a window, never spanning a hold.
//
// Invariants, both relied on by useHeroScroll.ts:
//   HERO_TRANSITIONS[i].to === HERO_STOPS[i + 1]     (a window ends at a stop)
//   HERO_TRANSITIONS[i].from >= HERO_STOPS[i]        (and starts at/after one)
const cardsGlobal = (local: number) =>
  COMMUNITY_EXIT_END + local * (CARDS_FADE_START - COMMUNITY_EXIT_END);
// Where each of the three columns has finished lighting up — the far edge of
// the spotlight's crossfade, not its center, so the stop is a settled state.
const SPOTLIGHT_HALF = SPOTLIGHT_FADE / 2;
const EXPLORE_LIT = cardsGlobal(SPOTLIGHT_P1 + SPOTLIGHT_HALF);
const JOIN_LIT = cardsGlobal(SPOTLIGHT_P2 + SPOTLIGHT_HALF);

export const HERO_STOPS = [
  // 1. The landing frame: title dim, bubbles below the fold, no button yet.
  //    The opening beat is the visitor's first scroll — the bubbles rise
  //    under their hand, they don't play themselves. Auto-playing it on mount
  //    was tried while the sequence still snapped between moments (a snap
  //    can't rest on a half-finished frame, so the beat had nowhere to live)
  //    and was reported straight back: "it just automatically goes up now".
  //    Scrubbing has no such constraint, so it went back on the scroll axis.
  0,
  TITLE_EXIT_START,    // 2. "Turtle Rock Science Club", lit, Join button up
  SCIENCE_ENTER_END,   // 3. "It's more than just Science."
  MORPH_END,           // 4. "It's a community." (+ the carousel strip)
  COMMUNITY_EXIT_END,  // 5. Cards in, spotlight on Learn
  EXPLORE_LIT,         // 6. Spotlight on Explore
  JOIN_LIT,            // 7. Spotlight on Join a community
  SEQUENCE_END         // 8. Bubbles back + "Let's Explore Science" + sign-up
];

// `weight` is how much this hand-off costs relative to the others — both in
// scroll (a heavier one takes proportionally more scrolling to cross) and in
// time (useHeroScroll.ts divides its speed ceiling by the same number, so a
// heavy hand-off also sweeps past more slowly on a hard flick). One shared
// figure would be wrong, because these windows are not equally busy: the
// opening title→Science hand-off is two full-height slides plus a four-word
// cascade, the spotlight roll is a single crossfade between two columns and
// feels sluggish given the same room, and the finale stacks a fade-out, the
// bubbles' return and two staggered entrances. 1.0 is the norm; these are
// the per-moment pacing dial, and nothing else in this file moves when they
// change. The overall pace lives in useHeroScroll.ts (`WHEEL_PER_STEP` and
// `MAX_STEPS_PER_SEC`) — change that when the whole sequence is off, not
// these, which are only about the balance between one moment and the next.
export const HERO_TRANSITIONS = [
  { from: 0, to: TITLE_EXIT_START, weight: 1 },
  { from: TITLE_EXIT_START, to: SCIENCE_ENTER_END, weight: 1.25 },
  { from: MORPH_START, to: MORPH_END, weight: 1 },
  { from: COMMUNITY_EXIT_START, to: COMMUNITY_EXIT_END, weight: 1.05 },
  { from: cardsGlobal(SPOTLIGHT_P1 - SPOTLIGHT_HALF), to: EXPLORE_LIT, weight: 0.75 },
  { from: cardsGlobal(SPOTLIGHT_P2 - SPOTLIGHT_HALF), to: JOIN_LIT, weight: 0.75 },
  { from: CARDS_FADE_START, to: SEQUENCE_END, weight: 1.35 }
];

// Pixel nudges applied to the whole Science/Community group's "hold"
// position — see the big comment on scienceGroupY below for why these
// exist at all (the floating nav pill, and a deliberate Science-vs-
// Community difference) rather than holding at a flat 0 like every other
// group in this file.
const HERO_NAV_OFFSET = 36;
// Bumped 60 → 170: the "hold" position here only ever centered the *text*
// box (scienceGroupY has no idea the carousel exists) — fine for Science,
// which has nothing below it, but the carousel now sits absolutely anchored
// off the text stack's own bottom edge, adding real visual weight below
// "a community." that this offset doesn't otherwise account for. Roughly
// half the carousel's own downward extent (mt-16's 64px + its height,
// ~270-340px on a typical desktop card size) is what re-centers the
// *combined* text+carousel block instead of just the text.
const COMMUNITY_LIFT = 170;
// The photo carousel is no longer its own full-panel "Moment 4" that takes
// over after the Community text leaves (see the big comment above the
// carousel's render for why that was scrapped). It's now a small strip that
// arrives *with* "It's a community." (fading in over the same MORPH_START→
// MORPH_END window the text swaps through) and rides along inside the same
// group for the rest of the sequence, so it leaves the screen together with
// the text rather than outliving it.
//
// Its own horizontal sweep is **not** scroll-driven anymore either — it used
// to be tied to progress (a `trackX` transform over a dedicated scroll
// "runway"), which meant one strong scroll gesture could blow through all 12
// photos in one go no matter how wide that runway was made ("way too fast,"
// reported directly, twice — widening the runway 4x still wasn't the actual
// fix). It's a plain auto-playing CSS marquee now (see CarouselTrack below):
// scrolling has nothing to do with its speed at all, "like a normal
// website," pausing only on hover. `carouselOpacity` below still gates *when*
// it's visible (arriving/leaving with the text), just not how fast it moves.

interface CarouselCardSpec {
  bg: string;
  ink: string;
  imageUrl?: string;
  title?: string;
}

// Real club photos, bundled directly into the build (same pattern as
// `coverPhoto` above) rather than pulled from the Sheet — sourced from a
// `Photo_Carousel/` folder dropped at the repo root, converted from HEIC to
// JPEG where needed (sips) and moved into src/assets/carousel/ so Vite
// actually bundles them (a repo-root folder outside src/ isn't part of the
// build). All 12 are used — nothing here caps the count, and CarouselCard's
// track (see contentWidth in Hero()) already sizes itself off
// carouselCards.length, so adding a 13th photo later is just another
// `carouselXX` import and array entry, no other change needed. `bg`/`ink`
// are unused for real photos (CarouselCard only falls back to them when
// `imageUrl` is absent) but kept on the type for the true empty-state case
// below.
const LOCAL_CAROUSEL_PHOTOS: CarouselCardSpec[] = [
  { bg: '#1F3A42', ink: '#FBF7EC', imageUrl: carousel01 },
  { bg: '#1F3A42', ink: '#FBF7EC', imageUrl: carousel02 },
  { bg: '#1F3A42', ink: '#FBF7EC', imageUrl: carousel03 },
  { bg: '#1F3A42', ink: '#FBF7EC', imageUrl: carousel04 },
  { bg: '#1F3A42', ink: '#FBF7EC', imageUrl: carousel05 },
  { bg: '#1F3A42', ink: '#FBF7EC', imageUrl: carousel06 },
  { bg: '#1F3A42', ink: '#FBF7EC', imageUrl: carousel07 },
  { bg: '#1F3A42', ink: '#FBF7EC', imageUrl: carousel08 },
  { bg: '#1F3A42', ink: '#FBF7EC', imageUrl: carousel09 },
  { bg: '#1F3A42', ink: '#FBF7EC', imageUrl: carousel10 },
  { bg: '#1F3A42', ink: '#FBF7EC', imageUrl: carousel11 },
  { bg: '#1F3A42', ink: '#FBF7EC', imageUrl: carousel12 }
];

// True empty state — only shown if LOCAL_CAROUSEL_PHOTOS itself were ever
// emptied out (it won't be, in the ordinary course of things). Every bg/ink
// pair reuses an already-documented brand combination (STYLE.md §2.2)
// rather than inventing new colors: Cream/ink, Mint/Forest, Club Green/Deep
// Leaf, Gold/Gold-ink, Seafoam/ink.
const PLACEHOLDER_CARDS: CarouselCardSpec[] = [
  { bg: '#FBF7EC', ink: '#1F3A42' },
  { bg: '#6CC24A', ink: '#14351F' },
  { bg: '#E4F5DA', ink: '#2E7D46' },
  { bg: '#F2C94C', ink: '#4A3900' },
  { bg: '#CFF2E0', ink: '#1F3A42' },
  { bg: '#6CC24A', ink: '#14351F' },
  { bg: '#E4F5DA', ink: '#2E7D46' }
];

// A tight, single-file filmstrip, not independent per-card sweeps. Three
// earlier designs all got scrapped by direct request: a 3D pitch (ported
// from wisprflow.ai's testimonial-wall script, broke — see STYLE.md), then
// a "diagonal" 2D x+y drift, then each card independently sweeping the
// *entire* screen width alone with an opacity/scale fade at its own edges,
// then (this file's previous version) a single scroll-driven `x` translate
// for the whole row — direct, repeated feedback that tying photo speed to
// scroll input at all felt wrong no matter how that ratio was tuned: too
// fast, then still too fast even after widening its scroll "runway" 4x. It's
// a plain auto-playing CSS marquee now (CarouselTrack below) — constant
// real-world speed, scroll has nothing to do with it, "like a normal
// website." Every card still has a fixed, static width/height and sits in a
// plain flex row with a small constant gap between neighbors (`CARD_GAP`),
// fully opaque, no per-card scale/opacity — only difference from before is
// what drives the row's `x`.
const CARD_GAP = 56;

const CarouselCard: React.FC<{
  spec: CarouselCardSpec;
  cardWidth: number;
  cardHeight: number;
}> = ({ spec, cardWidth, cardHeight }) => {
  return (
    <div
      className="shrink-0 rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
      style={{ width: cardWidth, height: cardHeight, background: spec.bg }}
    >
      {spec.imageUrl ? (
        <img
          src={spec.imageUrl}
          alt={spec.title || 'Turtle Rock Science Club'}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <>
          <ImageIcon className="w-7 h-7" style={{ color: spec.ink, opacity: 0.5 }} />
          <span className="text-[11px] font-sans font-bold tracking-wide" style={{ color: spec.ink, opacity: 0.6 }}>
            Photo
          </span>
        </>
      )}
    </div>
  );
};

// Speed target for the auto-scroll (px of real screen space per second) —
// picked to be easily readable, a slow drift rather than a flashy ticker.
// `CarouselTrack` derives its CSS animation duration from this plus the
// actual measured content width, so the *felt* speed stays constant
// regardless of viewport size, card size, or how many photos are loaded —
// unlike a fixed animation-duration, which would make the same photo set
// visibly faster on a narrow screen (smaller cards, same duration = more
// distance covered per second than intended) or slower on a wide one.
const MARQUEE_PX_PER_SEC = 45;

// One full loop of the (possibly Sheet-published) photo set, laid out once;
// `CarouselTrack` renders this twice back-to-back and animates by exactly
// its own width, so the seam between the first copy's last card and the
// second copy's first is invisible — a standard marquee technique. Needs its
// own component (not just inline JSX in Hero()) so `useAnimationFrame`-free
// hover-pause (a plain CSS `:hover` rule, no JS state) has a stable DOM
// node to target; recreating the row inline on every Hero() re-render would
// restart the CSS animation each time.
const CarouselTrack: React.FC<{
  playState: MotionValue<string>;
  cards: CarouselCardSpec[];
  cardWidth: number;
  cardHeight: number;
}> = ({ cards, cardWidth, cardHeight, playState }) => {
  const loopWidth = cards.length * (cardWidth + CARD_GAP);
  const durationS = loopWidth / MARQUEE_PX_PER_SEC;
  return (
    // Static vertical centering lives on this outer, non-animated wrapper;
    // the CSS @keyframes animation (targeting `transform: translateX`) goes
    // on the inner element instead of sharing this one — a running
    // @keyframes animation on `transform` fully overrides any other
    // transform (Tailwind's `-translate-y-1/2` utility included) on that
    // same element for as long as it runs, which would silently cancel the
    // vertical centering the instant the marquee started (the same class of
    // bug `.glow-word`'s own comment documents for scroll-driven values).
    <div className="absolute left-0 top-1/2 -translate-y-1/2">
      {/* `animationPlayState` is driven from Hero's `carouselOpacity` so the
          marquee stops while the strip is hidden (see carouselPlayState).
          The hover-pause utility still wins over it when the strip is
          actually on screen, since a running state only matters there. */}
      <motion.div
        className="flex items-center animate-carousel-marquee hover:[animation-play-state:paused]"
        style={{ gap: CARD_GAP, animationDuration: `${durationS}s`, animationPlayState: playState }}
      >
        {[...cards, ...cards].map((spec, i) => (
          <CarouselCard key={i} spec={spec} cardWidth={cardWidth} cardHeight={cardHeight} />
        ))}
      </motion.div>
    </div>
  );
};

interface BubbleSpec {
  left: string;
  top: string;
  size: number;
  delay: number;
  travel: number;
  /** "r,g,b" — a brand green, tinting the rim-glow gradient layer. */
  tint: string;
  /** Opacity ceiling once "lit" (see Bubble's dim→lit transform below). Kept
   * low — these are meant to blend into the panel, not stand out from it. */
  peak: number;
}

// Fixed, hand-jittered so the bubbles read as scattered across the whole
// screen at rest — like bubbles already sitting in a glass — rather than a
// row lined up along the bottom edge. Few and large (per the whiteboard
// reference), not a fine speckle. `travel` is generous relative to each
// bubble's `top` so every one of them actually clears the top of the
// (overflow-hidden) panel by BUBBLE_END: they disappear because they've
// physically left the visible area, not because of an opacity fade partway
// through. `tint` cycles through the brand's green shades (as rgb triplets,
// for use inside rgba()).
const BUBBLES: BubbleSpec[] = [
  { left: '4%', top: '68%', size: 130, delay: 0.00, travel: 1050, tint: '108,194,74', peak: 0.34 },
  { left: '16%', top: '16%', size: 80, delay: 0.05, travel: 820, tint: '143,224,122', peak: 0.28 },
  { left: '80%', top: '14%', size: 150, delay: 0.02, travel: 800, tint: '168,224,144', peak: 0.3 },
  { left: '88%', top: '62%', size: 70, delay: 0.09, travel: 1000, tint: '108,194,74', peak: 0.3 },
  { left: '44%', top: '84%', size: 95, delay: 0.12, travel: 1120, tint: '143,224,122', peak: 0.24 },
  { left: '2%', top: '32%', size: 60, delay: 0.16, travel: 900, tint: '168,224,144', peak: 0.26 },
  { left: '68%', top: '78%', size: 105, delay: 0.06, travel: 1080, tint: '108,194,74', peak: 0.3 },
];

const Bubble: React.FC<{ spec: BubbleSpec; progress: MotionValue<number> }> = ({ spec, progress }) => {
  // A three-point range (rather than [start, BUBBLE_END]) so a bubble with
  // delay > 0 holds still at y=0 until its turn instead of extrapolating
  // early motion. The input array must be strictly increasing, so the
  // scaled delay is nudged off 0.
  const start = Math.max(0.001, spec.delay) * BUBBLE_END;
  const y = useTransform(progress, [0, start, BUBBLE_END], [0, 0, -spec.travel]);
  // Dim at rest, lights up over the same stretch of scroll as the title and
  // Join button so the whole scene wakes up together.
  const opacity = useTransform(progress, [0, TITLE_LIT_END], [spec.peak * 0.3, spec.peak]);
  // Soft glass, not a cartoon sticker: a small white specular highlight, a
  // faint tinted rim glow, and a barely-there overall wash, plus a thin
  // translucent edge and soft shadow for roundness — meant to read as part
  // of the panel's atmosphere, not a graphic sitting on top of it.
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: spec.left,
        top: spec.top,
        width: spec.size,
        height: spec.size,
        y,
        opacity,
        background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.5), rgba(255,255,255,0) 32%),
          radial-gradient(circle at 68% 72%, rgba(${spec.tint},0.55), rgba(${spec.tint},0) 48%),
          radial-gradient(circle, rgba(228,245,218,0.12), rgba(228,245,218,0.02) 72%)`,
        border: '1px solid rgba(228,245,218,0.16)',
        boxShadow: `inset 0 0 ${Math.round(spec.size * 0.08)}px rgba(255,255,255,0.18), 0 0 ${Math.round(spec.size * 0.12)}px rgba(${spec.tint},0.15)`
      }}
    />
  );
};

// The same bubbles "coming back" for the sequence's final moment — direct
// request. Reuses the exact same BUBBLES specs (position, size, tint) rather
// than a new set, so they read as the literal same bubbles returning, not a
// lookalike new batch. Visually the mirror image of Bubble above: instead of
// resting at y=0 then rising up and out of frame, these start already
// displaced downward by their own `travel` amount (below the viewport, off
// screen at the bottom) and rise up to rest at y=0, dimly appearing and
// lighting up to `peak` opacity as they arrive — same "dim → lit" language
// as the original bubbles waking up, just run as an entrance instead of
// tied to the panel's very start. Kept as its own component rather than
// adding a `reverse` flag to Bubble: different motion shape entirely (a
// single [START, END] window here vs. Bubble's three-point per-delay one),
// and this way neither component risks breaking the other under concurrent
// edits.
const ReturningBubble: React.FC<{ spec: BubbleSpec; progress: MotionValue<number> }> = ({ spec, progress }) => {
  const y = useTransform(progress, [FINAL_BUBBLES_START, FINAL_BUBBLES_END], [spec.travel, 0], { ease: DECEL_EASE });
  const opacity = useTransform(progress, [FINAL_BUBBLES_START, FINAL_BUBBLES_END], [0, spec.peak]);
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: spec.left,
        top: spec.top,
        width: spec.size,
        height: spec.size,
        y,
        opacity,
        background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.5), rgba(255,255,255,0) 32%),
          radial-gradient(circle at 68% 72%, rgba(${spec.tint},0.55), rgba(${spec.tint},0) 48%),
          radial-gradient(circle, rgba(228,245,218,0.12), rgba(228,245,218,0.02) 72%)`,
        border: '1px solid rgba(228,245,218,0.16)',
        boxShadow: `inset 0 0 ${Math.round(spec.size * 0.08)}px rgba(255,255,255,0.18), 0 0 ${Math.round(spec.size * 0.12)}px rgba(${spec.tint},0.15)`
      }}
    />
  );
};

interface SciWordSpec {
  text: string;
  /** Gets the permanent CSS glow (see .glow-word) — just the punchline
   * word, not the whole line. */
  emphasize?: boolean;
}

// "more than just Science." reveals one word at a time rather than
// appearing as a single block — each word's own window is offset from the
// previous by WORD_STAGGER and lasts WORD_ENTER_DURATION, so they cascade
// in left-to-right instead of all fading in together.
const SCI_WORDS: SciWordSpec[] = [
  { text: 'more' },
  { text: 'than' },
  { text: 'just' },
  { text: 'Science.', emphasize: true }
];

const SciWord: React.FC<{ spec: SciWordSpec; index: number; progress: MotionValue<number> }> = ({
  spec,
  index,
  progress
}) => {
  const start = SCIENCE_ENTER_START + index * WORD_STAGGER;
  const end = start + WORD_ENTER_DURATION;
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const y = useTransform(progress, [start, end], [22, 0], { ease: DECEL_EASE });
  // The permanent glow lives on an *inner* span, never on this outer one —
  // see the comment on .glow-word in index.css.
  return (
    <motion.span style={{ opacity, y }} className="inline-block">
      {spec.emphasize ? <span className="glow-word">{spec.text}</span> : spec.text}
    </motion.span>
  );
};

// A small 4-point "sparkle" — reads as a star rather than another soft dot,
// for a bit of variety among the twinkling points.
const SparkleStar: React.FC<{ className?: string; color: string }> = ({ className, color }) => (
  <svg viewBox="0 0 24 24" className={className} fill={color}>
    <path d="M12 0c.6 4.8 2.2 7.6 5 9.6 1.4 1 3 1.6 5 1.9v.5c-2.7.4-4.5 1.2-6 2.6-1.6 1.5-2.8 3.7-4 8.4-.6-4.7-1.8-6.9-3.4-8.4-1.5-1.4-3.3-2.2-6-2.6v-.5c2-.3 3.6-.9 5-1.9 2.8-2 4.4-4.8 4.4-9.6z" />
  </svg>
);

interface SparkSpec {
  left: string;
  top: string;
  size: number;
  color: string;
  delay: number;
}

// A scattered handful of soft twinkling points around the Science
// statement — atmosphere in the same visual language as the Bubbles above
// (soft glow, brand tints), not literal iconography. Positions are hand-
// placed to sit around the text block rather than on top of it.
const SPARKS: SparkSpec[] = [
  { left: '16%', top: '28%', size: 6, color: '#F2C94C', delay: 0 },
  { left: '84%', top: '24%', size: 5, color: '#8FE07A', delay: 0.5 },
  { left: '10%', top: '70%', size: 5, color: '#E4F5DA', delay: 1.1 },
  { left: '90%', top: '66%', size: 6, color: '#F2C94C', delay: 1.6 },
  { left: '30%', top: '82%', size: 4, color: '#8FE07A', delay: 0.8 },
  { left: '72%', top: '16%', size: 4, color: '#E4F5DA', delay: 2.0 }
];

export default function Hero({ onOpenJoin, progress, locked, photos }: HeroProps) {
  // Sheet-published photos win once there are any (same "Sheet is the
  // source of truth once it has content" rule the rest of the site
  // follows); otherwise the bundled real club photos (LOCAL_CAROUSEL_PHOTOS)
  // are the default, not a placeholder — PLACEHOLDER_CARDS only shows up in
  // the (currently hypothetical) case that bundle were itself emptied out.
  // Neither branch caps the count — every entry in whichever list wins gets
  // its own card.
  const carouselCards: CarouselCardSpec[] =
    photos.length > 0
      ? photos.map((p) => ({ bg: '#1F3A42', ink: '#FBF7EC', imageUrl: p.imageUrl, title: p.title }))
      : LOCAL_CAROUSEL_PHOTOS.length > 0
        ? LOCAL_CAROUSEL_PHOTOS
        : PLACEHOLDER_CARDS;

  // Measured once on mount and on resize, so distances that need to clear
  // the actual viewport (title/Science slide travel, carousel card sizing)
  // scale to it instead of using a fixed guess that only works on some
  // screen sizes.
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const measure = () => setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  // Direct request, reversed from an earlier "fade in place" pass: Title→
  // Science should read as scrolling between two separate slides again, not
  // a crossfade. A leaving/entering block needs to clear the panel's actual
  // height, with margin — 1.3x is comfortable slack for any screen size.
  const exitTravel = viewportSize.height > 0 ? viewportSize.height * 1.3 : 900;
  const enterTravel = exitTravel;

  // --- Moment 1: Turtle Rock Science Club ---
  const titleOpacity = useTransform(progress, [0, TITLE_LIT_END], [0.55, 1]);
  const titleBrightness = useTransform(progress, [0, TITLE_LIT_END], [0.75, 1.1]);
  const titleFilter = useTransform(titleBrightness, (b) => `brightness(${b})`);
  const ctaOpacity = useTransform(progress, [CTA_START, CTA_END], [0, 1]);
  const ctaY = useTransform(progress, [CTA_START, CTA_END], [24, 0], { ease: DECEL_EASE });
  const scrollHintOpacity = useTransform(progress, [0, TITLE_EXIT_START, TITLE_EXIT_END], [1, 1, 0]);
  // Title + Join button leave together, as one block — translated up and out
  // (not faded): this specific handoff is meant to read as scrolling between
  // two separate slides, per direct request reversing the earlier "fade in
  // place" pass. The cover photo behind it does its own separate fade (see
  // coverPhotoOpacity below) rather than sharing this motion value — sliding
  // the photo away with the text used to reveal a flat dark panel underneath
  // mid-slide ("like two mismatched PowerPoint slides"); fading the photo on
  // its own timeline instead lets it dissolve straight into the celestial
  // background instead of getting yanked off with the text.
  // DECEL_EASE on every positional/scale transform below (not the plain
  // opacity fades) — direct request: scroll-driven motion was moving at a
  // constant rate for its whole window and then just stopping dead the
  // instant the window ended, which read as abrupt no matter how the window
  // itself was timed. DECEL_EASE decelerates into the resting position instead,
  // regardless of scroll speed, since it reshapes the *output* curve, not
  // the input (progress itself still tracks scroll input 1:1 plus its own
  // separate catch-up lag from useHeroScroll.ts's CATCH_UP — this is a
  // second, independent layer of smoothing on top of that one).
  const titleGroupExitY = useTransform(progress, [TITLE_EXIT_START, TITLE_EXIT_END], [0, -exitTravel], { ease: DECEL_EASE });
  // The cover photo fades on its own — into the Science moment's dark/starry
  // backdrop — independent of the title text's slide above.
  const coverPhotoOpacity = useTransform(progress, [TITLE_EXIT_START, TITLE_EXIT_END], [1, 0]);

  // --- Moment 2: "It's more than just Science." + Moment 3: "It's a community." ---
  // Slides up from below into the spot the title vacated, and — direct
  // request, replacing what used to be a plain opacity crossfade here —
  // leaves the same way: translated up and out (COMMUNITY_EXIT_START→END,
  // folded into scienceGroupY below) rather than fading in place, so the
  // Community→Cards handoff reads as the same "scrolling to the next slide"
  // feel as every other slide-style transition in this file, not a
  // dissolve. No opacity prop on this group's wrapper at all anymore —
  // `y` alone drives entrance, hold, and exit, exactly like the title
  // group above.
  // "It's" is shared between the two sentences and never moves
  // independently — this whole group (it + whichever second line is
  // showing, plus the celestial scene, which is centered on this same group
  // — see its JSX below) slides/settles together as one block. The value
  // isn't a flat 0 at rest: the floating nav pill (`fixed top-4`) sits
  // outside this panel's own box model, so true viewport-center math
  // visually reads as too high in the space actually left below it —
  // HERO_NAV_OFFSET nudges the resting position down to compensate.
  // Community gets a further nudge up (COMMUNITY_LIFT) once the morph
  // finishes, since the carousel now anchors below it and adds real visual
  // weight the Science hold doesn't have — a small settle, not another
  // full-height slide. `DECEL_EASE` on the whole transform (not just the
  // exit segment) — Framer applies one `ease` to every segment of a
  // multi-point useTransform, and the entrance/settle segments already
  // wanted it too — this is what makes the Title→Science entrance decelerate
  // the same way its exit does.
  const scienceGroupY = useTransform(
    progress,
    [SCIENCE_ENTER_START, SCIENCE_ENTER_END, MORPH_START, MORPH_END, COMMUNITY_EXIT_START, COMMUNITY_EXIT_END],
    [
      enterTravel + HERO_NAV_OFFSET,
      HERO_NAV_OFFSET,
      HERO_NAV_OFFSET,
      HERO_NAV_OFFSET - COMMUNITY_LIFT,
      HERO_NAV_OFFSET - COMMUNITY_LIFT,
      -exitTravel
    ],
    { ease: DECEL_EASE }
  );

  // Science → Community: a "focus pull" morph instead of a flat crossfade,
  // direct request for something more distinctive — the outgoing line
  // scales up slightly and blurs away as it fades, like pulling focus past
  // it, while the incoming line resolves into focus from a smaller, blurred
  // state as it fades in.
  const scienceLineOpacity = useTransform(progress, [MORPH_START, MORPH_END], [1, 0]);
  const scienceLineScale = useTransform(progress, [MORPH_START, MORPH_END], [1, 1.15], { ease: DECEL_EASE });
  const scienceLineBlurPx = useTransform(progress, [MORPH_START, MORPH_END], [0, 10], { ease: DECEL_EASE });
  const scienceLineFilter = useTransform(scienceLineBlurPx, (b) => `blur(${b}px)`);
  const communityLineOpacity = useTransform(progress, [MORPH_START, MORPH_END], [0, 1]);
  const communityLineScale = useTransform(progress, [MORPH_START, MORPH_END], [0.85, 1], { ease: DECEL_EASE });
  const communityLineBlurPx = useTransform(progress, [MORPH_START, MORPH_END], [10, 0], { ease: DECEL_EASE });
  const communityLineFilter = useTransform(communityLineBlurPx, (b) => `blur(${b}px)`);

  // --- The photo carousel strip ---
  // Used to be its own full-panel "Moment 4" that took over after the
  // Community text left — scrapped per direct request back to a plain
  // sideways-scrolling strip that sits *below* "It's a community." on the
  // same screen instead. It fades in over the exact same MORPH_START→
  // MORPH_END window the text itself swaps through, so it arrives together
  // with "a community." rather than after it, and — because it renders as a
  // child of the same `scienceGroupY`-driven wrapper as the text (see the
  // JSX below) — it rides along on that group's shared exit-translate at
  // COMMUNITY_EXIT_START→END too, leaving the screen with the text instead
  // of outliving it.
  const carouselOpacity = useTransform(progress, [MORPH_START, MORPH_END], [0, 1]);
  // An `opacity: 0` element is still painted and composited every frame, and
  // this one is a full-viewport-wide strip of twelve photos on a permanently
  // running CSS marquee — paid for continuously through the two moments
  // before it arrives and every moment after it leaves, which is most of the
  // sequence. `visibility: hidden` takes it out of painting entirely, and
  // pausing the marquee stops it animating a thing nobody can see. Both are
  // driven off the same MotionValue rather than React state so this costs no
  // re-renders; `visibility` is not interpolated (it flips at a threshold),
  // which is exactly right here — there is nothing to see either side of it.
  const carouselVisibility = useTransform(carouselOpacity, (o) => (o < 0.01 ? 'hidden' : 'visible'));
  const carouselPlayState = useTransform(carouselOpacity, (o) => (o < 0.01 ? 'paused' : 'running'));

  // Background "scene" (orbit rings + sparks) behind the Science statement —
  // present only for that specific line, not the Community one that follows
  // in the same slot: fades in with the words' own entrance and fades back
  // out at MORPH_START, just as "a community." starts swapping in.
  // Fades out over MORPH_START→MORPH_END — with the words' own swap, which is
  // what the paragraph above always described. It used to fade out over
  // SCIENCE_ENTER_END→MORPH_START instead, i.e. across the entire *hold* on
  // the Science statement, which is the one thing in this file that animated
  // during a beat where nothing is supposed to be moving. That was invisible
  // enough when progress crept along with the wheel; it isn't now that
  // useHeroScroll.ts crosses each hold in a single instant jump (see
  // HERO_TRANSITIONS above) — the scene would have popped out of existence.
  const sceneOpacity = useTransform(
    progress,
    [SCIENCE_ENTER_START, SCIENCE_ENTER_END, MORPH_START, MORPH_END],
    [0, 1, 1, 0]
  );

  // --- ThreeThings (Learn/Explore/Join card stack) ---
  // Slides up from below (cardsEnterY, in the JSX below — same "scrolling to
  // the next slide" convention as the title/science handoffs above) over the
  // exact same COMMUNITY_EXIT_START→END window Community translates *out*
  // through, so cards visibly arrive right as community leaves rather than
  // after any gap. `cardsOpacity` no longer fades that arrival in — it's a
  // slide now, not a dissolve, direct request — it only still fades the
  // stack back *out* at the very end (CARDS_FADE_START→END) to make room for
  // Moment 7; clamped at 1 for everything before that, which is exactly the
  // "stay solid while sliding in" look this needs.
  const cardsOpacity = useTransform(progress, [CARDS_FADE_START, CARDS_FADE_END], [1, 0]);
  // Same slide-in mechanic and easing as every other entrance in this file.
  const cardsEnterY = useTransform(progress, [COMMUNITY_EXIT_START, COMMUNITY_EXIT_END], [enterTravel, 0], {
    ease: DECEL_EASE
  });
  // ThreeThings.tsx's own card1/card2/card3 transforms all expect a plain
  // local 0→1 range (their own Learn→Explore→Join sequence, independent of
  // where in Hero's bigger sequence that range actually sits) — this remaps
  // just the COMMUNITY_EXIT_END→CARDS_FADE_START tail into that shape. Below
  // COMMUNITY_EXIT_END this clamps to 0 (cards sit at their opening/"Learn"
  // pose, which is exactly what should be showing while cardsOpacity is still
  // fading them in — no separate "hold at rest" logic needed, the clamp does
  // it for free); above CARDS_FADE_START it clamps to 1 (flip sequence stays
  // complete while cardsOpacity fades the whole stack out).
  const cardsProgress = useTransform(progress, [COMMUNITY_EXIT_END, CARDS_FADE_START], [0, 1]);

  // --- Moment 7: the bubbles return + "Let's explore science." + sign-up ---
  const finalTextOpacity = useTransform(progress, [FINAL_TEXT_START, FINAL_TEXT_END], [0, 1]);
  const finalTextY = useTransform(progress, [FINAL_TEXT_START, FINAL_TEXT_END], [30, 0], { ease: DECEL_EASE });
  const finalCtaOpacity = useTransform(progress, [FINAL_CTA_START, FINAL_CTA_END], [0, 1]);
  const finalCtaY = useTransform(progress, [FINAL_CTA_START, FINAL_CTA_END], [24, 0], { ease: DECEL_EASE });

  // Card size scales continuously with the actual measured viewport width
  // (clamped to a sane range, not a handful of fixed Tailwind breakpoints)
  // so it's a real function of screen size, not a step function. 0.68 for
  // height keeps a landscape-photo-ish ratio close to the old fixed
  // 220×150/180×130 sizes.
  const cardWidth = viewportSize.width > 0 ? Math.min(400, Math.max(200, viewportSize.width * 0.26)) : 200;
  const cardHeight = cardWidth * 0.68;

  // --- Background: crossfades during each text transition, not before/after it ---
  const bgTop = useTransform(
    progress,
    [0, TITLE_EXIT_END, SCIENCE_ENTER_END, MORPH_START, MORPH_END],
    ['#0B2A2E', '#0B2A2E', '#1F3A42', '#1F3A42', '#12181A']
  );
  const bgBottom = useTransform(
    progress,
    [0, TITLE_EXIT_END, SCIENCE_ENTER_END, MORPH_START, MORPH_END],
    ['#123B38', '#123B38', '#14282e', '#14282e', '#1B2426']
  );
  const backgroundImage = useMotionTemplate`linear-gradient(to bottom, ${bgTop}, ${bgBottom})`;

  return (
    <>
      {/* While locked, the panel below is `fixed` and so takes up no space
          in the document flow — without this spacer, the welcome/CTA block
          after it would collapse up to the very top of the page. This keeps
          exactly one viewport-height of flow space reserved for the panel
          the whole time it's `fixed`, so nothing downstream moves. */}
      {locked && <div className="h-screen w-full" aria-hidden="true" />}

      {/* Stays a full `h-screen` block even once unlocked — a much earlier
          version shrank this to a small buffer (`h-[8vh]`) once nothing was
          left visible in it post-unlock, back when the panel's content
          always fully faded out by the time `progress` reached 1. That
          stopped being true once this panel grew a genuine final moment: the
          ThreeThings card stack now fades back out (cardsOpacity), and
          Moment 7's returning bubbles + "Let's Explore Science." + sign-up
          button (finalTextOpacity/finalCtaOpacity) are what actually stays
          at full opacity forever at progress=1 instead. Shrinking the panel
          post-unlock would now clip the very thing the visitor is meant to
          be looking at right as they finish scrolling. Full `h-screen`
          instead means every moment gets a whole viewport to sit in, exactly
          like it did while still locked, and normal scrolling then carries
          that block away naturally — this is the one moment allowed to
          behave like an ordinary in-flow section once unlocked, because it's
          the last one. */}
      <motion.section
        className={`${locked ? 'fixed inset-0' : 'relative w-full h-screen'} z-40 overflow-hidden`}
      >
        {/* Persistent moment-crossfading background — covers the whole
            locked sequence exactly as it did before the cover photo below
            existed, since that photo now leaves partway through (next
            block) rather than sticking around as the base for every
            moment. */}
        <motion.div className="absolute inset-0" style={{ backgroundImage }} />

        {/* Cover photo (a real club meeting,
            `Reference_Photos/TRSC_Cover_Photo.heic`) — Moment 1 only. Fades
            out on its own timeline (`coverPhotoOpacity`), independent of the
            title/Join group's slide just below, so it dissolves straight
            into the Science moment's dark/starry backdrop instead of being
            yanked off-panel with the sliding text — sliding it with the text
            used to reveal a flat dark panel mid-slide, reading as two
            mismatched slides rather than one photo settling into a scene.
            Its own tint uses Moment 1's fixed colors as a plain static
            gradient (not the animated `backgroundImage` above) since by the
            time this has finished fading, `bgTop`/`bgBottom` haven't started
            crossfading away from those colors yet anyway. */}
        <motion.div style={{ opacity: coverPhotoOpacity }} className="absolute inset-0">
          <img src={coverPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ backgroundImage: 'linear-gradient(to bottom, #0B2A2E, #123B38)', opacity: 0.88 }}
          />
        </motion.div>

        {/* Dimmed vignette, on top of the photo + tint. */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(0,0,0,0.45) 100%)' }}
        />

        {BUBBLES.map((spec, i) => (
          <Bubble key={i} spec={spec} progress={progress} />
        ))}

        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 text-center">
          {/* Moment 1 */}
          {/* `willChange: 'transform'` on this and the two other groups that
              translate during the sequence (scienceGroupY, cardsEnterY):
              these are the big, full-viewport blocks that slide, and the hint
              lets the compositor move an already-painted layer instead of
              repainting the block every frame. Kept to those three on
              purpose — will-change costs memory per layer, so it is not
              something to sprinkle on everything that happens to move. */}
          <motion.div style={{ y: titleGroupExitY, willChange: 'transform' }} className="flex flex-col items-center">
            <motion.div style={{ opacity: titleOpacity, filter: titleFilter }} className="flex flex-col items-center">
              <h1 className="font-hero font-extrabold uppercase tracking-tight text-[#FBF7EC] text-[20vw] sm:text-[17vw] md:text-[15vw] lg:text-[13vw] leading-[0.88]">
                Turtle Rock
              </h1>
              <p className="font-hero italic font-bold text-[#8FE07A] text-[17vw] sm:text-[14vw] md:text-[12vw] lg:text-[10vw] mt-1 tracking-tight leading-[0.9]">
                Science Club
              </p>
            </motion.div>

            <motion.div style={{ opacity: ctaOpacity, y: ctaY }} className="mt-10">
              {/* Bumped from the original px-7 py-3.5 text-sm to match Moment
                  7's "Sign Me Up!" button (hero-final-signup-btn) — direct
                  request: modestly bigger than before, not a dramatic jump,
                  and identical between the two so neither reads as the
                  "real" CTA over the other. */}
              <button
                id="hero-intro-join-btn"
                onClick={onOpenJoin}
                className="px-8 py-4 rounded-full font-hero font-bold uppercase tracking-wide text-base transition-all duration-300 hover:scale-[1.03] active:scale-95 cursor-pointer bg-[#6CC24A]/90 backdrop-blur-md text-[#0B2A2E] border border-[#E4F5DA]/40 shadow-[0_4px_20px_rgba(108,194,74,0.35)] flex items-center gap-2"
              >
                <span>Join the Club</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>

          {/* Moments 2 & 3, absolutely stacked in the same slot the title
              group occupied, so the sequence reads as one continuous panel
              rather than separate screens. */}
          <motion.div style={{ y: scienceGroupY, willChange: 'transform' }} className="absolute inset-0 flex flex-col items-center justify-center">

            {/* "It's" + the Science/Community box are the only things this
                outer flex column centers on. The photo carousel below
                *looks* like it flows right after them, but is actually
                absolutely anchored off this wrapper's own bottom edge
                (`top-full`) rather than a normal flex sibling — it used to
                be a real flex child here, and even at `opacity: 0` before
                MORPH_START it still consumed its full flow height (a fixed
                `height` plus `mt-16`), which skewed this column's centering
                upward the whole time Science was showing: "centered" was
                actually centered around a phantom block that included an
                invisible carousel-sized chunk at the bottom. */}
            <div className="relative flex flex-col items-center">
              <p className="font-hero font-semibold text-[#FBF7EC] text-2xl sm:text-3xl md:text-4xl tracking-tight">
                It's
              </p>

              <div className="relative mt-1">
              {/* Background "celestial scene" — centered on this box (the
                  Science/Community text swap, the actual visual focal
                  point) rather than the whole panel, so it doesn't drift
                  off-center under the shorter "It's" line above. A small
                  glowing "sun," three guide rings each carrying its own
                  orbiting "planet" dot (the rotation is on an *offset*
                  child, not the ring stroke itself — spinning a plain
                  circle outline is invisible, since a circle has no
                  rotational reference point), plus a scatter of twinkling
                  points and a couple of 4-point sparkle "stars." Gated to
                  the Science statement only (see sceneOpacity above),
                  abstract/atmospheric rather than literal clipart. */}
              <motion.div
                aria-hidden="true"
                style={{ opacity: sceneOpacity }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(75vw,62vh)] max-w-[620px] aspect-square pointer-events-none"
              >
                <div
                  className="absolute inset-0 m-auto w-10 h-10 sm:w-14 sm:h-14 rounded-full"
                  style={{
                    background:
                      'radial-gradient(circle, #F2C94C 0%, rgba(242,201,76,0.55) 45%, rgba(242,201,76,0) 72%)'
                  }}
                />

                <div className="absolute inset-[4%] rounded-full border border-dashed border-[#8FE07A]/20" />
                <div className="absolute inset-[20%] rounded-full border border-dotted border-[#E4F5DA]/25" />
                <div className="absolute inset-[36%] rounded-full border border-dashed border-[#F2C94C]/20" />

                <div className="absolute inset-[4%] animate-spin-slow-a">
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#8FE07A]"
                    style={{ boxShadow: '0 0 10px #8FE07A' }}
                  />
                </div>
                <div className="absolute inset-[20%] animate-spin-slow-b">
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#E4F5DA]"
                    style={{ boxShadow: '0 0 10px #E4F5DA' }}
                  />
                </div>
                <div className="absolute inset-[36%] animate-spin-slow-c">
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#F2C94C]"
                    style={{ boxShadow: '0 0 12px #F2C94C' }}
                  />
                </div>

                {SPARKS.map((spec, i) => (
                  <span
                    key={i}
                    className="absolute rounded-full animate-twinkle"
                    style={{
                      left: spec.left,
                      top: spec.top,
                      width: spec.size,
                      height: spec.size,
                      background: spec.color,
                      animationDelay: `${spec.delay}s`,
                      boxShadow: `0 0 ${spec.size * 2}px ${spec.color}`
                    }}
                  />
                ))}
                <SparkleStar className="absolute w-4 h-4 -left-[2%] top-[10%] animate-twinkle" color="#F2C94C" />
                <SparkleStar
                  className="absolute w-3 h-3 right-[0%] bottom-[8%] animate-twinkle"
                  color="#8FE07A"
                />
              </motion.div>

              {/* Moment 2: Science. Sized smaller than the Community line
                  below (roughly proportional to its ~2x character count,
                  24 vs 12) rather than matching it — "more than just
                  Science." is a much longer phrase, and giving it the same
                  aggressive vw ratio as the short lines risks it overflowing
                  the viewport width on real screens, not just looking
                  visually consistent on a wide monitor. Each word fades/
                  slides in on its own staggered window (SciWord) rather than
                  the line appearing as one block. */}
              <motion.p
                style={{ opacity: scienceLineOpacity, scale: scienceLineScale, filter: scienceLineFilter }}
                className="relative font-hero italic font-extrabold text-[#F2C94C] text-[13vw] sm:text-[11vw] md:text-[9.5vw] lg:text-[8.5vw] leading-[0.9] tracking-tight whitespace-nowrap flex justify-center gap-x-[0.22em]"
              >
                {SCI_WORDS.map((spec, i) => (
                  <SciWord key={spec.text} spec={spec} index={i} progress={progress} />
                ))}
              </motion.p>
              {/* Moment 3: Community — stacked exactly on top of Moment 2's
                  line so the swap happens in place, via the same "focus
                  pull" morph (opacity + scale + blur) as Science's own exit
                  above, resolving into focus from a smaller/blurred state as
                  it fades in — a more distinctive transition than a flat
                  crossfade, direct request. Explicit flex centering here
                  (not just inherited text-center) because it's now a visibly
                  larger font than the box its `inset-0` stretches to match
                  (sized by the Science line above, the shorter of the two)
                  — without it this line would render top-aligned instead of
                  centered whenever its own natural height exceeds that box. */}
              <motion.p
                style={{ opacity: communityLineOpacity, scale: communityLineScale, filter: communityLineFilter }}
                className="absolute inset-0 flex items-center justify-center font-hero italic font-extrabold text-[#8FE07A] text-[17vw] sm:text-[14vw] md:text-[12vw] lg:text-[10vw] leading-[0.9] tracking-tight whitespace-nowrap"
              >
                <span className="glow-word">a community.</span>
              </motion.p>
              </div>

              {/* The photo carousel strip — visually sits right below
                  "a community.", but is `absolute top-full` off this
                  `textStack` wrapper's own bottom edge rather than a normal
                  flex child of it (see the comment on textStack above for
                  why: a flex sibling here would count toward this column's
                  centered height even at opacity 0). `w-screen` + re-
                  centering with left-1/2/-translate-x-1/2 gets back the
                  genuinely full viewport width (no max-w cap) the auto-
                  scrolling track needs as its clip boundary, independent of
                  `textStack`'s own (text-sized, much narrower) width. This
                  outer div is purely the clip window (`overflow-hidden`,
                  sized to the cards, fading in/out with the text via
                  `carouselOpacity`) — the actual auto-playing row lives in
                  CarouselTrack. */}
              <motion.div
                style={{
                  opacity: carouselOpacity,
                  visibility: carouselVisibility,
                  height: cardHeight + 20
                }}
                className="absolute left-1/2 top-full -translate-x-1/2 w-screen mt-16 overflow-hidden"
              >
                <CarouselTrack
                  cards={carouselCards}
                  cardWidth={cardWidth}
                  cardHeight={cardHeight}
                  playState={carouselPlayState}
                />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Learn/Explore/Join card stack — see the big comment above
            COMMUNITY_EXIT_END for why this lives here now instead of in its
            own section further down the page. `z-10` matches the text/
            carousel layer above (both sit above the background/bubbles).
            `cardsEnterY` here is the slide-up-from-below entrance (see its
            own comment above) — separate from `cardsOpacity`, which
            ThreeThings applies internally and which now only ever fades the
            stack back *out* at the end, not in. No longer the very last
            thing rendered — it fades back out to make room for Moment 7 just
            below. */}
        <motion.div style={{ y: cardsEnterY, willChange: 'transform' }} className="absolute inset-0 z-10">
          <ThreeThings progress={cardsProgress} opacity={cardsOpacity} />
        </motion.div>

        {/* Moment 7 — the sequence's true final moment now: the bubbles
            return (rising up from below instead of up and out, same specs as
            the opening Bubbles above), and "Let's explore science." + a
            closing sign-up button fade/slide in on top. This is the one
            moment allowed to never fade back out — same reasoning the card
            stack used to have before it started fading out for this. */}
        {BUBBLES.map((spec, i) => (
          <ReturningBubble key={`return-${i}`} spec={spec} progress={progress} />
        ))}

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center">
          {/* Same format as Moment 1's "Turtle Rock" / "Science Club"
              (uppercase extrabold cream h1-scale line, then italic bold
              green mt-1 second line) — but sized a notch smaller by direct
              request rather than matching it exactly. */}
          <motion.div style={{ opacity: finalTextOpacity, y: finalTextY }} className="flex flex-col items-center">
            <h2 className="font-hero font-extrabold uppercase tracking-tight text-[#FBF7EC] text-[17vw] sm:text-[14.5vw] md:text-[12.5vw] lg:text-[11vw] leading-[0.88]">
              Let's Explore
            </h2>
            <p className="font-hero italic font-bold text-[#8FE07A] text-[14vw] sm:text-[11.5vw] md:text-[10vw] lg:text-[8.5vw] mt-1 tracking-tight leading-[0.9]">
              Science
            </p>
          </motion.div>

          {/* Same size as the intro's "Join the Club" button (hero-intro-
              join-btn, Moment 1) — direct request: both bumped up together
              from the original px-7 py-3.5 text-sm to this, modestly bigger
              rather than a dramatically different size. */}
          <motion.div style={{ opacity: finalCtaOpacity, y: finalCtaY }} className="mt-10">
            <button
              id="hero-final-signup-btn"
              onClick={onOpenJoin}
              className="px-8 py-4 rounded-full font-hero font-bold uppercase tracking-wide text-base transition-all duration-300 hover:scale-[1.03] active:scale-95 cursor-pointer bg-[#6CC24A]/90 backdrop-blur-md text-[#0B2A2E] border border-[#E4F5DA]/40 shadow-[0_4px_20px_rgba(108,194,74,0.35)] flex items-center gap-2"
            >
              <span>Sign Me Up!</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>

        <motion.div
          style={{ opacity: scrollHintOpacity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-[#E4F5DA]/70 text-xs font-sans font-bold tracking-[0.2em] uppercase"
        >
          Scroll
        </motion.div>
      </motion.section>
    </>
  );
}
