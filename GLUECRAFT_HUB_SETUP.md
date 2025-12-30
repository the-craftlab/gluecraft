# Gluecraft Action Hub Setup

This document outlines what needs to be created in the central [`the-craftlab/gluecraft`](https://github.com/the-craftlab/gluecraft) repository to serve as the action hub.

## Repository Purpose

The `the-craftlab/gluecraft` repository serves as a **composite GitHub Action** that routes to integration-specific actions. This provides a unified entry point for all Gluecraft integrations.

## Repository Structure

```
the-craftlab/gluecraft/
├── action.yml              # Composite action definition
├── README.md               # Hub documentation
├── LICENSE                 # MIT License
├── .github/
│   └── workflows/
│       └── test.yml        # Test the routing works
└── docs/
    └── integrations.md     # Available integrations
```

## action.yml (Composite Action)

This action routes to the appropriate integration based on the `integration` input:

```yaml
name: 'Gluecraft'
description: 'Sync GitHub with external tools (Jira, Linear, Notion, etc.) - Part of The Craft Lab'
author: 'The Craft Lab'

branding:
  icon: 'link-2'
  color: 'blue'

inputs:
  integration:
    description: 'Integration to use (jpd, jira, linear, notion)'
    required: true
  
  config-path:
    description: 'Path to the gluecraft.yaml configuration file'
    required: false
    default: 'config/gluecraft.yaml'
  
  dry-run:
    description: 'Run in dry-run mode (no actual changes)'
    required: false
    default: 'false'

runs:
  using: 'composite'
  steps:
    # JPD Integration
    - name: Route to Gluecraft JPD
      if: inputs.integration == 'jpd'
      uses: the-craftlab/gluecraft@v1
      with:
        config-path: ${{ inputs.config-path }}
        jpd-api-key: ${{ env.JPD_API_KEY }}
        jpd-email: ${{ env.JPD_EMAIL }}
        jpd-base-url: ${{ env.JPD_BASE_URL }}
        github-token: ${{ env.GITHUB_TOKEN }}
        dry-run: ${{ inputs.dry-run }}
    
    # Jira Integration (future)
    - name: Route to Gluecraft Jira
      if: inputs.integration == 'jira'
      shell: bash
      run: |
        echo "::error::Gluecraft Jira integration coming soon!"
        echo "Track progress: https://github.com/the-craftlab/gluecraft-jira"
        exit 1
    
    # Linear Integration (future)
    - name: Route to Gluecraft Linear
      if: inputs.integration == 'linear'
      shell: bash
      run: |
        echo "::error::Gluecraft Linear integration coming soon!"
        echo "Track progress: https://github.com/the-craftlab/gluecraft-linear"
        exit 1
    
    # Notion Integration (future)
    - name: Route to Gluecraft Notion
      if: inputs.integration == 'notion'
      shell: bash
      run: |
        echo "::error::Gluecraft Notion integration coming soon!"
        echo "Track progress: https://github.com/the-craftlab/gluecraft-notion"
        exit 1
    
    # Unknown integration
    - name: Invalid Integration
      if: |
        inputs.integration != 'jpd' &&
        inputs.integration != 'jira' &&
        inputs.integration != 'linear' &&
        inputs.integration != 'notion'
      shell: bash
      run: |
        echo "::error::Unknown integration: ${{ inputs.integration }}"
        echo "Available integrations: jpd, jira, linear, notion"
        echo "Documentation: https://gluecraft.thecraftlab.dev"
        exit 1
```

## README.md

```markdown
# Gluecraft

> Sync GitHub with external tools - Part of [The Craft Lab](https://github.com/the-craftlab)

Gluecraft is a family of tools for bidirectional synchronization between GitHub and project management platforms like Jira, Linear, and Notion.

## Quick Start

```yaml
name: Sync
on:
  schedule:
    - cron: '*/15 * * * *'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: the-craftlab/gluecraft@v1
        with:
          integration: jpd  # or jira, linear, notion
          config-path: .github/workflows/gluecraft.yaml
        env:
          JPD_API_KEY: ${{ secrets.JPD_API_KEY }}
          JPD_EMAIL: ${{ secrets.JPD_EMAIL }}
          JPD_BASE_URL: ${{ secrets.JPD_BASE_URL }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Available Integrations

| Integration | Status | Repository | NPM Package |
|-------------|--------|------------|-------------|
| **JPD** (Jira Product Discovery) | ✅ Available | [gluecraft](https://github.com/the-craftlab/gluecraft) | [@thecraftlab/gluecraft](https://www.npmjs.com/package/@thecraftlab/gluecraft) |
| **Jira** (Jira Software/Cloud) | 🚧 Coming Soon | [gluecraft-jira](https://github.com/the-craftlab/gluecraft-jira) | @thecraftlab/gluecraft-jira |
| **Linear** | 🚧 Coming Soon | [gluecraft-linear](https://github.com/the-craftlab/gluecraft-linear) | @thecraftlab/gluecraft-linear |
| **Notion** | 🚧 Coming Soon | [gluecraft-notion](https://github.com/the-craftlab/gluecraft-notion) | @thecraftlab/gluecraft-notion |

## Configuration

Create a `gluecraft.yaml` config file:

```yaml
sync:
  direction: bidirectional
  jql: 'project = MYPROJECT'

mappings:
  - jpd: "fields.summary"
    github: "title"
  - jpd: "fields.description"
    github: "body"

statuses:
  "To Do":
    github_state: open
  "Done":
    github_state: closed
```

## Two Ways to Use

### 1. Central Action Hub (This Repo)

Use the unified action with routing:

```yaml
- uses: the-craftlab/gluecraft@v1
  with:
    integration: jpd
```

### 2. Integration-Specific Actions

Use the integration directly:

```yaml
- uses: the-craftlab/gluecraft@v1
```

## Documentation

📚 **Full Documentation:** [gluecraft.thecraftlab.dev](https://gluecraft.thecraftlab.dev)

- [Getting Started](https://gluecraft.thecraftlab.dev/docs/getting-started)
- [Configuration Guide](https://gluecraft.thecraftlab.dev/docs/configuration)
- [Examples](https://gluecraft.thecraftlab.dev/docs/examples)
- [Troubleshooting](https://gluecraft.thecraftlab.dev/docs/troubleshooting)

## The Craft Lab

Gluecraft is part of **The Craft Lab** - a collection of specialized tools ("crafts") for modern development workflows.

- 🔗 [GitHub Organization](https://github.com/the-craftlab)
- 📦 [NPM Organization](https://www.npmjs.com/org/thecraftlab)
- 🌐 [Website](https://thecraftlab.dev) (coming soon)

## License

MIT © The Craft Lab
```

## Benefits of This Architecture

### For Users
- **Single action to learn** - `uses: the-craftlab/gluecraft@v1`
- **Easy to switch integrations** - Just change `integration: jpd` to `integration: jira`
- **Unified versioning** - One version tag across all integrations
- **Clear entry point** - the-craftlab/gluecraft is the obvious starting place

### For Maintainers
- **Separation of concerns** - Each integration in its own repo
- **Independent releases** - Update JPD without touching Jira
- **Modular testing** - Test integrations independently
- **Future expansion** - Easy to add new integrations

### For the Ecosystem
- **Discoverability** - One repo to find all integrations
- **Consistency** - All integrations follow same patterns
- **Community** - Central place for discussions and feature requests

## Migration Path

1. **Phase 1: Create hub repo** (this document)
   - Set up the-craftlab/gluecraft with composite action
   - Add routing to gluecraft

2. **Phase 2: Publish gluecraft**
   - Move current repo to the-craftlab/gluecraft
   - Publish NPM package @thecraftlab/gluecraft
   - Ensure action.yml works standalone

3. **Phase 3: Add more integrations**
   - gluecraft-jira
   - gluecraft-linear
   - gluecraft-notion

4. **Phase 4: Central documentation**
   - Set up gluecraft.thecraftlab.dev
   - Point all repos to central docs

## Next Steps

1. ✅ Rebrand current repo (completed)
2. ⬜ Create the-craftlab/gluecraft hub repo
3. ⬜ Move current repo to the-craftlab/gluecraft
4. ⬜ Test action routing
5. ⬜ Update documentation
6. ⬜ Publish NPM package
7. ⬜ Set up custom domain for docs

---

**This repository will become the face of the entire Gluecraft ecosystem.**

