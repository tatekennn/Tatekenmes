# VTuber-style Home Redesign Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Shift the homepage from a quiet dark literary diary aesthetic to a brighter, polished, character-forward VTuber-style official site while preserving a subtle dark/occult undertone.

**Architecture:** Keep the existing Next.js App Router structure and diary data model intact. Redesign the visual system at the CSS layer, restructure only the homepage composition, and add a lightweight illustration showcase fed by local static SVG assets so the site can present multiple visual directions even before final character art exists.

**Tech Stack:** Next.js 15, React 19, TypeScript, global CSS, local static SVG assets.

---

### Task 1: Preserve current architecture and identify lowest-risk files

**Objective:** Limit the redesign to high-leverage files.

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/site-shell.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/content/site-data.ts`
- Create: `public/illustrations/*.svg`

**Verification:**
- Confirm the existing diary routes and data files remain untouched.
- Ensure no dependency changes are required.

### Task 2: Reframe shared brand presentation

**Objective:** Update the common shell so the site reads more like a polished character homepage.

**Files:**
- Modify: `src/components/site-shell.tsx`

**Changes:**
- Replace the current subtitle with wording that feels more like a character-official site.
- Add a small brand note/tagline area without changing navigation structure.

**Verification:**
- Header still renders on all pages.
- Navigation links continue to work.

### Task 3: Rebuild homepage composition

**Objective:** Replace the minimal literary landing layout with a character-forward VTuber-style top page.

**Files:**
- Modify: `src/app/page.tsx`

**Changes:**
- Add richer hero structure: ruby, character name, pitch, CTA buttons, compact stat chips, decorative visual panel.
- Introduce a “profile / concept / worldview” split that feels like an official character site rather than a diary intro.
- Keep latest diary cards but present them as featured pickups.
- Add a visual showcase section for 10 illustration slots.

**Verification:**
- Homepage renders without type errors.
- Existing diary cards still link correctly.

### Task 4: Replace the visual system

**Objective:** Shift the site from dark dusk panels to bright-premium VTuber styling.

**Files:**
- Modify: `src/app/globals.css`

**Changes:**
- Redefine color variables toward ivory / blush / lilac / plum / moonlit navy.
- Brighten surfaces and improve text contrast.
- Introduce new utility classes for hero layout, pill buttons, stat chips, visual showcase, and gallery cards.
- Preserve responsiveness for narrow screens.

**Verification:**
- Header, hero, cards, and diary blocks all remain legible on desktop and mobile.
- No visible overlap or broken grid at common widths.

### Task 5: Add ten local illustration placeholders

**Objective:** Create immediately usable visual slots even without external image generation.

**Files:**
- Create: `public/illustrations/mio-visual-01.svg` through `mio-visual-10.svg`

**Changes:**
- Build 10 standalone SVG concept illustrations with varied motif combinations (moon, office glass, ribbons, rain, archive, neon reflection, etc.).
- Use them as polished placeholder visuals, not fake screenshots or fake news art.

**Verification:**
- All 10 files exist.
- They render from `/illustrations/...` in the browser.

### Task 6: Adjust site copy just enough to match the new direction

**Objective:** Keep the character concept intact while slightly brightening the presentation.

**Files:**
- Modify: `src/content/site-data.ts`

**Changes:**
- Tune metadata description and selected copy toward “official site / archive / diary” presentation.
- Do not erase the office-worker-with-occult-undertone premise.

**Verification:**
- Japanese copy stays coherent with the existing character.
- No fake-news-like section wording appears.

### Task 7: Build and verify

**Objective:** Ensure the redesign actually compiles and looks correct.

**Files:**
- No code changes unless fixes are needed.

**Run:**
- `npm run lint`
- `npm run build`

**Verification:**
- TypeScript passes.
- Next build succeeds.
- Manually inspect the homepage in a browser.

### Task 8: Review polish

**Objective:** Catch immersion-breaking leftovers.

**Check:**
- No stray “dark literary only” framing dominates the top page.
- No placeholder text like lorem ipsum.
- No fake news blocks.
- Buttons, headings, and labels are consistent and polished.

**Verification:**
- Browser snapshot looks cohesive.
- The homepage now reads as a VTuber-like official homepage with a soft nocturne undertone.
