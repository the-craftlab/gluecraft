# JPD to GitHub Connector

[![npm version](https://badge.fury.io/js/@expedition%2Fjpd-github-connector.svg)](https://www.npmjs.com/package/@expedition/jpd-github-connector)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)

Bidirectional sync between Jira Product Discovery (JPD) and GitHub Issues. Keep your product roadmap in Jira while developers work in GitHub—automatically synchronized with full hierarchy support, custom fields, and stateless operation.

📚 **[Complete Documentation](https://expedition.github.io/jpd-to-github-connector/)** • [Getting Started](GETTING_STARTED.md) • [Examples](examples/) • [CLI Guide](CLI_GUIDE.md)

---

## Quick Start

Get synchronized in three commands:

```bash
# Install and run interactive setup wizard
npx @expedition/jpd-github-connector setup

# The wizard will:
# - Test your API connections (with smart rate limit handling)
# - Discover available JPD fields  
# - Generate a working config file
# - Set up GitHub labels automatically

# Test sync without making changes
npx @expedition/jpd-github-connector sync --dry-run

# Run actual sync
npx @expedition/jpd-github-connector sync
```

That's it. Your JPD issues are now in GitHub, and status updates flow both ways. The wizard handles API discovery, field validation, and configuration—you just provide credentials.

## Key Features

**Bidirectional sync** - JPD issues sync to GitHub, GitHub status updates sync back to JPD. Work where you want, stay in sync automatically. Sync runs on schedule, manual trigger, or real-time webhooks.

**Native GitHub sub-issues** - Epic → Story → Task hierarchies from JPD become GitHub sub-issues with visual task lists and progress tracking. Parent-child relationships work both directions—create in either tool.

**Smart field mapping** - Automatically discovers JPD custom fields with IDs and types. Interactive wizard helps you map fields correctly. Validates configuration before first sync to catch errors early.

**No database required** - Sync state lives in hidden GitHub issue comments. Zero infrastructure, zero maintenance. Delete and recreate issues—sync picks up where it left off automatically.

**Custom transformations** - Need complex logic? Write TypeScript functions for field transformations. Combine multiple JPD fields, compute values, or implement business rules. See [`examples/mtt/transforms/`](examples/mtt/transforms/) for real implementations.

**Production-ready** - Built-in rate limit handling with exponential backoff. Connection caching reduces API calls by 80%. Comprehensive error messages with fix instructions. Docker support and GitHub Actions integration included.

## When to Use This Tool

**You're managing a product roadmap in JPD** but your developers live in GitHub. This tool keeps both tools synchronized so PMs work in Jira and devs work in GitHub—everyone sees the same data.

**You need hierarchy and custom fields** from JPD visible in GitHub. Epics, stories, tasks sync as sub-issues. Custom fields like RICE scores, target dates, or business value map to GitHub labels or issue bodies.

**You want stateless, infrastructure-free sync** that doesn't require databases or persistent services. Sync state lives in GitHub issues, so you can run the sync anywhere—GitHub Actions, Docker, cron jobs, or serverless functions.

**You're frustrated with manual copy-paste** between Jira and GitHub. Automate it. Status updates, comments, field changes—all synchronized automatically on a schedule or in real-time via webhooks.

## Installation

### Using npx (recommended)

No installation required—just run commands directly:

```bash
npx @expedition/jpd-github-connector setup
npx @expedition/jpd-github-connector sync
```

### Global installation

Install once, use everywhere:

```bash
npm install -g @expedition/jpd-github-connector
jpd-github-connector setup
```

### Local project installation

Add to your project's dev dependencies:

```bash
npm install --save-dev @expedition/jpd-github-connector
```

Then add scripts to your `package.json`:

```json
{
  "scripts": {
    "sync:setup": "jpd-github-connector setup",
    "sync:run": "jpd-github-connector sync",
    "sync:dry-run": "jpd-github-connector sync --dry-run",
    "sync:validate": "jpd-github-connector validate-config"
  }
}
```

## Simple Example

Create a `sync-config.yaml` describing your sync:

```yaml
# Basic sync configuration
sync:
  direction: bidirectional
  jql_filter: "project = PROD AND status != Done"
  
# Field mappings - JPD to GitHub
mappings:
  - jpd: Summary
    github: title
  
  - jpd: Description
    github: body
  
  - jpd: Priority
    github: labels
    transform: "priority:{{Priority | lowercase}}"
  
  - jpd: "custom_field_10042"  # RICE Score
    github: labels
    transform: "rice:{{custom_field_10042}}"

# Status synchronization
statuses:
  "Backlog": 
    github_state: open
    
  "In Progress":
    github_state: open
    
  "Done":
    github_state: closed

# Hierarchy configuration (optional)
hierarchy:
  enabled: true
  max_depth: 8  # GitHub's limit
```

Run `jpd-github-connector sync` and you get:

* **JPD issues synced to GitHub** - Each JPD issue becomes a GitHub issue with mapped fields
* **Hierarchies as sub-issues** - Parent-child relationships from JPD appear as GitHub sub-issues with task lists
* **Status synchronization** - Closing GitHub issues updates JPD status automatically
* **Idempotent operation** - Re-running sync only updates changed issues

**What you configure**:

* Which JPD fields map to GitHub (title, body, labels)
* How statuses map between systems
* Custom transformations for complex field logic
* Optional: comment sync, label strategies, GitHub Projects integration

**Example of what gets synced**:

**JPD Issue:**
```
PROD-123: Improve login performance
Status: In Progress
Priority: High
RICE Score: 85
Parent: PROD-100 (Epic: Authentication Improvements)
```

**GitHub Issue #45:**
```markdown
# Improve login performance

[Original JPD body content]

## 🔗 Parent
- GitHub: #40
- JPD: [PROD-100](https://yoursite.atlassian.net/browse/PROD-100)

---
Labels: priority:high, rice:85, in-progress
```

## What Gets Synchronized

**Managed by the connector** (automatic):

* Issue creation and updates (JPD ↔ GitHub)
* Status transitions based on your configuration
* Hierarchy relationships (parent-child links)
* Field mappings as you define them
* Sync state tracking in hidden comments
* Label creation with configured colors

**You control** (configure as needed):

* Which JPD fields map to GitHub
* Status mapping rules (which JPD status = which GitHub state)
* Custom transformation logic for complex fields
* JQL filters to limit which issues sync
* Comment synchronization (opt-in feature)
* GitHub Projects integration (opt-in)
* Webhook triggers for real-time sync

**Example sync flow**:

```
JPD:
PROD-100 (Epic) → Creates GitHub issue #40
├── PROD-123 (Story) → Creates GitHub sub-issue #45 (parent: #40)
└── PROD-124 (Story) → Creates GitHub sub-issue #46 (parent: #40)

GitHub:
Close issue #45 → Updates PROD-123 status to "Done" in JPD
Comment on #45 → Syncs comment to PROD-123 (if enabled)
Update #40 → Task list automatically checks off #45 ✅
```

Regenerating config preserves your custom transformation functions and mappings. See the [Getting Started guide](GETTING_STARTED.md) for a complete walkthrough.

## CLI Commands

The connector provides focused commands for setup, validation, and operation:

```bash
# Setup and configuration
jpd-github-connector setup                    # Interactive wizard
jpd-github-connector discover-fields PROJ     # List JPD fields with IDs
jpd-github-connector validate-config          # Check config before sync

# Label management
jpd-github-connector setup-labels --preview   # Preview labels
jpd-github-connector setup-labels             # Create all labels

# Sync operations
jpd-github-connector sync --dry-run           # Test without changes
jpd-github-connector sync                     # Run actual sync
jpd-github-connector health-check             # Verify connections
```

See the [CLI Guide](CLI_GUIDE.md) for complete command documentation with examples.

## Production Deployment

Deploy sync to run automatically in GitHub Actions:

### 1. Create workflow file

Add `.github/workflows/jpd-sync.yml` to your repository:

```yaml
name: JPD Sync

on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
  workflow_dispatch:        # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Sync JPD <-> GitHub
        run: npx @expedition/jpd-github-connector sync
        env:
          JPD_API_KEY: ${{ secrets.JPD_API_KEY }}
          JPD_EMAIL: ${{ secrets.JPD_EMAIL }}
          JPD_BASE_URL: ${{ secrets.JPD_BASE_URL }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 2. Add secrets

In your repository settings, add these secrets:

* `JPD_API_KEY` - Your Atlassian API token ([create one here](https://id.atlassian.com/manage/api-tokens))
* `JPD_EMAIL` - Email associated with the API token
* `JPD_BASE_URL` - Your Jira instance URL (e.g., `https://yoursite.atlassian.net`)

### 3. Commit your config

Add the `sync-config.yaml` generated by the setup wizard to your repository and commit it. The workflow will use this configuration on every sync run.

**Alternative deployment options:**

* **Docker** - Use the included `Dockerfile` for containerized deployment
* **Serverless** - Deploy to AWS Lambda, Google Cloud Functions, or Vercel
* **Cron** - Run as a scheduled cron job on any server

See the [deployment examples](examples/) for complete configurations.

## Custom Transformations

For complex field logic beyond simple templates, write TypeScript functions:

**1. Create a transform file:**

```typescript
// transforms/combine-labels.ts
export default function(data: any): string[] {
  const labels = [];
  if (data.Epic) labels.push(`epic:${data.Epic}`);
  if (data.Priority) labels.push(`priority:${data.Priority.toLowerCase()}`);
  return labels;
}
```

**2. Reference in config:**

```yaml
mappings:
  - jpd: [Epic, Priority]
    github: labels
    transform_function: "./transforms/combine-labels.ts"
```

See [`examples/mtt/transforms/`](examples/mtt/transforms/) for real-world examples including RICE score calculations and conditional field logic.

## GitHub Labels

Labels are automatically created from your configuration with custom colors:

```yaml
labels:
  priorities:
    - name: "priority:critical"
      color: "DE350B"
      description: "Critical priority"
    - name: "priority:high"
      color: "FF5630"
  
  types:
    - name: "type:bug"
      color: "DE350B"
    - name: "type:feature"
      color: "6554C0"
```

**Preview before creating:**

```bash
jpd-github-connector setup-labels --preview
```

For teams with changing membership, focus on permanent labels (type, priority) and use GitHub assignees for "who's working on what." See [Label Strategy Guide](LABEL_STRATEGY_FLUID_TEAMS.md) for recommendations.

---

## Hierarchy & Sub-Issues

The connector supports **native GitHub sub-issues** for Epic → Story → Task relationships:

**JPD Structure:**
```
PROD-1 (Epic: Mobile Redesign)
├── PROD-10 (Story: Login Updates)
│   ├── PROD-101 (Task: Update UI)
│   └── PROD-102 (Task: Add biometrics)
```

**GitHub Representation:**

Issue #1 shows child stories as a task list with progress tracking:

```markdown
## 📋 Subtasks (1/2 complete)

- [ ] #10 Login Updates (PROD-10)
- [x] #11 Dark Mode (PROD-11) ✅
```

**Key features:**

* Visual progress tracking with checkboxes
* Automatic task list updates when sub-issues close
* Works in GitHub Issues, Projects, and mobile app
* Bidirectional - create hierarchies in either tool

**Configuration:** Hierarchy sync is enabled by default. Disable with:

```yaml
hierarchy:
  enabled: false
  max_depth: 8  # GitHub's limit
```

See [`RELEASE_NOTES_v2.0.md`](RELEASE_NOTES_v2.0.md) for v2.0 improvements including parent linking and checkbox preservation.

## Next Steps

**Start with the tutorial:** The [Getting Started Guide](GETTING_STARTED.md) walks through setup with detailed explanations of each step and common pitfalls.

**Understand configuration:** The config file documentation explains field mappings, status synchronization, and hierarchy options with real examples.

**See real-world examples:** The [`examples/`](examples/) directory shows configurations for different scenarios:
- **[jira-software-basic](examples/jira-software-basic/)** - Simple 3-status workflow
- **[ecommerce-roadmap](examples/ecommerce-roadmap/)** - Product roadmap with RICE scoring
- **[bug-tracking](examples/bug-tracking/)** - Bug triage with severity levels
- **[mtt](examples/mtt/)** - Advanced features with custom transforms

**Learn advanced features:**
- [Comment Sync](COMMENT_SYNC.md) - Bidirectional comment synchronization
- [Custom Transformations](examples/mtt/transforms/) - TypeScript functions for complex logic
- [Rate Limit Handling](RATE_LIMIT_HANDLING.md) - How we handle JPD's strict API limits
- [Label Strategy](LABEL_STRATEGY_FLUID_TEAMS.md) - Best practices for fluid teams

## Troubleshooting

Common issues and quick fixes:

**Rate limit errors:**
```bash
# Built-in caching and retry usually handles this
jpd-github-connector health-check
```

**Field validation errors:**
```bash
# Discover correct field IDs
jpd-github-connector discover-fields YOUR_PROJECT
```

**Config errors:**
```bash
# Validate before syncing
jpd-github-connector validate-config
```

**Test sync without changes:**
```bash
jpd-github-connector sync --dry-run
```

See the [CLI Guide](CLI_GUIDE.md) for complete command documentation. For questions and discussions, visit [GitHub Discussions](https://github.com/expedition/jpd-to-github-connector/discussions). To report bugs, open an [issue](https://github.com/expedition/jpd-to-github-connector/issues).

## FAQ

**Does this work with JIRA Software (not just JPD)?**  
Yes! See [`examples/jira-software-basic/`](examples/jira-software-basic/) for a basic JIRA Software configuration.

**How do I get API credentials?**  
JPD/Jira: Create an API token at [id.atlassian.com/manage/api-tokens](https://id.atlassian.com/manage/api-tokens). GitHub: Create a PAT with `repo` scope in your GitHub settings.

**Where is sync state stored?**  
In hidden HTML comments in GitHub issue bodies (invisible in the UI). No database required—completely stateless operation.

**Does it create duplicate issues?**  
No. Sync is idempotent—running it multiple times only updates changed issues. State tracking prevents duplicates.

**Can I sync multiple JPD projects?**  
Yes. Create separate config files or use JQL filters spanning multiple projects: `project IN (PROJ1, PROJ2)`.

**How do I find custom field IDs?**  
Run `jpd-github-connector discover-fields YOUR_PROJECT` to list all available fields with IDs and types.

**Can I exclude certain issues?**  
Yes. Use JQL filters in your config to limit which issues sync: `jql_filter: "project = PROD AND status != Archived"`.

**Is this production-ready?**  
Yes. Includes rate limit handling, error recovery, health checks, Docker support, and GitHub Actions integration.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

* Development setup instructions
* Code architecture overview
* Testing guidelines
* Pull request process

Quick development setup:

```bash
git clone https://github.com/expedition/jpd-to-github-connector.git
cd jpd-to-github-connector
pnpm install
pnpm test
```

## License

MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built for teams that want the best of both worlds: Jira's product management and GitHub's developer experience**

[Documentation](https://expedition.github.io/jpd-to-github-connector/) · [Report Bug](https://github.com/expedition/jpd-to-github-connector/issues) · [Request Feature](https://github.com/expedition/jpd-to-github-connector/issues)