# Testing Guide

Comprehensive guide for testing the JPD-to-GitHub Connector, including automated tests, manual testing, and debugging.

## 🚀 Quick Start

### Run All Tests

```bash
# Full integration test suite (includes sub-issues)
./tests/scripts/test-sync-integration.sh

# Dry-run mode (no actual changes)
pnpm run dev -- --dry-run

# Cleanup old test data
./tests/scripts/test-sync-integration.sh --cleanup-only
```

### Run Specific Tests

```bash
# Comment sync test
./tests/scripts/test-comment-sync.sh

# GitHub to JPD creation test
./tests/scripts/test-github-to-jpd-creation.sh

# Quick smoke test
./tests/scripts/test-quick.sh
```

---

## 📋 Test Suites

### 1. Integration Tests (`test-sync-integration.sh`)

**What it tests:**
- ✅ JPD → GitHub sync (create issues)
- ✅ JPD → GitHub sync (update issues)
- ✅ JPD → GitHub sync (priority changes)
- ✅ GitHub → JPD sync (status updates)
- ✅ **NEW:** Epic → Story → Task hierarchy with sub-issues
- ✅ **NEW:** Task list creation and checkbox auto-update

**Run it:**
```bash
./tests/scripts/test-sync-integration.sh
```

**What happens:**
1. Cleans up old `[TEST-AUTO]` issues (idempotency)
2. Creates test issues in JPD with different categories/priorities
3. Syncs to GitHub and verifies creation
4. Updates issues and verifies sync
5. Creates parent-child hierarchies and verifies sub-issues
6. Closes issues and verifies checkbox updates
7. Offers to clean up test data

**Expected output:**
```
═══════════════════════════════════════════════════════
  TEST 1: JPD → GitHub (Create)
═══════════════════════════════════════════════════════
✓ Created JPD issue: MTT-100
✓ GitHub issue #10 created for MTT-100
✓ Title synced correctly: [TEST-AUTO] Story Title
✓ Labels synced correctly: story,high

═══════════════════════════════════════════════════════
  TEST 5: Sub-Issues & Hierarchy (Epic → Story → Task)
═══════════════════════════════════════════════════════
✓ Epic GitHub issue #11 created
✓ Epic task list contains Story as sub-issue: - [ ] #12
✓ Story task list shows Task as completed: - [x] #13
```

**See also:** [Sub-Issues Test Guide](tests/SUB_ISSUES_TEST_GUIDE.md) for detailed test breakdown

---

### 2. Comment Sync Tests (`test-comment-sync.sh`)

**What it tests:**
- ✅ Bidirectional comment synchronization
- ✅ Comment deduplication
- ✅ Markdown → ADF conversion

**Run it:**
```bash
./tests/scripts/test-comment-sync.sh
```

---

### 3. GitHub to JPD Creation Tests (`test-github-to-jpd-creation.sh`)

**What it tests:**
- ✅ Creating JPD issues from unsynced GitHub issues
- ✅ Label-to-category mapping
- ✅ Default priority assignment
- ✅ Metadata injection

**Run it:**
```bash
./tests/scripts/test-github-to-jpd-creation.sh
```

---

## 🧪 Manual Testing

### Test Sub-Issues Manually

#### 1. Create Hierarchy in JPD

```bash
# Create Epic
EPIC_KEY=$(curl -u "${JPD_EMAIL}:${JPD_API_KEY}" \
  -H "Content-Type: application/json" \
  -X POST "${JPD_BASE_URL}/rest/api/3/issue" \
  -d '{
    "fields": {
      "project": {"key": "MTT"},
      "summary": "[MANUAL] Epic: Mobile Redesign",
      "issuetype": {"name": "Idea"},
      "customfield_14385": {"value": "Epic"}
    }
  }' | jq -r '.key')

echo "Epic created: $EPIC_KEY"

# Create Story
STORY_KEY=$(curl -u "${JPD_EMAIL}:${JPD_API_KEY}" \
  -H "Content-Type: application/json" \
  -X POST "${JPD_BASE_URL}/rest/api/3/issue" \
  -d '{
    "fields": {
      "project": {"key": "MTT"},
      "summary": "[MANUAL] Story: Login Updates",
      "issuetype": {"name": "Idea"},
      "customfield_14385": {"value": "Story"}
    }
  }' | jq -r '.key')

echo "Story created: $STORY_KEY"

# Link Story to Epic
curl -u "${JPD_EMAIL}:${JPD_API_KEY}" \
  -H "Content-Type: application/json" \
  -X POST "${JPD_BASE_URL}/rest/api/3/issueLink" \
  -d "{
    \"type\": {\"name\": \"relates to\"},
    \"inwardIssue\": {\"key\": \"${STORY_KEY}\"},
    \"outwardIssue\": {\"key\": \"${EPIC_KEY}\"}
  }"

echo "Linked $STORY_KEY to $EPIC_KEY"
```

#### 2. Run Sync

```bash
pnpm run dev
```

#### 3. Verify in GitHub

1. Find the Epic issue (search for "[MANUAL] Epic: Mobile Redesign")
2. Check the issue body for:
   ```markdown
   ## 📋 Subtasks
   
   - [ ] #XX Login Updates (MTT-XXX)
   ```
3. Click the sub-issue link to verify it exists
4. Check the Story issue for parent reference:
   ```markdown
   ## 🔗 Parent
   - GitHub: #YY
   - JPD: [MTT-YYY](...)
   ```

#### 4. Test Checkbox Update

1. Close the Story issue in GitHub (via UI or API)
2. Run sync: `pnpm run dev`
3. Check Epic issue - checkbox should be checked:
   ```markdown
   - [x] #XX Login Updates (MTT-XXX) ✅
   ```

---

## 🔍 Debugging Tests

### Enable Debug Logging

```bash
# Set log level to debug
export LOG_LEVEL=debug
pnpm run dev
```

### Inspect Issue Metadata

```bash
# Get GitHub issue and check sync metadata
curl -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/11" | \
  jq -r '.body' | grep -A 20 'jpd-sync-metadata'
```

### Check Task Lists

```bash
# Get parent issue and check task list
curl -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/10" | \
  jq -r '.body' | grep -A 10 'Subtasks'
```

### Verify JPD Links

```bash
# Get JPD issue and check issue links
curl -u "${JPD_EMAIL}:${JPD_API_KEY}" \
  "${JPD_BASE_URL}/rest/api/3/issue/MTT-100?fields=issuelinks" | \
  jq '.fields.issuelinks'
```

---

## 🛠️ Test Utilities

### Cleanup Commands

```bash
# Delete all [TEST-AUTO] issues from JPD and GitHub
./tests/scripts/test-sync-integration.sh --cleanup-only

# Clear all GitHub labels (use with caution!)
./clear-all-labels.sh

# Cleanup old labels (deprecated ones)
./cleanup-old-labels.sh
```

### Quick Validation

```bash
# Validate configuration
pnpm run validate-config

# Test API connections
pnpm run health-check

# Discover JPD fields
pnpm run discover-fields MTT
```

---

## 📊 Test Coverage

| Feature | Automated | Manual | Integration |
|---------|-----------|--------|-------------|
| **Sync: JPD → GitHub** | ✅ | ✅ | ✅ |
| **Sync: GitHub → JPD** | ✅ | ✅ | ✅ |
| **Sub-Issues** | ✅ | ✅ | ✅ |
| **Task Lists** | ✅ | ✅ | ✅ |
| **Checkbox Auto-Update** | ✅ | ✅ | ✅ |
| **Comment Sync** | ✅ | ✅ | ⚠️ |
| **Label Auto-Creation** | ⚠️ | ✅ | ⚠️ |
| **Field Validation** | ⚠️ | ✅ | ⚠️ |
| **Rate Limit Handling** | ⚠️ | ✅ | ⚠️ |

**Legend:**
- ✅ Full coverage
- ⚠️ Partial coverage
- ❌ No coverage

---

## 🐛 Common Test Issues

### Test Fails: Rate Limit Hit

**Problem:** JPD returns 429 errors

**Fix:**
```bash
# Increase wait times in test script
# Or run cleanup and try again later
./tests/scripts/test-sync-integration.sh --cleanup-only
```

### Test Fails: Old Issues Found

**Problem:** Previous test run didn't clean up

**Fix:**
```bash
# Force cleanup
./tests/scripts/test-sync-integration.sh --cleanup-only

# Then re-run tests
./tests/scripts/test-sync-integration.sh
```

### Test Fails: Missing Fields

**Problem:** Custom field IDs don't match your JPD instance

**Fix:**
1. Discover your field IDs:
   ```bash
   pnpm run discover-fields MTT
   ```
2. Update test script with correct field IDs:
   ```bash
   # Edit tests/scripts/test-sync-integration.sh
   # Update customfield_XXXXX values
   ```

### Test Fails: Wrong Project Key

**Problem:** Tests use `MTT` but your project is different

**Fix:**
```bash
# Set your project key
export JPD_PROJECT_KEY=YOUR_KEY

# Or edit test script to use your key
```

---

## 📝 Writing New Tests

### Test Script Template

```bash
#!/usr/bin/env bash
set -euo pipefail

# Load environment
source .env

# Test configuration
TEST_NAME="My New Test"
TEST_PASSED=0
TEST_FAILED=0

# Utility functions
log_success() {
  echo "✓ $1"
  ((TEST_PASSED++))
}

log_error() {
  echo "✗ $1"
  ((TEST_FAILED++))
}

# Your test logic here
test_my_feature() {
  log_success "Test passed!"
}

# Run test
test_my_feature

# Summary
echo ""
echo "✓ Passed: $TEST_PASSED"
echo "✗ Failed: $TEST_FAILED"

# Exit code
[ "$TEST_FAILED" -eq 0 ] && exit 0 || exit 1
```

### Best Practices

1. **Idempotency** - Clean up before and after tests
2. **Rate Limits** - Add `sleep` between API calls
3. **Clear Output** - Use colored logs and sections
4. **Error Handling** - Capture and display API errors
5. **Cleanup** - Offer to delete test data after run

---

## 🎯 CI/CD Integration

### GitHub Actions

```yaml
name: Integration Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run integration tests
        env:
          JPD_EMAIL: ${{ secrets.JPD_EMAIL }}
          JPD_API_KEY: ${{ secrets.JPD_API_KEY }}
          JPD_BASE_URL: ${{ secrets.JPD_BASE_URL }}
          GITHUB_TOKEN: ${{ secrets.GH_PAT }}
          GITHUB_OWNER: ${{ secrets.GITHUB_OWNER }}
          GITHUB_REPO: ${{ secrets.GITHUB_REPO }}
        run: |
          ./tests/scripts/test-sync-integration.sh
          # Auto-cleanup in CI
          ./tests/scripts/test-sync-integration.sh --cleanup-only
```

---

## 📚 Additional Resources

- **[Sub-Issues Test Guide](tests/SUB_ISSUES_TEST_GUIDE.md)** - Detailed sub-issues testing
- **[Sub-Issues Implementation](SUBISSUES_IMPLEMENTATION.md)** - Technical details
- **[README](README.md)** - Main documentation
- **[CLI Guide](CLI_GUIDE.md)** - Command reference

---

🧪 **Happy Testing!** If you encounter issues, check the debug commands above or open an issue on GitHub.

