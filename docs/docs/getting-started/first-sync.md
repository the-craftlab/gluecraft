# Running Your First Sync

This guide walks you through running your first sync, verifying the results, and understanding common workflows.

## Before You Start

Ensure you have completed:
- [Prerequisites](./prerequisites) - System requirements and credentials
- [Quick Start](./quick-start) OR [Manual Setup](./manual-setup) - Configuration setup
- Configuration validation passed: `pnpm run validate-config`

## Understanding Sync Modes

The connector has two sync modes:

### Dry-Run Mode (Safe)

```bash
pnpm run dev -- --dry-run
```

**What it does:**
- Fetches issues from JPD
- Fetches existing issues from GitHub
- Calculates what would be created/updated
- Shows detailed output of planned changes
- **Does not make any actual changes**

**When to use:**
- Before every real sync (recommended)
- After configuration changes
- To preview what will happen
- When testing new field mappings

### Actual Sync Mode

```bash
pnpm run dev
```

**What it does:**
- Fetches issues from JPD
- Fetches existing issues from GitHub
- Creates new GitHub issues
- Updates existing GitHub issues
- Syncs status changes
- Syncs comments (if enabled)
- **Makes real changes to GitHub and potentially JPD**

**When to use:**
- After dry-run looks correct
- In production/automated workflows
- When you're confident in your configuration

## Step 1: Run Your First Dry-Run

Always start with a dry-run:

```bash
pnpm run dev -- --dry-run
```

### What to Look For

**Issue Count:**
```
Found 15 issues in JPD project MTT
Found 3 existing GitHub issues
```

**Planned Actions:**
```
Would create 12 new GitHub issues:
  - MTT-1: [EPIC] Mobile App Redesign
  - MTT-2: [STORY] Implement New Navigation
  ...

Would update 3 existing GitHub issues:
  - #45 (MTT-5): Status changed
  - #46 (MTT-7): Labels updated
  ...
```

**Field Mappings:**
Check that fields are being mapped correctly:
```
MTT-1 would be created with:
  Title: [MTT-1] Mobile App Redesign
  Labels: type:epic, theme:mobile, priority:high
  Body: (rendered from template)
```

### Common Dry-Run Issues

**No issues found:**
- Check your JQL query in config
- Verify project key is correct
- Ensure issues exist in JPD

**Fields not mapping:**
- Verify field IDs in config match `discover-fields` output
- Check field paths are correct (e.g., `fields.customfield_10001.value`)

**Labels look wrong:**
- Check template syntax
- Verify filters are applied correctly (lowercase, slugify, etc.)

## Step 2: Review the Output

Dry-run output is organized into sections:

### Connection Status

```
Connecting to JPD: https://company.atlassian.net
Connecting to GitHub: owner/repo
```

Verify URLs and repository are correct.

### Fetched Issues

```
Fetched 15 issues from JPD
Fetched 3 existing GitHub issues
```

**Check:**
- Issue count matches expectations
- Existing GitHub issues are recognized

### Sync Plan

```
Plan:
  Create: 12 new issues
  Update: 3 existing issues
  Skip: 0 issues
```

**Check:**
- Create count seems reasonable
- Update count makes sense
- No unexpected skips

### Issue Details

For each issue, review:

**Title formatting:**
```
[MTT-1] Mobile App Redesign Initiative
```

**Labels:**
```
Labels: type:epic, theme:mobile-experience, priority:high
```

**Body content:**
Check that custom fields are rendering correctly in the issue body.

## Step 3: Run the Actual Sync

When dry-run looks good, run the real sync:

```bash
pnpm run dev
```

### What Happens

The sync executes in phases:

**Phase 1: Fetch Data**
```
Fetching JPD issues...
Fetching GitHub issues...
```

**Phase 2: Create New Issues**
```
Creating issue for MTT-1...
  ✓ Created GitHub issue #50
Creating issue for MTT-2...
  ✓ Created GitHub issue #51
```

**Phase 3: Update Existing Issues**
```
Updating issue #45 (MTT-5)...
  ✓ Updated status to 'open'
  ✓ Added labels: priority:high
```

**Phase 4: Sync Metadata**
```
Updating sync metadata...
  ✓ Saved sync state
```

### Monitoring Progress

The sync provides real-time feedback:
- Spinner while fetching data
- Progress for each issue created/updated
- Success/error indicators
- Final summary

## Step 4: Verify Results in GitHub

Open your GitHub repository and verify:

### Issue Creation

1. Go to `https://github.com/OWNER/REPO/issues`
2. Check that new issues were created
3. Verify issue titles match format

### Labels

Check that labels are:
- Created with correct names
- Assigned to appropriate issues
- Using configured colors

### Issue Content

Open a few issues and verify:
- Title is correct
- Body contains expected fields
- Labels are applied
- Cross-references to JPD are present

### Hierarchy (if enabled)

If using sub-issues:
- Parent issues show child count
- Child issues link to parent
- Hierarchy labels are present (`epic:MTT-1`, etc.)

## Step 5: Test Bidirectional Sync (if enabled)

If you configured bidirectional sync, test the GitHub → JPD flow:

### Test Status Sync

1. In GitHub: Close an issue that was synced from JPD
2. Run sync again: `pnpm run dev`
3. In JPD: Verify the issue status updated to your configured closed status

### Test Comment Sync

1. In GitHub: Add a comment to a synced issue
2. Run sync again: `pnpm run dev`
3. In JPD: Verify the comment appears with attribution

## Common Workflows

### Daily Sync Workflow

```bash
# 1. Validate configuration (quick check)
pnpm run validate-config

# 2. Run dry-run to preview
pnpm run dev -- --dry-run

# 3. If dry-run looks good, sync
pnpm run dev
```

### After Configuration Changes

```bash
# 1. Validate new configuration
pnpm run validate-config

# 2. Dry-run to see impact
pnpm run dev -- --dry-run

# 3. Review carefully - field changes may affect many issues
# 4. If safe, proceed with sync
pnpm run dev
```

### Adding New JPD Issues

1. Create issue in JPD
2. Set status to one that triggers sync (e.g., move to "Ready for Delivery")
3. Run sync: `pnpm run dev`
4. Verify issue appears in GitHub

### Updating Existing Issues

1. Modify issue in JPD (change priority, add fields, etc.)
2. Run sync: `pnpm run dev`
3. Verify changes appear in GitHub

## Understanding Sync State

The connector maintains sync state to avoid duplicates:

### Sync Metadata

Stored in GitHub issue body as HTML comment:

```html
<!-- jpd-sync-metadata
issue_key: MTT-1
sync_hash: abc123def456
last_synced: 2024-12-30T10:30:00Z
-->
```

This metadata:
- Links GitHub issue to JPD issue
- Detects changes since last sync
- Prevents duplicate issue creation

### When Issues are Updated

Issues are updated when:
- JPD issue content changed (detected via hash)
- Status changed in either system
- Comments added in either system
- Field values updated in JPD

### When Issues are Skipped

Issues are skipped when:
- Already synced and unchanged
- Status doesn't match sync criteria
- Filtered out by JQL query
- Marked as "do not sync" (if configured)

## Troubleshooting

### Issues Not Appearing in GitHub

**Check:**
1. Status matches hierarchy criteria (if configured)
2. JQL query includes the issue
3. No errors in sync output
4. Rate limits not exceeded

**Debug:**
```bash
DEBUG=1 pnpm run dev -- --dry-run
```

### Issue Created Multiple Times

**Cause:** Sync metadata not being saved/read properly

**Fix:**
1. Delete duplicate GitHub issues
2. Run sync again - connector should recognize existing issues
3. Check issue body contains sync metadata comment

### Status Not Syncing Back to JPD

**Check:**
1. Bidirectional sync enabled in config
2. GitHub closed status mapped in config
3. JPD API permissions allow status updates

**Config:**
```yaml
sync:
  direction: "bidirectional"
  github_closed_status: "Done"
```

### Fields Not Updating

**Check:**
1. Field mapping in config is correct
2. JPD field actually changed
3. Sync hash changed (indicates update detected)

**Debug:** Compare sync hashes before and after JPD update

### Rate Limit Errors

**Symptom:**
```
Rate limit exceeded, retrying in 60s...
```

**Solution:**
- Wait for retry (automatic)
- Reduce sync frequency
- Check rate limit status: `pnpm run health-check`

## Next Steps

Now that your sync is working:

- [Configure Field Mappings](../configuration/field-mappings) - Customize field transforms
- [Set Up Hierarchy](../configuration/hierarchy) - Enable Epic/Story/Task relationships
- [Configure Status Workflows](../configuration/status-workflows) - Customize status mappings
- [Enable Comment Sync](../features/comment-sync) - Sync team discussions
- [Automate Syncs](../guides/automation) - Set up GitHub Actions

## Performance Tips

### Optimize Sync Speed

- Use specific JQL to limit issue count
- Enable caching (default)
- Run syncs during off-peak hours

### Reduce API Calls

- Don't sync unchanged issues (automatic)
- Cache field discovery results
- Use connection caching

### Monitor Health

```bash
# Check API rate limits and connection status
pnpm run health-check
```

:::tip Incremental Syncs
The connector only updates changed issues. After the initial full sync, subsequent syncs are much faster as they only process modified issues.
:::

:::warning First Sync May Be Slow
The first sync creates many GitHub issues and labels. Expect 5-10 seconds per issue created due to API rate limits. Subsequent syncs are much faster.
:::

