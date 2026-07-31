# Connecting the Google Sheet to the website

You only do this once. It takes about five minutes.

**Your spreadsheet:** [Turtle Rock Science Club — Website Content](https://docs.google.com/spreadsheets/d/1F-4w57Cehlh-55I8fmAzeYY0DUFYS2I6FpOfjjqUhV0/edit)
(already created, sitting in the root of your Google Drive)

---

## Step 1 — Paste the script

1. Open the spreadsheet with the link above.
2. Menu bar: **Extensions ▸ Apps Script**. A new tab opens with an editor
   containing an empty `myFunction()`.
3. Select everything in that editor (`Cmd+A`) and delete it.
4. Open `apps-script/Code.gs` from this repo, copy the whole file, and paste it in.
5. Save (`Cmd+S`). Name the project `Turtle Rock Website Publisher` if it asks.

## Step 2 — Run setup once

1. Still in the Apps Script editor, find the function dropdown in the toolbar
   (it probably says `onOpen`). Change it to **`setupSheets`**.
2. Click **Run**.
3. Google will ask for authorization the first time:
   - **Review permissions** → pick your account (`jiayou.carl.liu@gmail.com`)
   - You'll see *"Google hasn't verified this app"* — this is expected for your
     own scripts. Click **Advanced** → **Go to Turtle Rock Website Publisher (unsafe)**.
   - Click **Allow**.
4. Switch back to the spreadsheet tab. You should now have four tabs at the
   bottom:

   | Tab | What it is |
   |---|---|
   | **Events** | Upcoming events shown on the site |
   | **Announcements** | Club announcements shown on the site |
   | **Lab Log** | Write-ups shown under "Latest From the Lab Log" |
   | **Signups** | Filled in **automatically** when someone signs up online |

   Do not type in **Signups** — the script writes to it.

## Step 3 — Deploy the web app

This is what gives the website a URL to read from.

1. Back in the Apps Script editor, click **Deploy ▸ New deployment** (top right).
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description:** `v1`
   - **Execute as:** `Me (jiayou.carl.liu@gmail.com)`
   - **Who has access:** `Anyone` ← **this matters.** Not "Anyone with Google
     account". The website has no login, so it must be plain `Anyone`.
4. Click **Deploy**, authorize again if asked.
5. Copy the **Web app URL**. It looks like:
   `https://script.google.com/macros/s/AKfycb.....................L/exec`

**Send me that URL** and I'll wire it into the site.

> If you lose it later: spreadsheet menu **🐢 Website ▸ Show Web App URL**.

## Step 4 — Reload the spreadsheet

Close and reopen the spreadsheet tab. A new **🐢 Website** menu appears in the
menu bar, to the right of "Help", with:

- 🚀 **Publish to Website** ← the button you asked for
- 🔗 Show Web App URL
- 👀 Preview Published JSON
- ⚙️ Set Up / Repair Sheets

---

## Everyday use

1. Type a row in **Events** or **Announcements**.
2. Tick **Show on Site**.
3. Click **🐢 Website ▸ 🚀 Publish to Website**.
4. Refresh the website. Done.

Nothing goes live until you press Publish, so a half-written event sitting in
the sheet stays private.

### Events tab columns

| Column | Required | Notes |
|---|---|---|
| Title | yes | e.g. `Lava Lamp Social` |
| Date | no | Type a real date or free text like `August 14, 2026` |
| Time | no | e.g. `4:00 PM - 5:30 PM` |
| Location | no | e.g. `Turtle Rock Clubhouse` |
| Description | no | A sentence or two. Wraps automatically. |
| Spots Total | no | Whole number. Blank counts as 0. |
| Spots Taken | no | Must not exceed Spots Total, or the row is skipped. |
| Image URL | no | Any public image link. Blank shows a themed placeholder. |
| Show on Site | **tick it** | Unticked rows are ignored. |

### Announcements tab columns

| Column | Required | Notes |
|---|---|---|
| Title | yes | |
| Date | no | |
| Category | no | Dropdown: `general`, `expansion`, `toolkit`, `volunteer`. Controls the badge colour. |
| Content | no | The body text. |
| Show on Site | **tick it** | |

### Lab Log tab columns

| Column | Required | Notes |
|---|---|---|
| Title | yes | e.g. `The Great Chemistry Blast` |
| Date | no | |
| Category | no | Dropdown: `chemistry`, `robotics`, `astronomy`, `general` |
| Summary | no | The short blurb on the card. |
| Full Write-Up | no | Shown when the entry is opened. |
| Image URL | no | Any public image link. |
| Author | no | e.g. `Dr. Elena Vance` |
| Show on Site | **tick it** | |

---

## Event sign-ups

Each event card on the site has a **Sign Up for This Event** button. It asks for
the **Student Name** and **School**, and on submit the script:

1. appends a row to the **Signups** tab — `Timestamp`, `Event`, `Student Name`, `School`
2. adds **1** to that event's **Spots Taken** in the Events tab
3. updates the live "spots left" counter on the site

Sign-ups are the one thing that does **not** wait for Publish — they are
recorded immediately, and only that one number is updated, so anything else you
are still drafting stays private until you press Publish.

When an event's Spots Taken reaches Spots Total, the button turns into
"No Spots Remaining" and further sign-ups are rejected by the server.

To close sign-ups for an event, untick its **Show on Site** and Publish.

---

## Updating the script later

If you edit `Code.gs`, you must **re-deploy** for the website to see the change:

**Deploy ▸ Manage deployments ▸** pencil icon **▸ Version: New version ▸ Deploy**

Keep using the same deployment — the URL stays the same. Creating a *new*
deployment instead gives you a *different* URL, which would break the site until
you update `src/config.ts`.

---

## Troubleshooting

**The 🐢 Website menu is missing.** Reload the spreadsheet tab. The menu is built
by `onOpen`, which only runs on open.

**Publish says "Missing tabs".** Run **⚙️ Set Up / Repair Sheets**.

**Website shows old content.** You edited the sheet but didn't press Publish, or
the browser cached the response. Hard-refresh (`Cmd+Shift+R`).

**Website shows nothing from the sheet.** Visit your `/exec` URL directly in a
browser. If you see JSON, the script is fine and the problem is in the site
config. If you see a Google login page, the deployment's access is not set to
`Anyone` — fix it in **Manage deployments**.
