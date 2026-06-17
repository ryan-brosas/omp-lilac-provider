---
purpose: Decision log for a bead
updated: 2026-06-18
---

# Decisions: omp-omp-daily-model-update-workflow-wdu

## Decision Log

| # | Decision | Rationale | Confidence |
|---|----------|-----------|------------|
| 1 | Use native `gh` CLI for PR creation instead of `peter-evans/create-pull-request` action | Fewer external dependencies; `gh` is pre-installed on GitHub runners; same capabilities (branch, commit, PR with body) | High |
| 2 | Schedule at 8 AM UTC (4 AM EST / 4 PM PHT) | Off-peak for Lilac API; catches any overnight model changes; PR arrives in maintainer's morning | High |
| 3 | Use `concurrency: update-models` group to prevent overlapping runs | Prevents branch name collision and duplicate PRs if cron + manual dispatch overlap | High |
| 4 | Branch naming: `auto/update-models-YYYY-MM-DD` | Date-stamped for traceability; `auto/` prefix distinguishes from human branches | High |
| 5 | Commit only `models.json` and `README.md` — not `package-lock.json` or other artifacts | `npm ci` may update `package-lock.json` if deps change, but that's a separate concern; focused diff reduces noise | High |
| 6 | No auto-merge — human review gate via PR | Model data is user-facing; a bad API response or script bug could produce wrong pricing. Human eyes before merge. | High |
| 7 | Single job, not matrix | Only one script to run; matrix adds complexity with no benefit | High |

## Rejected Alternatives

| # | Alternative | Why Rejected | Risk if Re-introduced |
|---|-------------|--------------|----------------------|
| 1 | `peter-evans/create-pull-request@v7` action | Adds an external dependency for functionality `gh` already provides; one more thing to keep updated | Low — would work fine, just more dependencies |
| 2 | Server-side cron on Utopia with git push | Couples automation to a single machine; no GitHub Actions visibility; no PR review gate | Medium — if Utopia is down, updates stop silently |
| 3 | Trigger on Lilac webhook (if existed) | Lilac has no webhook endpoint; polling is the only option | N/A — not feasible |
| 4 | Run on every push to main | Unnecessary churn; models don't change that frequently; would create noise in commit history | Low — wasteful but harmless |
| 5 | Commit directly to main (no PR) | Bypasses review; model data changes should be human-verified before publishing | High — bad data could ship to users |

## Assumptions

| # | Assumption | Validation | Invalidation Impact |
|---|------------|------------|---------------------|
| 1 | `LILAC_API_KEY` GitHub secret is set and valid | Unknown — must be set before workflow can succeed | Workflow fails on API call; PRs stop appearing |
| 2 | Lilac `/v1/models` API is stable (no breaking changes imminent) | Validated — script has been working against current API | Script exits non-zero; workflow marked failed; script fix needed (separate bead) |
| 3 | `npm run update-models` is idempotent and safe to run daily | Validated — script only writes changed data; no side effects | Low risk — script reads API, writes files, nothing else |
| 4 | `models.json` and `README.md` are the only files changed by the script | Validated — confirmed by reading `scripts/update-models.js` | If wrong, missing changes in commit; add additional file patterns to commit step |
| 5 | GitHub Actions free tier limits are sufficient for 1 daily run (~2 min each) | Validated — public repo, well within free tier (2000 min/month) | Would need to reduce frequency or move to self-hosted runner |
