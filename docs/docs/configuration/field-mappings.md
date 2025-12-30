# Field Mappings

Field mappings define how JPD custom fields translate to GitHub issue properties and labels. This is the heart of the sync configuration.

## Understanding Field Mappings

Field mappings consist of two parts:

1. **Field Definitions** - Declare which JPD fields exist and their types
2. **Field Mappings** - Define how those fields map to GitHub

## Field Definitions

Define JPD custom fields in the `fields` section:

```yaml
fields:
  priority:
    field_id: "customfield_10001"  # JPD internal field ID
    field_type: "select"            # Field data type
    required: false                 # Whether field must have a value
    
  impact_score:
    field_id: "customfield_10002"
    field_type: "number"
    required: false
```

### Field Properties

**field_id** (required)
- JPD's internal field identifier
- Find with: `pnpm run discover-fields YOUR_PROJECT`
- Format: `customfield_XXXXX`

**field_type** (required)
- The data type of the field
- Valid types: `select`, `multiselect`, `number`, `text`, `user`, `array`, `date`

**required** (optional)
- Whether the field must have a value
- Defaults to `false`
- If `true`, sync fails if field is empty

## Basic Field Mapping

Map fields using the `mappings` section:

```yaml
mappings:
  # Map issue title
  - jpd: "fields.summary"
    github: "title"
```

### Mapping Properties

**jpd** (required)
- Path to the JPD field value
- Use dot notation: `fields.fieldname.value`
- Access nested properties: `fields.priority.value`

**github** (required)
- Target GitHub property
- Options: `title`, `body`, `labels`

## Mapping to Different GitHub Properties

### Map to Title

```yaml
mappings:
  - jpd: "fields.summary"
    github: "title"
    template: "[{{fields.project.key}}-{{fields.id | idonly}}] {{fields.summary}}"
```

**Result:**
```
[MTT-123] Implement new navigation system
```

### Map to Labels

```yaml
mappings:
  - jpd: "fields.customfield_10001.value"  # Priority field
    github: "labels"
    template: "priority:{{fields.customfield_10001.value | lowercase}}"
```

**Result:**
```
Labels: priority:high, priority:critical
```

### Map to Issue Body

```yaml
mappings:
  - jpd: "fields.customfield_10002"  # Impact score
    github: "body"
    template: |
      **Customer Impact:** {{fields.customfield_10002}}/10
      
      **Description:**
      {{fields.description}}
```

**Result:**
```markdown
**Customer Impact:** 8/10

**Description:**
Customers are requesting this feature...
```

## Templates

Templates use Handlebars-like syntax for dynamic content:

### Basic Variable Substitution

```yaml
template: "{{fields.summary}}"
```

### Accessing Nested Fields

```yaml
# Select field with value property
template: "{{fields.priority.value}}"

# Array field (first element)
template: "{{fields.customfield_10001[0].value}}"

# User field
template: "{{fields.assignee.displayName}}"
```

### Project and Issue Metadata

```yaml
template: "[{{fields.project.key}}-{{fields.id | idonly}}] {{fields.summary}}"
```

Available metadata:
- `fields.project.key` - Project key (e.g., `MTT`)
- `fields.id` - Full issue ID (e.g., `MTT-123` or just `123`)
- `fields.summary` - Issue title
- `fields.status.name` - Current status

## Template Filters

Filters transform values in templates:

### lowercase

Convert to lowercase:

```yaml
template: "priority:{{fields.priority.value | lowercase}}"
```

**Input:** `High`  
**Output:** `priority:high`

### uppercase

Convert to uppercase:

```yaml
template: "SEVERITY:{{fields.severity.value | uppercase}}"
```

**Input:** `critical`  
**Output:** `SEVERITY:CRITICAL`

### slugify

Convert to URL-safe slug:

```yaml
template: "theme:{{fields.customfield_10001[0].value | slugify}}"
```

**Input:** `Expand Horizons`  
**Output:** `theme:expand-horizons`

**Slugify rules:**
- Converts to lowercase
- Replaces spaces with hyphens
- Removes special characters
- Safe for labels and URLs

### idonly

Extract numeric ID from issue key:

```yaml
template: "JPD-{{fields.id | idonly}}"
```

**Input:** `MTT-123`  
**Output:** `JPD-123`

**Input:** `123` (if just the number)  
**Output:** `JPD-123`

## Advanced Field Mappings

### Conditional Content

Skip empty fields using conditional logic:

```yaml
mappings:
  - jpd: "fields.customfield_10001"
    github: "body"
    template: |
      {{#if fields.customfield_10001}}
      **Priority:** {{fields.customfield_10001.value}}
      {{/if}}
```

### Multiple Fields in One Mapping

Combine multiple JPD fields:

```yaml
mappings:
  - jpd: "fields"
    github: "body"
    template: |
      # {{fields.summary}}
      
      **Priority:** {{fields.priority.value}}
      **Impact:** {{fields.customfield_10002}}/10
      **Theme:** {{fields.customfield_10003[0].value}}
      
      ## Description
      {{fields.description}}
```

### Array Fields (Multi-Select)

Handle multi-select fields:

```yaml
mappings:
  - jpd: "fields.customfield_10001"  # Multi-select field
    github: "labels"
    template: "{{#each fields.customfield_10001}}theme:{{this.value | slugify}} {{/each}}"
```

**Input:** `["Mobile App", "Web Platform"]`  
**Output:** `theme:mobile-app theme:web-platform`

## Custom Transform Functions

For complex transformations, use custom TypeScript functions:

### Create Transform Function

**transforms/derive-priority.ts:**
```typescript
export default function(data: Record<string, any>): string {
  const impact = data.fields?.customfield_10001 || 0;
  const reach = data.fields?.customfield_10002 || 0;
  
  const score = impact * reach;
  
  if (score > 80) return 'priority:critical';
  if (score > 50) return 'priority:high';
  if (score > 20) return 'priority:medium';
  return 'priority:low';
}
```

### Reference in Config

```yaml
mappings:
  - jpd: "fields"
    github: "labels"
    transform_function: "./transforms/derive-priority.ts"
```

See existing transforms in the `transforms/` directory:
- `build-issue-body.ts` - Rich issue body generation
- `combine-labels.ts` - Merge multiple label sources
- `derive-priority.ts` - Calculate priority from RICE scores

## Complete Examples

### Minimal Field Mapping

```yaml
fields:
  priority:
    field_id: "customfield_10001"
    field_type: "select"

mappings:
  - jpd: "fields.summary"
    github: "title"
    
  - jpd: "fields.customfield_10001.value"
    github: "labels"
    template: "priority:{{fields.customfield_10001.value | lowercase}}"
```

### Comprehensive Field Mapping

```yaml
fields:
  priority:
    field_id: "customfield_10001"
    field_type: "select"
    required: false
    
  theme:
    field_id: "customfield_10002"
    field_type: "array"
    required: false
    
  impact_score:
    field_id: "customfield_10003"
    field_type: "number"
    required: false

mappings:
  # Title with issue key
  - jpd: "fields.summary"
    github: "title"
    template: "[{{fields.project.key}}-{{fields.id | idonly}}] {{fields.summary}}"
  
  # Priority label
  - jpd: "fields.customfield_10001.value"
    github: "labels"
    template: "priority:{{fields.customfield_10001.value | lowercase}}"
  
  # Theme labels (multi-select)
  - jpd: "fields.customfield_10002"
    github: "labels"
    template: "{{#each fields.customfield_10002}}theme:{{this.value | slugify}} {{/each}}"
  
  # Rich issue body
  - jpd: "fields"
    github: "body"
    template: |
      **Impact Score:** {{fields.customfield_10003}}/10
      
      **Theme:** {{fields.customfield_10002[0].value}}
      
      ## Description
      {{fields.description}}
      
      ---
      🔗 [View in JPD]({{jpd_url}})
```

## Discovering Field IDs

Before creating mappings, discover available fields:

```bash
pnpm run discover-fields YOUR_PROJECT
```

**Output:**
```
Field Discovery Results:

ID                     | Type        | Status | Sample Value
-----------------------|-------------|--------|----------------
customfield_10001      | select      | ✓ Set  | High
customfield_10002      | array       | ✓ Set  | ["Mobile App"]
customfield_10003      | number      | ✓ Set  | 8
customfield_10004      | text        | ✓ Set  | Additional context...
```

Use the IDs in your field definitions.

## Field Types Reference

### select

Single-select dropdown:

```yaml
fields:
  priority:
    field_id: "customfield_10001"
    field_type: "select"

# Access value
template: "{{fields.customfield_10001.value}}"
```

### multiselect / array

Multi-select or checkbox fields:

```yaml
fields:
  themes:
    field_id: "customfield_10002"
    field_type: "array"

# Loop through values
template: "{{#each fields.customfield_10002}}{{this.value}} {{/each}}"
```

### number

Numeric fields:

```yaml
fields:
  impact:
    field_id: "customfield_10003"
    field_type: "number"

# Direct access
template: "Impact: {{fields.customfield_10003}}/10"
```

### text

Text fields:

```yaml
fields:
  notes:
    field_id: "customfield_10004"
    field_type: "text"

# Direct access
template: "{{fields.customfield_10004}}"
```

### user

User/assignee fields:

```yaml
fields:
  assignee:
    field_id: "assignee"
    field_type: "user"

# Access user properties
template: "Assigned to: {{fields.assignee.displayName}}"
```

### date

Date fields:

```yaml
fields:
  due_date:
    field_id: "duedate"
    field_type: "date"

# Access date value
template: "Due: {{fields.duedate}}"
```

## Validation

The connector validates field mappings:

```bash
pnpm run validate-config
```

**Checks:**
- Field IDs exist in JPD
- Field types match actual types
- Required fields are present
- Template syntax is valid
- Transform functions exist

**Common validation errors:**

**"Field customfield_10001 not found"**
- Field ID is incorrect
- You don't have permission to access the field
- Field doesn't exist in this project

**"Field type mismatch: expected select, got text"**
- field_type in config doesn't match actual JPD field type
- Run `discover-fields` to check actual type

**"Required field is empty"**
- Field marked as `required: true` has no value
- Either make it optional or ensure field is populated

## Troubleshooting

### Field Not Mapping

**Check:**
1. Field ID is correct (use `discover-fields`)
2. Field path includes `.value` for select fields
3. Template syntax is valid
4. Field has a value in JPD

**Debug:**
```bash
DEBUG=1 pnpm run dev -- --dry-run
```

### Labels Not Created

**Check:**
1. Template produces valid label name
2. Label name has no special characters (except `-`, `_`)
3. Label name length < 50 characters

### Template Not Rendering

**Check:**
1. Variable names match JPD field structure
2. Using correct syntax: `{{variable}}` not `{variable}`
3. Filters are spelled correctly: `| lowercase` not `| lower`

## Next Steps

- [Configure Status Workflows](./status-workflows) - Map statuses between systems
- [Define Labels](./labels) - Create label color scheme
- [Set Up Hierarchy](./hierarchy) - Enable Epic/Story/Task relationships
- [Advanced Configuration](./advanced) - Rate limiting, GitHub Projects

:::tip Field Mapping Strategy
Start with essential fields (title, priority, status) then add more fields incrementally. Test each addition with dry-run before committing.
:::

