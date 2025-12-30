# Gluecraft Rebrand Summary

This document summarizes the rebranding from `@expedition/jpd-github-connector` to `@thecraftlab/gluecraft-jpd`.

## Package Changes

### NPM Package
- **Old:** `@expedition/jpd-github-connector`
- **New:** `@thecraftlab/gluecraft-jpd`

### CLI Commands
All CLI commands have been renamed with the `gluecraft-jpd` prefix:

| Old Command | New Command |
|-------------|-------------|
| `jpd-sync` | `gluecraft-jpd` |
| `jpd-setup` | `gluecraft-jpd-setup` |
| `jpd-discover` | `gluecraft-jpd-discover` |
| `jpd-health` | `gluecraft-jpd-health` |
| `jpd-validate` | `gluecraft-jpd-validate` |
| `jpd-setup-labels` | `gluecraft-jpd-setup-labels` |

### Repository URLs
- **Old:** `https://github.com/expedition/jpd-to-github-connector`
- **New:** `https://github.com/thecraftlab/gluecraft-jpd`

### Documentation Site
- **Old:** `https://expedition.github.io/jpd-to-github-connector/`
- **New:** `https://thecraftlab.github.io/gluecraft-jpd/`

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
- ✅ `package.json` - Package name, author, repository URLs, keywords
- ✅ `action.yml` - GitHub Action name, description, author
- ✅ `README.md` - All references, badges, installation commands, examples

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
npx @thecraftlab/gluecraft-jpd setup
npm install -g @thecraftlab/gluecraft-jpd
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

**New:**
```yaml
name: Gluecraft JPD Sync
jobs:
  sync:
    steps:
      - name: Sync JPD <-> GitHub
        run: npx @thecraftlab/gluecraft-jpd sync
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
    "sync:setup": "gluecraft-jpd setup",
    "sync:run": "gluecraft-jpd sync"
  }
}
```

## Next Steps

### Before Publishing

1. **Update GitHub Repository**
   - Create new repository: `https://github.com/thecraftlab/gluecraft-jpd`
   - Transfer or migrate from old repository
   - Update repository settings and webhooks

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
   npm install @thecraftlab/gluecraft-jpd
   ```

3. **Update scripts in package.json** (replace `jpd-github-connector` with `gluecraft-jpd`)

4. **Update GitHub Actions workflows** (replace package name and workflow names)

5. **No configuration changes needed** - Config files remain compatible

## Brand Architecture

```
The Craft Lab (Organization)
├── Gluecraft (Tool Family)
│   ├── Gluecraft JPD (@thecraftlab/gluecraft-jpd)
│   ├── Gluecraft Jira (@thecraftlab/gluecraft-jira) [future]
│   ├── Gluecraft Linear (@thecraftlab/gluecraft-linear) [future]
│   └── Gluecraft Notion (@thecraftlab/gluecraft-notion) [future]
└── [Other Craft Tools]
```

Each tool in The Craft Lab is a specialized "craft" - Gluecraft specializes in syncing/gluing systems together.

## Keywords Added

New NPM keywords for better discoverability:
- `gluecraft`
- `the-craft-lab`

All existing keywords retained for continuity.

---

**Rebrand completed:** December 30, 2025

