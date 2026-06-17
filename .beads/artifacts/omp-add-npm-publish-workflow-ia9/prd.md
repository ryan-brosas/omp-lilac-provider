# PRD: Add npm publish workflow

**Bead:** omp-add-npm-publish-workflow-ia9 | **Type:** chore | **Priority:** P1
**Created:** 2026-06-18 | **Estimate:** 30 min

## Problem

WHEN a maintainer tags a release THEN the package must be manually published to npm BECAUSE there is no automated publish workflow. The README's Quickstart says `omp plugin install omp-lilac-provider` but this only works if the package is on the npm registry.

**Who is affected?** All users who try the README Quickstart — they get "package not found."
**Why now?** The plugin is feature-complete, CI is in place, and the package is ready for distribution. Publishing is the last blocker before this is usable.

## Scope

### In Scope
- Add `.github/workflows/publish.yml` triggered on `v*` tags
- Steps: checkout → setup Node 22 → npm ci → npm publish
- Configure `NPM_TOKEN` secret in workflow
- Verify `package.json` `files` whitelist excludes dev-only files
- Add `publishConfig` to `package.json` (public access)
- Verify `.npmignore` is not needed (the `files` whitelist is sufficient)

### Out of Scope
- Automated changelog generation (future bead)
- Git tag automation (tags are created manually by maintainer)
- Version bumping (manual via `npm version`)
- npm provenance/signing (future enhancement)
- Pre-publish test gate (already handled by CI workflow on push)

## Requirements

| # | Requirement | Priority | Acceptance Criteria |
|---|------------|----------|-------------------|
| 1 | publish workflow on tag | MUST | Push `v*` tag triggers workflow |
| 2 | npm publish step | MUST | `npm publish` runs with NPM_TOKEN |
| 3 | public access config | MUST | `publishConfig.access: "public"` in package.json |
| 4 | Correct files whitelist | SHOULD | Only provider files published; `.pi/`, scripts, types excluded |
| 5 | Node 22 runtime | SHOULD | Uses same Node version as CI workflow |

## Technical Context

- **Current CI:** `.github/workflows/ci.yml` runs typecheck + tests on push/PR
- **package.json `files`:** `["index.ts", "models.json", "custom-models.json", "patch.json", "README.md", "LICENSE"]` — already correct
- **Dependencies:** `@honcho-ai/sdk` is not used by the provider (only by `.pi/` extensions which are gitignored). Consider moving to `devDependencies` — out of scope for this bead but noted.
- **No `.npmignore`** — the `files` whitelist is sufficient; npm ignores everything not in `files`
- **Lockfile:** `package-lock.json` exists and is tracked for `npm ci` reproducibility
- **npm requires `NPM_TOKEN`** — classic Automation token from npm's Access Tokens page

## Approach

1. Add `"publishConfig": { "access": "public" }` to `package.json`
2. Create `.github/workflows/publish.yml`:
   - Trigger: `push: tags: ['v*']`
   - Job: ubuntu-latest, Node 22
   - Steps: checkout → npm ci → npm publish
   - Env: `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`
3. Verify `npm publish --dry-run` locally lists only the 6 files in the `files` whitelist

**Alternatives considered:**
- **GitHub Release + npm publish** — Rejected. Keep bead focused; GitHub releases are a follow-up.
- **semantic-release** — Rejected. Overkill for a single-file plugin. Manual tags are sufficient.
- **npm provenance** — Rejected. Requires OIDC setup and public repo configuration. Future enhancement.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| NPM_TOKEN not configured | Med | High | Document in README; workflow fails gracefully |
| `package-lock.json` out of sync | Low | Med | `npm ci` validates lockfile integrity |
| Accidental publish of .pi/ files | Low | High | `files` whitelist prevents this; verify with `--dry-run` |

## Success Criteria

- [ ] Push a `v*` tag triggers the publish workflow
    - Verify: Create test tag `v0.0.0-test`, push, check Actions tab
- [ ] `npm publish --dry-run` shows only the 6 whitelisted files
    - Verify: `npm publish --dry-run 2>&1 | grep "Tarball Contents"`
- [ ] `publishConfig.access` is `"public"` in `package.json`
    - Verify: `node -e "console.log(require('./package.json').publishConfig.access)"`
- [ ] Workflow YAML is valid
    - Verify: `npx actionlint .github/workflows/publish.yml`
