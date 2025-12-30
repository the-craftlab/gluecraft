# Sync Commands

Commands for running synchronization between JPD and GitHub.

## dev Command

The main sync command that creates and updates GitHub issues from JPD.

### Basic Usage

```bash
pnpm run dev
```

Performs full synchronization:
- Fetches issues from JPD
- Fetches existing GitHub issues
- Creates new GitHub issues
- Updates existing GitHub issues
- Syncs status changes
- Syncs comments (if enabled)

### Dry-Run Mode

Preview changes without making them:

```bash
pnpm run dev -- --dry-run
```

**What dry-run does:**
- Fetches all data from both systems
- Calculates what would change
- Shows detailed plan of operations
- **Does not create or modify anything**

**Always run dry-run first:**
- Before first sync
- After configuration changes
- When testing new field mappings
- To verify behavior

### Output Format

#### Standard Sync Output

```
Gluecraft JPD Sync
==================

Connecting to services...
→ JPD: https://acme-corp.atlassian.net
→ GitHub: acme-corp/product-roadmap

Fetching data...
✓ Fetched 25 JPD issues
✓ Fetched 10 existing GitHub issues

Synchronizing...
→ Creating MTT-1: Mobile App Redesign
  ✓ Created issue #45

→ Updating MTT-5 (existing #48)
  ✓ Updated status
  ✓ Added labels: priority:high

→ Skipping MTT-3 (unchanged)

Summary
-------
Created: 15 issues
Updated: 5 issues
Skipped: 5 issues
Duration: 45 seconds
```

#### Dry-Run Output

```
Gluecraft JPD Sync (DRY RUN)
============================

Would create 15 new GitHub issues:
  MTT-1: Mobile App Redesign
    Title: [MTT-1] Mobile App Redesign
    Labels: type:epic, theme:mobile, priority:high
    
  MTT-2: Implement New Navigation
    Title: [MTT-2] Implement New Navigation
    Labels: type:story, epic:MTT-1, priority:high

Would update 5 existing issues:
  #48 (MTT-5): Status change: In Progress → open
  #49 (MTT-7): Add labels: theme:mobile

Would skip 5 unchanged issues:
  MTT-3, MTT-4, MTT-6, MTT-8, MTT-9

No changes made (dry-run mode)
```

## Command Options

### --dry-run

Preview without making changes:

```bash
pnpm run dev -- --dry-run
```

**Use cases:**
- Verify configuration changes
- See what will be synced
- Test field mappings
- Check label generation

### --config PATH

Use alternate configuration file:

```bash
pnpm run dev -- --config config/prod-config.yaml
```

Or use environment variable:

```bash
CONFIG_PATH=config/prod.yaml pnpm run dev
```

### --filter JQL

Override JQL filter from config:

```bash
pnpm run dev -- --filter "project = MTT AND created >= -7d"
```

Useful for:
- Testing specific issues
- Partial syncs
- Debugging

### --force

Skip caches and force full sync:

```bash
pnpm run dev -- --force
```

**What it does:**
- Bypasses connection cache
- Recalculates all sync hashes
- Forces re-evaluation of all issues

**When to use:**
- After major configuration changes
- When cache seems stale
- Troubleshooting sync issues

## Sync Behavior

### What Gets Synced

**Issues synced when:**
- Status matches hierarchy criteria (if configured)
- Passes JQL filter
- Has changed since last sync
- Doesn't exist in GitHub yet

**Issues skipped when:**
- Already synced and unchanged
- Status doesn't match hierarchy
- Filtered out by JQL
- No changes detected (hash unchanged)

### Change Detection

The connector uses sync hashes to detect changes:

```html
<!-- jpd-sync-metadata
issue_key: MTT-1
sync_hash: abc123def456
last_synced: 2024-12-30T10:30:00Z
-->
```

**Hash includes:**
- Issue title and description
- All mapped custom fields
- Status
- Labels
- Parent relationships

**Issue is updated when:**
- Hash differs from last sync
- Any mapped field changed
- Status changed
- Parent relationship changed

### Bidirectional Sync

When `direction: bidirectional` is configured:

**JPD → GitHub:**
- Issue creation
- Content updates
- Status changes
- Comment sync

**GitHub → JPD:**
- Status changes (when issue closed/reopened)
- Comment sync

```yaml
sync:
  direction: "bidirectional"
  github_closed_status: "Done"
```

## Performance and Rate Limits

### Sync Duration

Sync speed depends on:
- Number of issues
- Number of changes
- API rate limits
- Network latency

**Typical performance:**
- First sync: 5-10 seconds per issue created
- Subsequent syncs: 1-2 seconds per issue updated
- Unchanged issues: Near instant (skipped)

### Rate Limit Handling

The connector automatically handles rate limits:

```
Rate limit approaching, slowing down...
→ Waiting 2 seconds before next request

Rate limit exceeded, retrying...
→ Attempt 1/3: Waiting 5 seconds
→ Attempt 2/3: Waiting 10 seconds
```

**Configuration:**
```yaml
rate_limiting:
  max_retries: 3
  initial_delay_ms: 1000
  backoff_multiplier: 2
```

### Batch Processing

Large syncs are processed in batches:

```
Processing batch 1/3 (50 issues)...
→ Created 45 issues
→ Updated 5 issues

Processing batch 2/3 (50 issues)...
```

**Configuration:**
```yaml
sync:
  batch_size: 50
  batch_delay_ms: 2000
```

## Error Handling

### Partial Failures

If some issues fail, sync continues:

```
✓ Created MTT-1 → #45
✓ Created MTT-2 → #46
✗ Failed to create MTT-3: Rate limit exceeded
✓ Created MTT-4 → #47

Summary
-------
Succeeded: 3 issues
Failed: 1 issue

Failed issues:
  MTT-3: Rate limit exceeded (will retry next sync)
```

Failed issues are automatically retried on next sync.

### Fatal Errors

Sync stops on fatal errors:

```
✗ Fatal error: Configuration validation failed
  Field customfield_10001 not found in JPD

Please fix configuration and try again.
```

**Common fatal errors:**
- Invalid configuration
- Authentication failures
- Permission denied
- Missing required fields

## Monitoring and Logging

### Standard Output

Enable progress indicators:

```bash
pnpm run dev
```

Shows:
- Connection status
- Fetch progress
- Sync operations
- Summary statistics

### Debug Logging

Enable verbose logging:

```bash
DEBUG=1 pnpm run dev
```

Shows:
- API requests and responses
- Field transformation details
- Hash calculations
- Cache operations

### Log Files

Configure log output:

```yaml
logging:
  file: "./logs/sync.log"
  level: "info"
  format: "json"
```

## Automation and Scheduling

### GitHub Actions

Run sync automatically:

**.github/workflows/sync.yml:**
```yaml
name: JPD Sync

on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run sync
        run: pnpm run dev
        env:
          JPD_BASE_URL: ${{ secrets.JPD_BASE_URL }}
          JPD_EMAIL: ${{ secrets.JPD_EMAIL }}
          JPD_API_KEY: ${{ secrets.JPD_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Cron Job

Run sync on a server:

```bash
# Run every 15 minutes
*/15 * * * * cd /path/to/connector && pnpm run dev
```

### Manual Trigger

Run on-demand:

```bash
# In your terminal
pnpm run dev

# Or via curl (if webhook configured)
curl -X POST https://your-server/webhook/trigger
```

## Troubleshooting

### No Issues Synced

**Check:**
1. JQL filter: `pnpm run dev -- --dry-run`
2. Hierarchy configuration (if enabled)
3. Field mappings

**Debug:**
```bash
DEBUG=1 pnpm run dev -- --dry-run
```

### Issues Not Updating

**Causes:**
- No changes detected (hash unchanged)
- Field mapping errors
- Permission issues

**Check sync metadata in GitHub issue body:**
```html
<!-- jpd-sync-metadata
issue_key: MTT-1
sync_hash: abc123def456
last_synced: 2024-12-30T10:30:00Z
-->
```

### Rate Limit Errors

**Symptoms:**
```
Rate limit exceeded, retrying...
```

**Solutions:**
- Wait for automatic retry
- Reduce sync frequency
- Decrease batch size
- Check rate limit status: `pnpm run health-check`

### Connection Failures

**Error:** "Failed to connect to JPD/GitHub"

**Solutions:**
- Verify credentials in `.env`
- Check network connectivity
- Test connections: `pnpm run test-connection`

## Best Practices

### Daily Sync Workflow

```bash
# 1. Validate configuration (quick)
pnpm run validate-config

# 2. Preview changes
pnpm run dev -- --dry-run

# 3. Review dry-run output carefully

# 4. Run actual sync
pnpm run dev
```

### After Configuration Changes

```bash
# 1. Validate new config
pnpm run validate-config

# 2. Test with dry-run
pnpm run dev -- --dry-run

# 3. Review ALL planned changes

# 4. If safe, proceed
pnpm run dev
```

### Production Deployment

1. **Test in staging first:**
   ```bash
   CONFIG_PATH=config/staging.yaml pnpm run dev
   ```

2. **Monitor first production sync:**
   ```bash
   DEBUG=1 pnpm run dev
   ```

3. **Automate after successful test:**
   - Set up GitHub Actions
   - Configure monitoring
   - Set up alerts

## Next Steps

- [Validation Tools](./validation) - Validate before syncing
- [Common Workflows](./workflows) - Typical command sequences
- [Configuration](../configuration/overview) - Customize sync behavior
- [Troubleshooting](../troubleshooting/sync-problems) - Debug sync issues

:::warning First Sync Duration
The first sync creates many GitHub issues and can take 10-20 minutes for large projects. Subsequent syncs are much faster as they only process changed issues.
:::

