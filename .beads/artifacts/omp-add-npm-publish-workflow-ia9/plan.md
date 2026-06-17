# Plan: omp-add-npm-publish-workflow-ia9

**Goal:** Automate npm publishing on version tags so `omp plugin install omp-lilac-provider` works for users.

## Graph Context

- **Blast radius:** `.github/workflows/publish.yml` (new), `package.json` (modified — add `publishConfig`)
- **Unblocks:** Users can install via npm (Quickstart path), enables future release automation
- **Blocked by:** None — the CI workflow (`.github/workflows/ci.yml`) already exists as a pre-publish quality gate
- **Critical path:** No — additive CD work
- **Forecast:** 30 minutes

## Observable Truths

What must be TRUE for the goal to be achieved:

1. A push of a `v*` tag (e.g. `v1.0.0`) triggers a GitHub Actions workflow that runs `npm publish`
2. `npm publish --dry-run` lists only the 6 files in the package.json `files` whitelist (no `.pi/`, `scripts/`, `types/`)
3. `package.json` has `publishConfig.access: "public"` so the package is visible on the npm registry
4. The publish workflow fails gracefully (non-zero exit, visible error) if `NPM_TOKEN` secret is missing

## Required Artifacts

| Artifact | Provides | Path | Status |
|----------|----------|------|--------|
| publish.yml | npm publish on tag trigger | `.github/workflows/publish.yml` | Need |
| publishConfig | Public access declaration | `package.json` | Need |
| README update | Link to npm package | `README.md` | Should |

## Wave Structure

| Wave | Tasks | Parallel? | Preconditions | Verification Gate |
|------|-------|-----------|---------------|-------------------|
| 1 | package.json publishConfig + publish.yml creation | No (config before workflow) | None | `npm publish --dry-run` shows correct files |
| 2 | Verification | No | Wave 1 | YAML valid, dry-run correct, README badge |

## Tasks

Detailed task decomposition: see `tasks.md` in the same artifact directory.

## Full Verification

```bash
cd /home/ryan/repos/omp-lilac-provider

# Verify publishConfig
node -e "console.log(require('./package.json').publishConfig.access)" | grep public

# Verify files whitelist (dry run)
npm publish --dry-run 2>&1 | grep -E "index\.ts|models\.json|custom-models\.json|patch\.json|README\.md|LICENSE"

# Verify no extraneous files
npm publish --dry-run 2>&1 | grep -vE "(index\.ts|models\.json|custom-models\.json|patch\.json|README\.md|LICENSE|package\.json|Tarball)" | grep -v "^$"

# Verify workflow YAML syntax
npx actionlint .github/workflows/publish.yml
```
