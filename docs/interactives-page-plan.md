# Interactives Page (/interactives) Plan

**Goal:** Create a new page `/interactives` that lists all weekly science interactives published on the site, ordered oldest to newest, accessible via the navbar.

## Status Checklist
- [x] Analyze requirements, routing architecture, and styling rules.
- [x] Create plan file `docs/interactives-page-plan.md`.
- [x] Define `ScienceInteractive` type in `src/types.ts`.
- [x] Create `src/data/interactives.ts` with Week 1 `/slingshot` data.
- [x] Create `src/components/InteractivesPage.tsx` adhering to dark theme, typography, and anti-slop/no-marketing-fluff rules.
- [x] Update `src/components/Header.tsx` to include `Interactives` in desktop and mobile navbar.
- [x] Update `src/components/Footer.tsx` to include `Interactives`.
- [x] Update `src/App.tsx` routing (`TAB_PATHS`, `PATH_TABS`, tab switching, route rendering).
- [x] Update `vite.config.ts` to include `'interactives'` in SPA fallback routes.
- [x] Run typechecks and build verification (`npm run lint`, `npm run build`, `npm run test:slingshot`).
- [x] Update `CLAUDE.md` with `/interactives` details.
