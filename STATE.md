# State

## Right now

**Admin Hub built; partially live already — unclear who deployed it or how far.**
Code is complete, typechecked (`npm run lint`), and builds clean. Browser
testing on 2026-09-25 turned up a surprise: a live request to `adminSenderInfo`
on the deployed Apps Script backend returned `"Admin session expired. Please
log in again."` — the real `requireAdmin_` error text — instead of `"Unknown
action."`. That only happens if a Code.gs version containing `requireAdmin_`
and `adminSenderInfo` is already deployed. A parallel request to
`adminListCampaigns` (added later in the same session) still returned
`"Unknown action."`, so whatever is live predates the campaign-stats/Zoho
Mail work but postdates the first Admin Hub pass (login, Events/Announcements
CRUD, publish, newsletter draft/send). **Nobody told the assistant a deploy
happened — next session should ask Jeremy/Carl directly whether one of them
redeployed, rather than assuming either way,** and should re-check with a
real login attempt (not just probing with a fake token) to confirm exactly
which actions are live before touching anything.

**Full feature set as of 2026-09-25, once fully deployed:**
- Events/Announcements editor + Publish (same "nothing goes live until
  Publish" rule as the Sheet).
- Newsletter: composer with a lightweight HTML toolbar, live preview,
  group/segment targeting with an inline warning about raw-group-without-
  segment sends, two-step create-draft-then-type-SEND-to-send flow, and a
  "Recent Campaigns" stats table (opens/clicks/bounces from Sender.net).
- Compose: one-off private email via Zoho Mail's API (`contact@trscienceclub.org`),
  for things Sender.net can't send (mass campaigns only).
- Backup Sheet: a direct link to the Google Sheet (not an embed — Google
  blocks framing its Sheets editor; confirmed live, not assumed).

See CLAUDE.md's "Admin Hub" section for the architecture.

**Setup steps that still need doing (whichever haven't happened already —
see the deploy-state question above), all documented click-by-click in
apps-script/SETUP.md's "Admin Hub" section:**
1. Paste the current `apps-script/Code.gs` into the Apps Script editor and
   redeploy (Deploy ▸ Manage deployments ▸ pencil ▸ Version: New version ▸
   Deploy — same URL).
2. 🐢 Website ▸ 🔐 Set Admin Hub Password.
3. 🐢 Website ▸ ✉️ Newsletter ▸ 📧 Set From Name / Reply-To — use
   `contact@trscienceclub.org` as the reply-to (that's a real, live Zoho Mail
   mailbox; replies to campaigns already land there today per Carl).
4. 🐢 Website ▸ 🔌 Zoho Mail ▸ 🔗 Connect Zoho Mail — only needed for the
   Compose tab; requires creating a Self Client in Zoho's API console first
   (SETUP.md has the full click-by-click).
5. Visit `trscienceclub.org/admin` (or `localhost:3000/admin` in dev) and log in.

**Known limitation, not a bug to fix later:** the Admin Hub's shared-password
model supports exactly one active admin session at a time. Fine for a small
volunteer team; would need real per-person accounts if that ever becomes a
problem.

**Why two email systems (Sender.net + Zoho), not one:** confirmed directly
with Carl — Sender.net can't send one-off private email (campaigns only) and
Zoho Mail doesn't provide campaign stats. Not a simplification opportunity;
the Hub just wraps both so admins don't have to leave it for either.

## Recent history

- **2026-09-25** — Added Compose (Zoho Mail one-off email) and a Sender.net
  campaign-stats table to the Newsletter tab. New Apps Script actions:
  `adminListCampaigns`, `adminZohoStatus`, `adminSendEmail`; new menu item
  🔌 Zoho Mail ▸ 🔗 Connect Zoho Mail. Discovered mid-session that part of
  the Admin Hub backend is already deployed (see "Right now").
- **2026-09-24** — Built the initial Admin Hub (`/admin`): password-gated
  Events/Announcements editor + publish, a two-step-confirm newsletter
  composer/sender wrapping Sender.net's Campaigns API, and a link out to the
  Sheet as backup.
- Prior work: forgot-password/email-verification UI, Issue 2 newsletter
  (Chemistry + Computer Science) artwork and placeholders, Ariadne console
  static page — see `git log` for the full trail; this file only tracks what
  changed since the last time someone updated it, not a complete history.

## Keeping this file current

Update it in the same commit whenever something in it goes stale — a wrong
entry here is worse than a missing one. Correct or remove stale entries
rather than only appending; once the deploy state above is actually confirmed
(not just inferred from one probe) and the setup steps are done, replace the
whole "Right now" section rather than keeping it alongside a new one.
