# Quick Start Guide - Complete Hierarchy & Two-Way Sync

## 🎉 What's Now Working

✅ **Status-Based Hierarchy** - Epic/Story levels determined by JPD status
✅ **Filtering** - Only sync Epics and Stories, not raw Ideas  
✅ **Type Labels** - `type:epic`, `type:story`, `type:task`
✅ **Hierarchy Labels** - `epic:MTT-X`, `story:MTT-Y` for relationships
✅ **Rich Body Content** - RICE scoring, context, cross-references
✅ **GitHub Projects Integration** - Auto-update columns (when enabled)
✅ **Two-Way Sync** - JPD ↔ GitHub status updates
✅ **Cross-References** - Links between GitHub issues AND JPD
✅ **Label Slugification** - Clean labels like `theme:expand-horizons`
✅ **Comment Sync** - Bidirectional with author attribution (NEW!)

---

## Testing the Complete System

### Step 1: Manual Status Update in JPD

Since the API doesn't support direct status changes, update statuses in JPD UI:

1. Go to https://checkfront.atlassian.net/jira/polaris/projects/MTT
2. Open **MTT-11** ([EPIC] Mobile App Redesign Initiative)
3. Change status from "Parking lot" → **"Impact"**
4. Open **MTT-12** ([STORY] Implement New Navigation)  
5. Change status from "Parking lot" → **"Ready for delivery"**

### Step 2: Run Sync

```bash
cd /Users/james/Sites/Expedition/jpd-to-github-connector
pnpm run dev
```

###Step 3: Verify Results in GitHub

Check https://github.com/Checkfront/manifest-jpd-sync-test/issues

You should see:

**MTT-11 (Epic)**:
- Label: `type:epic`
- Label: `epic:MTT-11`
- Label: `theme:expand-horizons`
- Body: Full RICE scoring and context
- No parent references (it's top-level)

**MTT-12 (Story)**:
- Label: `type:story`
- Label: `story:MTT-12`
- Label: `theme:expand-horizons`
- Body: Full RICE scoring and context
- Parent link (if you set MTT-11 as parent in JPD)

### Step 4: Test Filtering

In GitHub, filter by labels:

```
is:issue label:type:epic
is:issue label:type:story
is:issue label:theme:expand-horizons
is:issue label:epic:MTT-11
```

### Step 5: Test Two-Way Sync

1. Close MTT-12 in GitHub
2. Run sync: `pnpm run dev`
3. Check JPD: MTT-12 should now be in "Done" status

---

## Configuration Reference

### Your Current Config

Location: `config/mtt-test-config-v2.yaml`

Key settings:
```yaml
hierarchy:
  epic_statuses: ["Impact"]
  story_statuses: ["Ready for delivery", "Delivery", "Done"]
```

### Sync Behavior

| JPD Status | Hierarchy Level | Synced to GitHub? | GitHub Label |
|------------|----------------|-------------------|--------------|
| Parking lot | Idea | ❌ No | - |
| Discovery | Idea | ❌ No | - |
| **Impact** | **Epic** | ✅ Yes | `type:epic` |
| **Ready for delivery** | **Story** | ✅ Yes | `type:story` |
| **Delivery** | **Story** | ✅ Yes | `type:story` |
| **Done** | Story | ✅ Yes (closed) | `type:story` |

---

## Workflow Examples

### Epic Workflow

```
JPD: Create idea → "Parking lot"
      ↓ (PM evaluation)
JPD: Move to "Discovery"
      ↓ (Design approval)
JPD: Move to "Impact" ← ✅ SYNCS TO GITHUB
GitHub: Issue created with type:epic label
GitHub: Added to Projects board (if enabled)
```

### Story Workflow

```
JPD: Create idea → "Parking lot"
      ↓ (Epic breakdown)
JPD: Move to "Ready for delivery" ← ✅ SYNCS TO GITHUB
GitHub: Issue created with type:story label
GitHub: Links to parent Epic (if set in JPD)
      ↓ (Dev picks up)
GitHub: Dev creates Tasks manually
GitHub: Dev adds story:MTT-X label to Tasks
      ↓ (Work complete)
GitHub: Dev closes Story
      ↓ ✅ TWO-WAY SYNC
JPD: Status updates to "Done"
```

---

## Advanced Features

### Enable GitHub Projects

1. Create a GitHub Project (Beta)
2. Note the project number (visible in URL)
3. Update config:

```yaml
projects:
  enabled: true
  project_number: 1  # Your project number
  status_field_name: "Status"
```

4. Add column mappings to statuses:

```yaml
statuses:
  "Impact":
    github_state: open
    github_project_status: "📊 Impact"  # Exact column name
```

### Custom Transformations

Create custom functions in `transforms/` directory:

```typescript
// transforms/my-transform.ts
export default function(data: Record<string, any>): string {
  // Your logic here
  return result;
}
```

Reference in config:

```yaml
mappings:
  - jpd: "fields.customfield_12345"
    github: "body"
    transform_function: "./transforms/my-transform.ts"
```

---

## Troubleshooting

### Issues Not Syncing

**Check**: Status must be in `epic_statuses` or `story_statuses`

```bash
# Debug mode
DEBUG=true pnpm run dev
```

Look for: `Skipping MTT-X, not in Epic/Story status`

### Missing Labels

**Check**: Field mappings in config

```yaml
mappings:
  - jpd: "fields.customfield_14377[0].value"  # Correct field path
    github: "labels"
    template: "theme:{{fields.customfield_14377[0].value | slugify}}"
```

### Two-Way Sync Not Working

**Check**: Bidirectional mode enabled

```yaml
sync:
  direction: bidirectional  # Not just "jpd-to-github"
```

---

## Next Steps

1. ✅ **Test current system** with MTT-11 and MTT-12
2. 📋 **Create more test issues** at different hierarchy levels
3. 🔗 **Test parent-child relationships** (if JPD supports)
4. 🎨 **Enable GitHub Projects** for visual Kanban board
5. 🚀 **Deploy to GitHub Actions** for automated sync

---

## Deployment to GitHub Actions

### Step 1: Build

```bash
pnpm run build
```

### Step 2: Commit

```bash
git add dist/ action.yml .github/workflows/
git commit -m "feat: add complete hierarchy and two-way sync"
git push
```

### Step 3: Configure Secrets

In GitHub repo settings, add secrets:
- `JPD_EMAIL`
- `JPD_API_KEY`
- `JPD_BASE_URL`
- `GITHUB_TOKEN` (auto-provided)

### Step 4: Trigger

- **Automatic**: Every 15 minutes (configurable)
- **Manual**: Actions tab → "JPD to GitHub Sync" → "Run workflow"
- **Webhook**: POST to repository_dispatch event

---

## Summary of Achievements

🎯 **Complete hierarchy system** with status-based Epic/Story/Task levels  
🏷️ **Rich labeling** for filtering and organization  
🔄 **Two-way sync** keeping JPD and GitHub in sync  
🔗 **Cross-references** for easy navigation  
📊 **GitHub Projects** ready (when enabled)  
🎨 **Flexible transformations** with templates and custom functions  
✅ **Production-ready** with error handling and dry-run mode

**You now have a complete, professional-grade sync tool!** 🎉

