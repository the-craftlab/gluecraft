# Sub-Issues Test Guide

## Quick Test Commands

### 1. Run Full Integration Test Suite
```bash
./tests/scripts/test-sync-integration.sh
```

**What it tests:**
- ✅ JPD → GitHub sync (create & update)
- ✅ GitHub → JPD sync (status updates)
- ✅ **NEW:** Epic → Story → Task hierarchy with sub-issues
- ✅ **NEW:** Task list creation and auto-update
- ✅ **NEW:** Checkbox completion when issues close

### 2. Cleanup Old Test Data
```bash
./tests/scripts/test-sync-integration.sh --cleanup-only
```

## Test 5: Sub-Issues & Hierarchy (NEW)

### What It Does

Creates a 3-level hierarchy in JPD and verifies GitHub sub-issues:

```
JPD:                              GitHub:
─────────────────────────────     ─────────────────────────────────────
MTT-XXX (Epic)            →       #10 [Epic: Mobile Redesign]
├─ MTT-YYY (Story)        →       ├─ [ ] #11 Login Updates (MTT-YYY)
   └─ MTT-ZZZ (Task)      →          └─ [x] #12 Update UI (MTT-ZZZ) ✅
```

### Test Steps

1. **Create Epic in JPD** - "Mobile Redesign"
2. **Create Story in JPD** - "Login Updates", linked to Epic
3. **Create Task in JPD** - "Update UI", linked to Story
4. **Run Sync** - Syncs all to GitHub
5. **Verify Task Lists:**
   - Epic body contains: `- [ ] #11 Login Updates`
   - Story body contains: `- [ ] #12 Update UI`
   - Story body contains: `## 🔗 Parent` with Epic reference
6. **Close Task** - Mark as "Done" in GitHub
7. **Run Sync** - Updates checkbox
8. **Verify Checkbox:** Story shows `- [x] #12 Update UI ✅`

### Expected Output

```bash
═══════════════════════════════════════════════════════
  TEST 5: Sub-Issues & Hierarchy (Epic → Story → Task)
═══════════════════════════════════════════════════════

▶ Creating JPD issue: [TEST-AUTO] Epic: Mobile Redesign (1234567890)
✓ Created JPD issue: MTT-100

▶ Creating JPD issue: [TEST-AUTO] Story: Login Updates (1234567890)
✓ Created JPD issue: MTT-101

▶ Linking MTT-101 to parent MTT-100
✓ Linked MTT-101 to MTT-100

▶ Creating JPD issue: [TEST-AUTO] Task: Update UI (1234567890)
✓ Created JPD issue: MTT-102

▶ Linking MTT-102 to parent MTT-101
✓ Linked MTT-102 to MTT-101

▶ Running sync (mode: live)...
✓ Sync completed

✓ Epic GitHub issue #10 created
✓ Story GitHub issue #11 created
✓ Task GitHub issue #12 created
✓ Epic contains Subtasks section
✓ Epic task list contains Story as sub-issue: - [ ] #11
✓ Story contains Subtasks section
✓ Story task list contains Task as sub-issue: - [ ] #12
✓ Story contains Parent section
✓ Story references Epic as parent: #10

▶ Closing Task to test checkbox auto-update...
▶ Updating GitHub issue #12: state = closed
✓ Updated #12: state = closed

▶ Running sync (mode: live)...
✓ Sync completed

✓ Story task list shows Task as completed: - [x] #12
```

## Manual Testing

### Test Sub-Issue Creation

```bash
# 1. Create Epic in JPD
curl -u "${JPD_EMAIL}:${JPD_API_KEY}" \
  -H "Content-Type: application/json" \
  -X POST "${JPD_BASE_URL}/rest/api/3/issue" \
  -d '{
    "fields": {
      "project": {"key": "MTT"},
      "summary": "[MANUAL-TEST] Epic: Feature X",
      "issuetype": {"name": "Idea"},
      "customfield_14385": {"value": "Epic"}
    }
  }'

# Note the returned key (e.g., MTT-200)

# 2. Create Story linked to Epic
curl -u "${JPD_EMAIL}:${JPD_API_KEY}" \
  -H "Content-Type: application/json" \
  -X POST "${JPD_BASE_URL}/rest/api/3/issue" \
  -d '{
    "fields": {
      "project": {"key": "MTT"},
      "summary": "[MANUAL-TEST] Story: Implement Login",
      "issuetype": {"name": "Idea"},
      "customfield_14385": {"value": "Story"}
    }
  }'

# Note the returned key (e.g., MTT-201)

# 3. Link Story to Epic
curl -u "${JPD_EMAIL}:${JPD_API_KEY}" \
  -H "Content-Type: application/json" \
  -X POST "${JPD_BASE_URL}/rest/api/3/issueLink" \
  -d '{
    "type": {"name": "relates to"},
    "inwardIssue": {"key": "MTT-201"},
    "outwardIssue": {"key": "MTT-200"}
  }'

# 4. Run sync
pnpm run dev

# 5. Check GitHub - Epic should have Story in task list!
```

### Test Checkbox Auto-Update

```bash
# 1. Find the GitHub issue number for the Task (e.g., #12)
# 2. Close it in GitHub UI or via API:

curl -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Content-Type: application/json" \
  -X PATCH \
  "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/12" \
  -d '{"state": "closed"}'

# 3. Run sync
pnpm run dev

# 4. Check parent issue in GitHub - checkbox should be checked: [x]
```

## Dry-Run Testing

Test without making changes:

```bash
pnpm run dev -- --dry-run
```

Look for log output like:
```
✓ MTT-101 has parent, creating as sub-issue of #10
✓ MTT-102 closed → Marking complete in parent #11
```

## Common Issues

### Issue Not Linking
**Problem:** Sub-issue not appearing in parent's task list

**Check:**
1. Does JPD issue have `parent` field or `issuelinks`?
2. Run with `--dry-run` to see if parent is detected
3. Check sync logs for "creating as sub-issue"

### Checkbox Not Updating
**Problem:** Closing issue doesn't check the box

**Check:**
1. Is the issue actually closed in GitHub?
2. Did sync run after closing?
3. Check for error messages in sync output

### Wrong Hierarchy Level
**Problem:** Story treated as Epic or Task

**Check:**
1. Is `customfield_14385` set correctly in JPD?
2. Check label mapping in `sync-config.yaml`
3. Verify hierarchy detection in sync logs

## Debug Commands

```bash
# Check if issue has sync metadata
curl -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/11" | \
  jq -r '.body' | grep -A 10 'jpd-sync-metadata'

# Check parent relationship in metadata
curl -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/11" | \
  jq -r '.body' | grep -A 5 'parent_github_issue'

# Check task list in parent issue
curl -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/10" | \
  jq -r '.body' | grep -A 10 'Subtasks'
```

## Idempotency

All tests are idempotent:
- Old `[TEST-AUTO]` issues are cleaned up before each run
- Created test data is tracked and cleaned up after tests
- Can re-run tests multiple times without conflicts

---

🧪 **Ready to test!** Run `./tests/scripts/test-sync-integration.sh` to verify sub-issues are working correctly.

