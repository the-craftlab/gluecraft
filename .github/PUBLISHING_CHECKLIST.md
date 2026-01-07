# Publishing Checklist

This checklist covers everything needed to publish Gluecraft to production.

## Phase 1: Repository Setup

### 1.1 Create Central Hub Repository

- [ ] Create repository: `the-craftlab/gluecraft`
- [ ] Copy `GLUECRAFT_HUB_SETUP.md` content to the hub repo
- [ ] Add `action.yml` with composite routing
- [ ] Add comprehensive `README.md`
- [ ] Add MIT LICENSE
- [ ] Set repository topics: `github-actions`, `sync`, `gluecraft`, `the-craft-lab`

### 1.2 Create/Update Integration Repository

- [ ] Create repository: `the-craftlab/gluecraft` (or transfer this one)
- [ ] Push all code from current repo
- [ ] Verify `action.yml` works standalone
- [ ] Update repository settings:
  - [ ] Description: "Sync Jira Product Discovery with GitHub - Part of The Craft Lab"
  - [ ] Topics: `github-actions`, `jira`, `jpd`, `gluecraft`, `sync`
  - [ ] Website: `https://gluecraft.thecraftlab.dev`

## Phase 2: NPM Publishing

### 2.1 Verify Package Configuration

Current `package.json` settings:
```json
{
  "name": "@thecraftlab/gluecraft",
  "version": "1.0.0",
  "description": "A Craft Lab tool for syncing Jira Product Discovery with GitHub Issues",
  "repository": "https://github.com/thecraftlab/gluecraft",
  "homepage": "https://github.com/thecraftlab/gluecraft#readme",
  "keywords": ["gluecraft", "the-craft-lab", ...]
}
```

- [ ] Verify all URLs point to correct repos
- [ ] Verify version number (start at 1.0.0)
- [ ] Verify keywords include brand terms

### 2.2 Build and Test

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test

# Test CLI commands locally
./dist/cli/setup.cjs --help
./dist/cli/discover-fields.cjs --help
```

- [ ] All builds complete successfully
- [ ] All tests pass
- [ ] CLI commands work

### 2.3 Publish to NPM

```bash
# Login to NPM (requires @thecraftlab org access)
npm login

# Publish with public access
npm publish --access public

# Verify it's published
npm info @thecraftlab/gluecraft
```

- [ ] Package published successfully
- [ ] Package visible at https://www.npmjs.com/package/@thecraftlab/gluecraft
- [ ] Can install: `npm install -g @thecraftlab/gluecraft`

## Phase 3: GitHub Action Publishing

### 3.1 Tag Integration Repo

```bash
cd gluecraft

# Create and push v1 tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Create major version tag (for easy updates)
git tag -fa v1 -m "Update v1 to v1.0.0"
git push origin v1 --force
```

- [ ] Release created: v1.0.0
- [ ] Major tag created: v1
- [ ] Tags visible in GitHub

### 3.2 Publish to GitHub Marketplace

Go to `the-craftlab/gluecraft` repository:

1. **Create Release:**
   - [ ] Click "Releases" → "Create a new release"
   - [ ] Choose tag: v1.0.0
   - [ ] Release title: "Gluecraft JPD v1.0.0"
   - [ ] Description: Copy from RELEASE_NOTES
   - [ ] Check "Publish this Action to the GitHub Marketplace"
   - [ ] Primary Category: "Continuous integration"
   - [ ] Secondary Category: "Project management"

2. **Verify Listing:**
   - [ ] Action appears in Marketplace search
   - [ ] Badge displays correctly
   - [ ] README renders properly

### 3.3 Test Action Works

Create a test workflow in a sample repository:

```yaml
name: Test Gluecraft
on: workflow_dispatch

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: the-craftlab/gluecraft@v1
        with:
          integration: jpd
          config-path: .github/workflows/gluecraft.yaml
```

- [ ] Workflow runs successfully
- [ ] Action routing works
- [ ] No errors in logs

## Phase 4: Documentation

### 4.1 Set Up Documentation Site

```bash
cd docs

# Install dependencies
pnpm install

# Build docs
pnpm build

# Test locally
pnpm start
```

- [ ] Docs build successfully
- [ ] All links work
- [ ] Examples render correctly

### 4.2 Deploy Documentation

**Option A: GitHub Pages**
```bash
# Build and deploy to GitHub Pages
pnpm deploy
```

**Option B: Custom Domain (Recommended)**
```bash
# Set up custom domain: gluecraft.thecraftlab.dev
# Configure DNS:
# CNAME: gluecraft.thecraftlab.dev → thecraftlab.github.io
```

- [ ] Docs deployed successfully
- [ ] Accessible at https://gluecraft.thecraftlab.dev
- [ ] Custom domain configured (if using)
- [ ] SSL certificate active

### 4.3 Update All Documentation Links

Verify these URLs work:
- [ ] https://gluecraft.thecraftlab.dev
- [ ] https://gluecraft.thecraftlab.dev/docs/getting-started
- [ ] https://gluecraft.thecraftlab.dev/docs/configuration
- [ ] https://github.com/the-craftlab/gluecraft
- [ ] https://github.com/the-craftlab/gluecraft
- [ ] https://www.npmjs.com/package/@thecraftlab/gluecraft

## Phase 5: Announcement

### 5.1 Create Announcement Content

**GitHub Discussion (in the-craftlab/gluecraft):**
- [ ] Title: "Gluecraft v1.0 Released! 🎉"
- [ ] Include:
  - What is Gluecraft
  - Why it exists
  - Quick start guide
  - Link to docs
  - Roadmap for future integrations

**Social Media (if applicable):**
- [ ] Twitter/X announcement
- [ ] LinkedIn post
- [ ] Dev.to article (optional)

### 5.2 Update Related Resources

- [ ] Add badge to README: ![GitHub Marketplace](badge-url)
- [ ] Update personal/company website (if applicable)
- [ ] Add to awesome lists (if relevant)
- [ ] Share in relevant communities:
  - [ ] r/github
  - [ ] r/devops
  - [ ] GitHub Community Forum
  - [ ] Dev.to

## Phase 6: Monitoring

### 6.1 Set Up Monitoring

- [ ] Enable GitHub Actions workflow for CI/CD
- [ ] Monitor NPM download stats
- [ ] Monitor GitHub Action usage (Marketplace insights)
- [ ] Set up GitHub Discussions for support
- [ ] Enable GitHub Issues for bug reports

### 6.2 First Week Checklist

- [ ] Respond to all issues/discussions within 24 hours
- [ ] Monitor error reports
- [ ] Track adoption metrics:
  - NPM downloads
  - Action usage count
  - GitHub stars
  - Documentation traffic
- [ ] Collect user feedback
- [ ] Document common issues in troubleshooting guide

## Quick Reference URLs

After publishing, these should all work:

| Resource | URL |
|----------|-----|
| **Docs** | https://gluecraft.thecraftlab.dev |
| **Hub Repo** | https://github.com/the-craftlab/gluecraft |
| **JPD Repo** | https://github.com/the-craftlab/gluecraft |
| **NPM Package** | https://www.npmjs.com/package/@thecraftlab/gluecraft |
| **Action (Hub)** | https://github.com/marketplace/actions/gluecraft |
| **Action (JPD)** | https://github.com/marketplace/actions/gluecraft |
| **Org** | https://github.com/the-craftlab |

## Pre-Flight Check

Before making anything public:

- [ ] All secrets removed from code
- [ ] No hardcoded API keys or tokens
- [ ] No internal company references
- [ ] LICENSE file present (MIT)
- [ ] CODE_OF_CONDUCT.md present
- [ ] CONTRIBUTING.md present
- [ ] Security policy defined
- [ ] All tests passing
- [ ] No placeholder content (e.g., "TODO", "FIXME" in docs)
- [ ] Version numbers consistent across all files

## Success Criteria

You'll know publishing is complete when:

✅ Users can run: `npx @thecraftlab/gluecraft setup`  
✅ Users can use: `uses: the-craftlab/gluecraft@v1`  
✅ Docs load at: `https://gluecraft.thecraftlab.dev`  
✅ Package appears in NPM search  
✅ Action appears in Marketplace search  
✅ All examples work out of the box  

---

**Ready to launch? Let's craft something great! 🚀**

