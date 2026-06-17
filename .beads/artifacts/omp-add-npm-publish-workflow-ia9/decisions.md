# Decisions: omp-add-npm-publish-workflow-ia9

## Decision Log

### 1. Tag trigger pattern: `v*` vs explicit semver regex
**Decision:** Use `on.push.tags: ['v*']` — trigger on any tag starting with `v`.
**Rationale:** Matches npm version conventions (`npm version` creates `v1.0.0` tags). Simple and clear. A stricter regex like `v[0-9]+.[0-9]+.[0-9]+` would be more precise but harder to maintain.
**Rejected:** GitHub Release trigger (`on.release.types: [published]`) — requires GitHub release creation as a manual step before npm publish. Tag trigger allows `git push --tags` to trigger both npm publish AND GitHub release creation simultaneously.

### 2. `npm ci` vs `npm install` in publish workflow
**Decision:** Use `npm ci` for reproducible installs.
**Rationale:** `npm ci` validates the lockfile and produces a clean install every time. Since `package-lock.json` is tracked, this ensures the exact dependency tree used in CI is what gets published.
**Rejected:** `npm install` — updates lockfile, slower, less deterministic.

### 3. Setup-node registry-url for npm publish
**Decision:** Set `registry-url: 'https://registry.npmjs.org'` in `actions/setup-node@v4`.
**Rationale:** This creates a `.npmrc` with the NPM_TOKEN, enabling `npm publish` without manual config. Standard practice from GitHub Actions docs.
**Rejected:** Manual `.npmrc` creation step — more verbose, same result.

### 4. publishConfig: public vs restricted
**Decision:** `"publishConfig": { "access": "public" }` — explicitly public.
**Rationale:** This is an open-source OMP plugin. Making it public ensures discoverability and matches the MIT license. Without this, scoped packages default to restricted on first publish.
**Rejected:** Removing `publishConfig` and relying on CLI flag — explicit is better for CI automation.

### 5. No pre-publish test step in publish workflow
**Decision:** Don't run tests in the publish workflow.
**Rationale:** The CI workflow already runs typecheck + tests on every push to main. The publish workflow only triggers on tags (which can only be pushed from main). Adding redundant test steps wastes CI minutes.
**Rejected:** Adding test gate to publish workflow — redundant because CI already gates pushes to main. Tags can't be pushed from branches directly (tags are commit-level).

### 6. `@honcho-ai/sdk` in dependencies (not moved)
**Decision:** Leave `@honcho-ai/sdk` as a regular dependency for now. Not in scope for this bead.
**Rationale:** It's only used by `.pi/` extensions (gitignored, not published). Moving it to devDependencies and documenting is a separate bead. The `files` whitelist already excludes `.pi/` from npm publish regardless.
**Rejected:** Moving to devDependencies in this bead — scope creep, no impact on publish workflow.

## Rejected Alternatives
- **semantic-release** — Overkill for a single-file plugin. Adds ~30 npm packages as transitive deps. Manual `npm version` + tag push is simpler.
- **GitHub Release workflow** — Scope creep. Separate bead for creating GitHub releases with release notes from tags.
- **npm provenance/attestation** — Requires OIDC trust configuration. Premature for first release; future enhancement.
- **Matrix publish across registries** — npm is the only target. GitHub Packages or other registries would be a separate bead.
