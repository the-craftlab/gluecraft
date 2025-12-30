# PipeCraft Publishing Setup

This repository uses [PipeCraft](https://github.com/the-craftlab/pipecraft) to automate versioning, tagging, and GitHub releases for the Gluecraft GitHub Action.

## What PipeCraft Does

PipeCraft automatically:

1. **Calculates versions** from conventional commits (e.g., `feat:`, `fix:`, `BREAKING:`)
2. **Runs tests** before creating tags
3. **Creates git tags** (e.g., `v2.0.0`, `v2.1.0`)
4. **Updates major version tags** (e.g., `v2` always points to latest v2.x.x)
5. **Creates GitHub releases** with auto-generated release notes

## How It Works

### Workflow Trigger

The pipeline runs automatically when:
- Code is pushed to `main` branch
- A pull request is opened/updated targeting `main`

### Version Calculation

PipeCraft reads your commit messages and calculates the next version:

- `feat:` → minor version bump (2.0.0 → 2.1.0)
- `fix:` → patch version bump (2.0.0 → 2.0.1)
- `BREAKING:` or `feat!:` → major version bump (2.0.0 → 3.0.0)

### Release Process

1. **Changes Detection** → Detects if action code changed
2. **Version Calculation** → Determines next version from commits
3. **Test Action** → Builds and tests the action
4. **Gate** → Ensures tests passed
5. **Tag** → Creates version tag (v2.0.0) and updates major tag (v2)
6. **Release** → Creates GitHub release with release notes

## Configuration

Configuration is in `.pipecraftrc`:

```yaml
ciProvider: github
mergeStrategy: fast-forward
requireConventionalCommits: true

initialBranch: main
finalBranch: main

branchFlow:
  - main

domains:
  action:
    description: 'GitHub Action and CLI package'
    paths:
      - '**/*'
```

## Publishing a Release

### Automatic (Recommended)

1. Make changes and commit using [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat: add new sync feature"
   git push origin main
   ```

2. PipeCraft automatically:
   - Calculates version (e.g., 2.0.0 → 2.1.0)
   - Runs tests
   - Creates tag `v2.1.0`
   - Updates tag `v2` to point to `v2.1.0`
   - Creates GitHub release

3. **Publish to Marketplace** (one-time per release):
   - Go to the created release: https://github.com/the-craftlab/gluecraft/releases
   - Click "Edit release"
   - Check "Publish this Action to the GitHub Marketplace"
   - Select categories and save

### Manual Trigger

You can also trigger the workflow manually:

1. Go to Actions → Pipeline
2. Click "Run workflow"
3. Optionally specify a version or commit SHA

## Version Tags

PipeCraft creates two types of tags:

- **Specific version**: `v2.0.0`, `v2.1.0`, `v2.1.1`
  - Points to exact release
  - Users can pin: `uses: the-craftlab/gluecraft@v2.0.0`

- **Major version**: `v2`
  - Always points to latest v2.x.x release
  - Auto-updates when new v2.x.x is released
  - Users can use: `uses: the-craftlab/gluecraft@v2` (gets latest)

## Customization

### Adding Custom Jobs

Edit `.github/workflows/pipeline.yml` and add jobs between:

```yaml
# <--START CUSTOM JOBS-->

# Your custom jobs here (e.g., NPM publish, deploy docs)

# <--END CUSTOM JOBS-->
```

### Regenerating Workflows

If you change `.pipecraftrc`, regenerate workflows:

```bash
npx pipecraft generate
```

**Note**: Your custom jobs are preserved! PipeCraft only updates managed sections.

## Example: Adding NPM Publishing

To automatically publish to NPM on release, add this in the custom jobs section:

```yaml
publish-npm:
  needs: [ release, version ]
  if: ${{ needs.release.result == 'success' }}
  runs-on: ubuntu-latest
  permissions:
    contents: read
    id-token: write  # For npm provenance
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        registry-url: 'https://registry.npmjs.org'
    - uses: pnpm/action-setup@v4
      with:
        version: '10.20.0'
    - run: pnpm install --frozen-lockfile
    - run: pnpm publish --access public
      env:
        NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Troubleshooting

### Version Not Calculated

- Ensure commits use conventional commit format
- Check that commits are on `main` branch
- Verify `FETCH_DEPTH_VERSIONING: "0"` in workflow (needs full git history)

### Tags Not Created

- Check that tests passed (gate job)
- Verify `contents: write` permission is set
- Ensure `GITHUB_TOKEN` has write access

### Major Tag Not Updated

- Check the tag job logs for errors
- Verify git config is set correctly in tag job

## Resources

- [PipeCraft Documentation](https://pipecraft.thecraftlab.dev)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Actions Publishing](https://docs.github.com/en/actions/creating-actions/publishing-actions-in-github-marketplace)

