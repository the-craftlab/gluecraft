# Gluecraft Rebrand Summary

This document summarizes the rebranding from `@expedition/jpd-github-connector` to `@thecraftlab/gluecraft`.

## Package Changes

### NPM Package
- **Old:** `@expedition/jpd-github-connector`
- **New:** `@thecraftlab/gluecraft`

### Configuration File
- **Old:** `config/sync-config.yaml`
- **New:** `config/gluecraft.yaml`
- **Template:** `config/gluecraft.minimal.yaml`

### CLI Commands
All CLI commands have been renamed with the `gluecraft` prefix:

| Old Command | New Command |
|-------------|-------------|
| `jpd-sync` | `gluecraft` |
| `jpd-setup` | `gluecraft-setup` |
| `jpd-discover` | `gluecraft-discover` |
| `jpd-health` | `gluecraft-health` |
| `jpd-validate` | `gluecraft-validate` |
| `jpd-setup-labels` | `gluecraft-setup-labels` |

### Repository URLs
- **Old:** `https://github.com/expedition/jpd-to-github-connector`
- **New (Integration):** `https://github.com/thecraftlab/gluecraft`
- **New (Action Hub):** `https://github.com/the-craftlab/gluecraft`

### Documentation Site
- **Old:** `https://expedition.github.io/jpd-to-github-connector/`
- **New:** `https://gluecraft.thecraftlab.dev` (primary)
- **Alternate:** `https://thecraftlab.github.io/gluecraft/`

## Brand Identity

### Organization
- **Old:** Expedition
- **New:** The Craft Lab

### Product Name
- **Old:** JPD to GitHub Connector / JPD-GitHub Connector
- **New:** Gluecraft JPD

### Tagline
- **Old:** "Bidirectional sync between Jira Product Discovery and GitHub Issues"
- **New:** "Bidirectional sync between Jira Product Discovery and GitHub Issues by The Craft Lab"

### Brand Context
Gluecraft JPD is now part of **The Craft Lab** - a collection of specialized tools (each a "craft") for modern development workflows.

## Files Updated

### Root Level
- ✅ `package.json` - Package name, author, repository URLs, keywords, config file reference
- ✅ `action.yml` - GitHub Action name, description, author, default config path
- ✅ `README.md` - All references, badges, installation commands, examples
- ✅ `env.example` - Config path reference

### Configuration
- ✅ `config/sync-config.minimal.yaml` → `config/gluecraft.minimal.yaml` (renamed)
- ✅ Template updated with Gluecraft branding and docs link
- ✅ All CLI commands updated to reference `gluecraft.yaml`

### Source Code
- ✅ `src/index.ts` - Default config path
- ✅ `src/cli/setup.ts` - Config file name, template references
- ✅ `src/cli/validate-config.ts` - Default config path
- ✅ `src/cli/setup-labels.ts` - Default config path
- ✅ `src/cli/health-check.ts` - Config path references
- ✅ `src/cli/discover-fields.ts` - Config snippet output

### Documentation
- ✅ `docs/package.json` - Package metadata
- ✅ `docs/docusaurus.config.ts` - Site title, URLs, organization, footer
- ✅ `docs/docs/intro.md` - Product name, references
- ✅ `docs/docs/getting-started/prerequisites.md` - Product references
- ✅ `docs/docs/getting-started/quick-start.md` - Product name, clone URLs
- ✅ `docs/docs/getting-started/manual-setup.md` - Product name, clone URLs
- ✅ `docs/docs/guides/contributing.md` - Title, repository URLs
- ✅ `docs/docs/features/sub-issues.md` - Product name
- ✅ `docs/docs/troubleshooting/common-issues.md` - Product name
- ✅ `docs/docs/cli/sync-commands.md` - Product name

## Usage Examples

### Installation

**Old:**
```bash
npx @expedition/jpd-github-connector setup
npm install -g @expedition/jpd-github-connector
```

**New:**
```bash
npx @thecraftlab/gluecraft setup
npm install -g @thecraftlab/gluecraft
```

### GitHub Actions

**Old:**
```yaml
name: JPD Sync
jobs:
  sync:
    steps:
      - name: Sync JPD <-> GitHub
        run: npx @expedition/jpd-github-connector sync
```

**New (using central action hub):**
```yaml
name: Gluecraft JPD Sync
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: the-craftlab/gluecraft@v1
        with:
          integration: jpd
          config-path: .github/workflows/gluecraft.yaml
```

**Alternative (using integration-specific action):**
```yaml
- uses: the-craftlab/gluecraft@v1
  with:
    config-path: .github/workflows/gluecraft.yaml
```

### Package.json Scripts

**Old:**
```json
{
  "scripts": {
    "sync:setup": "jpd-github-connector setup",
    "sync:run": "jpd-github-connector sync"
  }
}
```

**New:**
```json
{
  "scripts": {
    "sync:setup": "gluecraft setup",
    "sync:run": "gluecraft sync"
  }
}
```

## Next Steps

### Before Publishing

1. **Update GitHub Repositories**
   
   **Action Hub (the-craftlab/gluecraft):**
   - Create composite action that routes to integrations
   - Add action.yml with routing logic
   - Document all available integrations
   
   **Integration Repo (the-craftlab/gluecraft):**
   - Create new repository: `https://github.com/thecraftlab/gluecraft`
   - Transfer or migrate from old repository
   - Update repository settings and webhooks
   - Ensure action.yml is properly configured

2. **Verify NPM Scope**
   - Ensure `@thecraftlab` org exists on NPM
   - Add collaborators to the org
   - Verify publishing permissions

3. **Test Build**
   ```bash
   pnpm install
   pnpm build
   pnpm test
   ```

4. **Update Documentation Deployment**
   - Configure GitHub Pages for new repository
   - Update CNAME if using custom domain
   - Test documentation build: `pnpm docs:build`

5. **Publish to NPM**
   ```bash
   npm login
   npm publish --access public
   ```

### Migration Guide for Users

Users upgrading from the old package should:

1. **Uninstall old package:**
   ```bash
   npm uninstall @expedition/jpd-github-connector
   ```

2. **Install new package:**
   ```bash
   npm install @thecraftlab/gluecraft
   ```

3. **Update scripts in package.json** (replace `jpd-github-connector` with `gluecraft`)

4. **Update GitHub Actions workflows** (replace package name and workflow names)

5. **Rename config file (optional but recommended):**
   ```bash
   mv config/sync-config.yaml config/gluecraft.yaml
   ```
   
   Or update `CONFIG_PATH` environment variable if keeping old name

## Brand Architecture

```
The Craft Lab (Organization)
│
├── gluecraft
│   ├── Purpose: GitHub Action hub (composite action)
│   ├── Repository: https://github.com/the-craftlab/gluecraft
│   └── Routes to integration-specific actions
│
├── Gluecraft Integrations (Tool Family)
│   ├── gluecraft
│   │   ├── NPM: @thecraftlab/gluecraft
│   │   ├── CLI: gluecraft
│   │   └── Action: the-craftlab/gluecraft@v1
│   │
│   ├── gluecraft-jira [future]
│   │   ├── NPM: @thecraftlab/gluecraft-jira
│   │   ├── CLI: gluecraft-jira
│   │   └── Action: the-craftlab/gluecraft-jira@v1
│   │
│   ├── gluecraft-linear [future]
│   └── gluecraft-notion [future]
│
└── [Other Craft Tools]
```

### Repository Structure

**Central Action Hub:**
- `the-craftlab/gluecraft` - Composite GitHub Action that routes to integrations
- Usage: `uses: the-craftlab/gluecraft@v1` with `integration: jpd`

**Integration Repositories:**
- Each integration is a separate repo (e.g., `the-craftlab/gluecraft`)
- Contains both NPM package (CLI) and GitHub Action
- Can be used directly: `uses: the-craftlab/gluecraft@v1`

Each tool in The Craft Lab is a specialized "craft" - Gluecraft specializes in syncing/gluing systems together.

## Keywords Added

New NPM keywords for better discoverability:
- `gluecraft`
- `the-craft-lab`

All existing keywords retained for continuity.

## GitHub Action Usage Patterns

### Pattern 1: Config in Workflows Directory (Recommended)

Everything lives together in `.github/workflows/`:

```
.github/
└── workflows/
    ├── sync.yml           # The workflow
    └── gluecraft.yaml     # The config (lives here!)
```

**Benefits:**
- ✅ Everything in one place
- ✅ Easy to review in PRs
- ✅ No separate config directory needed
- ✅ Workflow auto-runs when config changes

**Example:** See `examples/github-action-workflow/`

### Pattern 2: Config in Root Config Directory

Traditional approach with config in `config/`:

```
config/
└── gluecraft.yaml

.github/
└── workflows/
    └── sync.yml
```

**Usage:**
```yaml
with:
  config-path: config/gluecraft.yaml
```

## Configuration File Changes

### New Default Name
The configuration file is now named `gluecraft.yaml` instead of `sync-config.yaml` to make it immediately clear where it comes from.

### Template Updates
The `config/gluecraft.minimal.yaml` template now includes:
- **Gluecraft branding** in the header
- **Documentation link:** `https://gluecraft.thecraftlab.dev`
- **Updated CLI commands** (all using `gluecraft` prefix)
- **The Craft Lab** attribution

### Backward Compatibility
The tool still respects the `CONFIG_PATH` environment variable, so existing configs at any path will continue to work. Users can:
- Keep their existing `sync-config.yaml` and set `CONFIG_PATH`
- Rename to `gluecraft.yaml` for the new default
- Use any custom path they prefer

---

**Rebrand completed:** December 30, 2025

