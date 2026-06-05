# Tatekenmes character diary site

天霧 澪の個人サイト兼日記アーカイブです。`src/content/site-data.ts` にキャラ設定を、`content/diary/*.json` に日記を置き、GitHub への push をきっかけに Vercel が再デプロイする前提で構成しています。

## What is included

- Next.js 15 App Router shell in TypeScript
- Home, diary archive, diary detail, profile, and world pages
- Server-side diary loader using `fs` and `path`
- Purple dusk visual theme with clean cards, thin borders, and soft glow accents
- Hermes-ready prompt and validation script for daily diary entry generation
- Documentation for cron → git push → Vercel deployment flow

## Project structure

```text
src/
  app/
  components/
  lib/diary.ts
  content/site-data.ts
content/
  diary/*.json
scripts/
  generate_diary_prompt.txt
  add-diary-entry.mjs
docs/
  hermes-automation.md
```

## Local setup

From the repository root:

```bash
cd /opt/data/Tatekenmes
npm install
npm run build
```

Optional local development server:

```bash
npm run dev
```

このリポジトリには初期状態で `src/content/site-data.ts` と 5 本の日記 JSON が入っています。`content/diary` が空でもビルドは通りますが、公開サイトとしては最低 1 本以上ある方が自然です。

## Content model

### Site data

ページ群は `src/content/site-data.ts` の以下を利用します:

- `profile`
- `navigation`
- `worldFragments`
- `featuredQuote`
- `quickFacts`
- `tagDescriptions`

### Diary entries

Each file in `content/diary` should be JSON with this shape:

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

Entries are loaded on the server and sorted by `date` descending.

## Adding diary entries with the script

The helper script accepts either a JSON file path or stdin.

```bash
node scripts/add-diary-entry.mjs /tmp/entry.json
```

Or:

```bash
cat /tmp/entry.json | node scripts/add-diary-entry.mjs
```

It will:

- validate required keys
- require `slug` and `date` in `YYYY-MM-DD` format
- require `slug === date`
- write `content/diary/YYYY-MM-DD.json`
- refuse overwrite unless `--force` is passed

Example overwrite:

```bash
cat /tmp/entry.json | node scripts/add-diary-entry.mjs --force
```

## Hermes daily automation flow

The intended automation loop is:

1. Hermes runs inside `/opt/data/Tatekenmes` on a daily cron.
2. Hermes generates one JSON entry from `scripts/generate_diary_prompt.txt`.
3. `node scripts/add-diary-entry.mjs` validates and writes the file.
4. Git stages the new diary file.
5. Git commits and pushes.
6. Vercel receives the push and rebuilds automatically.

See `docs/hermes-automation.md` for the operational flow and guardrails.

## Vercel deployment

1. Push this repository to the git remote linked with Vercel.
2. In Vercel, ensure the framework preset is Next.js.
3. Keep the production branch aligned with the branch Hermes pushes to.
4. Each new diary commit triggers a new deployment automatically.

ローカル JSON をそのまま読むため、基本構成では別途 CMS やデータベースは不要です。

## Git credential rotation guidance

For automation:

- use a dedicated git credential or PAT with the minimum push scope required
- store it in the automation environment, not in the repo
- rotate it on a schedule and immediately after any suspected exposure
- verify Vercel remains connected to the correct remote after credential changes

## Verification commands

Use these exact commands after content files are present:

```bash
npm install
npm run build
# optional
npm run dev
```
