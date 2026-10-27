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
- **SPA Routing**: `spaFallbackPlugin` in `vite.config.ts` copies `index.html` to `404.html` and creates directory fallbacks for direct route access (`titration`, `admin`, `join`, `events`, `games`, `resources`, `announcements`, `gallery`, `about`, `dashboard`).
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
- **Templates**: Stored in `docs/newsletter/` (e.g. `06-scioly-tryouts.html`, `07-post-tryouts-halloween.html`, `confirm-subscription.html`).

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

## LaTeX & Formats

- Handled via `src/components/Latex.tsx`: `<Latex>`, `<Chem>`, `<MathText>`.
- `SafeHtml.tsx` parses markdown/HTML, strips unwanted `<br />` around block elements, sanitizes via DOMPurify, and compiles `$math$` expressions.
- `src/useHeroScroll.ts`: Controls landing page 7-moment narrative scroll, isolates trackpad inertia, unlocks normal page scroll at finale.
