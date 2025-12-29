# Quick Testing Guide

## Test the Complete System in 5 Minutes

### Prerequisites

You already have:
- ✅ `.env` configured with JPD and GitHub credentials
- ✅ `config/mtt-test-config-v2.yaml` set up
- ✅ Test JPD project (MTT)
- ✅ Test GitHub repo (manifest-jpd-sync-test)

---

## Test 1: Basic Sync (2 minutes)

### Step 1: Change Issue Status in JPD

```bash
# Go to JPD UI
open "https://checkfront.atlassian.net/jira/polaris/projects/MTT/ideas"

# Pick any issue (e.g., MTT-11 or MTT-12)
# Change status from "Parking lot" to:
#   - "Impact" (for Epic)
#   - "Ready for delivery" (for Story)
```

### Step 2: Run Sync

```bash
cd /Users/james/Sites/Expedition/jpd-to-github-connector
pnpm run dev
```

### Step 3: Verify in GitHub

```bash
# List issues with labels
gh issue list --label "jpd-synced:MTT-11"

# Or view in browser
open "https://github.com/Checkfront/manifest-jpd-sync-test/issues"
```

**Expected Result**: 
- New issue created with:
  - Title from JPD summary
  - Rich body with RICE scoring
  - Labels: `theme:X`, `category:Y`, `type:epic`, `jpd-synced:MTT-11`

---

## Test 2: Comment Sync GitHub → JPD (2 minutes)

### Step 1: Add Comment in GitHub

```bash
# Find a synced issue number (from Test 1)
ISSUE_NUMBER=9  # Replace with your issue number

# Add a comment
gh issue comment $ISSUE_NUMBER --body "🧪 Test comment from GitHub - this should sync to JPD with my name!"
```

### Step 2: Run Sync

```bash
pnpm run dev
```

**Watch for**:
```
[INFO] Syncing comments...
[INFO] Syncing GitHub comment XXXXX to JPD issue MTT-X
```

### Step 3: Verify in JPD

```bash
# Open JPD issue in browser
open "https://checkfront.atlassian.net/jira/polaris/projects/MTT/ideas/view/163309"

# Or check via API
source .env
curl -s -u "$JPD_EMAIL:$JPD_API_KEY" \
  "$JPD_BASE_URL/rest/api/3/issue/MTT-9/comment" \
  | jq '.comments[-1] | {id, author: .author.displayName, preview: .body.content[0].content[0].text[:100]}'
```

**Expected Result**:
```
**[YourGitHubUsername](https://github.com/...) commented in GitHub:

🧪 Test comment from GitHub - this should sync to JPD with my name!
```

---

## Test 3: Comment Sync JPD → GitHub (2 minutes)

### Step 1: Add Comment in JPD

```bash
# Go to JPD and add a comment manually
open "https://checkfront.atlassian.net/jira/polaris/projects/MTT/ideas/view/163309"

# Click "Add a comment"
# Type: "🧪 Test from JPD - should appear in GitHub!"
# Click "Save"
```

### Step 2: Run Sync

```bash
pnpm run dev
```

**Watch for**:
```
[INFO] Syncing comments...
[INFO] Syncing JPD comment XXXXX to GitHub issue #X
```

### Step 3: Verify in GitHub

```bash
# View comments
gh issue view 9 --comments

# Or in browser
open "https://github.com/Checkfront/manifest-jpd-sync-test/issues/9"
```

**Expected Result**:
```markdown
**[Your Name](https://checkfront.atlassian.net/people/...) commented in JPD:

🧪 Test from JPD - should appear in GitHub!
```

---

## Test 4: Deduplication (1 minute)

### Run Sync Multiple Times

```bash
pnpm run dev
pnpm run dev
pnpm run dev
```

**Expected Result**:
```
[INFO] Syncing comments...
```
*(No individual sync messages = no duplicates created)*

### Verify

```bash
# Count comments in GitHub
gh issue view 9 --comments | grep -c "commented"

# Count comments in JPD
source .env
curl -s -u "$JPD_EMAIL:$JPD_API_KEY" \
  "$JPD_BASE_URL/rest/api/3/issue/MTT-9/comment" \
  | jq '.comments | length'
```

**Expected**: Same count each time (no new comments created)

---

## Advanced Testing Scenarios

### Test Rich Body Transformation

```bash
# Sync an issue with full RICE scoring
# Check GitHub issue body includes:
# - Theme
# - Category  
# - Roadmap
# - Reach/Impact/Confidence/Effort/Value scores
# - Link back to JPD

gh issue view 9
```

### Test Label Slugification

```bash
# Check labels are properly formatted
gh issue view 9 --json labels -q '.labels[].name'

# Expected format:
# theme:expand-horizons
# category:sample-ideas
# priority:now
# type:epic
# jpd-synced:MTT-9
```

### Test Status Updates

```bash
# Close an issue in GitHub
gh issue close 9 --comment "Completed via GitHub"

# Run sync
pnpm run dev

# Check JPD status (should attempt to update to "Done")
# Note: May fail if workflow transitions required
```

---

## Dry Run Testing

### Test Without Making Changes

```bash
# Run in dry-run mode
pnpm run dev -- --dry-run

# Check logs show what WOULD happen
# No actual API calls made
```

---

## Debug Mode Testing

### See Detailed Logs

```bash
# Enable debug logging
DEBUG=true pnpm run dev 2>&1 | tee sync-debug.log

# Check for:
# - [DEBUG] Processing MTT-X
# - [DEBUG] Field 'customfield_XXXXX': value
# - [INFO] Syncing comments...
```

---

## Production-Like Testing

### Test with Real Data

1. **Create a real Epic in JPD**:
   - Set status to "Impact"
   - Fill in RICE scores
   - Add theme, category
   - Add description

2. **Run sync**:
   ```bash
   pnpm run dev
   ```

3. **Verify complete issue in GitHub**:
   - Check all fields mapped
   - Verify labels correct
   - Check body formatting

4. **Add comments back and forth**:
   - PM comments in JPD
   - Dev comments in GitHub
   - Run sync between each
   - Verify all visible in both systems

5. **Test full workflow**:
   - Epic created (JPD)
   - Epic synced (GitHub)
   - Dev comments on implementation
   - PM sees comment in JPD
   - PM responds in JPD
   - Dev sees response in GitHub
   - Dev closes issue
   - Status updates in JPD

---

## Quick Verification Commands

### Check JPD Issue

```bash
source .env
curl -s -u "$JPD_EMAIL:$JPD_API_KEY" \
  "$JPD_BASE_URL/rest/api/3/issue/MTT-9" \
  | jq '{key, summary: .fields.summary, status: .fields.status.name}'
```

### Check GitHub Issue

```bash
gh issue view 9 --json title,state,labels,comments \
  -q '{title, state, labels: [.labels[].name], comment_count: (.comments | length)}'
```

### Check Comments Match

```bash
# JPD comment count
source .env
curl -s -u "$JPD_EMAIL:$JPD_API_KEY" \
  "$JPD_BASE_URL/rest/api/3/issue/MTT-9/comment" \
  | jq '.comments | length'

# GitHub comment count
gh api "/repos/Checkfront/manifest-jpd-sync-test/issues/9/comments" \
  | jq 'length'
```

---

## Troubleshooting

### Comments Not Syncing

**Check 1**: Bidirectional mode enabled?
```bash
grep -A2 "sync:" config/mtt-test-config-v2.yaml
# Should show: direction: bidirectional
```

**Check 2**: Issue has sync label?
```bash
gh issue view 9 --json labels -q '.labels[].name' | grep jpd-synced
```

**Check 3**: Run with debug
```bash
DEBUG=true pnpm run dev 2>&1 | grep -i comment
```

### Status Not Updating

**Known Issue**: JPD requires workflow transitions, not direct status updates.

**Workaround**: Status sync works for GitHub → JPD "Done" status.

### Duplicates Created

**Check**: Sync markers in comments
```bash
gh issue view 9 --comments | grep "comment-sync:"
```

If missing, re-run sync to add markers to existing comments.

---

## Success Criteria

✅ **Basic Sync Working**:
- [ ] Issue created in GitHub from JPD
- [ ] Labels properly formatted
- [ ] Rich body with RICE scoring
- [ ] Link back to JPD present

✅ **Comment Sync Working**:
- [ ] GitHub comment appears in JPD with author
- [ ] JPD comment appears in GitHub with author
- [ ] Sync markers present in both systems

✅ **Deduplication Working**:
- [ ] Multiple syncs don't create duplicates
- [ ] Comment count stable across runs

✅ **Complete Flow Working**:
- [ ] PM can work in JPD only
- [ ] Dev can work in GitHub only
- [ ] Both see all comments
- [ ] Context preserved across systems

---

## Next Steps

Once testing is complete:

1. **Review** test results
2. **Document** any edge cases found
3. **Adjust** config if needed
4. **Deploy** to production (see DEPLOYMENT_CHECKLIST.md)

---

**Ready to test? Start with Test 1 above!** 🚀

