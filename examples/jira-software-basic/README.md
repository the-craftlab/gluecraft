# JIRA Software Basic Example

A minimal example for syncing a basic JIRA Software project to GitHub Issues.

## Use Case

This configuration is perfect for teams who:
- Use JIRA Software (not Jira Product Discovery) with a simple workflow
- Don't have complex custom fields
- Want basic bidirectional sync of issues
- Need status visibility in GitHub via labels

## What's Included

### Workflow
- **To Do** → GitHub: open
- **In Progress** → GitHub: open
- **Done** → GitHub: closed

### Synced Fields
- Title (JIRA summary → GitHub title)
- Description (JIRA description → GitHub body)
- Status (JIRA status → GitHub label, e.g., `status:to-do`)

### What's NOT Included
- Custom fields
- Priority mapping
- Epic/Story hierarchy
- GitHub Projects integration
- Comment sync (available but not configured)

## Setup Instructions

### 1. Prerequisites

```bash
# From project root
cd /Users/james/Sites/Expedition/jpd-to-github-connector

# Ensure dependencies are installed
pnpm install

# Create .env file if you haven't already
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env`:

```bash
# JIRA Configuration
JPD_BASE_URL=https://your-company.atlassian.net
JPD_EMAIL=your-email@company.com
JPD_API_KEY=your_jira_api_key

# GitHub Configuration
GITHUB_TOKEN=your_github_pat
GITHUB_OWNER=your-github-org
GITHUB_REPO=your-repo-name

# Point to this example config
CONFIG_PATH=examples/jira-software-basic/config/config.yaml
```

### 3. Update Config for Your Project

Edit `examples/jira-software-basic/config/config.yaml`:

```yaml
sync:
  jql: 'project = YOUR_ACTUAL_PROJECT_KEY'  # e.g., 'project = ENG'
```

### 4. Test the Configuration

```bash
# Validate config
pnpm run validate-config

# Test connectivity
pnpm run health-check

# Dry run (no changes made)
pnpm run dev -- --dry-run
```

### 5. Run Your First Sync

```bash
# Run actual sync
pnpm run dev
```

## Customization Options

### Add Priority Labels

If your JIRA has a priority field, add this mapping:

```yaml
mappings:
  - jpd: "fields.priority.name"
    github: "labels"
    template: "priority:{{fields.priority.name | lowercase}}"
```

### Add Issue Type Labels

Map JIRA issue types to GitHub labels:

```yaml
mappings:
  - jpd: "fields.issuetype.name"
    github: "labels"
    template: "type:{{fields.issuetype.name | lowercase}}"
```

### Enable GitHub → JIRA Creation

Uncomment the `github_to_jpd_creation` section in the config to create JIRA issues from GitHub.

### Add More Statuses

If your workflow has more than 3 statuses:

```yaml
statuses:
  "Backlog":
    github_state: open
    sync: true
  "Ready for Review":
    github_state: open
    sync: true
  "Blocked":
    github_state: open
    sync: true
```

## Common Issues

### Issue: "Project not found"

**Solution**: Verify your project key in the JQL query matches your JIRA project.

```bash
# Check your projects
curl -u "your-email:your-api-key" \
  "https://your-company.atlassian.net/rest/api/3/project" | jq '.[].key'
```

### Issue: "Status transition failed"

**Solution**: JIRA may require specific transitions. Check your workflow:

1. Go to JIRA → Project Settings → Workflows
2. View your workflow transitions
3. Ensure "To Do", "In Progress", "Done" exist or update config with actual status names

### Issue: No issues syncing

**Solution**: Check your JQL returns results:

```bash
# Test JQL
curl -u "your-email:your-api-key" \
  "https://your-company.atlassian.net/rest/api/3/search?jql=project=YOUR_KEY" \
  | jq '.total'
```

## Next Steps

Once you have this basic sync working:

1. **Add custom fields** - Discover your fields: `pnpm run discover-fields YOUR_PROJECT`
2. **Enable comments** - See [Comment Sync Guide](../../COMMENT_SYNC.md)
3. **Add hierarchy** - See [MTT Example](../mtt/) for parent-child relationships
4. **Automate sync** - See [GitHub Actions Example](../../.github/workflows/sync.yml)

## Comparison with Other Examples

| Feature | Basic | [MTT](../mtt/) | [E-commerce](../ecommerce-roadmap/) | [Bug Tracking](../bug-tracking/) |
|---------|-------|-------|------------|---------------|
| Custom Fields | None | Many | Moderate | Few |
| Statuses | 3 | 9 | 4 | 4 |
| Hierarchy | No | Yes | No | No |
| Complexity | Low | High | Medium | Medium |
| Best For | Simple teams | Product teams | Product managers | Dev teams |

## Support

- [Architecture Guide](../../docs/ARCHITECTURE.md)
- [Transform Patterns](../../docs/TRANSFORM_PATTERNS.md)
- [Full Documentation](../../README.md)

