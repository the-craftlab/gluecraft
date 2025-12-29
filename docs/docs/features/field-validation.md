# JPD Field Validation

## Overview

The sync tool automatically validates that all required JPD custom fields exist and have the correct types before starting the sync process. This prevents sync failures and provides clear, actionable error messages when fields are missing or misconfigured.

## Features

✅ **Pre-Sync Validation** - Validates fields before any sync operations  
✅ **Type Checking** - Ensures fields have the expected data types  
✅ **Required vs Optional** - Distinguishes between required and optional fields  
✅ **Helpful Error Reports** - Provides clear instructions on how to fix issues  
✅ **Automatic Detection** - Extracts project key from JQL automatically  

## Configuration

### Defining Fields

Add a `fields` section to your config file:

```yaml
fields:
  # Example: Required numeric field
  - id: "customfield_10001"
    name: "Impact Score"
    type: "number"
    required: true
    description: "RICE Impact score (0-10)"
  
  # Example: Optional text field
  - id: "customfield_10002"
    name: "Notes"
    type: "text"
    required: false
    description: "Additional notes"
  
  # Example: Multi-select field
  - id: "customfield_10003"
    name: "Product Themes"
    type: "multiselect"
    required: true
    description: "Strategic product themes"
```

### Field Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | ✅ | JPD custom field ID (e.g., `customfield_14377`) |
| `name` | string | ✅ | Human-readable field name |
| `type` | FieldType | ✅ | Expected field type (see below) |
| `required` | boolean | ✅ | Whether field is required for sync |
| `description` | string | ❌ | Brief description (for documentation) |
| `searcherKey` | string | ❌ | Jira searcher key (for future API creation) |

### Supported Field Types

| Type | Description | JPD Examples |
|------|-------------|--------------|
| `string` | Single-line text | Short text fields |
| `text` | Multi-line text | Long descriptions |
| `number` | Numeric values | RICE scores, estimates |
| `select` | Single-select dropdown | Priority, Status |
| `multiselect` | Multi-select dropdown | Themes, Tags |
| `user` | User picker | Assignee, Reporter |
| `date` | Date picker | Due date |
| `datetime` | Date-time picker | Timestamps |
| `url` | URL field | Links, references |
| `array` | Array/list | Generic arrays |

## How It Works

### 1. **Automatic Project Detection**

The validator extracts the project key from your JQL:

```yaml
sync:
  jql: "project = YOUR_PROJECT"  # Automatically detects "YOUR_PROJECT"
```

Or from environment variable:

```bash
JPD_PROJECT_KEY=YOUR_PROJECT
```

### 2. **Sample Issue Validation**

The validator fetches one issue from the project and checks all configured fields:

- ✅ Field exists
- ✅ Field has correct type
- ✅ Required fields are not null

### 3. **Type Compatibility**

The validator understands JPD's field structures:

```javascript
// Single-select field
{ value: "High Priority" } → type: "select"

// Multi-select field
[{ value: "Theme A" }, { value: "Theme B" }] → type: "multiselect"

// Number field
42 → type: "number"
```

## Validation Results

### Success ✅

```
[INFO] Validating 9 JPD custom fields...
[INFO] ✅ All 8 required fields validated successfully
[WARN] Optional field "Notes" (customfield_14388) is null.
[INFO] Syncing JPD -> GitHub
```

### Failure ❌

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║           ❌ JPD FIELD VALIDATION FAILED ❌                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

🚫 ERRORS:
─────────────────────────────────────────────────────────────

❌ Impact Score (customfield_10001)
   Required field "Impact Score" (customfield_10001) not found in JPD project.

   💡 How to fix:
   1. Go to JPD Project Settings
   2. Create custom field: "Impact Score"
   3. Type: number
   4. Add to project screens

─────────────────────────────────────────────────────────────
Sync cannot continue until all required fields are available.
─────────────────────────────────────────────────────────────
```

## Discovering Field IDs

To find JPD custom field IDs, use the JPD API or debug logging:

```bash
# Enable debug mode
DEBUG=1 pnpm run dev -- --dry-run
```

Look for output like:

```
[DEBUG] Processing PROJ-1. Available fields: customfield_12345, customfield_67890, ...
```

Or use `curl`:

```bash
curl -u "your-email:your-api-token" \
  "https://your-instance.atlassian.net/rest/api/3/issue/PROJ-1" \
  | jq '.fields | keys'
```

## Best Practices

### 1. **Start with Required Fields Only**

```yaml
fields:
  # Only validate fields you actually use in mappings
  - id: "customfield_14377"
    name: "Theme"
    type: "multiselect"
    required: true
```

### 2. **Mark Optional Fields Appropriately**

```yaml
fields:
  # Optional fields won't fail sync if null
  - id: "customfield_14388"
    name: "Notes"
    type: "text"
    required: false  # ← Won't block sync if empty
```

### 3. **Validate Before Production**

```bash
# Test validation without making changes
pnpm run dev -- --dry-run
```

### 4. **Document Your Fields**

```yaml
fields:
  - id: "customfield_14376"
    name: "Impact"
    type: "number"
    required: true
    description: "RICE Impact score - How many people affected?"
```

## Disabling Validation

If you don't want field validation, simply omit the `fields` section:

```yaml
sync:
  direction: bidirectional
  jql: "project = MTT"

mappings:
  - jpd: "fields.summary"
    github: "title"

# No fields section = no validation
```

## Troubleshooting

### "No issues found in project"

**Cause**: Project is empty or JQL is incorrect  
**Fix**: Create at least one issue in the project

### "Field has type 'null' but expected 'text'"

**Cause**: Field exists but is empty on the sample issue  
**Fix**: Either:
- Populate the field on at least one issue
- Mark the field as `required: false`

### "Could not determine project key"

**Cause**: JQL doesn't include `project = X` clause  
**Fix**: Add project key to JQL or set `JPD_PROJECT_KEY` env var

## Future Enhancements

🚧 **Automatic Field Creation** (requires admin permissions)  
🚧 **Field Value Validation** (ranges, patterns, etc.)  
🚧 **Custom Validation Rules** (via functions)  
🚧 **Bulk Field Discovery** (scan all issues)  

## Example: Complete Config

```yaml
sync:
  direction: bidirectional
  jql: "project = MTT"

mappings:
  - jpd: "fields.summary"
    github: "title"
  
  - jpd: "fields.customfield_14377[0].value"
    github: "labels"
    template: "{{fields.customfield_14377[0].value | slugify}}"

fields:
  # Core RICE fields
  - id: "customfield_14377"
    name: "Theme"
    type: "multiselect"
    required: true
    description: "Product theme"
  
  - id: "customfield_14376"
    name: "Impact"
    type: "number"
    required: true
    description: "RICE Impact (0-10)"
  
  - id: "customfield_14379"
    name: "Reach"
    type: "number"
    required: true
    description: "RICE Reach (users/quarter)"
  
  - id: "customfield_14388"
    name: "Notes"
    type: "text"
    required: false
    description: "Optional notes"
```

## See Also

- [Configuration Guide](README.md#configuration)
- [Custom Fields Mapping](TESTING_GUIDE.md#field-mapping)
- [Troubleshooting](TESTING_GUIDE.md#troubleshooting)

