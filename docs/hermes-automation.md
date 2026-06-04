# Hermes automation flow

This repository is set up so Hermes can generate one JSON diary entry per run, commit it, push it, and let Vercel redeploy automatically.

## Expected content flow

1. Hermes runs with the repo workdir set to `/opt/data/Tatekenmes`.
2. Hermes uses `scripts/generate_diary_prompt.txt` to request a single diary entry as strict JSON.
3. Hermes pipes that JSON into `node scripts/add-diary-entry.mjs` or passes a saved JSON file path.
4. The script validates shape, enforces `slug === date`, creates `content/diary/YYYY-MM-DD.json`, and refuses overwrite unless `--force` is present.
5. Hermes stages the new file, commits it, and pushes to the tracked branch.
6. Vercel detects the git push and performs a fresh deployment.

## Safe command sequence

Run from the repo root:

```bash
cd /opt/data/Tatekenmes

# Example: payload already written to /tmp/entry.json
node scripts/add-diary-entry.mjs /tmp/entry.json

git add content/diary

git commit -m "feat: add diary entry $(date +%F)"

git push
```

Example using stdin instead of a temp file:

```bash
cat /tmp/entry.json | node scripts/add-diary-entry.mjs
```

Example overwrite when intentionally regenerating the same day:

```bash
cat /tmp/entry.json | node scripts/add-diary-entry.mjs --force
```

## Hermes cron guidance

A typical cron-driven Hermes job should do the following in one run:

- generate today’s diary JSON from the prompt file
- validate and write it with `scripts/add-diary-entry.mjs`
- `git add content/diary`
- `git commit` only if there is a new file or intentional overwrite
- `git push` to the branch connected to Vercel

Important guardrails:

- Keep git credentials scoped to the repository or automation user.
- Prefer a dedicated PAT or deploy credential with the minimum permissions needed to push.
- Rotate credentials regularly and immediately on suspicion of leakage.
- Avoid `--force` unless the daily entry truly needs replacement.
- Keep the prompt and script in git so the automation path remains auditable.

## Vercel deployment model

This project uses standard git-based deployment:

- GitHub/Git remote receives the push
- Vercel sees the new commit
- Next.js rebuilds using the repo contents
- New diary JSON becomes visible on `/diary` and the homepage latest-entry section

No direct Vercel API call is required if the repository is already linked to a Vercel project.

## Recommended failure handling

If generation fails validation:

- do not commit anything
- persist the raw model output to logs or a temp file for inspection
- rerun only after fixing the prompt or payload

If git push fails:

- leave the generated file in the repo
- inspect remote auth or branch protections
- push again once credentials are fixed
