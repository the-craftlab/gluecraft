# Testing Strategy: Progressive Enhancement

## Philosophy

This project uses a **progressive enhancement** testing approach:

1. **Start Simple**: Test core mechanics with minimal fields
2. **Add Complexity**: Layer on additional features once basics work
3. **API-Driven**: Use direct API calls to simulate real-world changes
4. **Automated**: Tests run without manual interaction
5. **Repeatable**: Can run tests multiple times with consistent results

## Test Suite Overview

### 🚀 Quick Test (`./test-quick.sh`)

**Purpose**: Rapid validation during development

**What it does**:
- Creates a single test issue in JPD
- Runs sync
- Verifies issue appears in GitHub
- Shows issue details for manual inspection

**When to use**:
- Quick sanity check after code changes
- Debugging specific field mappings
- Verifying basic connectivity

**Runtime**: ~10 seconds

**Usage**:
```bash
# Test default (title field)
./test-quick.sh

# Test specific field
./test-quick.sh priority
./test-quick.sh category
./test-quick.sh status
```

**Example Output**:
```
═══════════════════════════════════════════════
  Quick Sync Test: title
═══════════════════════════════════════════════

Step 1: Creating JPD issue...
✓ Created JPD issue: MTT-15

Step 2: Moving to Backlog status...
✓ Moved to Backlog

Step 3: Running sync...
[sync output...]

Step 4: Verifying GitHub issue...
✓ Found GitHub issue: #42

GitHub Issue Details:
  Title: [QUICK-TEST] Test title
  State: open
  Labels: story, normal

✓ Test PASSED

Cleanup command:
  JPD: curl -u "..." -X DELETE "..."
  GitHub: gh issue close 42 -R ...
```

---

### 🧪 Integration Test Suite (`./test-sync-integration.sh`)

**Purpose**: Comprehensive end-to-end validation

**What it does**:
1. **Test 1: JPD → GitHub (Create)**
   - Creates issue in JPD with specific fields
   - Runs sync
   - Verifies GitHub issue created with correct title, labels, metadata

2. **Test 2: JPD → GitHub (Update)**
   - Updates title in JPD
   - Runs sync
   - Verifies GitHub issue title updated

3. **Test 3: JPD → GitHub (Priority Change)**
   - Changes priority field in JPD
   - Runs sync
   - Verifies GitHub label updated (high → critical)

4. **Test 4: GitHub → JPD (Status Change)**
   - Closes GitHub issue
   - Runs sync
   - Verifies JPD status changed to "Done"

**When to use**:
- Before committing changes
- CI/CD pipeline validation
- Testing bidirectional sync
- Verifying complex field transformations

**Runtime**: ~60 seconds

**Usage**:
```bash
# Run full test suite
./test-sync-integration.sh

# Cleanup only (remove old test issues)
./test-sync-integration.sh --cleanup-only
```

**Example Output**:
```
═══════════════════════════════════════════════════════
  TEST 1: JPD → GitHub (Create)
═══════════════════════════════════════════════════════

  Creating JPD issue: [TEST-AUTO] Story Title
✓ Created JPD issue: MTT-20
  Running sync (mode: live)...
✓ Sync completed
✓ GitHub issue #45 created for MTT-20
✓ Title synced correctly: [TEST-AUTO] Story Title
✓ Labels synced correctly: story,high

[... more tests ...]

═══════════════════════════════════════════════════════
  Test Results
═══════════════════════════════════════════════════════
✓ Passed: 8
✗ Failed: 0

Clean up test data? (y/n)
```

---

## Test Data Management

### Test Issue Naming Convention

All test issues use a prefix to identify them:
- Quick tests: `[QUICK-TEST]`
- Integration tests: `[TEST-AUTO]`

This makes them easy to:
- Identify in JPD/GitHub
- Filter in searches
- Clean up en masse

### Cleanup Strategy

**Automatic cleanup** (recommended):
```bash
# Integration tests prompt for cleanup after completion
./test-sync-integration.sh
# Answer 'y' when prompted

# Or force cleanup of any leftover test issues
./test-sync-integration.sh --cleanup-only
```

**Manual cleanup**:
```bash
# Find test issues in JPD
curl -u "$JPD_EMAIL:$JPD_API_KEY" \
  "$JPD_BASE_URL/rest/api/3/search?jql=project=MTT AND summary ~ 'TEST'" | \
  jq -r '.issues[].key'

# Delete specific issue
curl -u "$JPD_EMAIL:$JPD_API_KEY" \
  -X DELETE "$JPD_BASE_URL/rest/api/3/issue/MTT-XX"

# Find test issues in GitHub
gh issue list -R Checkfront/manifest-jpd-sync-test --search "TEST in:title"

# Close them
gh issue close XX -R Checkfront/manifest-jpd-sync-test
```

---

## Field Coverage

### Currently Tested Fields

| Field | Create | Update | JPD→GH | GH→JPD |
|-------|--------|--------|--------|--------|
| Title | ✅ | ✅ | ✅ | ❌ |
| Status | ✅ | ✅ | ✅ | ✅ |
| Priority | ✅ | ✅ | ✅ | ❌ |
| Category | ✅ | ❌ | ✅ | ❌ |
| Description | ✅ | ❌ | ✅ | ❌ |

### Future Field Testing

**Planned additions**:
- [ ] Hierarchy (parent-child relationships via issuelinks)
- [ ] Custom field: Theme
- [ ] Custom field: Roadmap timeline
- [ ] Comments (bidirectional)
- [ ] Attachments
- [ ] Watchers → Assignees

---

## Progressive Enhancement Roadmap

### Phase 1: Core Mechanics ✅ (Current)
- ✅ Basic JPD → GitHub sync (create)
- ✅ Field mapping (title, status, category, priority)
- ✅ Label generation (type, priority)
- ✅ GitHub → JPD status sync (closed → Done)

### Phase 2: Hierarchy & Relationships (Next)
- [ ] Test parent-child creation via issuelinks
- [ ] Test subtask references in GitHub body
- [ ] Test hierarchy label generation
- [ ] Verify GitHub issue linkage

### Phase 3: Bidirectional Updates
- [ ] Test JPD updates propagating to GitHub
- [ ] Test GitHub comment sync to JPD
- [ ] Test assignee mapping
- [ ] Handle conflict resolution

### Phase 4: Advanced Features
- [ ] Test GitHub Projects integration
- [ ] Test team assignment
- [ ] Test webhook-triggered sync
- [ ] Performance testing with 100+ issues

---

## Debugging Failed Tests

### Common Issues

**Issue**: "JPD API Error 400: Unbounded JQL queries"
- **Cause**: Rate limiting or missing project filter
- **Fix**: Add wait time between API calls, use specific JQL

**Issue**: "GitHub issue not found after sync"
- **Cause**: Issue didn't meet sync criteria (wrong status)
- **Fix**: Check sync output, verify issue status is in `statuses` config

**Issue**: "Labels don't match expected"
- **Cause**: Transform function not executing or mapping incorrect
- **Fix**: Check `DEBUG=true` logs, verify field IDs in config

### Debug Mode

Run tests with detailed logging:

```bash
# Quick test with debug output
DEBUG=true ./test-quick.sh

# Integration test with debug output
DEBUG=true ./test-sync-integration.sh
```

### Inspecting Sync Output

All sync output is saved to `/tmp/sync-output.txt` or `/tmp/quick-test-output.txt`:

```bash
# View full sync output
cat /tmp/sync-output.txt

# Search for specific issue
grep "MTT-20" /tmp/sync-output.txt -A 20

# Check for errors
grep -i "error" /tmp/sync-output.txt
```

---

## Rate Limit Handling

### JPD Rate Limits

JPD has strict rate limits (~10 requests per minute for free accounts).

**Mitigation strategies**:
- Add `wait_for_rate_limit` calls between API operations
- Use connection caching for repeated requests
- Batch operations when possible

**In tests**:
```bash
# Quick test: 2-3 second pauses
sleep 2

# Integration test: configurable pauses
wait_for_rate_limit 3
```

### GitHub Rate Limits

GitHub has generous rate limits (5000/hour authenticated).

**Rarely an issue**, but if hit:
- Check remaining quota: `curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit`
- Wait for reset time
- Use personal access token (not OAuth app token)

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 22
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Create .env
        run: |
          echo "JPD_EMAIL=${{ secrets.JPD_EMAIL }}" >> .env
          echo "JPD_API_KEY=${{ secrets.JPD_API_KEY }}" >> .env
          echo "JPD_BASE_URL=${{ secrets.JPD_BASE_URL }}" >> .env
          echo "GITHUB_TOKEN=${{ secrets.GH_PAT }}" >> .env
          echo "GITHUB_OWNER=${{ secrets.GH_OWNER }}" >> .env
          echo "GITHUB_REPO=${{ secrets.GH_REPO }}" >> .env
      
      - name: Run integration tests
        run: ./test-sync-integration.sh
      
      - name: Cleanup test data
        if: always()
        run: ./test-sync-integration.sh --cleanup-only
```

---

## Best Practices

### ✅ DO

- Run quick test after every code change
- Run full integration suite before commits
- Clean up test data after each run
- Use rate limit pauses between API calls
- Check exit codes to catch failures
- Review sync output for warnings

### ❌ DON'T

- Don't run tests against production issues
- Don't skip cleanup (creates noise in JPD/GitHub)
- Don't run tests in parallel (rate limits!)
- Don't ignore test failures
- Don't commit without running tests

---

## Extending the Test Suite

### Adding a New Test

1. **Create test function** in `test-sync-integration.sh`:

```bash
test_new_feature() {
  log_section "TEST X: New Feature"
  
  # Setup
  local key=$(jpd_create_issue "Test Issue" "Story" "High")
  
  # Perform action
  jpd_update_issue "$key" "new_field" "new_value"
  
  # Run sync
  run_sync "live"
  wait_for_rate_limit 3
  
  # Verify result
  local gh_number=$(github_get_issue_by_jpd_key "$key")
  local gh_issue=$(github_get_issue "$gh_number")
  
  local actual=$(echo "$gh_issue" | jq -r '.field_name')
  if [[ "$actual" == "expected_value" ]]; then
    log_success "New feature works!"
  else
    log_error "New feature failed: $actual"
  fi
}
```

2. **Add to main()** test sequence
3. **Document** in this file
4. **Run and verify**

### Adding a New Field Test

1. Update `jpd_create_issue()` to include the field
2. Update `jpd_update_issue()` to support the field
3. Add verification logic in test functions
4. Update field coverage table above

---

## Success Criteria

A successful test run should show:

✅ All JPD issues created with correct fields  
✅ All GitHub issues created with correct metadata  
✅ Updates propagate JPD → GitHub  
✅ Status changes propagate GitHub → JPD  
✅ Labels match expected values  
✅ No errors in sync output  
✅ Test data cleaned up  

If any criteria fails, investigate before proceeding with development.

