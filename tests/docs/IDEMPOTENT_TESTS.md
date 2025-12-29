# Idempotent Test Scripts

## Overview

Both test scripts (`test-quick.sh` and `test-sync-integration.sh`) are **idempotent**, meaning they can be run multiple times safely without manual cleanup or causing conflicts.

---

## How It Works

### Pre-Test Cleanup

Before each test run, the scripts automatically:

1. **Search for existing test issues** in both JPD and GitHub
2. **Delete old JPD test issues** with matching prefixes
3. **Close old GitHub test issues** with matching titles
4. **Proceed with fresh test data**

### Unique Identifiers

Test issues include timestamps to ensure uniqueness:

```bash
# Example: [QUICK-TEST] Test title (1735516800)
TIMESTAMP=$(date +%s)
TEST_ISSUE_PREFIX="[TEST-AUTO]"
SUMMARY="${TEST_ISSUE_PREFIX} Story Title (${TIMESTAMP})"
```

---

## Test Scripts

### 1. `test-quick.sh` - Quick Sync Test

**Cleanup Scope**: Issues with `QUICK-TEST` in title/summary

**Usage**:
```bash
# Run as many times as needed
./test-quick.sh
./test-quick.sh priority
./test-quick.sh category
```

**Idempotent Behavior**:
```bash
# First run
Checking for existing test data...
✓ Cleanup complete (no old data found)
✓ Created JPD issue: MTT-24
✓ Found GitHub issue: #26
✓ Test PASSED

# Second run (immediate)
Checking for existing test data...
Cleaning up old JPD issues...
  ✓ Deleted MTT-24
Cleaning up old GitHub issues...
  ✓ Closed #26
✓ Cleanup complete
✓ Created JPD issue: MTT-25
✓ Found GitHub issue: #27
✓ Test PASSED
```

---

### 2. `test-sync-integration.sh` - Integration Tests

**Cleanup Scope**: Issues with `TEST-AUTO` in title/summary

**Usage**:
```bash
# Run full test suite (idempotent)
./test-sync-integration.sh

# Cleanup only (force)
./test-sync-integration.sh --cleanup-only
```

**Idempotent Behavior**:
```bash
# First run
═══════════════════════════════════
  Idempotency Check - Cleaning Existing Test Data
═══════════════════════════════════
Searching for old TEST-AUTO issues in JPD...
No old JPD test issues found
Searching for old TEST-AUTO issues in GitHub...
No old GitHub test issues found
✓ Pre-test cleanup complete

# TEST 1: JPD → GitHub (Create)
✓ Created MTT-26
✓ Issue synced to GitHub
...

# Second run (with existing data)
═══════════════════════════════════
  Idempotency Check - Cleaning Existing Test Data
═══════════════════════════════════
Searching for old TEST-AUTO issues in JPD...
Found old test issues, cleaning up...
  ✓ Deleted MTT-26
  ✓ Deleted MTT-27
Searching for old TEST-AUTO issues in GitHub...
Found old GitHub issues, closing...
  ✓ Closed #28
  ✓ Closed #29
✓ Pre-test cleanup complete

# TEST 1: JPD → GitHub (Create)
✓ Created MTT-30
...
```

---

## Cleanup Logic

### JPD Cleanup

Uses JQL to find test issues:

```bash
curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
  -H "Content-Type: application/json" \
  -X POST "${JPD_BASE_URL}/rest/api/3/search/jql" \
  -d '{"jql":"project=MTT AND summary ~ '\''TEST-AUTO'\''","fields":["key"],"maxResults":50}' | \
  jq -r '.issues[].key'
```

### GitHub Cleanup

Searches all issues (open + closed):

```bash
curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/${OWNER}/${REPO}/issues?state=all&per_page=100" | \
  jq -r '.[] | select(.title | contains("TEST-AUTO")) | .number'
```

---

## Benefits

### 1. No Manual Cleanup Required ✅
- No need to remember which issues to delete
- No leftover test data cluttering the system
- Safe to interrupt and restart tests

### 2. Parallel Development ✅
- Multiple developers can run tests simultaneously
- Timestamp-based uniqueness prevents conflicts
- Each run is isolated

### 3. CI/CD Ready ✅
- Safe to run in automated pipelines
- No state dependencies between runs
- Predictable behavior

### 4. Debugging Friendly ✅
- Easy to re-run failed tests
- Fresh state for each run
- No "works on my machine" issues

---

## Edge Cases Handled

### Interrupted Tests
If a test is interrupted (Ctrl+C), the next run will clean up:

```bash
# Test interrupted after creating MTT-30
^C

# Next run automatically cleans up
Checking for existing test data...
  ✓ Deleted MTT-30 (orphaned from previous run)
```

### Rate Limiting
Cleanup includes rate limit delays:

```bash
wait_for_rate_limit 1  # 1 second between deletions
```

### API Errors
Cleanup continues even if individual deletions fail:

```bash
jpd_delete_issue "$key" || true  # Don't stop on error
github_delete_issue "$num" || true
```

---

## Configuration

### Cleanup Search Patterns

**test-quick.sh**:
```bash
TEST_PREFIX="[QUICK-TEST]"
```

**test-sync-integration.sh**:
```bash
TEST_ISSUE_PREFIX="[TEST-AUTO]"
```

### Search Limits

- JPD: `maxResults: 50` issues per search
- GitHub: `per_page: 100` issues per search

If you have more than these limits, run `--cleanup-only` multiple times.

---

## Manual Cleanup (If Needed)

### Force Cleanup Without Testing

```bash
# Integration tests only
./test-sync-integration.sh --cleanup-only

# Quick test (manual)
cd /path/to/repo
source .env

# Delete JPD issues
curl -u "${JPD_EMAIL}:${JPD_API_KEY}" \
  "${JPD_BASE_URL}/rest/api/3/search?jql=summary~'QUICK-TEST'" | \
  jq -r '.issues[].key' | \
  xargs -I {} curl -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    -X DELETE "${JPD_BASE_URL}/rest/api/3/issue/{}"

# Close GitHub issues
gh issue list --repo "${GITHUB_OWNER}/${GITHUB_REPO}" \
  --search "QUICK-TEST in:title" \
  --state all \
  --limit 100 | \
  awk '{print $1}' | \
  xargs -I {} gh issue close {}
```

---

## Verification

### Check for Leftover Test Data

**JPD**:
```bash
source .env
curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
  "${JPD_BASE_URL}/rest/api/3/search?jql=project=MTT AND (summary~'QUICK-TEST' OR summary~'TEST-AUTO')" | \
  jq '.total'
# Expected: 0
```

**GitHub**:
```bash
gh issue list --search "TEST-AUTO in:title OR QUICK-TEST in:title" --state all
# Expected: empty
```

---

## Troubleshooting

### "No old test issues found" but data exists

**Cause**: Search pattern mismatch  
**Fix**: Verify the test prefix matches:

```bash
# Check actual titles
curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
  "${JPD_BASE_URL}/rest/api/3/search?jql=project=MTT" | \
  jq -r '.issues[].fields.summary' | \
  grep -i test
```

### Cleanup takes too long

**Cause**: Many old test issues  
**Fix**: Increase maxResults or run multiple times:

```bash
# Run cleanup-only mode 3 times
for i in {1..3}; do
  ./test-sync-integration.sh --cleanup-only
  sleep 5
done
```

### Rate limit during cleanup

**Cause**: Too many deletions  
**Fix**: The scripts automatically handle this with delays. If it persists, increase `wait_for_rate_limit` values.

---

## Best Practices

1. **Run tests frequently** - Idempotency makes it safe
2. **Don't manually create issues with test prefixes** - They'll be auto-deleted
3. **Use timestamps for debugging** - Helps identify which run created what
4. **Check cleanup output** - Verify expected number of deletions
5. **Run cleanup-only after failed tests** - Ensures clean state

---

## Summary

✅ **Fully idempotent** - Run as many times as needed  
✅ **Automatic cleanup** - No manual intervention  
✅ **Timestamp uniqueness** - No conflicts  
✅ **Error resilient** - Continues on failures  
✅ **CI/CD ready** - Safe for automation  

**You can now run tests without worrying about cleanup or state conflicts.**

