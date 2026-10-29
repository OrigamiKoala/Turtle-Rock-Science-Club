---
name: trsc-newsletter-generator
description: >-
  Generates the complete weekly Turtle Rock Science Club newsletter HTML from the schedule in docs/schedule.md. Follows the visual format of 01-info-recap.html, generates combined digital ink hero artwork using Nano Banana (generate_image), gathers 2-3 recent breakthroughs via web search for In the News, writes engaging Science Tidbits for each of the week's topics, features the weekly web-based Science Interactive (e.g. /slingshot), includes a custom message placeholder, and formats condensed contact info.
---

# TRSC Weekly Newsletter Generator

Generates production-ready, self-contained HTML newsletters for Turtle Rock Science Club matching the design and layout of `docs/newsletter/01-info-recap.html`. The newsletter is called the "Lab Log". Each issue is published both as an email newsletter (`docs/newsletter/XX-<slug>.html`) and as an in-site web log entry (`docs/newsletter/XX-lab-log-entry.html`).

## Overview

Each weekly newsletter includes:
1. **Header & Artwork**: Club brand bar plus a custom cartoonish digital ink hero illustration (`generate_image`) combining all of that week's workshop topics into one scene.
2. **Spam & Delivery Notice**: Essential prompt to ensure delivery.
3. **Hero Greeting & Custom Message**: "Welcome to TRSC!" followed by an editable custom message paragraph placeholder for club announcements.
4. **Upcoming Events**: Workshop cards for each concurrent session with room numbers, times, and descriptions.
5. **Science Tidbits**: Fun, kid-friendly science facts (1 per workshop topic) introducing students to key concepts.
6. **In the News**: 2–3 recent real-world science breakthroughs retrieved via `search_web`.
7. **Weekly Science Interactive**: A featured browser simulation or game hosted on `trscienceclub.org` (e.g. `/slingshot`, `/titration`, `/ecology`) that lets students test real science principles hands-on at home. Includes topic kicker, title with route, honest challenge description (no marketing fluff), and a green CTA button.
8. **Fall Workshop Schedule**: Full roadmap table of meetings, tryouts, and dates.
9. **Essential Reference Guide**: Callout card linking to the TRSC Master Document and past lesson slides.
10. **Condensed Contacts**: Single compact block containing club email, website link, and school WhatsApp coordinators.

*Note: Excludes long onboarding/program logistics sections from Issue 0/1.*

---

## Workflow

### 1. Identify Target Date & Topics
Run the schedule parser to extract the week's date, topics, and room assignments:
```bash
uv run .agents/skills/trsc-newsletter-generator/scripts/parse_schedule.py --date <MM/DD>
```
If `--date` is omitted, review the schedule list to select the next upcoming session.

### 2. Generate Hero Artwork
Call `generate_image` to create a whimsical cartoon digital ink illustration combining all topics for that week:
- **Style**: Cartoonish digital ink illustration, bold clean outlines, vibrant colors, friendly and playful.
- **Content**: Incorporate visual elements from each of that week's topics into a unified scene (e.g. for CS + Chemistry: computer screens showing molecular code, glowing reaction flasks next to robotic circuits).
- **Aspect Ratio**: `16:9`
- **File Storage**:
  Copy the generated artifact to:
  1. `public/newsletter-XX-art.jpg`
  2. `docs/newsletter/newsletter-XX-art.jpg`
- **Commit & Push**:
  Commit and push `public/newsletter-XX-art.jpg` to GitHub so it is served reliably via:
  `https://raw.githubusercontent.com/OrigamiKoala/Turtle-Rock-Science-Club/main/public/newsletter-XX-art.jpg`

### 3. Retrieve Recent Science Breakthroughs
Use `search_web` to search for 2–3 recent breakthroughs from credible sources (Science News, ScienceDaily, Nature, NASA, MIT Technology Review):
- Query: recent science discoveries or breakthroughs related to astronomy, AI, biology, chemistry, or physics.
- Format: Category kicker, title, concise kid-friendly summary with a fun voice (2–3 sentences), and source link. Assume the students have little prior knowledge.

### 4. Draft Science Tidbits
Write 1 compelling, mind-blowing, kid-friendly paragraph for each workshop topic scheduled for that week:
- Explain an intriguing real-world phenomenon or scientific principle.
- Connect concepts to what students will explore in the session.
- Assume the students have little prior knowledge.

### 5. Feature the Weekly Science Interactive
Every week, TRSC releases a new interactive science tool, simulator, or game on the website:
- Identify that week's interactive route (e.g. `/slingshot`, `/titration`, `/ecology`).
- Explain the concrete challenge and scientific principles clearly and honestly (e.g. navigating to Neptune on a small fuel tank by stealing momentum behind Jupiter).
- **Zero fluff**: Never use feature advertisements, promotional hype, or vague marketing language.
- Include a CTA button with an absolute URL (`https://trscienceclub.org/<route>`) and mention the route tag `(/route)`.

### 6. Assemble HTML Newsletters
Generate two matching files:
1. **Email Newsletter (`docs/newsletter/XX-<slug>.html`)**:
   Follows `references/template.html`:
   - **Container**: `width="600"` table with `background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 24px rgba(31,58,66,0.06);`.
   - **Preheader**: Hidden inbox preview text.
   - **Header**: `#1F3A42` background, `https://trscienceclub.org/Logo.png` logo, Georgia serif title, green kicker.
   - **Artwork Row**: Full-bleed `width="600"` image pointing to raw GitHub URL.
   - **Custom Message Placeholder**:
     ```html
     <p style="margin:0 0 18px 0;background-color:#F5FAF2;border-left:4px solid #6CC24A;padding:12px 16px;border-radius:8px;color:#1F3A42;font-style:italic;">
       [Custom organizer message / weekly update goes here]
     </p>
     ```
   - **Interactive Card**: `#F5FAF2` background table with `border:2px solid #CBE6C5`, rounded corners, topic kicker, description, and green CTA button.
   - **Condensed Contacts**: Single compact table with club email, website link, and school WhatsApp contacts.

2. **Web Lab Log Entry (`docs/newsletter/XX-lab-log-entry.html`)**:
   Follows `references/entry-template.html` using Tailwind classes (`trsc-card`, `trsc-eyebrow`, `trsc-schedule-table`, dark mode variants) for the in-app modal reader on the club website.

### 7. Verify & Update CLAUDE.md
- Verify markup rendering, link targets, and email responsiveness.
- Update `CLAUDE.md` in the project root documenting the newly created newsletter issue and any new interactives.

---

## Common Mistakes
- **Relative image or link URLs**: Email clients cannot resolve local relative paths. Always use GitHub raw or full deployed HTTPS URLs (`https://trscienceclub.org/...`).
- **Missing topic in artwork**: Always blend *all* concurrent workshop topics of the week into the single hero artwork prompt.
- **Marketing fluff in interactive copy**: Never write hype-filled ad copy. Describe the actual mechanics and science clearly.
- **Forgetting web modal entry**: Always create or update both `XX-<slug>.html` and `XX-lab-log-entry.html`.
- **Forgetting CLAUDE.md update**: Always record new newsletter issues and interactives in `CLAUDE.md`.
