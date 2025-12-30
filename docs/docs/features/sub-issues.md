# Native GitHub Sub-Issues

**Gluecraft JPD** supports **native GitHub sub-issues** for managing Epic → Story → Task hierarchies.

## Overview

### What Are Sub-Issues?

Sub-issues are real GitHub issues with parent-child relationships. They:
- Appear as separate cards on GitHub Projects boards
- Support automatic progress tracking
- Use GitHub's task list syntax for visibility
- Maintain bidirectional sync with JPD

### Key Features (v2.0)

- ✅ **Native GitHub Sub-Issues** - Real parent-child relationships
- ✅ **Automatic Task Lists** - Progress tracking with checkboxes
- ✅ **Checkbox State Preservation** - State persists across updates
- ✅ **Late Parent Linking** - Existing issues can be linked to parents
- ✅ **Depth Validation** - Prevents exceeding GitHub's 8-level limit
- ✅ **Config Control** - `hierarchy.enabled` flag to disable if not needed

## How It Works

### JPD → GitHub

When syncing a JPD issue with a parent:
1. Connector detects parent-child relationship via JPD's `issuelinks` API
2. Creates child issue as a GitHub sub-issue
3. Adds child to parent's task list: `- [ ] #123`
4. Adds parent reference to child's body

### GitHub → JPD

When creating a JPD issue from a GitHub sub-issue:
1. Connector detects parent reference in GitHub issue
2. Creates issue in JPD
3. Uses JPD's `issuelinks` API to establish parent-child relationship

## Visualizing Hierarchy

### Task Lists

Subtasks appear in the parent issue as interactive checkboxes:

```markdown
## 📋 Subtasks
- [x] #11 ([MTT-101](https://jpd.../MTT-101)) ✅
- [ ] #12 ([MTT-102](https://jpd.../MTT-102))
- [ ] #13 ([MTT-103](https://jpd.../MTT-103))
```

**Progress:** 1/3 tasks complete

### Parent References

Child issues show their parent:

```markdown
## 🔗 Parent
- GitHub: #10
- JPD: [MTT-100](https://jpd.../MTT-100)
```

## Configuration

### Enable/Disable Hierarchy

```yaml
hierarchy:
  enabled: true  # Enable hierarchy tracking (default: true)
  parent_field_in_body: true
  use_github_parent_issue: true
```

### Hierarchy by Status

Define which JPD statuses represent different hierarchy levels:

```yaml
hierarchy:
  enabled: true
  epic_statuses:
    - "Epic"
    - "Initiative"
  story_statuses:
    - "Story"
    - "Feature"
  task_statuses:
    - "Task"
    - "Subtask"
```

## Examples

### Creating a Hierarchy

**In JPD:**
```
MTT-100 (Epic) - "Payment Gateway"
├── MTT-101 (Story) - "Stripe Integration"
│   ├── MTT-102 (Task) - "Add Stripe SDK"
│   └── MTT-103 (Task) - "Implement webhook"
└── MTT-104 (Story) - "PayPal Integration"
```

**After Sync:**

**GitHub Issue #10** (Epic):
```markdown
## 📋 Subtasks
- [ ] #11 ([MTT-101](...)) - Stripe Integration
- [ ] #14 ([MTT-104](...)) - PayPal Integration
```

**GitHub Issue #11** (Story):
```markdown
## 🔗 Parent
- GitHub: #10
- JPD: [MTT-100](...)

## 📋 Subtasks
- [ ] #12 ([MTT-102](...)) - Add Stripe SDK
- [ ] #13 ([MTT-103](...)) - Implement webhook
```

### Progress Tracking

When a developer closes Task #12:
1. Issue #12 state changes to `closed`
2. Connector detects the change
3. Parent #11's task list updates: `- [x] #12 ✅`
4. GitHub shows: "1 of 2 sub-issues closed"

### Late Parent Linking

Scenario: Issue exists before parent relationship is added.

**Steps:**
1. Issue MTT-101 exists in GitHub as #11
2. In JPD, MTT-101 is linked to parent MTT-100
3. MTT-100 syncs to GitHub as #10
4. ✅ Connector automatically adds #11 to #10's task list

## GitHub Projects Integration

### Filtering

GitHub Projects can filter by:
- **Status** - `is:open`, `is:closed`
- **Labels** - `label:epic`, `label:story`
- **Assignee** - `assignee:@username`
- **Parent** - Issues with/without subtasks

### Boards

Sub-issues appear as:
- **Separate cards** on the board
- **Progress indicators** on parent cards
- **Linked cards** when clicking parent references

### Automation

GitHub Projects can automatically:
- Move parent when all sub-issues close
- Set parent status based on sub-issue states
- Update fields when sub-issues change

## Depth Limits

GitHub supports up to **8 levels** of nesting:

```
Epic (level 1)
└── Story (level 2)
    └── Task (level 3)
        └── Subtask (level 4)
            └── ... (levels 5-7)
                └── Issue at level 8 ✅
```

**When limit reached:**
```
⚠️  Cannot create sub-issue of #10: depth limit reached (8 levels, max 8)
✅  Creating as regular issue instead
```

The connector:
- Validates depth before creating sub-issues
- Detects circular references
- Provides clear warning messages
- Falls back to regular issues gracefully

## Known Limitations

These are acceptable edge cases that can be addressed in future releases:

1. **Manual Task Lists** - Task lists manually created in GitHub are not detected
2. **GitHub Projects "Parent issue" field** - Not set (uses task lists instead)
3. **Orphaned Sub-Issues** - Manual cleanup required if parent deleted

All core functionality works perfectly. These are rare edge cases.

## Troubleshooting

### Sub-Issue Not Created

**Possible causes:**
- Depth limit reached (8 levels)
- Hierarchy disabled in config
- Parent issue not yet synced

**Solution:**
```yaml
# Check config
hierarchy:
  enabled: true  # Must be true
```

### Checkbox Not Updating

**Possible causes:**
- Task list item format incorrect
- Child issue number missing

**Solution:**
- Ensure task list format: `- [ ] #123`
- Run sync to regenerate task lists

### Parent Reference Missing

**Possible causes:**
- JPD parent link not established
- Issue synced before parent

**Solution:**
- Link issues in JPD first
- Run sync again to update references

## See Also

- [Configuration Guide](../configuration/sync-config) - Configure hierarchy behavior
- [CLI Guide](../cli) - Run sync commands
- [Testing Guide](../guides/testing) - Test hierarchy features

