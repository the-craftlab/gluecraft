# Sync Configuration

The sync behavior is controlled by a YAML configuration file (typically `config/sync-config.yaml`).

## Configuration File Location

By default, the connector looks for configuration at:
```
config/sync-config.yaml
```

You can specify a custom location:
```bash
CONFIG_PATH=./my-config.yaml pnpm run dev
```

## Basic Structure

```yaml
jpd:
  project_key: "YOUR_PROJECT"
  
github:
  owner: "your-org"
  repo: "your-repo"
  
field_mappings:
  jpd_to_github:
    priority:
      field_type: "select"
      transform: "priority-to-label"
      
  github_to_jpd:
    labels:
      - name: "priority:high"
        jpd_field: "customfield_12345"
        jpd_value: "High"

status_mapping:
  jpd_to_github:
    - jpd_status: "To Do"
      github_state: "open"
    - jpd_status: "Done"
      github_state: "closed"

hierarchy:
  enabled: true
  parent_field_in_body: true
  use_github_parent_issue: true

labels:
  auto_create: true
  definitions:
    - name: "epic"
      color: "0052CC"
      description: "High-level initiative"
```

## Core Sections

### JPD Configuration

```yaml
jpd:
  project_key: "MTT"  # Your JPD project key
```

**Required:**
- `project_key` - JPD project identifier

**Environment Variables:**
- `JPD_BASE_URL` - Your JPD instance URL
- `JPD_EMAIL` - Your JPD email
- `JPD_API_KEY` - JPD API token

### GitHub Configuration

```yaml
github:
  owner: "expedition"     # GitHub organization or user
  repo: "my-repo"         # Repository name
```

**Required:**
- `owner` - GitHub organization or username
- `repo` - Repository name

**Environment Variables:**
- `GITHUB_TOKEN` - GitHub personal access token

### Field Mappings

Map JPD custom fields to GitHub labels or fields:

```yaml
field_mappings:
  jpd_to_github:
    priority:
      field_type: "select"
      transform: "priority-to-label"
      jpd_field_id: "customfield_10001"
    
    customer_impact:
      field_type: "number"
      transform: "append-to-body"
      template: "**Customer Impact:** {{value}}/10"
```

See [Field Mappings](./field-mappings) for details.

### Status Mapping

Control how JPD statuses map to GitHub states:

```yaml
status_mapping:
  jpd_to_github:
    - jpd_status: "Backlog"
      github_state: "open"
    - jpd_status: "In Progress"
      github_state: "open"
    - jpd_status: "Done"
      github_state: "closed"
      
  github_to_jpd:
    - github_state: "open"
      jpd_status: "To Do"
    - github_state: "closed"
      jpd_status: "Done"
```

### Hierarchy

Configure parent-child relationships:

```yaml
hierarchy:
  enabled: true              # Enable/disable hierarchy (default: true)
  parent_field_in_body: true # Add parent references to issue body
  use_github_parent_issue: true  # Use GitHub's native sub-issues
  
  epic_statuses:            # JPD statuses that represent Epics
    - "Epic"
    - "Initiative"
    
  story_statuses:           # JPD statuses that represent Stories
    - "Story"
    - "Feature"
    
  task_statuses:            # JPD statuses that represent Tasks
    - "Task"
    - "Subtask"
```

See [Sub-Issues Documentation](../features/sub-issues) for more.

### Labels

Configure automatic label creation and color coding:

```yaml
labels:
  auto_create: true  # Automatically create labels (default: true)
  
  definitions:
    - name: "epic"
      color: "0052CC"      # Hex color without #
      description: "High-level initiative (2-3 month project)"
      
    - name: "story"
      color: "2684FF"
      description: "Deliverable unit of work"
      
    - name: "priority:high"
      color: "D73A4A"
      description: "High priority issue"
```

See [Labels Configuration](./labels) for more.

## Advanced Configuration

### Transform Functions

Use custom TypeScript functions for complex mappings:

```yaml
field_mappings:
  jpd_to_github:
    priority:
      transform: "custom-priority-transform"
      transform_file: "./transforms/priority.ts"
```

**Transform function:**
```typescript
export function customPriorityTransform(value: any, issue: any): string {
  // Custom logic here
  return `priority:${value.toLowerCase()}`;
}
```

### Templates

Use templates for dynamic content:

```yaml
field_mappings:
  jpd_to_github:
    summary:
      template: "[{{project_key}}] {{summary}}"
```

**Supported variables:**
- `{{project_key}}` - JPD project key
- `{{summary}}` - Issue summary
- `{{field_name}}` - Any JPD field value

### Rate Limiting

Configure rate limit handling:

```yaml
rate_limiting:
  max_retries: 3
  initial_delay_ms: 1000
  backoff_multiplier: 2
  cache_ttl_seconds: 300
```

## Environment Variables

Required environment variables in `.env`:

```bash
# JPD Configuration
JPD_BASE_URL=https://your-instance.atlassian.net
JPD_EMAIL=your-email@example.com
JPD_API_KEY=your-jpd-api-token

# GitHub Configuration  
GITHUB_TOKEN=ghp_your_github_token_here
GITHUB_OWNER=your-org
GITHUB_REPO=your-repo
```

## Configuration Examples

### Minimal Configuration

```yaml
jpd:
  project_key: "PROJ"
  
github:
  owner: "my-org"
  repo: "my-repo"
  
status_mapping:
  jpd_to_github:
    - jpd_status: "To Do"
      github_state: "open"
    - jpd_status: "Done"
      github_state: "closed"
```

### Full-Featured Configuration

See `config/mtt-clean.yaml` in the repository for a complete example with:
- Custom field mappings
- Transform functions
- Hierarchy configuration
- Label definitions
- Status workflows

## Validation

The connector validates your configuration on startup:

```bash
pnpm run health-check
```

**Checks:**
- Configuration file syntax
- Required fields present
- JPD API connectivity
- GitHub API connectivity
- Custom field IDs exist
- Status names valid

## Troubleshooting

### Configuration Not Found

```
Error: Configuration file not found
```

**Solution:**
```bash
# Check file exists
ls -la config/sync-config.yaml

# Or specify custom path
CONFIG_PATH=./my-config.yaml pnpm run dev
```

### Field Validation Failed

```
Field "Priority" has type "null" but expected "select"
```

**Solution:**
1. Run field discovery: `pnpm run discover-fields YOUR_PROJECT`
2. Update `jpd_field_id` in config
3. Verify field exists in JPD

### Invalid Status Mapping

```
JPD status "In Progress" not found
```

**Solution:**
1. Check exact status name in JPD (case-sensitive)
2. Update `jpd_status` in config to match exactly

## See Also

- [Field Mappings](./field-mappings) - Detailed field mapping guide
- [Labels Configuration](./labels) - Label setup and strategies
- [CLI Guide](../cli) - Running sync commands
- [Examples](/config/sync-config.minimal.yaml) - Minimal config template

