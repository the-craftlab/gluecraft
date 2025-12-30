# Manual Setup

This guide walks you through manually configuring Gluecraft JPD without using the setup wizard. Recommended for advanced users who want full control over their configuration.

## When to Use Manual Setup

Choose manual setup if you:
- Want to understand every configuration option
- Need to set up multiple environments
- Prefer to version control your configuration
- Are integrating with existing infrastructure
- Need custom field mappings or transforms

## Step 1: Install Dependencies

Clone the repository and install packages:

```bash
git clone https://github.com/thecraftlab/gluecraft.git
cd gluecraft
pnpm install
```

## Step 2: Create Environment File

Create a `.env` file in the project root:

```bash
# JPD Configuration
JPD_BASE_URL=https://your-company.atlassian.net
JPD_EMAIL=your-email@company.com
JPD_API_KEY=your_jpd_api_token_here

# GitHub Configuration
GITHUB_TOKEN=ghp_your_github_token_here
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name

# Optional: Override default config path
CONFIG_PATH=./config/sync-config.yaml
```

### Environment Variables Explained

**`JPD_BASE_URL`**
- Your Atlassian instance URL
- Must include `https://`
- No trailing slash

**`JPD_EMAIL`**
- Email for your Atlassian account
- Used for API authentication

**`JPD_API_KEY`**
- Generate at [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
- Treat as a password

**`GITHUB_TOKEN`**
- Generate at [GitHub Tokens](https://github.com/settings/tokens)
- Requires `repo` scope at minimum
- Add `write:discussion` for Projects support

**`GITHUB_OWNER`**
- GitHub username or organization name
- Case-sensitive

**`GITHUB_REPO`**
- Repository name only (not full URL)
- Case-sensitive

**`CONFIG_PATH`** (optional)
- Path to your configuration file
- Defaults to `./config/sync-config.yaml`

## Step 3: Discover JPD Fields

Before creating your configuration, discover what custom fields exist in your JPD project:

```bash
pnpm run discover-fields YOUR_PROJECT_KEY
```

This outputs a table showing:
- Field IDs (e.g., `customfield_10001`)
- Field types (select, multiselect, number, etc.)
- Whether fields are populated
- Sample values from actual issues

**Save this output** - you'll reference it when creating your configuration.

## Step 4: Create Configuration File

### Option A: Start from Template

Copy the minimal example configuration:

```bash
cp config/sync-config.minimal.yaml config/sync-config.yaml
```

### Option B: Start from Full Example

Copy a complete example with all features:

```bash
cp config/mtt-clean.yaml config/my-config.yaml
```

### Option C: Create from Scratch

Create `config/sync-config.yaml` with this basic structure:

```yaml
# JPD Project Configuration
jpd:
  project_key: "YOUR_PROJECT"  # Replace with your project key

# GitHub Repository Configuration  
github:
  owner: "your-org"  # Replace with your owner
  repo: "your-repo"  # Replace with your repo

# Sync Direction
sync:
  direction: "bidirectional"  # Or "jpd-to-github"

# Field Definitions
fields:
  priority:
    field_id: "customfield_10001"  # Use ID from discover-fields
    field_type: "select"
    required: false
    
  impact:
    field_id: "customfield_10002"
    field_type: "number"
    required: false

# Field Mappings
mappings:
  - jpd: "fields.customfield_10001.value"
    github: "labels"
    template: "priority:{{fields.customfield_10001.value | lowercase}}"
    
  - jpd: "fields.summary"
    github: "title"
    template: "[{{fields.project.key}}-{{fields.id | idonly}}] {{fields.summary}}"

# Status Mapping
statuses:
  "To Do":
    github_state: "open"
  "In Progress":
    github_state: "open"
  "Done":
    github_state: "closed"

# Label Definitions
labels:
  hierarchy:
    - name: "epic"
      color: "0052CC"
      description: "High-level initiative"
    - name: "story"
      color: "2684FF"
      description: "User story"
```

## Step 5: Configure Field Mappings

Field mappings control how JPD data translates to GitHub.

### Basic Field Mapping

```yaml
mappings:
  - jpd: "fields.summary"  # JPD field path
    github: "title"        # GitHub field
```

### Mapping to Labels

```yaml
mappings:
  - jpd: "fields.customfield_10001.value"
    github: "labels"
    template: "priority:{{fields.customfield_10001.value | lowercase}}"
```

### Mapping to Issue Body

```yaml
mappings:
  - jpd: "fields.customfield_10002"
    github: "body"
    template: |
      **Impact Score:** {{fields.customfield_10002}}
```

### Template Filters

Available filters for transforms:
- `lowercase` - Convert to lowercase
- `uppercase` - Convert to uppercase
- `slugify` - Convert to URL-safe slug
- `idonly` - Extract numeric ID from issue key

See [Field Mappings](../configuration/field-mappings) for detailed documentation.

## Step 6: Configure Status Mappings

Define how JPD statuses map to GitHub states:

```yaml
statuses:
  "Backlog":
    github_state: "open"
    
  "In Progress":
    github_state: "open"
    
  "Done":
    github_state: "closed"
    
  "Cancelled":
    github_state: "closed"
```

For bidirectional sync, also configure GitHub to JPD:

```yaml
sync:
  direction: "bidirectional"
  github_closed_status: "Done"  # Where to move JPD issues when GitHub closes
```

See [Status Workflows](../configuration/status-workflows) for details.

## Step 7: Configure Hierarchy (Optional)

Enable Epic > Story > Task hierarchy:

```yaml
hierarchy:
  enabled: true
  use_github_sub_issues: true
  
  epic_statuses:
    - "Impact"
    - "Epic"
    
  story_statuses:
    - "Ready for delivery"
    - "In Progress"
    - "Delivery"
```

Issues in `epic_statuses` get `type:epic` label. Issues in `story_statuses` get `type:story` label.

See [Hierarchy Configuration](../configuration/hierarchy) for details.

## Step 8: Define Labels

Configure automatic label creation with colors:

```yaml
labels:
  hierarchy:
    - name: "epic"
      color: "0052CC"
      description: "High-level initiative (2-3 month project)"
      
    - name: "story"
      color: "2684FF"
      description: "Deliverable unit of work (1-2 week effort)"
      
  priorities:
    - name: "priority:critical"
      color: "DE350B"
      description: "Critical priority"
      
    - name: "priority:high"
      color: "FF5630"
      description: "High priority"
```

Labels are automatically created in GitHub if they don't exist.

See [Labels Configuration](../configuration/labels) for details.

## Step 9: Validate Configuration

Validate your configuration before running:

```bash
pnpm run validate-config
```

This checks:
- YAML syntax is valid
- Required fields are present
- Environment variables are set
- JPD field IDs exist
- Field types match configuration

**Fix any errors before proceeding.**

## Step 10: Test Connection

Verify credentials work:

```bash
pnpm run test-connection
```

This tests:
- JPD API connection
- GitHub API connection
- Rate limit handling

## Step 11: Run Dry-Run

Perform a test sync without making changes:

```bash
pnpm run dev -- --dry-run
```

Review the output:
- How many issues will be synced?
- Are field mappings correct?
- Do labels look right?
- Any errors or warnings?

## Step 12: Run Actual Sync

When ready, run the actual sync:

```bash
pnpm run dev
```

This will:
- Create new GitHub issues from JPD
- Update existing issues
- Sync status changes
- Sync comments (if enabled)

## Advanced Configuration

### Custom Transform Functions

Create custom transforms in `transforms/` directory:

```typescript
// transforms/custom-priority.ts
export default function(data: Record<string, any>): string {
  const priority = data.fields?.priority?.value;
  
  if (!priority) return 'priority:none';
  
  // Custom mapping logic
  const mapping = {
    'Highest': 'priority:p0',
    'High': 'priority:p1',
    'Medium': 'priority:p2',
    'Low': 'priority:p3',
  };
  
  return mapping[priority] || `priority:${priority.toLowerCase()}`;
}
```

Reference in config:

```yaml
mappings:
  - jpd: "fields.priority"
    github: "labels"
    transform_function: "./transforms/custom-priority.ts"
```

### GitHub Projects Integration

Enable Projects board updates:

```yaml
projects:
  enabled: true
  project_number: 1
  status_field_name: "Status"

statuses:
  "In Progress":
    github_state: "open"
    github_project_status: "In Progress"  # Column name in Projects
```

### Rate Limiting Configuration

Customize rate limit handling:

```yaml
rate_limiting:
  max_retries: 3
  initial_delay_ms: 1000
  backoff_multiplier: 2
  cache_ttl_seconds: 300
```

## Multiple Environments

### Development vs Production

Create separate configs:

```bash
config/
  dev-config.yaml
  prod-config.yaml
```

Use different .env files:

```bash
.env.development
.env.production
```

Load with:

```bash
CONFIG_PATH=./config/prod-config.yaml pnpm run dev
```

### Multiple Projects

Create one config per JPD project:

```bash
config/
  project-a-config.yaml
  project-b-config.yaml
```

## Troubleshooting

### Configuration validation fails

**Run:**
```bash
pnpm run validate-config
```

Review errors carefully - they tell you exactly what's wrong.

### Can't find field IDs

**Run:**
```bash
pnpm run discover-fields YOUR_PROJECT_KEY
```

Copy the exact field IDs shown.

### Status mapping not working

**Check:**
- Status names in config match JPD exactly (case-sensitive)
- Status names don't have extra spaces
- Status actually exists in your JPD project

### Labels not being created

**Check:**
- Label color is valid hex (6 characters, no `#`)
- Label name follows GitHub rules (no special characters except `-`, `_`)

## Next Steps

- [Run Your First Sync](./first-sync) - Execute and verify sync
- [Field Mappings](../configuration/field-mappings) - Detailed field configuration
- [Status Workflows](../configuration/status-workflows) - Status mapping details
- [CLI Reference](../cli/overview) - All available commands

:::tip Configuration Examples
See real-world configurations in the `examples/` directory:
- `examples/bug-tracking/` - Bug tracking workflow
- `examples/ecommerce-roadmap/` - Product roadmap setup
- `examples/jira-software-basic/` - Basic Jira integration
:::

