# Gravity Slingshot (/slingshot) — Implementation Plan & Progress

**Status:** In Progress
**Goal:** Build a standalone, high-fidelity educational interactive on a separate page (`/slingshot`) based on `docs/Science Minigame Ideas.md` and following the `science-interactive` skill guidelines.

---

## 0. Scope & Requirements

| Item | Decision | Detail |
|---|---|---|
| Route | `/slingshot` | Standalone top-level route with header back button to club site, full SPA fallback in `vite.config.ts`. |
| Concept | Gravity Assist / Slingshot | Earth to Neptune with fixed fuel budget; direct routes fail; gravity assists steal orbital momentum from moving planets. |
| Audience | Middle school (grades 6–8) / high school | Plain language, honest physics, no jargon before earned, no feature ads or empty fluff. |
| Physics Engine | Pure TypeScript symplectic Newtonian solver | Central solar gravity + planetary gravity + moving Keplerian planets; deterministic, zero DOM dependencies. |
| Representation | 2D canvas with orbital tracks, velocity vectors, encounter telemetry, trajectory traces, and prediction ghosts | 2D is the honest medium for planar heliocentric mechanics. |
| Stages | 4 guided stages + Sandbox | 1: Falling and Missing; 2: The Fuel Wall; 3: The Moving Slingshot (Jupiter); 4: The Grand Tour (Voyager 2 to Neptune); 5: Sandbox. |
| Persistence | `tr_sc_slingshot_progress` | LocalStorage saving of stage completions and best fuel scores. |
| Verification | Automated node verification script | `scripts/check-slingshot.mjs` verifying physics engine, stage solutions, and copy rules. |

---

## 1. Click Spec Summary

- **Arrives believing:**
  1. Gravity only pulls things down into crashes; it can't speed you up.
  2. To reach far planets, you just need a bigger engine and more fuel.
  3. Conservation of energy means a planet cannot give a probe extra speed.
- **Leaves believing:**
  - Passing behind a moving planet steals a fraction of the planet's massive orbital velocity around the Sun, boosting heliocentric speed for zero fuel expenditure.
- **The discriminating observation:**
  - Direct burn drains 100% fuel and stalls far short of Neptune.
  - Flying behind moving Jupiter drains zero fuel during flyby, but heliocentric speed surges from ~12 km/s to ~25 km/s, hurling the probe out to Saturn and Neptune.
- **Forbidden before earned terms:**
  - "Gravity assist", "hyperbolic excess", "aphelion/perihelion", "patched conics".

---

## 2. Architecture & File Layout

- `src/components/slingshot/physics.ts`: Pure physics engine (Newtonian gravitational acceleration, symplectic leapfrog/Verlet integrator, Keplerian planetary positions, trajectory projection, fuel budget calculations).
- `src/components/slingshot/types.ts`: Stage definitions, probe state, planet definitions, telemetry types.
- `src/components/slingshot/stages.ts`: The 4 stages + sandbox configuration, copy, hint ladders, win/miss conditions.
- `src/components/slingshot/SlingshotCanvas.tsx`: High-performance 2D Canvas rendering orbits, trails, celestial bodies, velocity vectors, prediction cone, and hover telemetry.
- `src/components/slingshot/TelemetryPanel.tsx`: Live telemetry (heliocentric speed, planet-relative speed, distance to target, fuel remaining, trajectory ghost comparison).
- `src/components/slingshot/SlingshotHeader.tsx`: Clean top header matching `TitrationHeader.tsx` with logo, back-to-site link, stage switcher, and reset controls.
- `src/components/GravitySlingshotPage.tsx`: Main page component on `/slingshot`.
- `scripts/check-slingshot.mjs`: Test suite asserting physics accuracy, stages solvable, copy constraints.
- `vite.config.ts`: Added `'slingshot'` to `spaFallbackPlugin`.
- `src/App.tsx`: Route integration for `/slingshot`.

---

## 3. Progress Tracking

- [x] Phase 0: Brief & Gate 0 passed
- [x] Phase 1: Click Spec & Gate 1 passed
- [x] Phase 2: Representation & Medium & Gate 2 passed
- [x] Phase 3: Stage Table & Interaction Design & Gate 3 passed
- [x] Phase 4: Honest Physics Engine & Verification (`scripts/check-slingshot.mjs` - 13/13 passing)
- [x] Phase 5: UI Components, Canvas Renderer, Controls & Route Integration
- [x] Phase 6: Verify all checks (`npm run build`, `npm run test:slingshot`, `npm run lint`), updated `CLAUDE.md`.
