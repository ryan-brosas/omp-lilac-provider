---
purpose: Product Requirements Document for a bead
updated: 2026-06-18
---

# PRD: Add daily model-update GitHub Actions workflow

**Bead:** omp-omp-daily-model-update-workflow-wdu | **Type:** feature | **Priority:** P2
**Created:** 2026-06-17 | **Estimate:** 45m

## Problem

WHEN Lilac adds new models, removes deprecated ones, or changes pricing THEN `models.json` and `README.md` drift from the live API state BECAUSE `npm run update-models` is only invoked manually. The provider's model catalog and documented pricing go stale without automation.

**Who is affected?** OMP users who rely on `omp-lilac-provider` for accurate model listings and pricing. Also the maintainer (Ryan) who must remember to run the script or notice drift.

**Why now?** The `scripts/update-models.js` script is already built and battle-tested. Adding a daily cron workflow is the smallest possible step to close the automation gap. Every day without it is a day the published models.json and README could be stale.

## Scope

### In Scope
- New `.github/workflows/update-models.yml` workflow file
- Daily cron trigger (once per day, off-peak)
- Run `npm run update-models` (which invokes `scripts/update-models.js`)
- Detect file changes (`models.json`, `README.md`)
- Auto-commit changes if any
- Create a pull request for review
- Requires `LILAC_API_KEY` GitHub secret

### Out of Scope
- Modifying `scripts/update-models.js` itself
- Merging PRs automatically (human review gate)
- Triggering on push/PR (that's the CI workflow's domain)
- Notifications beyond the PR itself
- Multi-branch model sync

## Requirements

| # | Requirement | Priority | Acceptance Criteria |
|---|------------|----------|-------------------|
| 1 | Daily scheduled run | MUST | Workflow triggers on `schedule: cron(0 8 * * *)` (8 AM UTC, off-peak) |
| 2 | Fetch latest models from Lilac API | MUST | `npm run update-models` executes successfully |
| 3 | Detect changes | MUST | Workflow checks `git diff --exit-code` on models.json and README.md |
| 4 | Auto-commit changes | MUST | If changes detected, commit with descriptive message including date |
| 5 | Create PR for review | MUST | PR opened against `main` with model diff summary in body |
| 6 | Handle API key securely | MUST | `LILAC_API_KEY` read from GitHub Secrets, never echoed |
| 7 | Handle API failures gracefully | SHOULD | Non-zero exit on API failure, workflow run marked failed, no stale PR created |
| 8 | Manual dispatch support | SHOULD | `workflow_dispatch` trigger for ad-hoc runs |

## Technical Context

- **Script:** `scripts/update-models.js` — fetches from `https://api.getlilac.com/v1/models`, transforms pricing to per-million-tokens, updates `models.json` and `README.md`
- **Existing CI:** `.github/workflows/ci.yml` — runs typecheck + test on push/PR to main (separate concern)
- **Artifacts touched:** `models.json` (model definitions), `README.md` (model table in `## Models` section)
- **Runtime deps:** Node 22, `npm ci`, no build step needed
- **Env:** `LILAC_API_KEY` required for API access
- **No existing scheduled workflows** — this is the first cron-based automation in the repo

## Approach

Create a single `.github/workflows/update-models.yml` with:

1. **Triggers:** `schedule` (daily 8 AM UTC) + `workflow_dispatch` (manual)
2. **Single job:** checkout → setup Node 22 → npm ci → run update-models → git diff check → commit + PR if changed
3. **PR:** Use `actions/checkout@v4` with fetch-depth 0, create branch `auto/update-models-YYYY-MM-DD`, push, open PR via `gh pr create` or `peter-evans/create-pull-request` action
4. **Auth:** `LILAC_API_KEY` from `secrets.LILAC_API_KEY`, `GITHUB_TOKEN` from `secrets.GITHUB_TOKEN` (auto-available) for PR creation

**Alternatives considered:**
- **Cron job on Utopia server:** Rejected — couples automation to a single machine, no visibility, no PR review gate
- **Webhook-driven (trigger on Lilac API change):** Rejected — Lilac has no webhook endpoint; polling is simpler and sufficient
- **Use `peter-evans/create-pull-request` action:** Considered but rejected in favor of native `gh` CLI — fewer dependencies, same capabilities

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| API key expires/rotates | Low | High — workflow silently fails | Workflow failure is visible in Actions tab; PR stops appearing |
| Lilac API is down during scheduled run | Low | Low — single missed update | Next day's run catches up; `workflow_dispatch` for immediate retry |
| Script produces no-op changes that still create a PR | Low | Low — noise | `git diff --exit-code` prevents empty commits; script is deterministic |
| Concurrent runs (manual dispatch overlapping cron) | Low | Low — branch name collision | `concurrency: update-models` group in workflow YAML |
| Breaking API changes in Lilac's /v1/models response | Low | Med — script exits non-zero | Workflow marked failed; human investigates; script fix is separate bead |

## Acceptance Criteria

- [ ] `.github/workflows/update-models.yml` exists and is valid YAML
    - Verify: `gh workflow list` shows it, or manual dispatch succeeds
- [ ] Workflow runs on schedule (verified after first scheduled run)
    - Verify: Actions tab shows successful run from cron trigger
- [ ] When models change, a PR is opened against main
    - Verify: PR appears with model diff in description
- [ ] When no models change, no PR is created
    - Verify: Workflow run shows "No changes" in logs, no PR opened
- [ ] `LILAC_API_KEY` secret is not exposed in logs
    - Verify: Review workflow run logs — no API key in output
