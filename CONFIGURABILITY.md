# Configurability Guide

GlueCraft is designed to be **fully configurable** and adapt to any JPD project structure without hardcoding workflows.

## Design Principles

1. **No Hardcoded Field IDs** - All JPD custom field IDs are configurable
2. **No Hardcoded Values** - Category values, status names, and labels are all configurable
3. **Flexible Sync Rules** - Choose what syncs based on field values, not statuses
4. **Extensible** - Write custom transform functions for complex logic

## Configuration Layers

### Layer 1: Core Configuration (Required)

The `gluecraft.yaml` file controls all sync behavior:

```yaml
sync:
  direction: bidirectional
  jql: 'project = YOUR_KEY'  # Any valid JQL query

hierarchy:
  category_field_id: "customfield_XXXXX"  # Your field ID
  epic_link_field_id: "customfield_XXXXX"  # Your field ID
  sync_types: ["Epic", "Story", "Bug"]     # Your values
```

**Nothing is hardcoded** - every field ID and value is configurable.

### Layer 2: Environment Variables (Optional)

Pass runtime configuration via environment variables:

```yaml
env:
  JPD_BASE_URL: ${{ secrets.JPD_BASE_URL }}
  JPD_EMAIL: ${{ secrets.JPD_EMAIL }}
  JPD_API_KEY: ${{ secrets.JPD_API_KEY }}
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  
  # Optional: Override default field IDs
  EPIC_LINK_FIELD_ID: "customfield_10008"
  THEME_FIELD_ID: "customfield_14377"
  PRIORITY_FIELD_ID: "customfield_14425"
```

**Use case:** Share transform functions across projects with different field IDs.

### Layer 3: Custom Transform Functions (Advanced)

Write TypeScript functions for complex field mapping:

```typescript
// transforms/my-custom-logic.ts
export function myTransform(jpdIssue: any): string {
  const fieldId = process.env.MY_FIELD_ID || 'customfield_14385';
  const value = jpdIssue.fields[fieldId];
  
  // Your custom logic here
  return processedValue;
}
```

**Use case:** Complex business logic, conditional formatting, computed values.

## Common Customization Scenarios

### Different JPD Field Structure

**Your JPD uses:**
- "Type" instead of "Category"
- "Parent Epic" instead of "Epic Link"
- "Importance" instead of "Priority"

**Solution:** Just change the field IDs in config:

```yaml
hierarchy:
  category_field_id: "customfield_11111"  # Your "Type" field
  epic_link_field_id: "customfield_22222"  # Your "Parent Epic" field

mappings:
  - jpd: "fields.customfield_11111.value"  # Type
    github: "labels"
    template: "{{fields.customfield_11111.value | lowercase}}"
  
  - jpd: "fields.customfield_33333.value"  # Importance
    github: "labels"
    template: "priority:{{fields.customfield_33333.value | lowercase}}"
```

### Different Category Values

**Your JPD uses:**
- "Feature" instead of "Story"
- "Technical Debt" as a category
- "Spike" for research work

**Solution:** Customize `sync_types`:

```yaml
hierarchy:
  sync_types: ["Epic", "Feature", "Bug", "Technical Debt", "Spike"]
```

**Result:**
- Title prefixes: `[FEATURE]`, `[TECHNICAL DEBT]`, `[SPIKE]`
- Labels: `feature`, `technical-debt`, `spike`

### No Epic Link Field

**Your JPD doesn't use Epic Links**

**Solution:** Omit `epic_link_field_id`:

```yaml
hierarchy:
  category_field_id: "customfield_14385"
  # No epic_link_field_id
  sync_types: ["Epic", "Story", "Bug"]
```

**Result:** Stories sync without `epic:*` labels.

### Flat Structure (No Hierarchy)

**Your JPD doesn't use hierarchy at all**

**Solution:** Disable hierarchy or use minimal config:

```yaml
hierarchy:
  enabled: false

# Or just use for filtering:
hierarchy:
  category_field_id: "customfield_14385"
  sync_types: ["Story", "Bug"]  # No Epics
```

### Different Status Workflow

**Your JPD uses:**
- "New" → "Analyzing" → "Approved" → "Building" → "Shipped"

**Solution:** Map your statuses:

```yaml
statuses:
  "New":
    sync: false  # Don't sync yet
  
  "Analyzing":
    sync: false  # Still in discovery
  
  "Approved":
    github_state: open
    sync: true  # Start syncing here
  
  "Building":
    github_state: open
    sync: true
  
  "Shipped":
    github_state: closed
    sync: true
```

### Multiple Projects with Different Structures

**You have multiple JPD projects with different field IDs**

**Solution 1:** Separate config files

```
configs/
  ├─ project-a.yaml
  ├─ project-b.yaml
  └─ project-c.yaml
```

Each with their own field IDs.

**Solution 2:** Shared transform functions + environment variables

```typescript
// Shared transform function
export function buildBody(jpdIssue: any): string {
  const epicFieldId = process.env.EPIC_LINK_FIELD_ID;
  const themeFieldId = process.env.THEME_FIELD_ID;
  
  // Use environment-configured field IDs
  const epic = jpdIssue.fields[epicFieldId];
  const theme = jpdIssue.fields[themeFieldId];
  
  // ... logic
}
```

```yaml
# workflow-project-a.yml
env:
  EPIC_LINK_FIELD_ID: "customfield_10008"
  THEME_FIELD_ID: "customfield_14377"

# workflow-project-b.yml
env:
  EPIC_LINK_FIELD_ID: "customfield_20001"
  THEME_FIELD_ID: "customfield_20050"
```

## Template System

The template system provides filters for transforming values:

### Available Filters

- `lowercase` - Convert to lowercase
- `uppercase` - Convert to uppercase
- `slugify` - Convert to URL-friendly slug
- `join` - Join array elements

### Examples

```yaml
# Lowercase category for label
template: "{{fields.customfield_14385.value | lowercase}}"
# "Epic" → "epic"

# Slugify epic name for label
template: "epic:{{fields.customfield_10008.fields.summary | slugify}}"
# "Mobile App Redesign" → "epic:mobile-app-redesign"

# Join array values
template: "{{fields.customfield_14377 | join ', '}}"
# ["Theme A", "Theme B"] → "Theme A, Theme B"
```

## Validation & Error Handling

### Field Validation

Validate fields exist before syncing:

```yaml
fields:
  - id: "customfield_14385"
    name: "Category"
    type: "select"
    required: true  # Sync will fail if missing
    description: "Issue type"

  - id: "customfield_10008"
    name: "Epic Link"
    type: "select"
    required: false  # Optional field
    description: "Parent Epic"
```

**Result:** Clear error messages if fields don't exist or have wrong types.

### Conditional Mappings

Only map fields when they have values:

```yaml
- jpd: "fields.customfield_10008"
  github: "labels"
  template: "epic:{{fields.customfield_10008.fields.summary | slugify}}"
  condition: "fields.customfield_10008 != null"  # Only if Epic Link is set
```

## Discovery & Introspection

Use the `discover` command to find field IDs:

```bash
pnpm run discover YOUR_PROJECT_KEY
```

Output shows:
- Field names (human-readable)
- Field IDs (customfield_XXXXX)
- Field types (select, text, number, etc.)
- Sample values from actual issues

**Use this to configure your project without guessing field IDs.**

## Anti-Patterns to Avoid

### ❌ Don't Hardcode Field IDs in Transform Functions

```typescript
// BAD: Hardcoded field ID
const epic = jpdIssue.fields.customfield_10008;
```

```typescript
// GOOD: Configurable via environment
const epicFieldId = process.env.EPIC_LINK_FIELD_ID || 'customfield_10008';
const epic = jpdIssue.fields[epicFieldId];
```

### ❌ Don't Assume Field Values

```typescript
// BAD: Assumes "Epic" is the value
if (category === "Epic") { ... }
```

```typescript
// GOOD: Use configured sync_types
const syncTypes = config.hierarchy?.sync_types || [];
if (syncTypes.includes(category)) { ... }
```

### ❌ Don't Use Status Names for Filtering

```yaml
# BAD: Hardcodes status logic
hierarchy:
  epic_statuses: ["Impact"]
  story_statuses: ["Ready for delivery"]
```

```yaml
# GOOD: Use field values
hierarchy:
  category_field_id: "customfield_14385"
  sync_types: ["Epic", "Story"]
```

## Best Practices

1. **Start with the template** - Use `examples/epic-story-sync.yaml` as a starting point
2. **Run discover first** - Always use `pnpm run discover` to find field IDs
3. **Validate early** - Use field validation to catch errors before sync
4. **Test with dry-run** - Use `--dry-run` flag to preview changes
5. **Document your config** - Add comments explaining project-specific choices
6. **Version your config** - Keep config in git to track changes
7. **Share transform functions** - Use environment variables for reusability

## Examples

See `examples/` directory for complete configurations:
- `examples/epic-story-sync.yaml` - Generic template (start here)
- `examples/mtt/` - Real-world MTT project configuration
- `examples/flat-structure.yaml` - No hierarchy example
- `examples/multi-project/` - Multiple projects with shared functions

## Support

If you need to sync something that's not configurable:
1. Check this guide first
2. Try using a custom transform function
3. Open an issue on GitHub with your use case
4. We'll make it configurable if it makes sense for others

