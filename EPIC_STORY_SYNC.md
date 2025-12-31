# Epic + Story Sync Configuration Guide

**Added in v0.0.3** - Sync both Epics and Stories from JPD to GitHub as separate issues with proper hierarchy.

## Overview

This feature allows you to:
- Sync both Epics AND Stories to GitHub (not just one type)
- Use any JPD custom field to determine issue type (Bug/Epic/Story/etc)
- Automatically add `[EPIC]`/`[STORY]` prefixes to GitHub issue titles
- Link Stories to parent Epics via labels and body references
- Filter which issue types sync to GitHub

## Configuration

### 1. Identify Your JPD Fields

First, discover which custom fields exist in your JPD project:

```bash
pnpm run discover YOUR_PROJECT_KEY
```

Look for:
- **Category/Type field** - Field that stores "Epic", "Story", "Bug", etc.
- **Epic Link field** - Field that links Stories to their parent Epic
- **Parent Link field** - Generic parent-child relationship field (optional)

### 2. Configure Hierarchy in Your Config

Add these fields to your `gluecraft.yaml`:

```yaml
hierarchy:
  enabled: true
  
  # REQUIRED: Field that stores issue type (Epic/Story/Bug)
  category_field_id: "customfield_XXXXX"  # Replace with your field ID
  
  # OPTIONAL: Field that links Stories to Epics
  epic_link_field_id: "customfield_XXXXX"  # Replace with your field ID
  
  # OPTIONAL: Generic parent link field
  parent_link_field_id: "customfield_XXXXX"  # Replace with your field ID
  
  # REQUIRED: Which issue types to sync to GitHub
  sync_types: ["Epic", "Story", "Bug"]  # Customize to match your JPD values
  
  # Display options
  parent_field_in_body: true  # Include parent references in issue body
```

### 3. Map Category Field to GitHub Labels

This creates labels like `epic`, `story`, `bug`:

```yaml
mappings:
  # Category → GitHub labels
  - jpd: "fields.customfield_XXXXX.value"  # Your category field
    github: "labels"
    template: "{{fields.customfield_XXXXX.value | lowercase}}"
```

### 4. Map Epic Link to GitHub Labels (Optional)

This creates labels like `epic:epic-name` for Stories:

```yaml
mappings:
  # Epic Link → epic:name label
  - jpd: "fields.customfield_XXXXX"  # Your epic link field
    github: "labels"
    template: "epic:{{fields.customfield_XXXXX.fields.summary | slugify}}"
    condition: "fields.customfield_XXXXX != null"
```

### 5. Enable Field Validation (Recommended)

Validate that required fields exist before syncing:

```yaml
fields:
  - id: "customfield_XXXXX"
    name: "Category"  # Or "Type", "Issue Type", etc.
    type: "select"
    required: true
    description: "Issue type (Bug/Epic/Story)"

  - id: "customfield_XXXXX"
    name: "Epic Link"
    type: "select"
    required: false
    description: "Parent Epic for Stories"
```

## How It Works

### Automatic Title Prefixes

GlueCraft automatically adds prefixes based on the Category field value:

- JPD: "Mobile App Redesign" (Category = Epic)
- GitHub: `[EPIC] Mobile App Redesign`

- JPD: "Implement Navigation" (Category = Story)
- GitHub: `[STORY] Implement Navigation`

**No template needed** - this happens automatically when `category_field_id` is configured.

### Hierarchy Representation

**In JPD:**
```
Epic: Mobile App Redesign (MTT-100)
  ├─ Story: Implement Navigation (MTT-101)
  │    Epic Link → MTT-100
  └─ Story: Redesign Home Screen (MTT-102)
       Epic Link → MTT-100
```

**In GitHub:**
```
Issue #122: [EPIC] Mobile App Redesign
  Label: epic

Issue #123: [STORY] Implement Navigation
  Labels: story, epic:mobile-app-redesign
  Body: "Part of #122"

Issue #124: [STORY] Redesign Home Screen
  Labels: story, epic:mobile-app-redesign
  Body: "Part of #122"
```

### Enriched Transform Context

Transform functions receive enriched data:

```typescript
export function myTransform(jpdIssue: any): string {
  // Standard JPD fields
  const summary = jpdIssue.fields.summary;
  
  // Enriched fields (added by GlueCraft)
  const epicKey = jpdIssue._epic_link_key;  // JPD key of parent Epic
  const epicNumber = jpdIssue._epic_github_number;  // GitHub issue number of Epic
  
  if (epicNumber) {
    return `Part of #${epicNumber}: ${summary}`;
  }
  return summary;
}
```

## Complete Example Config

```yaml
sync:
  direction: bidirectional
  jql: 'project = MYPROJ'

hierarchy:
  enabled: true
  category_field_id: "customfield_14385"
  epic_link_field_id: "customfield_10008"
  sync_types: ["Epic", "Story", "Bug"]
  parent_field_in_body: true

mappings:
  # Title (prefix added automatically)
  - jpd: "fields.summary"
    github: "title"

  # Body
  - jpd: "fields.description"
    github: "body"

  # Category → type labels
  - jpd: "fields.customfield_14385.value"
    github: "labels"
    template: "{{fields.customfield_14385.value | lowercase}}"

  # Epic Link → epic:name label
  - jpd: "fields.customfield_10008"
    github: "labels"
    template: "epic:{{fields.customfield_10008.fields.summary | slugify}}"
    condition: "fields.customfield_10008 != null"

statuses:
  "Backlog":
    github_state: open
    sync: true
  "In Progress":
    github_state: open
    sync: true
  "Done":
    github_state: closed
    sync: true

fields:
  - id: "customfield_14385"
    name: "Category"
    type: "select"
    required: true
  - id: "customfield_10008"
    name: "Epic Link"
    type: "select"
    required: false

labels:
  hierarchy:
    - name: "epic"
      color: "0052CC"
    - name: "story"
      color: "2684FF"
    - name: "bug"
      color: "DE350B"
```

## Customization for Your Team

### Different Category Values

If your JPD uses different values (e.g., "Feature" instead of "Story"):

```yaml
hierarchy:
  sync_types: ["Epic", "Feature", "Bug", "Technical Debt"]
```

The prefixes will automatically match: `[FEATURE]`, `[TECHNICAL DEBT]`, etc.

### No Epic Link Field

If you don't use Epic Links, omit `epic_link_field_id`:

```yaml
hierarchy:
  enabled: true
  category_field_id: "customfield_XXXXX"
  sync_types: ["Epic", "Story", "Bug"]
  # No epic_link_field_id - Stories won't have epic:* labels
```

### Custom Label Format

Change how Epic names appear in labels:

```yaml
mappings:
  - jpd: "fields.customfield_10008"
    github: "labels"
    template: "parent-epic:{{fields.customfield_10008.key | lowercase}}"
    condition: "fields.customfield_10008 != null"
```

Result: `parent-epic:mtt-100` instead of `epic:mobile-app-redesign`

### Disable Title Prefixes

If you don't want `[EPIC]`/`[STORY]` prefixes:

```yaml
mappings:
  # Override title mapping to prevent automatic prefix
  - jpd: "fields.summary"
    github: "title"
    template: "{{fields.summary}}"  # Explicit template = no auto-prefix
```

## Migration from Status-Based Sync

**Old approach:** Sync based on JPD status names
```yaml
hierarchy:
  epic_statuses: ["Impact"]
  story_statuses: ["Ready for delivery"]
```

**New approach:** Sync based on Category field
```yaml
hierarchy:
  category_field_id: "customfield_14385"
  sync_types: ["Epic", "Story"]
```

**Advantages:**
- More explicit and queryable in JPD
- Works regardless of status
- Can sync issues in any status (e.g., "Backlog", "In Progress", "Done")
- PMs can easily filter by Category field in JPD

## Troubleshooting

### Issue Skipped: "not in sync_types"

Check:
1. Is `category_field_id` correct? Run `pnpm run discover PROJECT_KEY`
2. Is the Category field populated on the issue?
3. Does the value match exactly? (case-sensitive: "Epic" ≠ "epic")
4. Is the value in your `sync_types` array?

### No Epic Label on Stories

Check:
1. Is `epic_link_field_id` configured?
2. Is the Epic Link field populated on the Story?
3. Is the parent Epic already synced to GitHub?
4. Check the mapping includes `condition: "fields.customfield_XXXXX != null"`

### No [EPIC]/[STORY] Prefix

Check:
1. Is `category_field_id` configured in hierarchy section?
2. Did you override the title mapping with an explicit template?
3. Is the Category field populated?

## See Also

- [Main Configuration Guide](./CONFIG_GUIDE.md)
- [Transform Functions](./TRANSFORMS.md)
- [Field Discovery](./CLI_GUIDE.md#discover)

