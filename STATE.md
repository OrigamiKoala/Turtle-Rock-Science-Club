# State

## Right now

**Three people/agents are actively editing this same repo concurrently:**
Jeremy + Carl (direct), a separate peer Claude session (working on an
event-signup-cancellation feature), and this session. Before running any
`git` operation beyond `status`/`fetch`/`log`, re-check for new commits and
uncommitted changes from the others — don't assume the working tree matches
what you last touched.

**Confirmed live on trscienceclub.org right now:** the Admin Hub (`/admin`)
through the Compose tab + Newsletter campaign-stats round (Events,
Announcements, Newsletter with two-step send, Compose, Backup Sheet) —
Jeremy confirmed redeploying `Code.gs` for this on 2026-09-25, and the site's
frontend build is current through commit `1ebbf77` (Carl's `_Published`
chunking rewrite, which also touched `Code.gs`).

**Open question, not yet answered:** has `Code.gs` been manually redeployed
in the Apps Script editor since `1ebbf77` landed (2026-09-27, ~12:05pm PT)?
Frontend deploys are automatic on push; Apps Script never is — someone has to
paste + Deploy ▸ New version by hand. Asked Jeremy directly; don't assume
either way until he confirms. (See CLAUDE.md's Apps Script gotchas.)

**Built this session (2026-09-27), NOT yet committed/pushed/deployed:**
- **Inbox tab** — reads and replies to the `contact@trscienceclub.org` Zoho
  Mail inbox from inside the Admin Hub. New Apps Script actions:
  `adminListInbox`, `adminGetMessage`; reply reuses the existing
  `adminSendEmail`. Needs a **wider Zoho OAuth scope**
  (`messages.READ`+`folders.READ` on top of what Compose alone needs) — an
  existing Zoho connection will need to be redone via 🐢 Website ▸ 🔌 Zoho
  Mail ▸ 🔗 Connect Zoho Mail with the new scope string in SETUP.md, or the
  Inbox tab will show "Inbox access is not set up" even after this deploys.
- **Real WYSIWYG editor** (`RichTextEditor` in `AdminHub.tsx`) replacing the
  raw-HTML textarea + manual-tag toolbar in both Newsletter and Compose (and
  now Inbox's Reply) — bold/italic/heading/link/list via toolbar or native
  Ctrl/Cmd+B / Ctrl/Cmd+I. No backend change needed; it still just produces
  an HTML string.
- Typechecked, built clean, and both features manually verified in a browser
  (Inbox against mocked API responses, since the backend isn't deployed for
  it yet; the editor's toolbar/keyboard-shortcut behavior against real DOM
  output).

**Pending decision, asked but not answered:** whether to rename the "Backup
Sheet" tab — Jeremy read it as implying a second, synced copy of the Sheet,
when it's actually just a link to the one real spreadsheet. Don't rename
without his go-ahead; the current name is confirmed confusing but not yet
agreed to change.

**Not yet done, once the above is committed/pushed:**
1. Redeploy `Code.gs` in the Apps Script editor (adds `adminListInbox`/
   `adminGetMessage`, and whatever the open chunking-redeploy question above
   resolves to).
2. Reconnect Zoho Mail with the expanded scope (SETUP.md, "Connecting Zoho
   Mail") for the Inbox tab to work.

**Known limitation, not a bug to fix later:** the Admin Hub's shared-password
model supports exactly one active admin session at a time.

**Why two email systems (Sender.net + Zoho), not one:** confirmed directly
with Carl — Sender.net can't send one-off private email or read a mailbox
(campaigns + stats only), and Zoho doesn't provide campaign stats. Not a
simplification opportunity; the Hub just wraps both so admins don't have to
leave it for either.

## Recent history

- **2026-09-27** — Inbox tab (read + reply to `contact@trscienceclub.org` via
  Zoho Mail) and a real WYSIWYG editor replacing raw-HTML textareas in
  Newsletter/Compose. Not yet committed — see "Right now."
- **2026-09-27** — Carl pushed `1ebbf77` ("update"): rewrote `_Published` to
  chunk across multiple cells instead of one, removing the ~45k-character
  publish cap; also newsletter content commits (`c5c5722` "add art").
- **2026-09-25** — Admin Hub's Compose (Zoho Mail one-off email) and a
  Sender.net campaign-stats table added to the Newsletter tab; confirmed
  redeployed and live same day.
- **2026-09-24** — Built the initial Admin Hub (`/admin`): password-gated
  Events/Announcements editor + publish, two-step-confirm newsletter
  composer/sender, link out to the Sheet as backup. Confirmed live
  2026-09-26 after a merge with Carl's concurrent commits.
- Prior work: forgot-password/email-verification UI, Ariadne console static
  page — see `git log` for the full trail; this file only tracks what
  changed since the last time someone updated it, not a complete history.

## Keeping this file current

Update it in the same commit whenever something in it goes stale — a wrong
entry here is worse than a missing one. Correct or remove stale entries
rather than only appending. With three people/agents touching this repo,
check this file's "Right now" is still accurate at the *start* of a session
too, not just when leaving one — it may have gone stale from someone else's
work since you last read it.
