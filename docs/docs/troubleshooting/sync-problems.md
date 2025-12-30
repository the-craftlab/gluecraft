# Sync Problems

Troubleshooting synchronization issues when issues aren't being created, updated, or synced correctly.

## Issues Not Syncing

### No Issues Found

**Symptom:** `Found 0 issues in JPD project`

**Causes:**
- Project is empty
- JQL filter too restrictive
- Wrong project key

**Solutions:**

1. **Verify project has issues:**
   - Log into JPD
   - Check issues exist

2. **Check project key:**
   ```yaml
   jpd:
     project_key: "MTT"  # Must match exactly
   ```

3. **Check JQL filter:**
   ```yaml
   jpd:
     jql_filter: "project = MTT"  # Remove restrictive filters
   ```

4. **Test with discover-fields:**
   ```bash
   pnpm run discover-fields MTT
   ```

### Issues Skipped During Sync

**Symptom:** `Skipping MTT-5, not in Epic/Story status`

**Cause:** Hierarchy filtering enabled

**Solutions:**

**Check hierarchy configuration:**
```yaml
hierarchy:
  enabled: true
  epic_statuses:
    - "Impact"
  story_statuses:
    - "Ready for Delivery"
    
# Issues only sync if status is in one of these lists
```

**Option 1: Add status to lists:**
```yaml
story_statuses:
  - "Ready for Delivery"
  - "In Progress"  # Add your status
```

**Option 2: Disable hierarchy:**
```yaml
hierarchy:
  enabled: false  # Sync all issues regardless of status
```

**Debug:**
```bash
DEBUG=1 pnpm run dev -- --dry-run | grep "Skipping"
```

## Issues Not Updating

### Issue Unchanged Detection

**Symptom:** `Skipping MTT-5 (unchanged)`

**Cause:** Sync hash unchanged (no modifications detected)

**Why this happens:**
- Issue hasn't changed since last sync
- This is normal and expected behavior

**When it's a problem:**
- Issue DID change but not detected
- Field mapping added/changed

**Solutions:**

**Force full sync:**
```bash
pnpm run dev -- --force
```

**Check sync metadata in GitHub:**
```html
<!-- jpd-sync-metadata
issue_key: MTT-5
sync_hash: abc123
last_synced: 2024-12-30T10:30:00Z
-->
```

**Debug hash calculation:**
```bash
DEBUG=1 pnpm run dev -- --dry-run
```

### Labels Not Updating

**Symptom:** Labels not appearing on GitHub issues

**Causes:**
1. Label creation failed
2. Field mapping incorrect
3. Field value empty

**Solutions:**

**Check label exists:**
```bash
# Visit GitHub labels page
open https://github.com/OWNER/REPO/labels
```

**Create labels manually:**
```bash
pnpm run setup-labels
```

**Verify field mapping:**
```yaml
mappings:
  - jpd: "fields.customfield_10001.value"  # Check field path
    github: "labels"
    template: "priority:{{fields.customfield_10001.value | lowercase}}"
```

**Check field has value:**
```bash
pnpm run discover-fields YOUR_PROJECT
# Verify field shows "✓ Set"
```

## Status Sync Issues

### GitHub Status Not Updating

**Symptom:** JPD status changes but GitHub state stays open

**Causes:**
- Status not mapped in config
- Status name mismatch

**Solutions:**

**Check status mapping:**
```yaml
statuses:
  "Done":  # Must match JPD exactly (case-sensitive)
    github_state: "closed"
```

**Verify status name:**
1. Open issue in JPD
2. Copy exact status name
3. Use in config (case-sensitive, watch for spaces)

**Common mistakes:**
```yaml
# Wrong
"In Progress"  # Extra space

# Correct
"In Progress"  # Match JPD exactly
```

### JPD Status Not Updating (Bidirectional)

**Symptom:** GitHub issue closed but JPD status unchanged

**Causes:**
- Bidirectional sync not enabled
- `github_closed_status` not configured

**Solutions:**

**Enable bidirectional sync:**
```yaml
sync:
  direction: "bidirectional"  # Not "jpd-to-github"
  github_closed_status: "Done"  # Required for bidirectional
```

**Verify status exists in JPD:**
- `github_closed_status` must be valid JPD status
- Case-sensitive

**Check permissions:**
- API token must have permission to update JPD issues

## Parent-Child Issues

### Sub-Issues Not Linking

**Symptom:** Child issues don't show parent relationship

**Causes:**
- `use_github_sub_issues` disabled
- Parent issue doesn't exist
- Insufficient permissions

**Solutions:**

**Enable sub-issues:**
```yaml
hierarchy:
  use_github_sub_issues: true
```

**Verify parent exists:**
- Parent must be created before child
- Parent must have been synced already

**Check token permissions:**
- Requires `repo` scope
- May need organization approval

### Hierarchy Labels Missing

**Symptom:** Issues missing `epic:MTT-1` or `story:MTT-2` labels

**Cause:** Label definitions missing

**Solution:**

**Add hierarchy labels:**
```yaml
labels:
  hierarchy:
    - name: "epic"
      color: "6554C0"
    - name: "story"
      color: "0052CC"
```

**Create labels:**
```bash
pnpm run setup-labels
```

## Performance Issues

### Sync Taking Too Long

**Symptoms:**
- Sync runs for hours
- Timeout errors

**Causes:**
- Too many issues
- Rate limiting
- Network issues

**Solutions:**

**Sync in batches:**
```bash
# Recent issues first
pnpm run dev -- --filter "created >= -30d"

# Older issues later
pnpm run dev -- --filter "created >= -60d AND created < -30d"
```

**Reduce batch size:**
```yaml
sync:
  batch_size: 25  # Smaller batches
  batch_delay_ms: 3000  # Longer delay
```

**Check rate limits:**
```bash
pnpm run health-check
```

### Issues Being Skipped Due to Rate Limits

**Symptom:** Some issues fail with rate limit errors

**Solutions:**

**Increase retry settings:**
```yaml
rate_limiting:
  max_retries: 5
  initial_delay_ms: 2000
  backoff_multiplier: 3
```

**Reduce sync frequency:**
```bash
# Instead of every 15 minutes
*/15 * * * * pnpm run dev

# Run every hour
0 * * * * pnpm run dev
```

## Duplicate Issues

### Same JPD Issue Creates Multiple GitHub Issues

**Symptom:** JPD issue MTT-5 appears as #45, #46, #47 in GitHub

**Causes:**
- Sync metadata not being saved
- Metadata being removed/corrupted

**Solutions:**

**Check sync metadata exists:**
```html
<!-- jpd-sync-metadata in issue body -->
```

**If metadata missing:**
1. Delete duplicate GitHub issues
2. Run sync again
3. Connector should recognize existing issue

**Prevent future duplicates:**
- Don't manually edit sync metadata in GitHub
- Avoid force-pushing or resetting sync state

## Debugging Sync Issues

### General Debugging Steps

1. **Enable debug logging:**
   ```bash
   DEBUG=1 pnpm run dev -- --dry-run
   ```

2. **Validate configuration:**
   ```bash
   pnpm run validate-config
   ```

3. **Test connections:**
   ```bash
   pnpm run test-connection --force
   ```

4. **Check health:**
   ```bash
   pnpm run health-check
   ```

5. **Review dry-run output:**
   ```bash
   pnpm run dev -- --dry-run > sync-output.txt
   less sync-output.txt
   ```

### Isolate the Problem

**Test single issue:**
```bash
pnpm run dev -- --filter "key = MTT-5"
```

**Test specific field:**
Comment out other field mappings temporarily

**Test without transforms:**
Remove transform functions temporarily to isolate issues

## Next Steps

- [Common Issues](./common-issues) - Connection and configuration problems
- [Field Configuration](./field-configuration) - Field mapping issues
- [Debugging Guide](./debugging) - Advanced debugging techniques

:::tip Dry-Run First
Always run `--dry-run` when troubleshooting to see what the sync would do without making actual changes.
:::

