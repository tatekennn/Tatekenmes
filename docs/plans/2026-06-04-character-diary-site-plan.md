# Character Diary Site Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a Vercel-ready character homepage for 天霧 澪 with a diary section, initial content, and Hermes-compatible daily update automation.

**Architecture:** Create a small Next.js App Router site with local JSON content as the source of truth. The site reads profile/world/diary data from `src/content/site-data.ts` and `content/diary/*.json`. Provide a Node script and Hermes cron documentation so daily diary generation can append a new JSON entry and trigger Vercel redeploy via git push.

**Tech Stack:** Next.js, React, TypeScript, CSS Modules, Node.js scripts, git-based deployment to Vercel.

---

### Task 1: Audit the empty repository and define the final deliverables

**Objective:** Confirm the repo state and lock down the set of files to create.

**Files:**
- Inspect: repository root
- Create: `docs/plans/2026-06-04-character-diary-site-plan.md`

**Step 1: Inspect repository state**
Run: `git status --short --branch && find . -maxdepth 2 -type f | sort`
Expected: essentially empty repo except auth-test artifact.

**Step 2: Define deliverables**
Deliverables must include:
- Vercel-ready Next.js site
- Character/profile/world copy
- At least 5 diary entries
- Automation script/docs for Hermes daily updates
- README with setup and deployment instructions

**Step 3: Commit plan later with implementation commit**
No separate commit required if repo is still empty.

### Task 2: Create content model and character canon

**Objective:** Encode the character, world, nav, and diary metadata in reusable TypeScript/JSON structures.

**Files:**
- Create: `src/content/site-data.ts`
- Create: `content/diary/2026-06-01.json`
- Create: `content/diary/2026-06-02.json`
- Create: `content/diary/2026-06-03.json`
- Create: `content/diary/2026-06-04.json`
- Create: `content/diary/2026-06-05.json`

**Step 1: Define TypeScript data shape**
Include profile, sections, featured quotes, tag descriptions.

**Step 2: Write diary JSON schema**
Each diary entry should include:
```json
{
  "slug": "2026-06-01",
  "date": "2026-06-01",
  "title": "...",
  "excerpt": "...",
  "tags": ["仕事", "観測"],
  "mood": "quiet",
  "body": ["paragraph1", "paragraph2", "paragraph3"]
}
```

**Step 3: Add five initial entries**
Voice rules:
- first-person 「私」
- modern Tokyo office-worker details
- subtle occult/observation hints only
- 3 short paragraphs each

### Task 3: Build the Next.js application shell

**Objective:** Create the app skeleton and base configuration.

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `next-env.d.ts`
- Create: `.gitignore`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/diary/page.tsx`
- Create: `src/app/diary/[slug]/page.tsx`
- Create: `src/app/profile/page.tsx`
- Create: `src/app/world/page.tsx`
- Create: `src/app/not-found.tsx`
- Create: `src/components/site-shell.tsx`
- Create: `src/components/section-card.tsx`
- Create: `src/components/diary-card.tsx`
- Create: `src/components/ambient-orb.tsx`
- Create: `src/lib/diary.ts`

**Step 1: Create package manifest**
Use stable dependencies only:
```json
{
  "name": "tatekenmes",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "15.3.3",
    "react": "19.1.0",
    "react-dom": "19.1.0"
  },
  "devDependencies": {
    "typescript": "5.8.3",
    "@types/node": "22.15.21",
    "@types/react": "19.1.6",
    "@types/react-dom": "19.1.5"
  }
}
```

**Step 2: Implement data loader**
`src/lib/diary.ts` should read JSON files from `content/diary`, parse them, and sort descending by date.

**Step 3: Implement pages**
- Home page: hero, profile summary, latest diary cards, world fragments.
- Diary index: all entries.
- Diary detail: full entry.
- Profile: structured bio.
- World: observation rules + glossary.

**Step 4: Styling**
Use a purple dusk palette, card layout, thin borders, soft radial glows, and a clean reading column.

### Task 4: Add Hermes automation assets

**Objective:** Make the repo ready for daily diary generation by Hermes.

**Files:**
- Create: `scripts/generate_diary_prompt.txt`
- Create: `scripts/add-diary-entry.mjs`
- Create: `docs/hermes-automation.md`

**Step 1: Create the add-entry script**
The script should:
- accept a JSON file path or stdin payload
- validate required keys
- write `content/diary/YYYY-MM-DD.json`
- refuse overwrite unless `--force`

**Step 2: Create the generation prompt**
Prompt must include:
- character canon
- tone constraints
- JSON output schema
- forbidden content (battle shounen escalation, explicit lore dumps, OOC voice)

**Step 3: Document Hermes cron flow**
Document a safe flow:
1. Hermes cron runs with workdir on repo
2. It generates JSON diary content
3. Script writes file
4. git add/commit/push
5. Vercel auto-deploys

### Task 5: Add onboarding docs and verification steps

**Objective:** Make the project runnable by the user later.

**Files:**
- Create: `README.md`

**Step 1: README sections**
Include:
- project overview
- local setup
- Vercel deployment
- content structure
- Hermes daily automation flow
- how to rotate Git credentials safely

**Step 2: Verification commands**
Document exact commands:
- `npm install`
- `npm run build`
- optional `npm run dev`

### Task 6: Verify, review, and prepare git state

**Objective:** Ensure the implementation works and the repo is clean.

**Files:**
- Review all created files

**Step 1: Install dependencies**
Run: `npm install`
Expected: lockfile created.

**Step 2: Production build**
Run: `npm run build`
Expected: Next.js build succeeds.

**Step 3: Review repo state**
Run: `git status --short`
Expected: only intended project files changed.

**Step 4: Commit**
```bash
git add .
git commit -m "feat: build character diary homepage"
```
