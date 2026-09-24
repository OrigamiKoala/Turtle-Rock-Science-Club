# Titration Lab — implementation plan

**Status:** planning. No code written yet.
**Goal:** a browser-based acid–base titration simulator on **its own top-level
page** (not a Virtual Lab minigame tab), built as a guided learning experience:
real equilibrium chemistry, realistic glassware, several reagent options, and
endlessly repeatable mystery unknowns that can be strong or weak acids or bases,
titrated against strong or weak titrants.

---

## 0. Scope decisions (read these first)

| Decision | Choice | Why |
|---|---|---|
| Where it lives | New top-level tab `titration` in `App.tsx` / `Header.tsx` | User asked for its own page. It is a curriculum, not a 60-second minigame. |
| Brand | **Light brand** (STYLE.md §1–10), *not* the dark instrument-panel exception of §11 | §11's dark chrome is scoped to `src/components/games/` inside VirtualLab's host panel. A top-level page is page content and follows the normal cream/white/teal system. |
| Progress storage | New key `tr_sc_titration_progress` | `GameProgress` is `Record<GameId, number[]>` and is owned by `VirtualLab.tsx`. Titration needs per-module state (trials, notebook rows, best % error), which does not fit `number[]`. |
| `GameId` | **Do not add one** | Deliberate. Anyone later "harmonizing" this into `GameProgress` would have to throw away the notebook. Noted in CLAUDE.md so it isn't undone. |
| XP / badges | Same `handleUpdateXp(xp, badge)` App already passes to `VirtualLab` | Keeps one XP path. Guests can do everything; only members bank XP (STYLE.md §13.7). |
| Difficulty | Two tracks per module: a **Basic** path (do the titration, watch the colour flip, read the answer) and a **Go deeper** expansion (the arithmetic, pKa from the curve, indicator error) | The audience is elementary students *and* their guardians/coaches. Titration maths is high-school; the apparatus and the colour change are not. Splitting the track lets a 9-year-old finish a module and a 15-year-old still be challenged. |

---

## 1. The chemistry engine — `src/components/titration/chem.ts`

Pure TypeScript, no React. This is the part that has to be *right*; everything
else is presentation.

### 1.1 One general solver, zero per-level special cases

Reject the textbook piecewise approach (before / at / after equivalence with a
different formula each). It is wrong near equivalence, wrong for dilute
solutions, and needs a new branch for every combination the user asked for.

Instead: model everything as **polyprotic acid systems plus spectator ions**,
and solve the exact charge balance numerically.

Every dissolved substance becomes one `AcidSystem`:

```ts
interface AcidSystem {
  /** Total analytical concentration, mol/L, after dilution. */
  F: number;
  /** Stepwise dissociation constants, most acidic first. Empty = strong. */
  pKa: number[];
  /** Charge of the fully protonated form. HA -> 0, NH4+ -> +1, H2PO4- -> -1. */
  z0: number;
}
```

- A **weak acid** HA: `pKa: [4.76], z0: 0`.
- A **weak base** B is entered as its conjugate acid BH⁺: `pKa: [14 - pKb], z0: +1`.
  (Ammonia, pKb 4.75, becomes NH₄⁺ with pKa 9.25.) One code path covers acids
  and bases — this is what makes weak-vs-weak fall out for free.
- A **strong** acid/base contributes no `AcidSystem` at all, just a spectator
  ion (Cl⁻ at −1, Na⁺ at +1) and its protons/hydroxides via the water term.
- **Polyprotic** is the same struct with more entries: carbonic `[6.35, 10.33]`,
  phosphoric `[2.15, 7.20, 12.35]`, citric `[3.13, 4.76, 6.40]`.

For a system with n protons, define
`D = [H]ⁿ + Ka₁[H]ⁿ⁻¹ + Ka₁Ka₂[H]ⁿ⁻² + … + Ka₁…Kaₙ` and
`αᵢ = (Π_{k≤i} Ka_k)·[H]^(n−i) / D`. Mean charge is `z0 − Σ i·αᵢ`.

Charge balance across the whole flask:

```
f([H]) = [H] − Kw/[H] + Σ_spectators (C·z) + Σ_systems F·(z0 − Σ i·αᵢ) = 0
```

Solve by **bisection on pH over [−1, 15]**, 60 iterations. `f` is monotonic in
`[H]`, so bisection cannot fail, cannot oscillate, and needs no initial guess —
unlike Newton, which diverges near the equivalence cliff of a dilute weak
system. 60 iterations of a few multiplies is microseconds; there is no reason
to be clever here.

Dilution is applied before solving: `F = moles / (V_analyte + V_titrant)`.

### 1.2 Verification before any UI exists

Write `scripts/check-titration.mjs` (precedent: level numbers in this repo were
tuned with scratch Node scripts, not eyeballed). It prints curves and asserts
known values:

| Check | Expected |
|---|---|
| 0.1 M HCl vs 0.1 M NaOH, at equivalence | pH 7.00 |
| 0.1 M acetic (pKa 4.76) vs NaOH, at half-equivalence | pH = 4.76 |
| 0.1 M acetic vs 0.1 M NaOH, at equivalence | pH ≈ 8.72 |
| 0.1 M NH₃ (pKb 4.75) vs 0.1 M HCl, at equivalence | pH ≈ 5.28 |
| 1e-7 M HCl (the classic trap) | pH ≈ 6.79, **not** 7.0 |
| Pure water, no analyte | pH 7.00 |
| 0.1 M Na₂CO₃ vs HCl | two distinct jumps near pH 8.3 and 3.8 |

If those seven pass, every combination the user asked for is correct, because
they all run through the same function.

**Documented simplifications** (state them in the UI's "About this simulation"
note rather than pretending): concentrations are used instead of activities (no
Debye–Hückel correction — worth ≲0.02 pH at these concentrations), 25 °C fixed,
no dissolved CO₂, no volume change on mixing.

### 1.3 Reagent library — real substances, kid-legible names

Each entry carries its real pKa values plus a household identity, which is the
hook for the target audience.

- **Strong acids:** hydrochloric (stomach acid), nitric, sulfuric (diprotic —
  first proton strong, second pKa 1.99).
- **Weak acids:** acetic (vinegar, 4.76), citric (lemon juice, 3.13/4.76/6.40),
  ascorbic (vitamin C, 4.10/11.6), formic (ant sting, 3.75), carbonic (fizzy
  water, 6.35/10.33), phosphoric (cola, 2.15/7.20/12.35), oxalic (rhubarb,
  1.27/4.27), benzoic (a food preservative, 4.20).
- **Strong bases:** sodium hydroxide (drain cleaner), potassium hydroxide.
- **Weak bases:** ammonia (window cleaner, pKb 4.75), sodium bicarbonate
  (baking soda), pyridine (5.23), ethylamine (3.25).

Both the analyte *and* the titrant are chosen from these lists, which is what
gives all four combinations — strong/strong, weak/strong, strong/weak,
weak/weak — plus polyprotic on either side.

### 1.4 Indicators — real transition ranges, blended colour

| Indicator | pKa | Acid form | Base form |
|---|---|---|---|
| Methyl orange | 3.7 | red | yellow |
| Bromocresol green | 4.7 | yellow | blue |
| Methyl red | 5.1 | red | yellow |
| Bromothymol blue | 7.1 | yellow | blue |
| Phenol red | 7.9 | yellow | red |
| Phenolphthalein | 9.4 | colourless | magenta |
| Thymolphthalein | 9.9 | colourless | blue |
| Alizarin yellow R | 11.0 | yellow | red |

Displayed colour = interpolation between the two forms by
`f = 1/(1 + 10^(pKa − pH))`, blended in sRGB (adequate here; note it in a
comment so nobody "fixes" it to OKLab without reason) and mixed toward the
flask's own tint. "Colourless" renders as a faintly tinted glass outline, never
literally invisible.

**Indicator choice is graded, not policed.** Picking phenolphthalein for
ammonia-vs-HCl gives an endpoint far from equivalence, so the student's computed
concentration comes out wrong by a measurable percentage. The app must let that
happen and then explain it in analysis. Blocking the bad choice would delete the
lesson.

### 1.5 Mystery samples

`makeUnknown(seed)` using **mulberry32** (same PRNG as `Epicenter.tsx`):

- draws an identity from the module's allowed pool (strong acid / weak acid /
  strong base / weak base / polyprotic, per module),
- draws a concentration in a realistic 0.02–0.25 M range, quantised to 3 s.f.,
- draws a sample volume (10.00 / 20.00 / 25.00 mL pipette).

The seed is **shown** as a Sample ID (`TR-4821`). Unlike `Epicenter`, where the
seed is fixed per level, here a fresh seed is drawn per "New sample" — that is
the replayability. Showing it means a whole class can titrate the same unknown
and compare, and a coach can reproduce a student's sample. Retrying keeps the
seed; "New sample" rolls a new one.

The true value is never rendered anywhere until the student submits. Grading
compares their reported concentration (computed from *their own* burette
readings) against the generated truth: ±5 % on Basic, ±2 % on Go deeper.

---

## 2. The apparatus — realism that teaches

- **50.00 mL burette** in SVG: graduations every 0.1 mL, numbered every mL,
  a real meniscus, and a **reading loupe** panel that magnifies the scale at the
  liquid line so the student *reads* the volume to 0.01 mL by estimation. An
  "auto-read" toggle is on for early modules and off later — once off, a misread
  propagates honestly into their answer.
- **Stopcock** with three controls: hold-to-open (stream), a single-**drop**
  button (0.05 mL), and a fine drag for partial delivery. Keyboard equivalents
  are required (space = open, arrow keys = drops); a mouse-only hold control
  would lock out keyboard users (STYLE.md §12).
- **Erlenmeyer flask** whose liquid colour is the indicator colour at the current
  pH. When a drop lands, a transient streak of the base-form colour appears at
  the point of entry and fades on swirl — this is the real phenomenon, and it is
  how students learn *why* you swirl. A **Swirl** button clears it.
- **pH probe**, toggleable. Free in Explore mode; in graded modules it is
  provided or withheld according to that module's learning goal (module 7 needs
  it; module 3 must not have it).
- **Live curve plot** (pH vs mL) drawn point-per-drop. Annotations — equivalence,
  half-equivalence = pKa, buffer plateau — appear **only in the analysis step**,
  never during the run. Same rule as the minigames' "live note" convention: never
  narrate the method before the student has tried it.
- **Overshoot is permanent within a trial.** You start a fresh trial; that is
  what real titrations do. Two concordant trials within 0.10 mL is itself a
  scored objective in later modules.

---

## 3. The curriculum — `src/components/titration/modules.ts`

Every module runs **Briefing → Predict → Titrate → Analyse → Check**. The
*Predict* step (one question, answered before any liquid moves: "will the
equivalence pH be above, below, or at 7?") is the cheapest thing on this list
and is most of the difference between a simulator and a lesson.

| # | Module | Teaches | Setup |
|---|---|---|---|
| 1 | First titration | The apparatus, what an endpoint is | HCl vs NaOH, indicator given, auto-read on |
| 2 | Reading the burette | Initial/final readings, drop volume, precision | Same, auto-read off |
| 3 | The steep jump | One drop swings pH by units; overshoot on purpose, then land it | Strong/strong, no pH probe |
| 4 | Weak acid, strong base | Buffer region, half-equivalence = pKa, equivalence above 7 | Acetic vs NaOH |
| 5 | Weak base, strong acid | The mirror image; equivalence below 7 | Ammonia vs HCl |
| 6 | Choosing an indicator | Same analyte titrated three times with three indicators; compare the three answers and find the error | Acetic vs NaOH ×3 |
| 7 | When it doesn't work | Weak vs weak: no sharp jump, indicators fail, the probe is the only way — *the module is supposed to be frustrating* | Acetic vs ammonia, probe provided |
| 8 | Two protons | Two equivalence points, two indicators, stoichiometric ratio ≠ 1:1 | Na₂CO₃ or H₃PO₄ vs HCl |
| 9 | **Mystery samples** | Everything, unaided. Repeatable forever | Random identity + concentration from the pools above |
| 10 | **Free bench** | Nothing scored — any analyte, any titrant, any concentration, any indicator | Full reagent library |

Modules 9 and 10 are where "several options" and "mystery solutions" live;
1–8 are the ramp that makes them meaningful.

**Analysis step** does not just ask for the final number. It walks the
calculation with checkable blanks — moles of titrant = C×V, mole ratio from the
balanced equation, moles of analyte, divide by sample volume — and checks each
line. Getting the right answer with the wrong ratio is caught.

**Lab notebook** persists every trial (initial reading, final reading, volume
delivered, indicator, observed endpoint colour, computed concentration, % error
once revealed) and can be printed via `window.print()` with a print stylesheet,
so a student can hand it to a coach.

---

## 4. Files

```
src/components/TitrationLab.tsx           page shell, module rail, mode switch
src/components/titration/chem.ts          solver, reagents, indicators, unknowns  (pure)
src/components/titration/modules.ts       curriculum data
src/components/titration/Burette.tsx      SVG burette + loupe + stopcock
src/components/titration/Flask.tsx        SVG flask, liquid colour, drop/swirl
src/components/titration/CurvePlot.tsx    pH vs mL, annotated in analysis only
src/components/titration/Notebook.tsx     trial table + print view
src/components/titration/Briefing.tsx     briefing + predict step
src/components/titration/Analysis.tsx     scaffolded calculation + grading
scripts/check-titration.mjs               solver verification (§1.2)
```

This is the first multi-file component folder in the repo. Justified: the whole
feature is ~2,000+ LOC against a 1,271-LOC ceiling for any existing single game
file, and `chem.ts` is pure logic worth reading on its own.

---

## 5. Wiring

1. `src/App.tsx` — `{currentTab === 'titration' && <TitrationLab userProfile={userProfile} onUpdateXp={handleUpdateXp} />}`.
2. `src/components/Header.tsx` — nav item `{ id: 'titration', label: 'Titration', icon: TestTube }`. This makes **7** desktop nav items in a `hidden lg:flex` row; check it at exactly 1024 px and in the mobile drawer.
3. `src/components/Footer.tsx` — add the link (it already receives `setCurrentTab`).
4. `src/components/Dashboard.tsx` — add `{ name: 'Analytical Chemist', desc: 'Identified a mystery solution by titration.', icon: TestTube }` to `badgeCatalog`. The catalog silently drifts out of sync otherwise (CLAUDE.md says so explicitly).
5. Badge awards on the first correctly-graded **mystery** sample, not on module 1 — the badge should mean something. XP per module completed, via the existing `onUpdateXp`.
6. `localStorage['tr_sc_titration_progress']` — add to the `tr_sc_*` list in CLAUDE.md.
7. **No** `GameId`, no `EMPTY_GAME_PROGRESS` entry, no `VirtualLab` change.

---

## 6. Brand and theming traps

- **Every new `text-[#hex]` / `bg-[#hex]` must have a `:root.dark` override in
  `src/index.css`,** or it renders identically in both themes — which usually
  means dark text on a dark background. `ConfirmEmailModal` shipped unreadable
  exactly this way. Prefer reusing `#1F3A42` / `#4B6169` / `#2E7D46` on
  `#FBF7EC` / `#ffffff` / `#E4F5DA` and add overrides only where genuinely new.
- **SVG `fill`/`stroke` attributes are invisible to those CSS overrides.** The
  glassware chrome, bench surface, plot gridlines and axis labels must therefore
  pick their colours in JS via `useTheme()` — the `SFCave.tsx` precedent, for the
  same reason (canvas/SVG paint CSS can't reach). Hook usage is safe: `applyTheme`
  is an idempotent `classList.toggle` and every caller reads the same
  `localStorage`/`matchMedia` source.
- **Chemical colours never flip with the theme.** Phenolphthalein pink is pink in
  dark mode. Only chrome flips. On the dark bench, "colourless" needs a visible
  glass outline and a faint tint so the flask doesn't disappear.
- Cards `rounded-[28px] border-2 border-[#1F3A42]/8 bg-white`; buttons
  `rounded-full` with the `#4C9A3A` shelf shadow; page wrapped in
  `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10` (STYLE.md §13).
- **Never encode the endpoint in colour alone** (§12): a text readout states the
  observed colour ("pale pink — persists after swirling"), and the pH probe is
  available as an accommodation. Icon-only buttons get `aria-label` **and**
  `title`.
- Swirl, drop and stopcock animations respect `prefers-reduced-motion` (§6).
- 375 px: apparatus stacks to a single column (burette above flask, curve below);
  the loupe must be thumb-reachable.

---

## 7. Performance

- Flowing titrant runs on a `requestAnimationFrame` loop with the volume in a
  **ref**, pushed to React state at a throttled rate — the `IslandKeeper` /
  `OrbitalSlingshot` pattern. Do not `setState` at 60 fps.
- Curve points are appended, never recomputed. The smooth 300-point curve for the
  analysis overlay is sampled once, on entering analysis, through the same solver
  (~60 bisection steps × 300 points is well under a millisecond).

---

## 8. Build order

Each phase ends with `npm run lint` (`tsc --noEmit`) **and** `npm run build`.

| Phase | Deliverable |
|---|---|
| 1 | `chem.ts` + `scripts/check-titration.mjs`, all seven checks in §1.2 passing. No UI. |
| 2 | Page shell, nav/footer wiring, **Free bench** mode: burette, flask, indicator picker, probe, live curve. Playable end to end. |
| 3 | Briefing/Predict/Analyse/Check scaffold + notebook; modules 1–5. |
| 4 | Modules 6–8 (indicator error, weak-vs-weak, polyprotic). |
| 5 | Mystery samples, grading, XP + badge, Dashboard catalog entry. |
| 6 | Dark mode + 375 px + reduced-motion pass; update `CLAUDE.md`, `STYLE.md` (§11 gains a note that the titration page is a *light-brand* page, unlike the games), and this file. |

Phase 1 is the gate: if the solver is wrong, everything above it is theatre.

---

## 9. Open assumptions

Stated rather than blocking — say so if any are wrong:

1. The page is open to guests; only XP and badges are member-gated.
2. Nav label is "Titration", badge is "Analytical Chemist".
3. Two tracks per module (Basic / Go deeper) rather than one difficulty aimed at
   the middle and satisfying neither audience.
4. No backend involvement — nothing here touches the Google Sheet or Apps Script.
   Progress and the notebook are `localStorage` only, like every other thing the
   visitor "owns".
