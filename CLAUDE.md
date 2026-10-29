# Turtle Rock Science Club

Single-page React site for Turtle Rock Science Club. Content is managed via Google Sheets + Google Apps Script backend.

## Tech Stack & Commands

- React 19 + TypeScript, Vite 6, Tailwind CSS v4 (`@tailwindcss/vite`).
- Icons: `lucide-react`. Styling: dark-mode only (Tailwind utilities + `:root.dark` overrides).
- Navigation: state-based (`currentTab` in `App.tsx`), no router.
- Lint/Typecheck: `npm run lint` (`tsc --noEmit`).
- Dev: `npm run dev` (port 3000). Build: `npm run build`.

## Deployment (GitHub Pages)

- **Workflow**: `.github/workflows/deploy-gh-pages.yml` runs `npm ci && npm run build` -> `actions/deploy-pages`. Always keep `package-lock.json` in sync (`npm install`).
- **Domain**: `trscienceclub.org`. `vite.config.ts` sets `base: '/'`.
- **Public Assets**: Reference runtime assets in `public/` using `${import.meta.env.BASE_URL}asset.png` in JS/TSX.
- **SPA Routing**: `spaFallbackPlugin` in `vite.config.ts` copies `index.html` to `404.html` and creates directory fallbacks for direct route access (`titration`, `slingshot`, `interactives`, `admin`, `join`, `events`, `games`, `resources`, `announcements`, `gallery`, `about`, `dashboard`).
- **Standalone Pages**:
  - `public/ariadne-console/index.html`: Chem curriculum terminal (`?week=N`, `#1,2,3`).
  - `public/station-1c/index.html`: Session 1-C Beam Deflector sim.
  - `public/ecology/index.html`: 2D canvas ecosystem simulator, embedded via iframe in `EcologyGame.tsx`.

## Content Pipeline (Google Sheets + Apps Script)

```
Google Sheet ──[🐢 Website ▸ Publish]──▶ hidden _Published tab (JSON chunked col A <=40k/cell)
                                                  │
                                       doGet ─────┤ /exec
                                                  ▼
                            src/useSiteContent.ts ──▶ App.tsx ──▶ Components
```

- **Sheet ID**: `1F-4w57Cehlh-55I8fmAzeYY0DUFYS2I6FpOfjjqUhV0`
- **Script ID**: `1ZG7i5Bm7qf6W6xZ0ylltG12xDP9R35aSdvqqjpykAbwYSHAH8SH9bJmg`
- **Script Source**: `apps-script/Code.gs` (paste manually into Apps Script editor; no clasp sync).
- **Web App URL**: `src/config.ts` (`SHEET_API_URL`).
- **Sheet Tabs**:
  - Manual edit: `Events`, `Announcements`, `Lab Log`, `Resources`.
  - Script-managed: `Members`, `Signups`, `Newsletter`, `_Published` (hidden cache).
- **Publish**: Explicit via `🐢 Website ▸ Publish to Website`. No bundled fallback data; empty sheet returns empty arrays.
- **Photos**: In `Events` tab `Photos` col (index 10). Plain URL renders external link button; HTML (`<...`) renders via `HtmlEmbedCard` with patched `/embed-ui.min.js`.

## Sign-ups & Membership

- **Flow**: `SignupModal` collects Name, School, Parent Email. Logged-in members skip email prompt.
- **Backend (`Code.gs`)**:
  - Lock-protected. Dedupes by `(Event, Student Name)`.
  - Appends to `Signups`, increments `Spots Taken`, updates `_Published` via `bumpPublishedSpots_`.
  - Records event in member row if authenticated.
  - Subscribes parent email to Sender.net `newsletter` audience.
- **Multiple Students**: Same family can sign up multiple students; duplicate student name per event is rejected.
- **Cancellation**: `handleCancelSignup_` deletes `Signups` row, decrements `Spots Taken`, clears member record. Guest signups persist student names in `localStorage` (`tr_sc_signup_names`). XP is not revoked on cancel.

## Email & Newsletter Systems

### Sender.net (Mass Newsletters)
- **Audiences**: `newsletter` -> **Newsletter** group; `parent` -> **Parents** + **Newsletter**; `student` -> **Students** + **Newsletter**.
- **Opt-in**: Join form opt-in checkbox controls newsletter signup. Logged-in non-opted members see top banner (`subscribeMember` action).
- **Confirmation**: Double opt-in confirmation email links to `https://trscienceclub.org/?confirm_newsletter=<token>`.
  - **CRITICAL**: Sender automation on confirmation link click MUST **Copy** subscriber to **Confirmed** (never Move, which wipes audience groups).
  - Campaigns MUST target `(Audience Group) AND Confirmed` segment.
- **Credentials**: `SENDER_API_TOKEN`, `SENDER_FROM_NAME`, `SENDER_REPLY_EMAIL` stored in Script Properties.
- **Templates & Issues**: Stored in `docs/newsletter/` (e.g. `06-scioly-tryouts.html`, `07-post-tryouts-halloween.html`, `07-lab-log-entry.html`, `confirm-subscription.html`). Each issue pairs an email HTML file with an in-site modal entry (`XX-lab-log-entry.html`).
- **Weekly Science Interactive Feature**: Every newsletter issue includes a dedicated interactive spotlight for a web-based science simulator or game on `trscienceclub.org` (e.g. `/slingshot`, `/titration`, `/ecology`). Copy must remain honest, clear, kid-friendly, and free of promotional marketing fluff.
- **Newsletter Generator Skill**: `.agents/skills/trsc-newsletter-generator/` manages automated generation from `docs/schedule.md`, including hero art, tidbits, science news, and interactive spotlight cards. Reference templates live in `.agents/skills/trsc-newsletter-generator/references/` (`template.html` for email, `entry-template.html` for web log modal).

### Zoho Mail (Private / Transactional / Inbox)
- **Mailbox**: `contact@trscienceclub.org`.
- **API**: Handles individual emails (Compose) and inbox checking/replies in Admin Hub.
- **OAuth Scopes**: `ZohoMail.messages.READ`, `ZohoMail.folders.READ`, `ZohoMail.messages.CREATE`, `ZohoMail.accounts.READ`.
- **Credentials**: `ZOHO_*` stored in Script Properties.

## Admin Hub (`/admin`)

- Staff-only portal (`src/components/AdminHub.tsx`).
- **Auth**: Single shared password configured via `🐢 Website ▸ 🔐 Set Admin Hub Password`. Session token in Script Properties (`ADMIN_SESSION`, 12h expiry); stored on client in `sessionStorage` (`tr_sc_admin_token`).
- **Capabilities**:
  - Edit Events & Announcements via generic `adminListRows_` / `adminSaveRow_`.
  - Publish content via `publishToWebsite_core_`.
  - Compose & send newsletters via Sender.net (two-step draft + type 'SEND').
  - Read & reply to `contact@trscienceclub.org` via Zoho Mail API.
  - Quick link to Google Sheet for `Lab Log`, `Resources`, `Signups`, `Members`.

## Apps Script Gotchas

- **`getLastRow()` counts checkbox formatting**: `insertCheckboxes()` writes `FALSE`, making `getLastRow()` return thousands. Use `isSheetEmpty_()` / `isBlankRow_()`.
- **`SpreadsheetApp.getUi()`**: Throws when run from editor. Use `notify_()` (falls back to `Logger.log`).
- **Deployments**: Always update existing deployment (**New version**) to preserve `/exec` URL.
- **Cache Lag**: `/exec` lags behind sheet publish by 1-2 minutes. Verify via `Preview Published JSON`.
- **POST Requests**: Must send `Content-Type: text/plain;charset=utf-8` with JSON string body to bypass CORS preflight.
- **Schema Changes**: Renaming or adding headers in `*_HEADERS` requires running `🐢 Website ▸ ⚙️ Set Up / Repair Sheets`.

## Frontend Conventions

- **Modals**: Full-screen modals (`SignupModal`, `LoginModal`, `ConfirmEmailModal`, `ResetPasswordModal`, log reader) MUST use `createPortal(..., document.body)` with `will-change-transform` and NO `backdrop-blur-*` (prevents Chromium compositing crash when `Hero.tsx` toggles `position: fixed`).
- **Theming**: Dark-only.
  - `src/useTheme.ts` returns `{ theme: 'dark' }`.
  - `index.html` adds `.dark` class to `<html>` synchronously.
  - `index.css` defines `@custom-variant dark (&:where(.dark, .dark *));` directly after `@import "tailwindcss"`.
  - Dark styling uses `:root.dark <selector>` overrides for hardcoded hexes. Only use hexes with existing overrides in `index.css` or add them.
- **LocalStorage Keys** (`tr_sc_*`):
  - `tr_sc_user_profile`: Member account data.
  - `tr_sc_signed_up_ids`: Reserved mission IDs.
  - `tr_sc_signup_names`: Guest signup student names for cancellation.
  - `tr_sc_sheet_content_v1`: 5-minute site content cache.
  - `tr_sc_game_progress`: Solved puzzle level indices.
  - `tr_sc_cave_best`: SF Cave high score.
  - `tr_sc_titration_progress`: Titration modules and mystery samples progress.
  - `tr_sc_slingshot_progress`: Gravity Slingshot completed stages and best fuel scores.
  - `tr_sc_newsletter_banner_dismissed`: Hides member newsletter prompt banner.

## Minigames & Virtual Lab

- Hosted in `VirtualLab.tsx` (`src/components/games/`).
- **Live Notes**: Commentary appears only after a concrete event/outcome (crash, burn, unbalance, win), never during exploration.
- **Key Games**:
  - `OrbitalSlingshot.tsx`: Canvas gravity sim, state kept in refs for 60fps performance.
  - `MoleculeBuilder.tsx`: SVG builder. Requires satisfied valence and connected bond graph.
  - `RobotProgrammer.tsx`: Grid bot with recursive subroutines.
  - `Lightbender.tsx`: Ray-traced optics (Snell's law). Nudges rays `1e-4` past boundary. Includes "Admire the beam" win state.
  - `ShortCircuit.tsx`: Nodal-analysis solver using Gaussian elimination with partial pivoting.
  - `Epicenter.tsx`: Trilateration with seeded RNG (`mulberry32`).
  - `CritterRanch.tsx`: Mendelian genetics simulator.
  - `IslandKeeper.tsx`: Lotka-Volterra food web. Consumers require positive damping despite negative growth rate.
  - `StarlightDecoder.tsx`: Spectral line matching with Doppler shifts.
  - `ReactorLine.tsx`: Stoichiometry balancing with unbalance warning banner.
  - `SortSquad.tsx`: 10 sorting algorithm puzzles (`10 + 5*index` XP). Levels 1-5 order is fixed. Tuned via `node scripts/check-sortsquad.mjs`.
  - `SFCave.tsx`: Faithful PalmOS port. Fixed 75ms tick (`TICK_MS`), symmetric gravity/thrust (`ACCEL`), `VELOCITY_CLAMP` = `STEP_X`. 5 distance milestones award XP.
  - `ChemTextAdventure.tsx`: External link-out.
- **Badges**: 15 badges cataloged in `Dashboard.tsx` (`badgeCatalog`).

## Titration Lab (`/titration`)

- Standalone component (`src/components/TitrationLab.tsx`).
- Polyprotic charge-balance equilibrium solver (`src/components/titration/chem.ts`, verified via `scripts/check-titration.mjs`).
- Direct manipulation: click/hold stopcock to dispense, shake mouse on flask to mix, hover over fluid for optical meniscus magnifier.
- Modes: Visual Indicator (default, colorimetric) and pH Probe Mode (plots titration curve).

## Gravity Slingshot (`/slingshot`)

- Standalone page (`src/components/GravitySlingshotPage.tsx`, `src/components/slingshot/`), rebuilt from scratch from `docs/Science Minigame Ideas.md` using the `science-interactive` skill.
- **Engine** (`physics.ts`, pure, AU/yr, Sun GM = 4π²): kick-drift-kick leapfrog with adaptive step; planets on exact circles; `simulate(world, launch)` returns samples, per-planet flybys (speed from the Sun and from the planet in/out), end reason, max/min r, swept angle. Planet gravity is multiplied by `PLANET_GRAVITY_SCALE` (10) in `stages.ts` so flybys are aimable; the page says so.
- **Stages** (`stages.ts`, data + `evaluate`, 10 total): 1 Sideways (one lap without hitting the Sun), 2 The tank (10 km/s of fuel, chart of farthest distance per launch; unwinnable by design, completes after using a full tank), 3 Jupiter (predict slower/same/faster first, then reach Saturn's orbit with 1.5 km/s of course changes), 4 Neptune (within 6 AU of Neptune with one 10 km/s tank; dotted preview), 5 Launch date (within 0.5 AU of Jupiter, 8.9 km/s tank, date slider), 6 Falling in (a Jupiter flyby that slows the probe so it passes inside Mercury's 0.39 AU), 7 Escape (reach 48 AU within 40 yr from a fixed start, 1.5 km/s tank, readout compares speed after Jupiter with the speed needed to leave), 8 Saturn / 9 Uranus / 10 Grand tour (Neptune within 4 AU): chains of planets from Earth with a 0-24 month launch date (built by `windowChain`, tanks 9 / 9.5 / 9.5 km/s). Stages with `windowMonths` use `stageAt(stage, waitYears)`: a later launch is modelled as Earth fixed and every other planet's phase advanced by `(ωplanet − ωEarth)·wait`. `evaluate` takes `wait` as a 4th argument. `target` draws the ring around a planet that counts as reaching it.
- **UI**: `SolarMap.tsx` (canvas, own rAF loop, reads `tRef`), `Dial.tsx` (drag dial + steppers; direction 0 is the dashed reference line), `Charts.tsx` (speed graph with "Measured from" Sun/planet, attempt chart). Playback slows automatically near planets; earlier attempts stay as ghost trails.
- Progress: `tr_sc_slingshot_progress` = `{done: boolean[10]}` (shorter saved arrays are padded); stages unlock in order; XP awarded once per stage (10/15/25/40/30/30/35/40/45/60) when logged in. Test hook: `window.__sim` (`getState`, `setState({stage, dir, kms, months, guess})`, `launch`).
- Verify: `npm run test:slingshot` (`scripts/check-slingshot.mjs`): engine vs vis-viva, every stage's reference solution (stages 5-10 include timing/aiming robustness and no-planet baselines), impossibility of direct routes, aiming robustness, and word-timing checks ("assist"/"orbit" only after earned).
- Not browser-tested yet (per owner preference); `OrbitalSlingshot.tsx` in Virtual Lab is a separate game.

## Weekly Science Interactives (`/interactives`)

- Top-level page (`src/components/InteractivesPage.tsx`, `src/data/interactives.ts`) accessible from desktop/mobile navbar (`TAB_PATHS.interactives = '/interactives'`) and footer.
- Lists weekly browser-based science tools, simulators, and games released each week, ordered chronologically from oldest to newest.
- Each interactive entry provides week number, release date, scientific discipline/topic, honest mechanical description, core concepts, and direct launch button.
- Week 1: Gravity Slingshot (`/slingshot`).

## LaTeX & Formats

- Handled via `src/components/Latex.tsx`: `<Latex>`, `<Chem>`, `<MathText>`.
- `SafeHtml.tsx` parses markdown/HTML, strips unwanted `<br />` around block elements, sanitizes via DOMPurify, and compiles `$math$` expressions.
- `src/useHeroScroll.ts`: Controls landing page 7-moment narrative scroll, isolates trackpad inertia, unlocks normal page scroll at finale.
