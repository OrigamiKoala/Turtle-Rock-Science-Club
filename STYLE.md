# Turtle Rock Science Club — Brand & Style Guide

The visual and verbal rules for **trscienceclub.org**. This is a description of
what the site *already does*, written down so it stays consistent. Everything
here was read off the live source (`src/`, `newsletter/`); where a rule has a
known exception or a known gap, it says so rather than pretending.

**Who we're talking to.** Elementary school students and their guardians, plus
the middle/high-school coaches who run sessions. Two audiences at once: the
site has to look inviting to a nine-year-old and credible to their parent. That
tension explains almost every choice below — rounded shapes and a cartoon
turtle, but real science, honest numbers, and no baby talk.

**The one-line brand.** *Curiosity is welcome here.* Friendly, warm, hands-on,
and quietly serious about the science.

---

## 1. The mark

`public/Logo.png` — a cartoon sea turtle whose shell is a domed beaker of
bubbling green liquid, set inside the ellipses of an atom, with **TURTLE ROCK**
arced above in chunky teal caps and *science club* curved below. Yellow-green
electrons sit on the orbit paths. Sticker-style: thick dark outlines, a white
keyline, flat fills.

It is the only logo. There is no wordmark-only lockup, no monochrome variant,
no alternate mascot.

**Rendering it.** Always through `TurtleRockLogo.tsx`, never a raw `<img>`.

| Prop | Use |
|---|---|
| `hideText` | Circular crop that zooms past the ring of text to the turtle + beaker. For small sizes where the arced type would be unreadable. |
| default | The full badge with its lettering. |

Sizes in use: **44px** (header, cropped), **36px** (footer, cropped), **150px**
(hero, full). Keep to that pattern — cropped below ~64px, full above.

**Rules.**

- The asset lives in `public/` and *must* be addressed as
  `` `${import.meta.env.BASE_URL}Logo.png` ``. A hardcoded `/Logo.png` resolves
  against the domain root and breaks under any non-root `base`.
- Don't recolor, add drop shadows, place it on a busy photo, or set it on a
  mid-green background — the logo's own greens stop separating. Cream, white,
  and deep teal are the safe backdrops.
- Don't stretch: width and height are always equal.
- It's decorative in the header (paired with the visible wordmark) and carries
  the alt text `Turtle Rock Science Club Logo` / `… Icon` elsewhere.

**Written name.** "Turtle Rock Science Club" on first use, **TRSC** acceptable
after. Never "TRSC Club", never "the Turtle Rock club", never lowercase
"turtle rock".

---

## 2. Color

The palette is deliberately small: a deep teal ink, a leafy green, a warm cream
page, and gold for reward moments. Everything else is a tint of those.

### 2.1 Core palette

| Hex | Name | Role | Dark-mode value |
|---|---|---|---|
| `#1F3A42` | **Deep Teal** (ink) | Primary text, borders (at low alpha), modal scrims, dark solid buttons/chips, avatar tile | `#E7EDE9` as *text*; stays `#1F3A42` as a *background* |
| `#4B6169` | **Slate** | Secondary/body text, metadata rows, icon strokes in meta | `#93A6A0` |
| `#9AA6A6` | **Faint** | Timestamps, placeholders, empty-state icons, fine print | `#67807A` |
| `#6CC24A` | **Club Green** | Primary button fill, progress fill, avatar circle, focus ring, success accents | unchanged |
| `#4C9A3A` | **Leaf** | The 3–4px hard "shelf" shadow under green buttons; small eyebrow labels; inline link cues | unchanged (no override — see §2.5) |
| `#2E7D46` | **Forest** | Green *text* — success copy, active nav label, "Read Entry →" | `#8FE07A` |
| `#14351F` | **Deep Leaf** | Label color *on* green fills. Never on a light background. | unchanged, intentionally |
| `#E4F5DA` | **Mint** | Active nav pill, badge icon tiles, success chips, progress track | `rgba(108,194,74,0.18)` |
| `#FBF7EC` | **Cream** | Page background, modal body, toast | `#12181A` |
| `#F3F0E4` | **Deep Cream** | Footer background | `#0D1213` |
| `#ffffff` | **White** | Cards, inputs, modal headers | `#1B2426` |
| `#F2C94C` | **Gold** | XP / trophy / ticket / lock icons, level-up chrome, "UNLOCKED" chip | unchanged |
| `#4A3900` | **Gold ink** | Label on gold fills | unchanged |
| `#B8860B` | **Dark gold** | Level-up headline only | unchanged |
| `#E4574B` | **Alert Red** | "Sold Out" chip only | unchanged |
| `#CFF2E0` | **Seafoam** | One decorative hero blob | unchanged |
| `#14282e` | **Teal pressed** | Hover/shelf for the dark solid button | unchanged |

Supporting one-offs: `#2D525D`, `#142B32`, `#A8E090`, `#064e3b`, `#043629`,
`#F3F0E4`, `#FEF3C7`, `#92400E` — decorative gradients and a couple of
game-adjacent accents. Don't grow this list without a reason.

`#0B2A2E` / `#123B38` — the landing intro's dark teal-blue-green gradient
(`Hero.tsx`, see §11). New, intro-only, always-dark like the games' palette —
not part of the §2.5 dark-mode override system (moot now that the whole site
is dark-only, but it was never one of the toggled hexes even back when there
was a toggle).

### 2.2 Semantic assignments

- **Primary action** — Club Green fill, Deep Leaf label, Leaf shelf shadow.
- **Secondary action** — white fill, ink label, `border-[#1F3A42]/15`.
- **Tertiary / dismiss** — no fill, Slate label, underline or hover-ink.
- **High-emphasis dark action** — Deep Teal fill, white label, `#14282e` shelf.
  Used sparingly (the "Got it" confirm, the official-document link).
- **Success** — Forest text on Mint, or a Club Green check icon.
- **Warning / scarcity** — Gold fill with Gold-ink label (`< 5 spots left`).
- **Error** — Alert Red for the Sold Out chip; Tailwind `red-500/600` with
  `red-50` / `red-200` for form errors. (Two reds coexist; form errors are the
  Tailwind one.)
- **Reward** — Gold, always. XP, levels, badges, trophies, tickets.

### 2.3 Backgrounds and depth

Page is Cream with a **dot pattern** (`.bg-dot-pattern`, 20px grid of
`rgba(76,154,58,0.10)` dots). A `.bg-grid-pattern` also exists
(30px, `rgba(31,58,66,0.05)` lines) for panels. Cards sit on top as **white**.
The footer drops to Deep Cream. Modals reverse it: **white header, Cream body**.

Depth ladder, lightest to heaviest: cream page → white card → ink-tinted border
→ soft ambient shadow → hard green shelf (interactive only) → `shadow-2xl`
(modals and toasts only).

### 2.4 Borders

Borders are structural here, not hairlines. **`border-2` is the default** —
`border` (1px) appears essentially only inside the always-dark games.

Alpha ladder on Deep Teal, in order of how often it's used:

| Token | Use |
|---|---|
| `/8` | Card borders, section dividers, modal header rule |
| `/10` | Header/footer rules, panel borders, dashed dividers |
| `/12` | **Form inputs**, dashed empty-state borders |
| `/15` | Secondary button borders, card hover state |
| `/20` | Profile chip hover |
| `/5` | Image-to-body seams inside cards |

Hover convention: bump the border one rung (`/8` → `/15`) and/or wash the
surface with `hover:bg-[#1F3A42]/5`.

### 2.5 Dark mode — read this before adding a color

The site is dark-only now — no toggle, no OS-preference tracking (see
CLAUDE.md's "Theming (dark-only)"). That doesn't make this section moot:
what used to be "dark mode" is simply the site's only mode now, and it's
still implemented in `src/index.css` as `:root.dark` overrides (`!important`)
on the site's hardcoded `bg-[#hex]` / `text-[#hex]` classes, applied
permanently rather than conditionally. The rules are **enumerated one hex at
a time**.

> **A new `text-[#hex]` that isn't in that list renders identically in both
> themes** — which usually means dark text on a dark background.

So: reuse `text-[#1F3A42]` / `text-[#4B6169]` / `text-[#9AA6A6]` /
`text-[#2E7D46]` and `bg-[#FBF7EC]` / `bg-white` / `bg-[#E4F5DA]` /
`bg-[#F3F0E4]`, or add the override alongside the new color. `text-[#14351F]`
is deliberately *not* flipped — it's the dark label on green buttons.

Two known live consequences:

- **`text-[#4C9A3A]` has no override.** It's the header's "Science Club"
  subtitle, the "Virtual Lab" eyebrow, the dashboard's scientist title, and the
  Read Entry cue. On the dark card (`#1B2426`) it measures **4.51:1** — passes
  AA for normal text, but it's the weakest brand color in dark mode. Prefer
  `text-[#2E7D46]` (→ `#8FE07A`, 9.88:1) for anything that must be legible.
- **`dark:` utilities apply permanently — but only because `index.css` says
  so.** Tailwind v4 compiles `dark:*` to `@media (prefers-color-scheme: dark)`
  by default, which reads the visitor's OS setting, not this site's
  permanent `.dark` class. `src/index.css` declares `@custom-variant dark
  (&:where(.dark, .dark *));` right after the `@import "tailwindcss"` to
  rebind it to the same `.dark` class the enumerated overrides use. Without
  that line, `dark:` utilities would only fire for visitors whose OS happens
  to be in dark mode — i.e. most visitors would see a mix, exactly what
  happened to the Resources filter bar (a light-gray card of washed-out
  pills on an otherwise dark page) back when this first shipped. Don't
  remove it, and check the compiled CSS has no `prefers-color-scheme` rules
  if you suspect a regression.
- **The scrollbar thumb isn't a `bg-[#hex]` utility, so it isn't in the
  enumerated list above** — it's raw CSS in `src/index.css` reading a
  `--scrollbar-thumb` custom property that `:root.dark` redefines directly
  (Deep Teal `#1F3A42` at low alpha in light mode → `#93A6A0`, the same
  muted-teal token already used for dark-mode text, at low alpha in dark
  mode). Same reasoning as the rest of this section — a scrollbar-thumb color
  with only a light-mode value would go invisible against the dark page
  background — just wired through a CSS variable instead of a second
  enumerated selector, since `::-webkit-scrollbar-thumb` isn't a Tailwind
  utility class to override per-hex.

### 2.6 Measured contrast

Computed on the actual pairs the site renders (WCAG 2.1):

| Pair | Ratio | |
|---|---|---|
| `#1F3A42` on `#ffffff` | 12.05 | ✅ |
| `#1F3A42` on `#FBF7EC` | 11.26 | ✅ |
| `#4B6169` on `#ffffff` | 6.54 | ✅ |
| `#4B6169` on `#FBF7EC` | 6.11 | ✅ |
| `#14351F` on `#6CC24A` (button label) | 6.06 | ✅ |
| `#2E7D46` on `#ffffff` | 5.07 | ✅ |
| `#4A3900` on `#F2C94C` | 7.05 | ✅ |
| `#2E7D46` on `#E4F5DA` (success chip) | 4.44 | ⚠️ AA normal text only at ≥14px bold / passes large |
| `#4C9A3A` on `#ffffff` | 3.51 | ⚠️ **large/bold text only** |
| `#ffffff` on `#E4574B` (Sold Out) | 3.64 | ⚠️ large/bold only — it *is* bold 10px, so treat as decorative-with-redundant-label |
| `#9AA6A6` on `#ffffff` | 2.51 | ❌ decorative / non-essential text only |
| Dark: `#E7EDE9` on `#1B2426` | 13.33 | ✅ |
| Dark: `#93A6A0` on `#1B2426` | 6.18 | ✅ |
| Dark: `#8FE07A` on `#1B2426` | 9.88 | ✅ |
| Dark: `#67807A` on `#1B2426` | 3.73 | ⚠️ fine print only |

Rule of thumb: **`#9AA6A6` never carries information a visitor needs.** It's
for timestamps and hints that are also expressed elsewhere.

---

## 3. Typography

Two Google fonts, loaded at the top of `src/index.css`.

```css
--font-sans:    "Nunito", ui-sans-serif, system-ui, sans-serif;   /* body */
--font-display: "Baloo 2", sans-serif;                            /* headings, buttons */
--font-mono:    "Nunito", ui-monospace, SFMono-Regular, monospace;
--font-hero:    "EB Garamond", serif;                             /* landing intro only */
```

- **Baloo 2** (500/600/700/800) — `font-display`. Rounded, chunky, friendly.
  Every heading, every button label, every chip. Almost always `font-bold`.
- **Nunito** (400/600/700/800/900) — `font-sans`. Body copy, form labels, meta
  rows, nav items.
- **EB Garamond** (600/700/800 upright, 500/600/700 italic) — `font-hero`.
  Used only by the landing intro's "TURTLE ROCK" / "Science Club" wordmark
  and the floating nav pill's brand text (see §11). The pick tracks whatever
  reference the intro is being matched against, so it's moved a few times:
  Baloo 2 has no real italic at all; Fraunces (soft-contrast serif) read as
  "elegant" rather than "bold"; Phantom Sans (Hack Club's brand font) turned
  out to be scoped to "HQ sites only" and isn't licensed for use here, so
  Poppins stood in for its geometric-sans character; this pick instead
  matches Wispr Flow (wisprflow.ai), which sets its own big display
  headlines in EB Garamond — a classic revival serif, SIL OFL licensed, with
  a genuinely elegant italic. Used here at `font-extrabold` (800, its max
  upright weight) / `font-bold` italic rather than Wispr's own regular-weight
  display, since the brief for this panel is specifically a bold statement,
  not Wispr's own restrained one. Not used anywhere else; don't reach for it
  in regular site copy.

> **Quirk worth knowing:** `--font-mono` lists **Nunito first**, so the ~93
> `font-mono` utilities inside `src/components/games/` render in Nunito, not a
> monospaced face. Numbers in the games therefore don't tabular-align. That's
> the current, shipped behavior — don't "fix" it casually, since the game
> layouts were tuned against how they actually look.

### 3.1 Scale as used

The site leans small and dense, with a few big display moments.

| Token | Typical use |
|---|---|
| `text-4xl sm:text-5xl lg:text-6xl` | Hero headline and the About page H1 (`leading-[1.05]`, `tracking-tight`) |
| `text-3xl` / `text-2xl sm:text-3xl` | Page and section headings |
| `text-2xl` / `text-xl` | Sub-section headings, level-up headline |
| `text-lg` | Card group headings, modal titles, mission-card names |
| `text-base` | Lead paragraphs, footer/newsletter headings |
| `text-sm` | Standard body, primary button labels, form inputs |
| `text-xs` | The workhorse — card body, badge descriptions, FAQ answers, footer links |
| `text-[13px]` / `text-[12px]` | Nav items; event card description and meta rows |
| `text-[11px]` | Form labels, timestamps, fine print, small buttons |
| `text-[10px]` / `text-[9px]` | Chips, "UNLOCKED", field taglines |

`text-xs` and `text-[11px]` together account for most text on the site. That's
intentional density — but it's why the muted colors must stay high-contrast.

### 3.2 Weight, tracking, leading

- Headings: `font-display font-bold`, `tracking-tight`, `leading-tight` or
  `leading-snug`.
- Body: `leading-relaxed` (the default for any paragraph).
- Nav items and form labels: `font-sans font-extrabold` — small text earns its
  presence through weight, not size.
- Footer column headings: `font-display font-bold text-xs uppercase
  tracking-widest`. That's the only place uppercase-tracked type is used on the
  site.
- `font-semibold` appears 3 times total; prefer `font-bold` / `font-extrabold`.

### 3.3 Casing

- Headings and buttons: **Title Case** — "Upcoming Events", "Join the Club!",
  "Browse Upcoming Events", "Count Us In!".
- Body, taglines, helper text: **sentence case**.
- Chips/labels: Title Case, except the deliberate all-caps `UNLOCKED`.
- Never ALL CAPS for emphasis in prose.

---

## 4. Layout & spacing

### 4.1 The container

Every top-level section uses the same one:

```jsx
<section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto ...">
```

`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` appears in the header, hero, footer,
events, gallery, lab, resources, dashboard, and announcements. Anything new
matches it exactly — no bespoke widths.

Vertical rhythm: `py-10` for a section; `space-y-8` between blocks inside one;
`space-y-14` / `space-y-16` between major stacked topics (Announcements, About);
`mb-8` under a section heading before its grid.

### 4.2 Grids

| Content | Grid |
|---|---|
| Event cards, lab log cards | `grid-cols-1 md:grid-cols-3` (events use `lg:grid-cols-3`), `gap-6` |
| Announcements, badges, reservations | `grid-cols-1 md:grid-cols-2`, `gap-4` |
| Game tabs | `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, `gap-3` |
| Footer | `grid-cols-1 md:grid-cols-4`, `gap-8` |
| Dashboard | `lg:grid-cols-12` split 4 / 8 |
| About mission cards | `md:grid-cols-3`, `gap-6` |

Mobile is always a single column. Breakpoints used: `sm`, `md`, `lg`, `xl`.

### 4.3 Radii

Very round. The ladder, by frequency:

| Radius | Use |
|---|---|
| `rounded-full` | **Every button**, every chip/pill, avatars, progress bars, scrollbar thumb |
| `rounded-xl` | Form inputs, small inner panels, comment rows |
| `rounded-2xl` | Badge cards, announcement cards, game tabs, icon tiles, game panels |
| `rounded-[28px]` | **The signature card radius** — event cards, dashboard panels, About cards, modals |
| `rounded-[24px]` | Newsletter panel, signup modal, confirm-email inner callout |
| `rounded-[32px]` | The confirm-email modal (largest, most emphatic) |
| `rounded-lg` / `rounded-md` | Small utility hit-areas (menu toggle, thumbnails) |

Pick `rounded-[28px]` for any new content card. Buttons are *never* anything
but `rounded-full`.

### 4.4 Shadows

Two families, plus modal lift.

- **Hard shelf (interactive):** `shadow-[0_3px_0_#4C9A3A]` for small/medium
  buttons, `shadow-[0_4px_0_#4C9A3A]` for large ones. The dark variant is
  `shadow-[0_4px_0_#14282e]`. This is the site's most recognizable detail —
  a flat, toy-like offset with no blur. Disabled buttons drop it
  (`disabled:shadow-none`).
- **Soft ambient (resting surfaces):**
  `shadow-[0_8px_24px_rgba(31,58,66,0.06)]` on event cards and dashboard
  panels, `0.05` on About cards. Plus `shadow-sm` / `shadow-md` on lighter
  elements.
- **Lift:** `shadow-2xl` on modals and the signup toast. Nothing else.

Never combine a shelf and an ambient shadow on the same element.

---

## 5. Component recipes

Copy these rather than improvising. Classes below are the ones actually shipped.

### Primary button

```jsx
className="px-6 py-3 rounded-full font-display font-bold text-sm
           transition-all duration-300 hover:scale-[1.02] active:scale-95
           cursor-pointer bg-[#6CC24A] text-[#14351F]
           shadow-[0_4px_0_#4C9A3A]"
```

Small variant: `px-4 py-2 text-xs` + `shadow-[0_3px_0_#4C9A3A]`.
Full-width in forms and cards: `w-full py-3` / `w-full py-2.5`.
Disabled: `disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none`
(or `disabled:opacity-60 disabled:cursor-wait` while submitting).

### Secondary button

```jsx
className="px-6 py-3 rounded-full font-display font-bold text-sm transition-all
           cursor-pointer bg-white hover:bg-[#1F3A42]/5 text-[#1F3A42]
           border-2 border-[#1F3A42]/15"
```

### Dark button (rare, high emphasis)

```jsx
className="px-10 py-4 rounded-full font-display font-bold
           bg-[#1F3A42] text-white shadow-[0_4px_0_#14282e]
           hover:scale-[1.02] active:scale-95 cursor-pointer"
```

### Nav pill

```jsx
// active
"px-3.5 py-2 rounded-full text-[13px] font-sans font-extrabold border-2
 bg-[#E4F5DA] text-[#2E7D46] border-transparent"
// idle
"... text-[#4B6169] border-transparent hover:bg-[#1F3A42]/5"
```

Note the `border-2 border-transparent` on both states — it reserves the space so
nothing shifts when the active style lands.

### Content card

```jsx
className="rounded-[28px] border-2 border-[#1F3A42]/8 bg-white
           hover:border-[#1F3A42]/15 transition-all duration-300
           shadow-[0_8px_24px_rgba(31,58,66,0.06)]"
```

With a cover image: `overflow-hidden`, image block `h-44` with
`border-b-2 border-[#1F3A42]/5`, image gets
`object-cover transition-transform duration-500 hover:scale-105`. Body is `p-6`
(or `p-5`) with `space-y-4`, and an internal meta block separated by
`pt-3.5 border-t-2 border-[#1F3A42]/8`.

### Status chip

```jsx
"px-2.5 py-1 rounded-full text-[10px] font-display font-bold"
```

Fill by meaning: `bg-[#6CC24A] text-[#14351F]` (good/plenty),
`bg-[#F2C94C] text-[#4A3900]` (scarce), `bg-[#E4574B] text-white` (gone),
`bg-[#E4F5DA] text-[#2E7D46]` (success/category), `bg-[#1F3A42] text-white`
(neutral category on an image).

### Form input

```jsx
className="w-full p-2.5 rounded-xl text-sm border-2 border-[#1F3A42]/12
           bg-white text-[#1F3A42] placeholder:text-[#9AA6A6] focus:outline-none"
```

Label above it: `text-[11px] font-extrabold text-[#4B6169]`, wrapper
`space-y-1` / `space-y-1.5`. `focus:outline-none` is safe here **only because**
`src/index.css` sets a global `outline: 2px solid #6CC24A; outline-offset: 1px`
on `input:focus, select:focus, textarea:focus`. Don't remove that rule, and
don't add `focus:outline-none` to non-input elements.

Placeholders are friendly and concrete: `e.g. Timothy`,
`e.g. Turtle Rock Elementary`, `parent@example.com`, `e.g. Alex Chen`.

### Modal

```jsx
// scrim
"fixed inset-0 z-50 overflow-y-auto bg-[#1F3A42]/45 backdrop-blur-sm
 flex items-center justify-center p-4"
// panel
"w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl bg-[#FBF7EC]
 flex flex-col justify-between max-h-[90vh] animate-fade-in"
```

Scrim alpha: `/45` for forms, `/50`–`/60` for celebratory or long-read modals
(`backdrop-blur-md` on the lab-log reader). Header strip is `p-5 bg-white
border-b-2 border-[#1F3A42]/8` with a title + one-line subtitle on the left and
a round `X` close button on the right (`p-1.5 rounded-full
hover:bg-[#1F3A42]/5 text-[#4B6169] hover:text-[#1F3A42]`).

Behavior conventions: Escape closes; click-outside closes (guard with
`e.target === e.currentTarget` or `stopPropagation` on the panel); set
`role="dialog"` and `aria-modal="true"` with a label; lock `body` overflow for
full-screen readers.

### Toast

Bottom-right, `fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border-2 px-4
py-3.5 shadow-2xl animate-fade-in bg-[#FBF7EC]`, border `#6CC24A]/50` on
success or `red-400/50` on failure, bold `text-xs` headline + `text-[11px]`
detail + a "Dismiss" button. Auto-clears after **5s**.

### Empty state

Centered in a card with a **dashed** border
(`border-2 border-dashed border-[#1F3A42]/12 rounded-[28px] bg-white`,
`py-12`): a `#9AA6A6` lucide icon, a bold short line, one encouraging sentence,
then a primary button. Copy pattern: state the fact, then point somewhere.
*"No sign-ups yet" → "Spots fill up fast! Explore upcoming events." → [Browse
Upcoming Events]*.

### Progress bar

`w-full bg-[#E4F5DA] h-3 rounded-full overflow-hidden` with an inner
`h-full rounded-full bg-[#6CC24A] transition-all duration-500`.

### Avatar

Header/mobile: `rounded-full bg-[#6CC24A] text-white font-display font-bold`,
first initial uppercased. Dashboard: `w-16 h-16 rounded-2xl bg-[#1F3A42]
text-white text-3xl` — the one place the avatar is a squircle, not a circle.

---

## 6. Motion

Restrained and quick. `motion` is a dependency but is barely used; nearly
everything is a CSS transition.

- **Durations:** `duration-200` (nav), `duration-300` (default for buttons and
  card hovers), `duration-500` (image zoom, progress fill, logo hover).
- **Press feedback:** `hover:scale-[1.02] active:scale-95` on primary buttons;
  `hover:scale-105` on smaller CTAs and card images; `hover:scale-[1.01]` on
  wide in-card buttons. Scale up a hair, scale down decisively.
- **Entrances (small elements):** `.animate-fade-in` — 0.25s, opacity 0→1 with
  a 4px rise. Used on every modal, the mobile drawer, the toast, and FAQ
  answers. **Leave this one where it is** — it is sized for small elements, and
  the page-level version below is deliberately a separate class.
- **Page transitions:** `.animate-tab-in` — 0.32s, opacity 0→1 with a 10px
  rise on `cubic-bezier(0.22, 0.61, 0.36, 1)`. **Every tab gets it**, from one
  wrapper in `App.tsx` keyed by `currentTab`; a page component should not add
  its own. `key={currentTab}` is what makes it replay — React remounts the
  wrapper on a tab change, restarting the CSS animation, which re-rendering
  the same element would not do. Resources used to be the only page with an
  entrance (a bare `animate-fade-in` on its own root, since removed) and is
  what this was modelled on; the larger figures are a deliberate slight
  exaggeration of it, by direct request — 4px is close to invisible across a
  full page, where 10px reads as the page actually arriving.
  - **Home is the one exception**, using `.animate-tab-in-fade` — the same
    timing, opacity only, no rise. Not tidiness: the hero panel is
    `position: fixed` while its scroll sequence is locked, and *any* non-none
    `transform` on an ancestor makes a fixed descendant resolve against that
    ancestor instead of the viewport, which would displace the hero for the
    length of the animation. Opacity creates a stacking context but not a
    containing block, so it is safe. Verified live: mid-animation the panel
    still measures exactly 0,0 × the full viewport.
- **Ambient:** `.lava-bubble` (8s infinite rise) exists for decorative bubbles.
- **Spinners:** `<Loader2 className="animate-spin" />` from lucide, paired with
  a changed label ("Signing up…").

Don't add bounce, spring, parallax, or anything that moves on scroll.

---

## 7. Iconography

**lucide-react**, exclusively. No emoji in UI chrome (the one exception is the
`✔` inside "You're signed up ✔" and the `→` / `↗` arrows in text links).

Sizes: `w-3.5 h-3.5` inline with small text, `w-4 h-4` in buttons and meta,
`w-5 h-5` for section headings and modal closes, `w-6 h-6` in icon tiles,
`w-8`–`w-10` in empty states, `w-16`/`w-20` for confirmation moments. Default
stroke; `strokeWidth={1.5}` only for the oversized confirm-email icon.

Stable icon → meaning pairings (keep these consistent):

| Icon | Means |
|---|---|
| `Calendar` | Events / dates |
| `Clock` | Time / timestamps |
| `MapPin` | Location |
| `Ticket` | Sign-ups |
| `Trophy` | Level |
| `Award` | Achievements |
| `Star` | XP |
| `ShieldCheck` | Membership |
| `FlaskConical` | Games / chemistry |
| `BookOpen` | Announcements |
| `BookMarked` | Resources |
| `ImageIcon` | Gallery |
| `HelpCircle` | About / FAQ |
| `Lock` | Guest limitation |
| `CheckCircle` | Success |
| `ShieldAlert` / `AlertCircle` / `AlertTriangle` | Errors and warnings |
| `LayoutDashboard` | Dashboard (profile dropdown) |
| `LogOut` | Log out |

Icon tiles: `p-3 rounded-2xl bg-[#E4F5DA] text-[#2E7D46]` (or `w-12 h-12
rounded-2xl` centered). Locked/inactive: `bg-[#1F3A42]/5 text-[#9AA6A6]`.

Each of the twelve minigames owns a badge icon — `Orbit`, `FlaskConical`,
`Bot`, `Eye`, `Zap`, `Activity`, `Dna`, `Leaf`, `Telescope`, `Factory`,
`Flashlight`, `ScrollText`. If a game is added, its icon must match between
`VirtualLab.tsx`'s `GAMES` and `Dashboard.tsx`'s `badgeCatalog`.

---

## 8. Imagery

Event and lab-log photos come from the Google Sheet, so the site can't control
their crop — which is why every image slot is fixed-height with `object-cover`
(`h-44` cards, `h-60` modal header) and every `<img>` carries
`referrerPolicy="no-referrer"`.

Over-image text sits on a gradient scrim: `bg-gradient-to-t from-black/60
via-black/10 to-transparent`. Chips over images use solid fills, never tints.

Photos should show **kids doing things** — hands, materials, mid-experiment —
not posed group shots or stock lab glassware.

---

## 9. Voice & tone

**Warm, plain, and specific.** We're a volunteer club talking to families, not
a brand talking to a market.

### Principles

1. **Say the real thing.** "Meetings take place at UCI's Paul Merage School of
   Business (Room SB2-117) every Saturday from 7:00 to 8:30 PM." Not "a
   convenient local venue."
2. **Respect the science.** Game copy names the actual field — "Punnett
   squares, test crosses, and epistasis"; "any topology you build, including a
   Wheatstone bridge." We tell children the true words for things.
3. **Encourage without hype.** "Levels get genuinely harder." "Curiosity is
   welcome here." Never "amazing", "revolutionary", "unleash", "supercharge".
4. **Be honest about limits.** "We only record the student's name and school so
   mentors know who to expect." "You won't receive anything from us until you
   do." "Events you've signed up for from this device."
5. **One exclamation point at a time.** They're reserved for genuine good news —
   "You're signed up!", "Welcome aboard!", "Count Us In!". Never two in a row,
   never in an error message.
6. **Second person.** "You're on the list", "Grab a spot before they fill up."
7. **Short.** Card body copy is one or two sentences. Helper text is one.

### Established phrases — reuse, don't reinvent

| Situation | Say |
|---|---|
| Membership CTA | "Join" / "Join the Club" / "Count Us In!" |
| Event CTA | "Sign Up for This Event" |
| Sold out | "No Spots Remaining" / "Sold Out" |
| Signup confirmed | "You're signed up!" — "*Name* is booked in for *Event*." |
| Join confirmed | "Welcome aboard!" |
| Return login | "Welcome back, *Name*!" |
| Newsletter success | "You're on the list!" / "You're already on the list!" |
| Level up | "Scientist Level Up!" → "Keep exploring!" |
| Level-up dismiss | "Continue experimenting!" |
| Nothing to show | "Check back soon —" + what's coming |
| Generic failure | "Something went wrong. Please try again." |
| Scarcity nudge | "Grab a spot before they fill up!" / "Spots fill up fast!" |

### Terminology

- The UI says **Events**. The code calls them `Mission`s — that's an internal
  legacy name from the template. **Never let "mission" appear in visitor-facing
  copy.**
- **Sign up** (verb) / **sign-up** (noun). Not "register", not "RSVP", not
  "reserve" in UI copy.
- **Guardian** on form labels ("Guardian Name", "Guardian Email"); "parent" is
  fine in prose and in the `parent@example.com` placeholder.
- **Coaches** and **mentors** are the middle/high-school students who teach.
- **Minigames** or **games**, hosted in the **Virtual Lab**.
- **Announcements** and **Lab Log** are distinct: announcements are short
  notices; lab log entries are illustrated write-ups with authors and comments.
- **Discovery XP**, **Level**, **badges**. Scientist titles ladder by badge
  count: *Rookie Researcher* → *Field Scientist* → *Senior Researcher* →
  *Principal Investigator*.

### Punctuation

Em dashes for asides, **with spaces around them** — like this — which is the
house style throughout the site. Real ellipses `…` in
loading states ("Signing up…", "Loading the latest schedule…"). Curly
apostrophes in prose. Serial comma. En dash for ranges ("7–8:30 PM").

### Don't

- No fake urgency or countdowns beyond the true spots-left number.
- No guilt in the newsletter or join flows.
- No jargon aimed at parents ("holistic STEM enrichment pathway").
- No talking down: no "Wow!", no "super fun", no baby talk.
- No claims about outcomes we can't back ("gets your child into a top college").

---

## 10. Email

`newsletter/*.html` are hand-written table-based emails and follow a
**deliberately different technical style** — email clients can't run the site's
CSS.

- **Type:** Georgia/Times serif for the H1, Arial/Helvetica for everything
  else. Baloo 2 and Nunito are *not* used — no webfonts in email.
- **Layout:** `role="presentation"` tables, 540px fixed width,
  `border-radius:16px` card on a `#FBF7EC` body.
- **Color:** the brand palette carries over — `#1F3A42` header bar and
  headings, `#6CC24A` button with `#14351F` label at `border-radius:999px`,
  `#4B6169` body, `#4C9A3A` step eyebrows. Email-only additions: `#3D5259`
  body text, `#FFF4D9` / `#E8B84B` / `#9A7318` / `#5C4A1F` for the caution
  card, `#8FA0A6` / `#5C7078` / `#EAF0F1` in the footer. These have no
  dark-mode counterparts and don't need any — email has no theme toggle.
- **Structure:** preheader div → teal header bar → H1 → body → callout →
  button → practical details → address + unsubscribe.
- **Voice:** same as the site, slightly more direct about logistics. The
  confirm email puts the *spam-folder* step **above** the confirm button on
  purpose — that ordering is a deliverability decision, not a layout
  preference. Don't reorder it.
- Every campaign ends with the physical address and `{{unsubscribe_link}}`.

---

## 11. The minigames are a deliberate exception

`src/components/games/` mostly does **not** follow the light brand. Ten of
the twelve tabs (everything except `ChemTextAdventure`, a link-out with no
panel of its own, and `SFCave`) render as always-dark instrument panels, on
purpose — they read as lab equipment rather than page content.

- **Surfaces:** `bg-[#0d0d12]` panels (also `#0a0a10`, `#070911`) with
  `border border-white/10` — note **1px** borders here, not the site's 2px.
- **Radius:** `rounded-2xl` throughout, not `rounded-[28px]`.
- **Text:** `text-zinc-200/300/400/500` instead of the teal/slate ink.
- **Semantic accents:** `emerald` = correct/go, `amber` = highlight/selected,
  `sky` = information/secondary, `red` = error/hazard.
- **Type:** `font-mono` (which resolves to Nunito, see §3) for readouts and
  numbers; `font-display` for game headings.

The site chrome *around* the games — the section heading, tab grid, and the
`rounded-[28px]` white host panel in `VirtualLab.tsx` — **is** normal brand
style. Only the interior is dark — except in `SFCave`.

**`SFCave` genuinely used the light brand, and tracked the toggle — now
retired along with it (CLAUDE.md's "Theming (dark-only)").** Its `<canvas>`
playfield is a light interior with green walls (matching the real original
PalmOS game's actual look, not a stylistic choice made for this site), so
unlike its eleven siblings it reads `theme` directly in JS (`useTheme()`)
rather than through the CSS override system — that part of the code is
unchanged. What changed is what `useTheme()` returns: it used to swap
between the exact pairs §2.1 documents (Cream ↔ `#12181A`, Forest ↔
`#8FE07A`) as the toggle moved; now that the whole site is dark-only,
`useTheme()` always returns `'dark'`, so `SFCave` always renders that
branch and its light interior no longer actually appears. Ship (Gold
`#F2C94C`), hazard (Alert Red `#E4574B`), and the HUD strip (Deep Teal
`#1F3A42` fill, white label) were already marked "unchanged" in §2.1 and are
unaffected either way. Surrounding chrome (milestone pills, buttons, status
text) still uses the same dark `zinc`/`amber`/`sky` game palette as every
other game.

**Known unfinished work:** `src/index.css` contains `.game-molecule`,
`.game-robot`, and `.game-adventure` scoped rules meant to flip those three
between dark and light chrome with the site theme. Nothing applies those
wrapper classes, so the rules never fire and those games stay dark like the
rest. That's a gap, not a regression — leave it alone unless you're finishing
the feature.

**Titration Lab is a full-page feature, not a minigame.** Unlike the dark
minigames in `VirtualLab`, the Titration Lab top-level page follows the light brand
(§1–10) with complete dark-mode support via `:root.dark` overrides on white cards,
cream panels, and mint active pills, rendering glassware and titration curves
with high contrast in both themes.

**The landing intro (`Hero.tsx`) is also always-dark, and scroll-*input*-
driven rather than scroll-position-driven.** The missions/home tab opens on
one continuous locked panel that plays four "moments" back to back off a
single 0→1 progress value — not separate screens. This went through two
reversals to get here: an earlier pass gave "It's more than just Science."
and "It's a community." their own differentiated panels (own colors, reached
by plain scrolling); that was walked back in favor of one seamless sequence
where everything — text, Join button, background color — visibly
*transitions* rather than cutting. The photo carousel (Moment 4, below) was
then also its own separately-scroll-locked section for the same reason
"It's more than just Science." briefly was — and caused a real bug: because
the main panel is `position: fixed` while locked (see below), it reserves no
document-flow space, so a *separate* section right after it would collapse
to the very top of the page at load and its own scroll-lock hook would
engage immediately, fighting the main one from the first frame. Folding the
carousel into this same panel as a fourth moment — one lock, one `progress`,
one hook — removed that whole class of bug rather than patching around it.

*Moment 1 — Turtle Rock Science Club.* Deep teal-blue gradient `#0B2A2E` →
`#123B38`, which — like the minigames — does not participate in the §2.5
dark-mode override system; it's meant to read as its own moment, not page
content.
Per a hand-drawn reference (`Reference_Photos/`), `TURTLE ROCK` and `Science
Club` are two comparably huge, comparably bold lines — a statement, not a
headline-plus-subtitle — in **Cream** `#FBF7EC` and dark-mode **Forest**
`#8FE07A`. The decorative bubbles are few and large (per a second whiteboard
reference), scattered at rest across the whole panel rather than lined up
along one edge; a flat-cartoon sticker treatment (solid fill, bold outline)
was tried per a potion-flask reference photo and rejected as too graphic —
the intent of that reference was the round "water bubble" *quality*, not a
literal sticker. The current look is soft glass: layered radial gradients (a
small white specular highlight, a faint rim glow tinted with a brand green —
`108,194,74` / `143,224,122` / `168,224,144` as rgb triplets — and a
barely-there overall wash), a hairline translucent edge, and a soft
inset+outer shadow. Kept deliberately low-opacity so the bubbles blend into
the panel's atmosphere rather than sit on top of it as graphics; they're dim
at rest and light up over the same early stretch of progress as the title
and Join button, so the whole scene wakes up together. Bubbles, title and
Join button all *only move on scroll* (no opacity-fade disappearance) —
they leave the same way they arrived, by translating past the panel's
`overflow-hidden` edge.

*The title + Join button leave together, "the same way the bubbles do."*
Once the intro has fully arrived, continued scroll translates the whole
title-and-button group straight up and off — pure position, no fade, same
mechanic as the bubbles — clipped by the panel edge exactly like they were.

*Moment 2 — "It's more than just Science."* Slides up from below into the
exact spot the title group just vacated, overlapping its exit slightly so
there's no dead gap. Sentence case, not all-caps — only the emphasis word
("Science.") is huge/italic/bold, inverting Moment 1's proportions, in
**Gold** `#F2C94C`. The background crossfades from Moment 1's gradient to
**Deep Teal** `#1F3A42` → **Teal pressed** `#14282e` during this exact
transition — colors change *as* the text changes, never before or after.

*Moment 3 — "It's a community."* This is the "find a way to connect them"
transition: "It's" is the one word shared by both sentences, so it's a
single element that arrives with Moment 2 and then never moves independently
— only the second line swaps, "more than just Science." sliding out while
"a community." slides in, synchronized in the same slot (tighter/more
overlapped than the Moment 1→2 cut, since this one is meant to read as
connected rather than a new screen). Emphasis color returns to dark-mode
**Forest** `#8FE07A`, echoing Moment 1. Background crossfades again, to
`#12181A` → `#1B2426` (the site's own dark-mode Cream/White-card values),
during the same swap, and holds through the rest of the panel (Moment 4
doesn't get its own background — it's meant to read as this same moment
taking over, not a new one).

*The whole "It's" + second-line group leaves once Moment 3 has had its
beat* — same mechanic as the title group (translate up + out, clipped, no
fade) — via one combined 4-point transform (`scienceGroupY`) that also
covers the group's entrance, so there's a single motion value for
enter → hold → exit rather than a separate one per edge.

*Moment 4 — the photo carousel, taking over the panel.* Not a strip along
the bottom anymore — it fades in **and** grows from a sliver to ~94% of the
panel's height over the *exact same window* the community text group exits
through (`COMMUNITY_EXIT_START`→`COMMUNITY_EXIT_END`), so the photo wall
visibly replaces the text right as it clears out, per a direct ask ("right
when it's a community goes out of bounds, then the whole screen is taken up
by this"). Before that it isn't just invisible, it's also small — both
`height` (via `useMotionTemplate` around a `%`-valued `useTransform`) and
`opacity` are driven off the same range, so nothing about the carousel
competes with the text for space while the text is still the point. This
also incidentally fixed an earlier complaint that the settled community
heading "wasn't really centered" — it was always centered
(`inset-0 flex items-center justify-center`), it just used to visually
compete with a permanently-visible carousel sliver below it; with the
carousel now invisible until the text is done, the centering reads
correctly on its own.

This carousel has gone through four builds. A flat horizontal strip, then a
masonry wall with per-card diagonal drift, were both replaced after reading
wisprflow.ai's own testimonial-wall script directly (their site is Webflow +
a public custom script, `wave-slider.js` — fetched and read via
`curl`/`WebFetch` rather than guessed from how a screen recording of it
looked, since those first two attempts, going only off what it visually
looked like, weren't faithful to the actual mechanic). That script turned
out to use a shared-3D-perspective "orbit": every card centre-anchored,
independently swept left→right while pitching through `rotateX` around a
`transform-origin` pushed behind it in Z. Ported faithfully — same
`x`/`rotateX` on the same element, matching the reference's structure — it
shipped **broken**: putting the sideways `x` and the pitch `rotateX` on one
element composes them (translate happens first, then rotate operates on an
already-hundreds-of-pixels-away point around that Z-shifted origin), which
swings a card by nearly a full viewport height vertically once it's any
real distance from centre. Cards were rendering, just entirely off-screen —
confirmed by reading `getBoundingClientRect()` on the live cards in Chrome,
not assumed. A first fix (splitting `x` and `rotateX` onto nested elements
so rotation always happens around a local, untranslated origin) reduced but
didn't eliminate the blowup, and under real time pressure to ship something
*working*, the 3D pitch was dropped entirely rather than debugged further.

**Current version: scale + opacity + a safe diagonal, no 3D.** Each card
independently sweeps the full panel width (`x`, `travelHalf`) and *also*
drifts vertically
(`y`, via `LANE_Y_BASE` + a per-card-index "lane" offset) — two independent
linear translates on the same element, which is safe precisely because
neither is a rotation: nothing to compose into a runaway the way `x` +
`rotateX` did. This is what actually delivers "diagonal" after the 3D pitch
was dropped — a request to bring the diagonal look back specifically, once
reliability was no longer in question. Cards also scale down and fade
toward the edges (`EDGE_SCALE` 0.72, `EDGE_OPACITY` 0.35), full size/fully
opaque centred, and are sized larger than the first pass (`lg` 300×360,
`sm` 300×200 at `sm:` breakpoint) per a direct ask to make them bigger once
they were reliably visible. Revisit the nested-element split from the 3D
attempt if the pitch is wanted back on top of this — but re-verify with
real `getBoundingClientRect()` numbers at several progress values before
trusting it, the way the original bug was actually found, not assumed.
`CAROUSEL_CARDS` still mixes `lg`/`sm` sizes (Wispr's own mix of case-study
and quote cards) with brand-recolored bg/ink pairs, each reusing an
already-documented combination from §2.2 (Cream, Mint/Forest, Club
Green/Deep Leaf, Gold/Gold-ink, Seafoam) rather than Wispr's own palette.
Each card's own sweep window (`half` in `CarouselCard`) is deliberately
wide relative to its slot — currently 2.4x the even spacing between card
centres, bumped up from an initial 1.15x once that read as too disjointed
(a visible gap between one card leaving and the next arriving, rather than
several always overlapping mid-sweep, so cards feel connected/continuous
rather than appearing one at a time) — matching the reference's density.
Swap the icon tile for real photos later; nothing about the mechanics
needs to change to do that.

Critically, the page itself never physically scrolls during any of this:
`useHeroScroll.ts` puts `<html>` in `overflow: hidden` for the whole
sequence and intercepts wheel/touch/keyboard scroll input directly.

**Scrolling scrubs; letting go settles.** Scroll input moves the sequence
along a *moment axis* — an integer is one of the eight resting frames in
`HERO_STOPS`, a fraction is that far through the hand-off leading to the next
one — at `WHEEL_PER_STEP` (420px) per moment, so the whole sequence is
~2940px, about three and a half screen-heights. **`WHEEL_PER_STEP` is the
resistance dial, and the only one** — `CATCH_UP` below is lag, not
resistance, and `MAX_STEPS_PER_SEC` caps pace, not effort. It has been walked
up on direct request in deliberately shrinking steps, 260 → 300 → 380 → 420,
each asked for after trying the last — a value being converged on by feel, so
prefer another small step over a fresh guess. `TOUCH_PER_STEP` (155px) moves
with it at the ratio the two were tuned together at, so raising one alone
doesn't quietly leave phones looser than desktops. Motion tracks the gesture
the entire time it is happening. When scrolling goes quiet for `IDLE_MS` (120ms), the target
becomes the nearest moment and the *same* glide that was following the
gesture carries it there — settling is not a second animation layered on top,
which is why it never reads as a snap after a scroll. `SNAP_BIAS` (0.35)
decides which way: a third of the way into a hand-off in the direction you
were travelling commits forward, less than that eases back. Biased by
direction rather than rounded to nearest, so a deliberate short scroll still
advances instead of springing back for being a shade under halfway.

Nothing caps how far one gesture may travel — keep scrolling and you keep
going. What is capped is the *pace*: `MAX_STEPS_PER_SEC` (2.8, divided by the
hand-off's own weight) is what turns a hard flick into a fast readable sweep
instead of a blur, and `CATCH_UP` (0.16 per 60fps-equivalent frame) is the
trailing lag that makes motion glide to a stop rather than stopping dead with
the gesture. **These two were picked by simulating the loop, not by eye**: one
moment from a standing start is 90% travelled at 367ms and fully settled at
583ms, ranging 300ms for a spotlight roll to 467ms for the finale; a ~2900px
hard flick sweeps all seven hand-offs in ~2.5s. Raise `CATCH_UP` to shorten
the tail, raise `MAX_STEPS_PER_SEC` to quicken the whole move without
touching the tail.

**Both halves are load-bearing, and each is the fix for a symptom the other
caused.** This is the third design, and the two before it each solved half of
it:

1. *A pure scrub* — wheel deltas accumulating into a position the visuals
   chase. Its `LOCK_DISTANCE` was retuned some ten times without ever landing
   (short, and one flick blew through everything; long, and getting anywhere
   was a chore), and underneath both was a fault no distance setting touched:
   a scrub can stop *anywhere*, including halfway through a hand-off, leaving
   the visitor in front of two half-faded things at once.
2. *Pure snapping* — input tripping a threshold that then played a step at
   the visitor. That fixed the landing, and broke the feel: nothing moved
   with the gesture, and it was reported straight back as **"too abrupt."**
   That is not a curve that can be softened — it is structural. Nothing moved
   at all until a step's worth of scroll had accumulated, and then an
   animation ran on its own.

So: scrub for the feel, settle for the landing. Scrolling always moves
something, immediately and proportionally; letting go always resolves to a
composed frame.

**The opening beat is the first hand-off, not a mount animation.** Bubbles
rising, the title lighting, the Join button arriving — `HERO_STOPS[0]` is
progress 0 with none of that done yet, and the visitor's first scroll is what
does it. Auto-playing it on mount was tried during the snapping design (a
snap cannot rest on a half-finished frame, so the beat had nowhere to live)
and was reported immediately: *"what happened to the bubbles in the
beginning? it just automatically goes up now."* A scrub can rest mid-beat, so
it went back on the axis with everything else. The "Scroll" hint holds through
that whole beat and the lit-title moment after it, leaving with the title —
it used to vanish by progress 0.007, which on a scrub means the instant the
visitor so much as twitches the wheel.

`useSectionScroll.ts`, the generic hook that once got the identical scrub
treatment so the two would feel like one site, is gone along with
`ThreeThings`'s own lock (see above).

Two further details:

- **Scrolling covers only the *active window* of a hand-off, never the holds
  around it.** Every moment here is a short transition with a long deliberate
  beat on either side. If scrolling covered the whole span between two stops,
  most of it would be spent inside those beats, where by construction nothing
  moves — scrolling would feel like a pause, a flurry, then another pause. So
  `HERO_TRANSITIONS[i]` names just the sub-range that animates, stretched
  across a whole unit of the moment axis, and the holds cost nothing to
  cross. That skip is invisible *because* it lands in a hold: every transform
  in `Hero.tsx` is flat across it. **A new keyframe that spans a hold breaks
  that** — `sceneOpacity` was exactly this bug, fading the orbit-ring backdrop
  out across the entire Science beat, and had to be moved onto the morph
  window. Keep new keyframes inside a window.
- **The tables live in `Hero.tsx`**, next to the phase constants they are
  built from, and are the only thing the hook imports from it. Two invariants
  the hook relies on: `HERO_TRANSITIONS[i].to === HERO_STOPS[i + 1]`, and
  `HERO_TRANSITIONS[i].from >= HERO_STOPS[i]`.

**Performance: the home tab has more moving parts than any other page, and
four things were making it feel heavy** — reported as laggy with "a little bit
of skippiness." None of these changed how anything looks:

1. **The animation loop parks itself.** It used to run at 60fps for as long
   as the home tab was mounted — sitting still on a moment, and *also* after
   the sequence had unlocked and the visitor had scrolled well past the hero
   to read the page. Every one of those frames pushed an unchanged value
   through ~30 `useTransform`s and back out as ~30 style writes. It now stops
   when nothing is moving and input wakes it (`wakeRef`); waking resets the
   frame clock, or the first frame back would read the whole idle period as
   one enormous delta.
2. **A dropped frame no longer becomes a jump.** Motion is delta-time
   normalised so it runs at the same speed on any refresh rate, which also
   means one slow frame advances everything by however long it took —
   precisely what a skip looks like. `MAX_FRAME_MS` caps the believed frame
   at two frames' worth (was four), so a janky stretch reads as a slight
   slow-down instead of a lurch.
3. **The photo carousel stops painting when it isn't on screen.** An
   `opacity: 0` element is still composited every frame, and this one is a
   viewport-wide strip of twelve photos on a permanently running marquee —
   paid for through the two moments before it arrives and every moment after
   it leaves. It now flips to `visibility: hidden` and pauses its animation,
   both driven off the same MotionValue as its opacity so it costs no
   re-renders.
4. **The bundled photos were 2–3x oversized.** Carousel cards render at most
   400 CSS px wide but shipped 1024–1400px images; three-things the same.
   Resized to 800px / 900px (originals still in `Photo_Carousel/` and the
   repo-root `*.jpeg` files), which halves the bytes and cuts decoded bitmap
   memory by roughly three. **Check this when adding a photo** — the display
   size, not the source size, is what it should be exported at.

The three groups that translate during the sequence (`titleGroupExitY`,
`scienceGroupY`, `cardsEnterY`) carry `will-change: transform` so the
compositor moves an already-painted layer instead of repainting. Kept to
those three deliberately; will-change costs memory per layer.

Two costs were left alone on purpose, both because removing them would change
the design: the `blur(0→10px)` focus-pull on the two huge statement lines
during the morph, and the header pill's `backdrop-blur-xl`, which re-blurs
whatever the hero is doing underneath it. The pill is small, so its area cost
is modest.

The per-moment dial is `HERO_TRANSITIONS[i].weight`, since these windows are
not equally busy. A heavier hand-off costs proportionally more scrolling to
cross *and* sweeps past more slowly on a flick, because the hook divides its
speed ceiling by the same number. 1.0 is the norm: the opening title→Science
hand-off is two full-height slides plus a four-word cascade (1.25); the
spotlight roll is a single crossfade between two columns and feels sluggish
given the same room (0.75); the finale stacks a fade-out, the bubbles' return
and two staggered entrances (1.35). Use these for the *balance* between one
moment and the next; use `WHEEL_PER_STEP` / `MAX_STEPS_PER_SEC` when the
whole sequence is off.

**A third friction pass targeted the Science/Community moment specifically,
rather than the whole sequence again** — history now, but the phase
constants it produced are still the live ones, and `HERO_STOPS`/
`HERO_TRANSITIONS` are built directly out of them, so the rescale
reasoning below still explains why those numbers are the shape they are. Even after the global 2600→5500
`LOCK_DISTANCE` bump above, visitors could still blow through "It's more than
just Science." → "It's a community." in one scroll gesture — the fractional
window those two holds and the morph between them occupied
(`SCIENCE_ENTER_START` through `COMMUNITY_EXIT_END`, ~0.107→0.408 of the
whole 0→1 progress) was too small relative to how long a visitor actually
needs to read two full statements and register the swap between them. Rather
than growing `LOCK_DISTANCE` again and letting every phase get
proportionally more room (which would have made Moment 1's bubbles/title and
the carousel finale unnecessarily slower too, solving a problem they didn't
have), every one of Hero.tsx's phase constants was rescaled by hand: convert
each existing fraction to its absolute pixel position at the old
`LOCK_DISTANCE` (5500), keep Moment 1's (`BUBBLE_END` through
`TITLE_EXIT_END`) and the carousel's absolute pixel *durations* unchanged,
substantially widen just the Science-hold, morph, and Community-hold
durations (each roughly 4x, 2.5x, and 4x respectively), then convert
everything back to fractions of the new total (8150). `LOCK_DISTANCE` in
useHeroScroll.ts grew 5500 → 8150 to match — that number isn't a round tuned
value, it's the sum this rescale produced. `Header.tsx`'s pill-reveal
range (`revealOpacity`/`revealY`), which tracks Moment 1's old
`CTA_START`/`CTA_END` window as a separately-tuned local range (see its own
comment on why it isn't an import), moved from `[0.025, 0.065]` to
`[0.014, 0.035]` in the same pass — this is the "must be re-checked whenever
Hero.tsx's phase constants are rescaled" drift its comment already warned
about, now actually re-checked.

**The same pass enlarged the big statement text**, per the whiteboard
reference (`Reference_Photos/IMG_0255.HEIC` for "TURTLE ROCK" spanning
edge-to-edge; `IMG_0257.HEIC`/`IMG_0258.HEIC` for "It's a community." at a
fairly uniform, large size across both words) — these had been sized with
Tailwind's fixed `sm:`/`md:`/`lg:` rem classes (`text-7xl`…`text-9xl`), which
*plateau*: below `sm` they scale with `vw`, but at `sm` and up they lock to a
flat rem value regardless of how much wider the viewport keeps getting, so on
any real desktop monitor the text reads far smaller relative to the screen
than the sketch's edge-to-edge intent. Fixed by switching every one of these
to `vw`-based arbitrary values at every breakpoint (`text-[Nvw]` all the way
up, tapering the ratio down at each breakpoint rather than freezing it) so
size keeps scaling with viewport width instead of capping out: "Turtle Rock"
(`text-[20vw] sm:text-[17vw] md:text-[15vw] lg:text-[13vw]`), "Science Club"
and "a community." (`text-[17vw] sm:text-[14vw] md:text-[12vw] lg:text-[10vw]`,
matched to each other since both are short, similar-length phrases per the
sketch). "more than just Science." deliberately did **not** get the same
ratio — at 24 characters it's roughly double the length of "a community."
(12 characters), and giving it the same aggressive `vw` scale risks it
overflowing real viewport widths outright rather than just looking smaller;
it's sized to roughly half the short lines' ratio instead
(`text-[10vw] sm:text-[8vw] md:text-[7vw] lg:text-[6vw]`), still
meaningfully bigger than its old `text-6xl`…`text-8xl` cap but scaled to its
own length rather than matching its (much shorter) sibling line. Because
"a community." now sits at a visibly larger font size than "more than just
Science." while still being absolutely `inset-0`-stacked in the same box
(sized by the Science line, the shorter of the two as the normal-flow
child), it picked up explicit `flex items-center justify-center` — without
that it would render top-aligned instead of centered whenever its larger
natural height exceeds that box, since `inset-0` only stretches the box
dimensions, it doesn't hand you vertical centering for free. **Verified
live** at both 1440px and ~1024px widths (the Chrome extension reconnected
after being unavailable for the first draft of this pass): neither line
wraps or clips at either width, and "a community." renders correctly
centered despite its larger size than its sibling line.

**A fourth pass fixed the carousel→ThreeThings handoff, which had three
separate real problems, not one.** Diagnosed by reading the actual
mechanics rather than guessing (the Chrome extension was unavailable when
these were found and fixed, though the panel-exit-fade CSS itself was later
confirmed benign by the reasoning below, not by pixels):

1. *"Paused at the end, have to scroll more."* Once `progress` reaches 1,
   Hero's locked panel unlocks and becomes a normal `relative h-screen`
   block sitting directly above `ThreeThings` in flow. Nothing about it
   changes after that — it's a fully static, fully opaque screen-height
   block — so the visitor has to blind-scroll one entire viewport-height of
   native scroll past it before `ThreeThings` (parked immediately below)
   even starts to appear. That dead, unanimated scroll is the "pause," and
   it's also why it read as scrolling *down to* the cards rather than the
   cards visibly *rising up*: nothing was doing the latter. Fixed with a
   `useScroll({ target: panelRef, offset: ['start start', 'end start'] })`
   in `Hero.tsx` tied to the panel's own ref — real scroll position, not the
   captured `progress` MotionValue, since that value's job is already done
   by the time this matters. `['start start', 'end start']` is exactly one
   screen of native scroll (panel top hitting viewport top → panel bottom,
   one `h-screen` down, hitting viewport top), and it reads a constant ~0
   the entire time the panel is still `fixed inset-0` and locked, because a
   `fixed` element's `getBoundingClientRect()` never moves against scroll —
   confirmed by reasoning through Framer's `offset` semantics, not by
   testing, but the geometry here is unambiguous. `panelExitOpacity`
   (1→0 over the first 80% of that scroll) and `panelExitY` (0→-120px over
   all of it, layered on top of the scroll itself, not replacing it) are
   applied directly on the `motion.section`, so it now visibly fades and
   slides away as you scroll that span, instead of sitting frozen.
2. *"The first card is already off."* (Items 2 and 3 here describe
   `useSectionScroll.ts`, the separate lock `ThreeThings` used back when it
   was its own scrolled-to section. That file no longer exists and the cards
   are a moment inside Hero's own sequence now — kept because the two
   problems below are the ones any second scroll-captured section would hit
   again.) `ThreeThings`' own scroll-lock engages the instant its top crosses the trigger
   line — but a real trackpad flick keeps delivering momentum `wheel` events
   for a while after the gesture that caused that crossing, and those
   leftover events land on the section's wheel listener the moment it
   attaches, immediately shoving `target` away from 0 before the visitor has
   even registered arriving. Fixed with `ENGAGE_GRACE_MS = 250`: wheel/touch
   input is swallowed (still `preventDefault`ed, so it doesn't leak into a
   native scroll — just not turned into progress) for 250ms after the
   idle→active transition, giving residual momentum from the *triggering*
   gesture somewhere to go besides `target`.
3. *"Hard to read while transitioning, should feel abrupt."* `useSectionScroll.ts`
   had been given the exact same `CATCH_UP` (0.04) as `useHeroScroll.ts`
   specifically so the whole site felt like one consistent resistance — see
   the friction-pass note above. That's wrong for a card mid-rotation/
   mid-exit specifically: unlike text easing toward its final resting spot,
   a half-rotated, half-slid-out card is genuinely hard to read, and a slow
   catch-up meant that half-state lingered long after the visitor stopped
   scrolling. `CATCH_UP` for this hook alone is now `0.35` — still a couple
   frames of smoothing so a full 1:1 jump doesn't look like a glitch, but
   settling in ~15-20 frames instead of ~140. This is a deliberate,
   documented divergence from Hero's resistance philosophy, not a
   regression of the "keep both hooks feeling consistent" decision above —
   this section was explicitly asked to feel different (fast/abrupt) from
   the rest of the site's "premium/resistant" scroll story.
   `LOCK_DISTANCE` (total friction/resistance) was left untouched at 1900;
   only the per-tick readability of the transition changed.

**A fifth pass scrapped the photo carousel's own "Moment 4" entirely** — it
used to be a separate full-panel takeover that grew from a sliver to 94% of
the panel's height as "It's a community." left the screen, with each card on
a `y`-drift "diagonal" alongside its `x` sweep (see the friction/diagonal
history above). Both of those are gone per direct request: back to a plain
sideways-only sweep (no `y` at all), and the carousel is now a small fixed
strip (`h-[130px] sm:h-[170px]`) that sits directly below "a community." on
the *same* screen, inside the *same* `scienceGroupY`-driven group as the
text, rather than replacing it after it leaves. Concretely: `carouselOpacity`
now fades 0→1 over the exact same `[MORPH_START, MORPH_END]` window the text
itself swaps through (arriving *with* "a community.", not after it), and
because the strip is a JSX child of the text's own wrapper `motion.div`
(`style={{ y: scienceGroupY }}`), it automatically rides along on that same
shared exit-translate at `COMMUNITY_EXIT_START→END` — it leaves the screen
together with the text rather than outliving it, with no separate exit logic
needed. Removing the old full-panel phase (previously `CAROUSEL_START=0.6`
through `CAROUSEL_END=1`, a dedicated 3260px scroll budget on top of the old
8150 `LOCK_DISTANCE`) meant the sequence no longer needs that tail at all —
`COMMUNITY_EXIT_END` is now `1` (the group's exit *is* the end of Hero's
locked sequence), every earlier phase constant was rescaled to preserve its
*absolute* pixel pacing under a smaller total, and `LOCK_DISTANCE` dropped
8150 → 4890 to match (see its own comment in `useHeroScroll.ts` — this is
bookkeeping, not a new friction tuning pass). `CAROUSEL_START`/`CAROUSEL_END`
survive as names, just repointed to `MORPH_END`/`COMMUNITY_EXIT_END` — the
card-sweep window during which cards are staggered across the strip.

**The carousel is now wired to real content, not just placeholder tiles.**
Per CLAUDE.md's content pipeline, the Sheet already has a hand-edited
**Photos** tab (`Title`, `Image URL`, `Caption`, `Category`, `Submitted By`,
`Show on Site`) that publishes into `content.photos` (`GalleryPhoto[]`,
`useSiteContent.ts`'s `toGalleryPhotos`) — until now its only consumer was
`PhotoGallery.tsx`. `Hero.tsx` takes the same `content.photos` as a new
`photos` prop (passed from `App.tsx`) and, when it's non-empty, maps every
entry straight to a card showing its real `imageUrl` (same `<img
className="object-cover" referrerPolicy="no-referrer">` treatment
`PhotoGallery.tsx` already uses, for consistency) instead of a colored icon
tile — every published photo gets a card, not just a fixed sample. The old
hardcoded `CAROUSEL_CARDS` array is now `PLACEHOLDER_CARDS`, a true empty
state (shown only when nothing's been published yet), matching the "no
bundled fallback content" rule elsewhere in this codebase — these tiles
never pretend to be real photos, they're a visibly generic "Photo" icon
placeholder. Net effect for maintainers: adding a photo to this carousel is
now the exact same act as adding one to the Gallery tab — add a row to the
Photos tab in the Sheet (an "Image URL" is any public image link — a Google
Drive share link works once its sharing is set to "Anyone with the link"),
then 🐢 Website ▸ Publish to Website — no code change, no separate mechanism
to learn.

**A sixth pass made card size and travel distance real functions of the
actual screen, not fixed numbers.** Two things were wrong before: cards were
sized with Tailwind breakpoint classes (`w-[180px] ... sm:w-[220px]`, a step
function, not "dynamic"), and `travelHalf` (how far each card slides from
center) was `viewportWidth * TRAVEL_VW` (`0.85`) — an arbitrary ratio picked
by feel, not derived from anything. Combined with the strip's old
`max-w-3xl` cap, cards would hit the *container's* clipping edge (768px,
centered — nowhere near the actual screen edge on any normal monitor) while
still at `EDGE_OPACITY` (`0.35`, not `0`) — a visibly-opaque card sliced by
`overflow-hidden` well inside the visible screen, which read as an abrupt
cutoff rather than an exit. Fixed with three changes together, all in
`Hero.tsx`:
1. The strip's `max-w-3xl` is gone — it's genuinely `w-full` against its
   `absolute inset-0` ancestor (which itself already ignores that ancestor's
   `px-4`, since an absolutely positioned element's containing block is the
   padding box, not the content box — confirmed by the CSS spec, not by
   pixels, though the geometry here isn't in question), so the clipping
   boundary really is the screen edge.
2. `cardWidth` is now `Math.min(400, Math.max(200, viewportSize.width *
   0.26))` — a continuous function of the *actual measured* viewport width
   (clamped to a sane 200–400px range so it doesn't get silly on a tiny or
   enormous screen), not a handful of breakpoint snapshots. `cardHeight` is
   `cardWidth * 0.68`, keeping the old ~3:2 landscape ratio. Both are passed
   down and applied as inline `style` widths, not Tailwind classes, so the
   exact same number used to size the card is also the number used to
   compute its travel (no drift between a CSS breakpoint and a JS
   assumption).
3. `travelHalf` is now `viewportSize.width / 2 - cardWidth / 2` — pure
   geometry (half the screen minus half the card), not a tuned ratio. A
   card's outer edge lands exactly on the screen edge at full travel,
   automatically, for any combination of screen size and card size.
   `EDGE_OPACITY` also dropped `0.35 → 0`, so — since opacity and `x` share
   the same `[enter, center, exit]` keyframes — a card is fully transparent
   at the exact same progress value it reaches that edge, not still 35%
   visible. The two together are what actually fixes "abruptly cut off":
   geometry alone would still have clipped a partially-opaque card; opacity
   alone would still have faded out well short of (or well past) the real
   edge on some screen sizes. Needed both.

**A seventh pass removed a fix that had become the bug it was originally
written to solve, plus fixed a real spatial-collision regression from the
"no diagonal" request two passes back.**

1. *"So much black space before the cards."* The real-scroll-linked panel
   exit fade (`useScroll` + `panelExitOpacity`/`panelExitY`, added in the
   fourth pass above) was written when the carousel was still a full-panel
   takeover that hadn't finished exiting by the time Hero unlocked — fading
   it over a real screen-height of native scroll gave the visitor something
   to actually see happen instead of a frozen block. The very next pass
   (fifth, above) moved the carousel to exit *during* the locked phase,
   riding along on `scienceGroupY`'s translate before `progress` ever
   reaches 1 — which quietly made that fade mechanic obsolete: by the time
   Hero unlocks now, the panel has nothing left in it, so the fade was
   fading emptiness over a whole extra screen of scroll, reintroducing
   (worse than before) the exact "have to scroll a lot through nothing"
   complaint it was built to fix. Removed entirely, along with the
   `useScroll`/`panelRef` it depended on. The panel's height once unlocked
   also shrank from `h-screen` to `h-[18vh] min-h-[120px]` — it doesn't need
   to reserve a full screen for content that's already gone, and doing so
   was the other half of the dead-scroll gap. `ThreeThings.tsx`'s own
   `whileInView` entrance still gives the cards a slower, softer pop-up on
   arrival — removing the gap didn't remove that, it just removed the empty
   scroll *before* it.
2. *"Photos overlapping."* Each `CarouselCard`'s enter→center→exit window
   used to be far wider than its slot (`half = spacing * 2.4`), so several
   cards were always mid-sweep simultaneously — deliberate, described above
   as keeping the stream feeling continuous. That was fine under the old
   "diagonal" design (each card also had its own vertical lane offset,
   `laneY`), where overlapping-in-*time* cards were still visually
   separated in space. The sixth pass's "no diagonal, sideways only"
   request (scrapping `laneY`) turned that same time-overlap into a literal
   space-collision: every card now shares one horizontal centerline, so two
   cards mid-sweep at once visibly cross through each other. Fixed by making
   the windows exactly back-to-back instead: `half = spacing * 0.5` is the
   exact value where card i's exit lands precisely on card i+1's enter — one
   card finishes leaving the instant the next starts arriving, no gap, no
   simultaneous overlap. Card size itself (the `cardWidth`/`cardHeight`
   formulas from the sixth pass) is untouched — "no overlap" came entirely
   from re-timing the windows, not shrinking the photos.

**Gotcha:** the title/Join group's and the Science/Community group's exit
travel (`exitTravel`/`enterTravel` in `Hero.tsx`) is measured off the
actual viewport height (`1.3×`, with a `FALLBACK_TRAVEL` of 900 before the
first measurement), not a flat number. A flat 560px shipped broken on any
screen taller than that: the group would translate up by exactly 560px and
then just stop, still fully visible, "floating" at the top of the panel for
the rest of the sequence instead of clearing it — the Join button never
actually disappeared, it just stopped moving. Don't reintroduce a fixed
px constant here.

**`ThreeThings.tsx`, right after Hero's locked panel — "the three things you
gain."** Per a hand-drawn reference (`Reference_Photos/`): Learn / Explore /
Join a community, each on its own card in a neat stack — explicitly *not*
meant to read as literal playing cards, just rounded, shadowed "paper"
sitting on paper. Only the emphasis word/phrase is italic (`font-hero`,
matching the rest of the scroll story's big-statement type), the rest of
each line is a plain sentence: "*Learn* about science.", "*Explore* your
interests in STEM.", "*Join a community* of like minded people." The last
card's bg/ink is Club Green/Deep Leaf rather than another pastel — a
deliberate callback to the community moment this section follows, since
"join a community" is the payoff of the scroll story so far.

The whole stack rises into view (`whileInView`, plays once, independent of
and before the scroll-lock below engaging) as the section scrolls into
frame, rather than abruptly just being present the instant you arrive — an
early version had no entrance at all and read as a static, jarring cut. The
front card then leaves to reveal the next one — but *not* the rest of the
site's up-and-out convention: per a direct ask, a card leaving here slides
off to the right while rotating clockwise (`EXIT_X`, `EXIT_ROTATE`),
"like flicking the top card off a deck," a deliberate departure since this
section is specifically about a physical card stack. The next card
animates in from its "peeking behind" rest offset to front-and-center over
that same window.

**Historical — this is no longer how the cards are reached.** They are the
fifth, sixth and seventh moments of Hero's own sequence now, and
`useSectionScroll.ts` has been deleted; what follows describes the
independent section they used to be. Unlike Hero's own panel, this section
was reached by ordinary scrolling — it had its own scroll-captured moment via
`useSectionScroll.ts`, a
generalized, reusable version of the bidirectional lock the photo carousel
used before it was folded into Hero.tsx's single sequence. It's safe to use
standalone here (unlike that earlier attempt) because this section isn't
the *immediate* sibling of a `position: fixed` element — Hero's locked
panel is long since unlocked and back in normal flow, with real in-flow
content between them, by the time a visitor scrolls this far, so the
"collapses to the top of the document at load" failure mode that bit the
carousel doesn't apply.

**Gotcha (the "can't scroll back up" bug):** the idle-phase watcher used to
check *"is the section's edge at the trigger line right now"* rather than
*"did it just cross into the trigger line"*. Since `overflow: hidden` holds
the section's rect perfectly still for the whole time it's locked, the
instant progress was exhausted at either end and control was handed back,
the section was still sitting exactly at the trigger line it had been
engaged from — a level check saw that unchanged position and re-locked
immediately, before the visitor had scrolled anywhere, trapping them at
whichever end they'd just reached. Fixed by seeding the "previous position"
from the section's rect at the moment idle starts, and requiring an actual
move away from the trigger zone before a later approach counts as a
crossing back in. Verified live (not just reasoned about): drove forward
through the whole stack, past it into the welcome section below, back up
to re-approach from below, reversed all the way back out past the top, and
confirmed normal scrolling resumed each time. Bidirectional and repeatable,
matching how the rest
of the scroll story already behaves: scrolling back up un-reveals the cards
in reverse.

---

## 12. Accessibility

- Interactive elements are real `<button>`s and carry `cursor-pointer`
  explicitly (Tailwind v4 doesn't set it by default).
- Icon-only buttons need `aria-label` **and** `title`.
- Modals: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` or
  `aria-label`, Escape to close, focus the first input on open.
- Inputs get a real `<label>` (or `aria-label` where the label is visual
  context, as in the newsletter box), plus `autoComplete` where it applies
  (`name`, `email`, `organization`).
- Never remove the global green focus outline.
- Don't encode meaning in color alone — the Sold Out chip says "Sold Out", the
  success chip says "Signed up", the unlocked badge says "UNLOCKED".
- Decorative images take `alt=""`; the logo and content images take real alt
  text.

---

## 13. Checklist for anything new

1. Wrapped in `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` with `py-10`.
2. Heading is `font-display font-bold tracking-tight`; body is
   `font-sans leading-relaxed`.
3. Every color is from §2.1, **and** every new `text-[#hex]` / `bg-[#hex]` is
   in the `:root.dark` list in `src/index.css` (or is one of the intentional
   exceptions).
4. Cards: `rounded-[28px] border-2 border-[#1F3A42]/8 bg-white`. Buttons:
   `rounded-full` with the green shelf shadow.
5. Icons are lucide, at a size from §7, reusing the established meanings.
6. Copy is sentence case, second person, one sentence where one will do, and
   uses the established phrases.
7. Guests can see it. Only XP, badges, and levels are member-gated.
8. Checked in **both** themes and at 375px wide.
9. `npm run lint` (`tsc --noEmit`) and `npm run build` both pass.
