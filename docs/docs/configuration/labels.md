# Label Configuration

Labels provide visual organization and filtering in GitHub. The connector automatically creates and manages labels based on your configuration.

## Label Definitions

Define labels in the `labels` section, organized by category:

```yaml
labels:
  hierarchy:
    - name: "epic"
      color: "0052CC"
      description: "High-level initiative"
      
  priorities:
    - name: "priority:high"
      color: "FF5630"
      description: "High priority"
```

## Label Properties

Each label has three properties:

### name

**Type:** String (required)  
**The label text**

**Format rules:**
- No special characters except `-` and `_`
- Maximum 50 characters
- Case-sensitive

**Naming conventions:**
- Use prefixes for categorization: `priority:high`, `theme:mobile`
- Use kebab-case for multi-word labels: `tech-debt`, `user-facing`
- Be concise and descriptive

### color

**Type:** String (required)  
**Hex color code (without #)**

**Format:**
- 6-character hex code
- No `#` prefix
- Examples: `0052CC`, `FF5630`, `36B37E`

**Color recommendations:**
- **Blues (`0052CC`, `2684FF`)** - Hierarchy, neutral categories
- **Reds (`DE350B`, `FF5630`)** - High priority, critical
- **Oranges (`FF8B00`, `FFAB00`)** - Medium priority, warnings
- **Greens (`36B37E`, `00B8D9`)** - Success, ready states
- **Purples (`6554C0`, `8777D9`)** - Epics, large initiatives
- **Grays (`97A0AF`, `C1C7D0`)** - Low priority, metadata

### description

**Type:** String (optional)  
**Human-readable explanation**

**Guidelines:**
- Explain when to use the label
- Include time estimates for work items
- Note any special meaning

**Examples:**
- "High-level initiative (2-3 month project)"
- "Critical priority - immediate action required"
- "Customer-facing feature"

## Label Categories

Organize labels into logical categories:

### Hierarchy Labels

Indicate issue level in the hierarchy:

```yaml
labels:
  hierarchy:
    - name: "epic"
      color: "0052CC"
      description: "High-level initiative (2-3 month project)"
      
    - name: "story"
      color: "2684FF"
      description: "Deliverable unit of work (1-2 week effort)"
      
    - name: "task"
      color: "4C9AFF"
      description: "Implementation task (1-3 day effort)"
```

### Priority Labels

Indicate urgency and importance:

```yaml
labels:
  priorities:
    - name: "priority:critical"
      color: "DE350B"
      description: "Critical priority - drop everything"
      
    - name: "priority:high"
      color: "FF5630"
      description: "High priority - schedule soon"
      
    - name: "priority:medium"
      color: "FFAB00"
      description: "Medium priority - normal schedule"
      
    - name: "priority:low"
      color: "97A0AF"
      description: "Low priority - nice to have"
```

### Type Labels

Classify work type:

```yaml
labels:
  types:
    - name: "type:feature"
      color: "0052CC"
      description: "New feature or enhancement"
      
    - name: "type:bug"
      color: "DE350B"
      description: "Bug fix"
      
    - name: "type:tech-debt"
      color: "FF8B00"
      description: "Technical debt or refactoring"
      
    - name: "type:documentation"
      color: "00B8D9"
      description: "Documentation update"
```

### Theme Labels

Group by strategic theme or product area:

```yaml
labels:
  themes:
    - name: "theme:mobile"
      color: "6554C0"
      description: "Mobile application features"
      
    - name: "theme:web"
      color: "8777D9"
      description: "Web platform features"
      
    - name: "theme:api"
      color: "998DD9"
      description: "API and integrations"
```

### Status Labels

Supplement GitHub's open/closed with workflow stages:

```yaml
labels:
  status:
    - name: "status:in-progress"
      color: "FFAB00"
      description: "Currently being worked on"
      
    - name: "status:blocked"
      color: "DE350B"
      description: "Blocked by external dependency"
      
    - name: "status:ready-for-review"
      color: "00B8D9"
      description: "Ready for team review"
```

## Automatic Label Creation

Labels are automatically created in GitHub when:
- First sync runs
- New labels appear in field mappings
- Label setup command executes

### Label Setup Command

Create labels before syncing:

```bash
# Preview what will be created
pnpm run setup-labels --preview

# Create labels in GitHub
pnpm run setup-labels
```

**What it does:**
- Reads label definitions from config
- Creates missing labels in GitHub
- Skips labels that already exist
- Updates descriptions (not colors)

:::tip
Running `setup-labels` is optional. Labels are automatically created during sync if they don't exist.
:::

## Dynamic Labels from JPD Fields

Generate labels dynamically from JPD custom fields:

### Priority from Select Field

```yaml
mappings:
  - jpd: "fields.customfield_10001.value"  # Priority field
    github: "labels"
    template: "priority:{{fields.customfield_10001.value | lowercase}}"
```

**Result:**
- JPD value `High` → GitHub label `priority:high`
- JPD value `Medium` → GitHub label `priority:medium`

### Themes from Multi-Select

```yaml
mappings:
  - jpd: "fields.customfield_10002"  # Themes multi-select
    github: "labels"
    template: "{{#each fields.customfield_10002}}theme:{{this.value | slugify}} {{/each}}"
```

**Result:**
- JPD values `["Mobile App", "User Experience"]`
- GitHub labels `theme:mobile-app`, `theme:user-experience`

### Hierarchy from Status

```yaml
hierarchy:
  enabled: true
  epic_statuses:
    - "Impact"
  story_statuses:
    - "Ready for Delivery"
```

**Result:**
- Issues in "Impact" status get `epic` label
- Issues in "Ready for Delivery" get `story` label

See [Field Mappings](./field-mappings) for details on template syntax.

## Label Management

### Updating Labels

**To update label descriptions:**
1. Edit config file
2. Run: `pnpm run setup-labels`
3. Descriptions update, colors remain

**To update colors:**
1. Manually update in GitHub UI
2. Or delete label and run `setup-labels` to recreate

### Removing Labels

**From config:**
1. Remove from config
2. Labels remain in GitHub
3. Won't be applied to new issues

**From GitHub:**
```bash
# Clear specific labels
pnpm run clear-labels priority:low priority:medium

# Clear all configured labels (careful!)
pnpm run clear-all-labels
```

:::warning
`clear-all-labels` removes ALL labels defined in your config from GitHub. This affects all issues, not just synced ones.
:::

## Label Strategies

### Minimalist Strategy

Just the essentials:

```yaml
labels:
  hierarchy:
    - name: "epic"
      color: "6554C0"
    - name: "story"
      color: "0052CC"
      
  priorities:
    - name: "priority:high"
      color: "DE350B"
    - name: "priority:normal"
      color: "0052CC"
```

**Pros:**
- Clean, focused
- Easy to understand
- Low maintenance

**Cons:**
- Less filtering granularity
- Limited categorization

### Comprehensive Strategy

Full categorization:

```yaml
labels:
  hierarchy:
    - name: "epic"
      color: "6554C0"
    - name: "story"
      color: "0052CC"
    - name: "task"
      color: "4C9AFF"
      
  priorities:
    - name: "priority:critical"
      color: "DE350B"
    - name: "priority:high"
      color: "FF5630"
    - name: "priority:medium"
      color: "FFAB00"
    - name: "priority:low"
      color: "97A0AF"
      
  types:
    - name: "type:feature"
      color: "0052CC"
    - name: "type:bug"
      color: "DE350B"
    - name: "type:tech-debt"
      color: "FF8B00"
      
  themes:
    - name: "theme:mobile"
      color: "8777D9"
    - name: "theme:web"
      color: "998DD9"
    - name: "theme:api"
      color: "B8ACF6"
```

**Pros:**
- Rich filtering options
- Clear categorization
- Detailed tracking

**Cons:**
- More labels to manage
- Can clutter UI
- Requires discipline

### Hybrid Strategy

Essential categories with selective detail:

```yaml
labels:
  hierarchy:
    - name: "epic"
      color: "6554C0"
    - name: "story"
      color: "0052CC"
      
  priorities:
    - name: "priority:high"
      color: "DE350B"
    - name: "priority:normal"
      color: "0052CC"
    - name: "priority:low"
      color: "97A0AF"
      
  themes:
    # Only major themes, not every subcategory
    - name: "theme:mobile"
      color: "8777D9"
    - name: "theme:web"
      color: "998DD9"
```

**Pros:**
- Balance of detail and simplicity
- Focus on what matters
- Easier to maintain

## Filtering with Labels

Use labels for powerful GitHub filtering:

### Filter by Priority

```
is:issue label:priority:high is:open
```

### Filter by Theme and Level

```
is:issue label:theme:mobile label:epic
```

### Complex Filters

```
is:issue label:priority:high label:type:bug -label:status:blocked
```

### Save Filters as Views

In GitHub Projects, create saved views using label filters for quick access to specific issue sets.

## Color Schemes

### Atlassian-Inspired

Match Jira's color scheme:

```yaml
labels:
  hierarchy:
    - name: "epic"
      color: "6554C0"  # Purple
    - name: "story"
      color: "0052CC"  # Blue
      
  priorities:
    - name: "priority:highest"
      color: "DE350B"  # Red
    - name: "priority:high"
      color: "FF5630"  # Orange-red
    - name: "priority:medium"
      color: "FFAB00"  # Orange
    - name: "priority:low"
      color: "36B37E"  # Green
```

### Traffic Light

Simple priority indication:

```yaml
labels:
  priorities:
    - name: "priority:high"
      color: "DE350B"  # Red - stop and handle
    - name: "priority:medium"
      color: "FFAB00"  # Yellow - proceed with caution
    - name: "priority:low"
      color: "36B37E"  # Green - go when ready
```

### Rainbow Categories

Visually distinct categories:

```yaml
labels:
  themes:
    - name: "theme:mobile"
      color: "DE350B"  # Red
    - name: "theme:web"
      color: "FF8B00"  # Orange
    - name: "theme:api"
      color: "FFAB00"  # Yellow
    - name: "theme:data"
      color: "36B37E"  # Green
    - name: "theme:infra"
      color: "00B8D9"  # Cyan
    - name: "theme:security"
      color: "6554C0"  # Purple
```

## Complete Example

```yaml
labels:
  # Hierarchy levels
  hierarchy:
    - name: "epic"
      color: "6554C0"
      description: "High-level initiative (2-3 month project)"
    - name: "story"
      color: "0052CC"
      description: "Deliverable unit of work (1-2 week effort)"
    - name: "task"
      color: "4C9AFF"
      description: "Implementation task (1-3 day effort)"
  
  # Priority levels
  priorities:
    - name: "priority:critical"
      color: "DE350B"
      description: "Critical priority - immediate action required"
    - name: "priority:high"
      color: "FF5630"
      description: "High priority - schedule in current sprint"
    - name: "priority:medium"
      color: "FFAB00"
      description: "Medium priority - normal scheduling"
    - name: "priority:low"
      color: "97A0AF"
      description: "Low priority - nice to have"
  
  # Work types
  types:
    - name: "type:feature"
      color: "0052CC"
      description: "New feature or enhancement"
    - name: "type:bug"
      color: "DE350B"
      description: "Bug fix"
    - name: "type:tech-debt"
      color: "FF8B00"
      description: "Technical debt or refactoring"
  
  # Strategic themes
  themes:
    - name: "theme:mobile"
      color: "8777D9"
      description: "Mobile application features"
    - name: "theme:web"
      color: "998DD9"
      description: "Web platform features"
```

## Next Steps

- [Configure Hierarchy](./hierarchy) - Use labels for Epic/Story/Task relationships
- [Field Mappings](./field-mappings) - Generate labels from JPD fields
- [Advanced Configuration](./advanced) - GitHub Projects label integration

:::tip Label Consistency
Establish a label naming convention early and stick to it. Consistent prefixes (priority:, theme:, type:) make filtering intuitive and powerful.
:::

