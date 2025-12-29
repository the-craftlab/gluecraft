# Clean Label Architecture

## 🎯 Philosophy

**Labels are for HUMANS, metadata is for MACHINES.**

Labels should help developers filter and organize work, not store system IDs and technical metadata.

---

## ✅ **New Label Strategy**

### Before (Machine-Focused - BAD)
```
Issue #11 Labels:
  type:epic              ❌ Redundant prefix
  epic:MTT-11            ❌ Machine ID (useless for filtering)
  jpd-synced:MTT-11      ❌ Sync metadata in label
  theme:expand-horizons  ❌ Unnecessary prefix
  category:sample-ideas  ❌ Unnecessary prefix
  priority:now           ❌ Unnecessary prefix
```

### After (Human-Focused - GOOD)
```
Issue #11 Labels:
  epic                   ✅ Simple type indicator
  expand-horizons        ✅ Clean theme
  sample-ideas          ✅ Clean category
  now                   ✅ Clean priority
  jpd-synced            ✅ Simple sync marker (no ID)
```

---

## 🏗️ **Where Machine Data Lives Now**

### 1. **Hidden HTML Comment** (Primary)

All machine metadata stored in hidden comment at end of issue body:

```html
<!-- jpd-sync:{
  "jpd_id": "MTT-11",
  "hierarchy": "epic",
  "parent_jpd_id": "MTT-10",
  "parent_github_issue": 10,
  "child_jpd_ids": ["MTT-12", "MTT-13"],
  "jpd_updated": "2025-12-24T05:00:00Z",
  "last_sync": "2025-12-24T05:17:00Z",
  "sync_hash": "abc123...",
  "original_link": "https://checkfront.atlassian.net/browse/MTT-11"
}-->
```

**Invisible to users, perfect for machines!**

### 2. **Issue Body** (Human-Readable Cross-References)

Relationship links in formatted markdown:

```markdown
## 🔗 Parent
- GitHub: #10
- JPD: [MTT-10](https://checkfront.atlassian.net/browse/MTT-10)

## 📋 Child Stories
- [ ] #12 Mobile UI implementation
- [ ] #13 Backend API updates

## 🔗 This Issue
- JPD: [MTT-11](https://checkfront.atlassian.net/browse/MTT-11)
```

**Human-readable, clickable links!**

### 3. **GitHub Relationships** (Future)

Task lists for hierarchy visualization:
- Checkboxes in Epic bodies
- "Closes #X" in PRs
- Blocking relationships

---

## 📊 **Label Categories**

### Type Labels (Simple)
```
epic          # High-level initiative
story         # User story
bug           # Bug fix
enhancement   # Feature enhancement
```

### Theme/Feature Labels (Clean Values)
```
expand-horizons
mobile
api-v2
authentication
```

### Category Labels (Clean Values)
```
sample-ideas
customer-requests
technical-debt
```

### Priority Labels (Clean Values)
```
critical
high
medium
low
now
later
next-up
```

### Status Flags (Actionable)
```
needs-design
needs-architecture
breaking-change
blocked
ready-for-qa
```

### System Labels (Minimal)
```
jpd-synced    # Marks issue as synced (no ID!)
```

---

## 🔍 **How Filtering Works**

### By Type
```
label:epic
label:story
label:bug
```

### By Theme
```
label:expand-horizons
label:mobile
```

### By Priority
```
label:critical
label:now
```

### Combined
```
label:epic label:expand-horizons label:critical
```

**Clean, scannable, useful!**

---

## 🛠️ **Configuration Example**

```yaml
mappings:
  # Clean labels - no prefixes
  - jpd: "fields.customfield_14377[0].value"  # Theme
    github: "labels"
    template: "{{fields.customfield_14377[0].value | slugify}}"
    # Result: "expand-horizons" not "theme:expand-horizons"

  - jpd: "fields.customfield_14385.value"     # Category
    github: "labels"
    template: "{{fields.customfield_14385.value | slugify}}"
    # Result: "sample-ideas" not "category:sample-ideas"

  - jpd: "fields.customfield_14378.value"     # Priority
    github: "labels"
    template: "{{fields.customfield_14378.value | slugify}}"
    # Result: "now" not "priority:now"
```

---

## 🔄 **How Sync Tracking Works**

### Finding Synced Issues
1. Search GitHub for label:`jpd-synced`
2. Fetch issue body
3. Parse hidden metadata comment
4. Extract JPD ID, parent, children, etc.

### Creating/Updating Issues
1. Transform JPD fields to clean labels
2. Generate relationship markdown for body
3. Inject hidden metadata at end of body
4. Add simple `jpd-synced` label

### Deduplication
1. Parse hidden metadata from existing issue
2. Check `sync_hash` to detect changes
3. Skip if unchanged

---

## 📈 **Benefits**

### For Developers
✅ **Clean labels** - Easy to scan and filter  
✅ **No noise** - No machine IDs cluttering the view  
✅ **GitHub-native** - Works with built-in filtering  
✅ **Discoverable** - Labels make sense without documentation  

### For System
✅ **Complete metadata** - All tracking data preserved  
✅ **Bidirectional** - Full hierarchy info for reverse sync  
✅ **Extensible** - Easy to add more metadata fields  
✅ **Hidden** - Metadata invisible to end users  

### For PMs
✅ **Cross-references** - Clear links between systems  
✅ **Hierarchy visible** - Task lists show parent-child  
✅ **Clean interface** - GitHub looks professional  

---

## 🧪 **Example: Epic Issue**

```markdown
Title: [EPIC] Mobile App Redesign Initiative

Labels: 
  epic, expand-horizons, sample-ideas, critical, mobile

Body:
## Context from Product
**Theme**: Expand horizons  
**Category**: Sample ideas  
**Roadmap**: Now

### Scoring (RICE)
- **Reach**: 10
- **Impact**: 10
- **Confidence**: 90%
- **Effort**: 8 points
- **Value**: 9

## 📋 Child Stories (2 total, 0 complete)
- [ ] #12 Mobile UI implementation
- [ ] #13 Backend API updates

## 🔗 This Epic
- JPD: [MTT-11](https://checkfront.atlassian.net/browse/MTT-11)

<!-- jpd-sync:{"jpd_id":"MTT-11","hierarchy":"epic","child_jpd_ids":["MTT-12","MTT-13"],...}-->
```

**Clean, professional, useful!**

---

## 🎯 **Migration from Old Labels**

If you have existing issues with old-style labels:

1. **Run sync** - It will update with new clean labels
2. **Old issues** - Will get updated automatically
3. **Manual cleanup** - Optionally remove old labels from existing issues

The hidden metadata ensures no data is lost during migration!

---

## 🚀 **Summary**

**Before**: Labels were polluted with machine IDs and prefixes  
**After**: Labels are clean, human-focused, useful for filtering  

**Machine data moved to**: Hidden metadata + formatted body  
**Result**: Professional, usable GitHub issues that PMs and Devs both love!

---

**Updated**: December 24, 2025  
**Architecture Version**: 2.0 - Clean Labels

