---
name: trsc-newsletter-generator
description: >-
  Generates the complete weekly Turtle Rock Science Club newsletter HTML from the schedule in docs/schedule.md. Follows the visual format of 01-info-recap.html, generates combined digital ink hero artwork using Nano Banana (generate_image), gathers 2-3 recent breakthroughs via web search for In the News, writes engaging Science Tidbits for each of the week's topics, includes a custom message placeholder, and formats condensed contact info.
---

# TRSC Weekly Newsletter Generator

Generates production-ready, self-contained HTML newsletters for Turtle Rock Science Club matching the design and layout of `docs/newsletter/01-info-recap.html`. The newsletter is called the "Lab Log". 

## Overview

Each weekly newsletter includes:
1. **Header & Artwork**: Club brand bar plus a custom cartoonish digital ink hero illustration (`generate_image`) combining all of that week's workshop topics into one scene.
2. **Spam & Delivery Notice**: Essential prompt to ensure delivery.
3. **Hero Greeting & Custom Message**: "Welcome to TRSC!" followed by an editable custom message paragraph placeholder for club announcements.
4. **Upcoming Events**: Workshop cards for each concurrent session with room numbers, times, and descriptions.
5. **Science Tidbits**: Fun, kid-friendly science facts (1 per workshop topic) introducing students to key concepts.
6. **In the News**: 2–3 recent real-world science breakthroughs retrieved via `search_web`.
7. **Fall Workshop Schedule**: Full roadmap table of meetings, tryouts, and dates.
8. **Essential Reference Guide**: Callout card linking to the TRSC Master Document.
9. **Condensed Contacts**: Single compact block containing club email, website link, and school WhatsApp coordinators.

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

### 5. Assemble HTML Newsletter
Create `docs/newsletter/XX-<slug>.html` using the styling rules:
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
- **Condensed Contacts**: Single compact table with club email, website link, and school WhatsApp contacts.

### 6. Verify & Update CLAUDE.md
- Verify markup rendering and link targets.
- Update `CLAUDE.md` in the project root documenting the newly created newsletter issue.

---

## Common Mistakes
- **Relative image URLs**: Email clients cannot resolve local relative paths. Always use GitHub raw or deployed HTTPS URLs.
- **Missing topic in artwork**: Always blend *all* concurrent workshop topics of the week into the single hero artwork prompt.
- **Forgetting CLAUDE.md update**: Always record new newsletter templates in `CLAUDE.md`.
