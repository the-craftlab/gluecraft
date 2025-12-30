# GitHub Action Workflow Example

This example shows how to use Gluecraft as a GitHub Action with the configuration file living directly in your `.github/workflows/` directory.

## Benefits of This Approach

✅ **Everything in one place** - Workflow and config live together  
✅ **Version controlled** - Config changes are tracked in git  
✅ **Easy to review** - See workflow + config in one PR  
✅ **No separate config directory** - Clean repository structure  
✅ **Automatic updates** - Workflow reruns when config changes  

## Files

```
.github/
└── workflows/
    ├── sync.yml           # The workflow that runs Gluecraft
    └── gluecraft.yaml     # The configuration (lives here!)
```

## Setup

### 1. Copy Files to Your Repository

```bash
# Copy the workflow
cp examples/github-action-workflow/sync-with-gluecraft.yml .github/workflows/sync.yml

# Copy the config (or generate your own)
cp examples/github-action-workflow/gluecraft.yaml .github/workflows/gluecraft.yaml
```

### 2. Generate Your Own Config (Recommended)

Instead of copying the example config, generate one tailored to your project:

```bash
# Run the setup wizard
npx @thecraftlab/gluecraft setup

# This creates config/gluecraft.yaml
# Move it to your workflows directory
mv config/gluecraft.yaml .github/workflows/gluecraft.yaml
```

### 3. Add GitHub Secrets

Go to your repository: **Settings → Secrets and variables → Actions → New repository secret**

Add these secrets:
- `JPD_API_KEY` - Your Atlassian API token ([create one](https://id.atlassian.com/manage/api-tokens))
- `JPD_EMAIL` - Email address for the API token
- `JPD_BASE_URL` - Your Jira URL (e.g., `https://yoursite.atlassian.net`)

> **Note:** `GITHUB_TOKEN` is automatically provided by GitHub Actions

### 4. Commit and Push

```bash
git add .github/workflows/
git commit -m "feat: add Gluecraft sync workflow"
git push
```

The workflow will run immediately and then every 15 minutes.

## How It Works

### The Workflow

```yaml
name: Gluecraft JPD Sync

on:
  schedule:
    - cron: '*/15 * * * *'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Sync JPD ↔ GitHub
        uses: the-craftlab/gluecraft@v1
        with:
          integration: jpd
          config-path: .github/workflows/gluecraft.yaml  # Config here!
        env:
          JPD_API_KEY: ${{ secrets.JPD_API_KEY }}
          JPD_EMAIL: ${{ secrets.JPD_EMAIL }}
          JPD_BASE_URL: ${{ secrets.JPD_BASE_URL }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Key Points

1. **Checkout step is required** - The action needs access to your config file
2. **Config path points to workflows directory** - `config-path: .github/workflows/gluecraft.yaml`
3. **Integration specified** - `integration: jpd` (in future: `jira`, `linear`, etc.)
4. **Secrets from repository settings** - Keep credentials secure

## Two Ways to Use Gluecraft Actions

### Option 1: Central Action (Recommended)

Use the main Gluecraft action that routes to integrations:

```yaml
uses: the-craftlab/gluecraft@v1
with:
  integration: jpd  # or jira, linear, notion, etc.
  config-path: .github/workflows/gluecraft.yaml
```

**Benefits:**
- Single action to learn
- Easy to switch integrations
- Unified versioning

### Option 2: Integration-Specific Action

Use the specific integration action directly:

```yaml
uses: the-craftlab/gluecraft@v1
with:
  config-path: .github/workflows/gluecraft.yaml
```

**Benefits:**
- Slightly faster (no routing)
- Pin to integration-specific versions
- Clearer what's being used

## Monitoring

### View Workflow Runs

Go to your repository's **Actions** tab to see:
- ✅ Successful syncs
- ❌ Failed syncs with error details
- 📊 Run duration and frequency

### Manual Trigger

Trigger a sync immediately:
1. Go to **Actions** tab
2. Select "Gluecraft JPD Sync"
3. Click "Run workflow"

### Debugging

If syncs fail:
1. Check the Actions tab for error messages
2. Verify secrets are set correctly
3. Test locally: `npx @thecraftlab/gluecraft sync --dry-run`
4. Check the [troubleshooting guide](https://gluecraft.thecraftlab.dev/docs/troubleshooting)

## Alternative: Config in Root

If you prefer the config in a `config/` directory:

```yaml
- name: Sync JPD ↔ GitHub
  uses: the-craftlab/gluecraft@v1
  with:
    integration: jpd
    config-path: config/gluecraft.yaml  # Traditional location
```

Both approaches work - choose what fits your team's preferences.

## Next Steps

- 📚 [Full Documentation](https://gluecraft.thecraftlab.dev)
- 🛠️ [Configuration Guide](https://gluecraft.thecraftlab.dev/docs/configuration)
- 💬 [GitHub Discussions](https://github.com/the-craftlab/gluecraft/discussions)
- 🐛 [Report Issues](https://github.com/the-craftlab/gluecraft/issues)

---

**Part of [The Craft Lab](https://github.com/the-craftlab)** - Specialized tools for modern development workflows.

