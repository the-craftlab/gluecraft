# Advanced Configuration

Advanced configuration options for transform functions, GitHub Projects integration, rate limiting, and other power-user features.

## Custom Transform Functions

Transform functions allow complex data transformations using TypeScript code.

### Creating Transform Functions

Create `.ts` files in the `transforms/` directory:

**transforms/derive-priority.ts:**
```typescript
/**
 * Derives priority label from RICE score components
 * @param data - Full JPD issue data
 * @returns Priority label string
 */
export default function(data: Record<string, any>): string {
  const reach = data.fields?.customfield_10001 || 0;
  const impact = data.fields?.customfield_10002 || 0;
  const confidence = data.fields?.customfield_10003 || 0;
  const effort = data.fields?.customfield_10004 || 1;
  
  // Calculate RICE score
  const score = (reach * impact * confidence) / effort;
  
  // Map to priority
  if (score > 100) return 'priority:critical';
  if (score > 50) return 'priority:high';
  if (score > 20) return 'priority:medium';
  return 'priority:low';
}
```

### Using Transform Functions

Reference in your configuration:

```yaml
mappings:
  - jpd: "fields"  # Pass all fields to function
    github: "labels"
    transform_function: "./transforms/derive-priority.ts"
```

### Transform Function Signature

```typescript
export default function(
  data: Record<string, any>,  // Full JPD issue object
  context?: {                 // Optional context
    github_issue?: any;       // Existing GitHub issue (for updates)
    config?: any;             // Your configuration object
  }
): string | string[] {        // Return label(s) or content
  // Your transformation logic
  return result;
}
```

### Built-In Transforms

The connector includes several ready-to-use transforms in `transforms/`:

**build-issue-body.ts** - Rich issue body with RICE scores
```yaml
mappings:
  - jpd: "fields"
    github: "body"
    transform_function: "./transforms/build-issue-body.ts"
```

**combine-labels.ts** - Merge multiple label sources
```yaml
mappings:
  - jpd: "fields"
    github: "labels"
    transform_function: "./transforms/combine-labels.ts"
```

**derive-priority.ts** - Calculate priority from scores
```yaml
mappings:
  - jpd: "fields"
    github: "labels"
    transform_function: "./transforms/derive-priority.ts"
```

### Transform Examples

**Conditional Label:**
```typescript
export default function(data: Record<string, any>): string {
  const isCustomerFacing = data.fields?.customfield_10005;
  return isCustomerFacing ? 'customer-facing' : 'internal';
}
```

**Multiple Labels:**
```typescript
export default function(data: Record<string, any>): string[] {
  const labels: string[] = [];
  
  if (data.fields?.priority?.value) {
    labels.push(`priority:${data.fields.priority.value.toLowerCase()}`);
  }
  
  if (data.fields?.customfield_10001?.value) {
    labels.push(`theme:${data.fields.customfield_10001.value.toLowerCase()}`);
  }
  
  return labels;
}
```

**Formatted Content:**
```typescript
export default function(data: Record<string, any>): string {
  const summary = data.fields?.summary || 'No summary';
  const description = data.fields?.description || 'No description';
  const reach = data.fields?.customfield_10001 || 'N/A';
  
  return `# ${summary}

## Description
${description}

## RICE Score
**Reach:** ${reach}

---
[View in JPD](${data.self})
`;
}
```

## GitHub Projects Integration

Integrate with GitHub Projects (Beta) for visual Kanban boards.

### Enabling Projects

```yaml
projects:
  enabled: true
  project_number: 1                    # Your project number
  status_field_name: "Status"          # Status field name in Projects
  update_project_items: true           # Update item status
```

### Project Configuration

**enabled**
- Type: Boolean
- Default: `false`
- Enables Projects integration

**project_number**
- Type: Number
- Required when enabled
- Find in project URL: `github.com/orgs/ORG/projects/1`

**status_field_name**
- Type: String
- Default: `"Status"`
- Name of the status field in your Projects board

**update_project_items**
- Type: Boolean
- Default: `true`
- Whether to move items between columns

### Mapping Statuses to Columns

```yaml
projects:
  enabled: true
  project_number: 1
  status_field_name: "Status"

statuses:
  "Backlog":
    github_state: "open"
    github_project_status: "📋 Backlog"  # Exact column name
    
  "In Progress":
    github_state: "open"
    github_project_status: "🚧 In Progress"
    
  "Review":
    github_state: "open"
    github_project_status: "👀 Review"
    
  "Done":
    github_state: "closed"
    github_project_status: "✅ Done"
```

**Important:**
- Column names must match exactly (including emojis)
- Case-sensitive
- Issues are automatically added to project when created

### Token Requirements

GitHub Projects requires additional token scope:

```bash
GITHUB_TOKEN=ghp_your_token  # Must have 'write:discussion' scope
```

Generate new token with both:
- `repo` - Repository access
- `write:discussion` - Projects access

## Rate Limiting

Configure rate limit handling for API calls.

### Rate Limit Configuration

```yaml
rate_limiting:
  max_retries: 3              # Maximum retry attempts
  initial_delay_ms: 1000      # Initial delay before retry (milliseconds)
  backoff_multiplier: 2       # Exponential backoff multiplier
  cache_ttl_seconds: 300      # Cache connection test results (seconds)
```

### Rate Limit Properties

**max_retries**
- Type: Number
- Default: `3`
- Maximum number of retry attempts for rate-limited requests

**initial_delay_ms**
- Type: Number
- Default: `1000`
- Initial delay in milliseconds before first retry

**backoff_multiplier**
- Type: Number
- Default: `2`
- Multiplier for exponential backoff (delay doubles each retry)

**cache_ttl_seconds**
- Type: Number
- Default: `300` (5 minutes)
- How long to cache successful connection tests

### Retry Behavior

When rate limit is hit:

```
Attempt 1: Wait 1000ms (1 second)
Attempt 2: Wait 2000ms (2 seconds)
Attempt 3: Wait 4000ms (4 seconds)
```

**Formula:** `delay = initial_delay_ms * (backoff_multiplier ^ attempt)`

### Rate Limit Best Practices

**For development:**
```yaml
rate_limiting:
  max_retries: 3
  initial_delay_ms: 500
  backoff_multiplier: 2
  cache_ttl_seconds: 300
```

**For production:**
```yaml
rate_limiting:
  max_retries: 5
  initial_delay_ms: 2000
  backoff_multiplier: 2
  cache_ttl_seconds: 600
```

**For high-volume:**
```yaml
rate_limiting:
  max_retries: 5
  initial_delay_ms: 5000
  backoff_multiplier: 3
  cache_ttl_seconds: 900
```

## Comment Sync Configuration

Configure bidirectional comment synchronization.

### Enabling Comment Sync

```yaml
sync:
  direction: "bidirectional"
  enable_comment_sync: true
  
comments:
  sync_direction: "bidirectional"  # or "jpd-to-github", "github-to-jpd"
  include_metadata: true           # Include author and timestamp
  rate_limit_delay_ms: 1000       # Delay between comment syncs
```

### Comment Properties

**sync_direction**
- Type: String
- Options: `bidirectional`, `jpd-to-github`, `github-to-jpd`
- Controls comment flow direction

**include_metadata**
- Type: Boolean
- Default: `true`
- Includes author and timestamp in synced comments

**rate_limit_delay_ms**
- Type: Number
- Default: `1000`
- Delay between comment API calls

### Comment Format

When synced, comments include attribution:

```markdown
[Comment from JPD by John Doe on 2024-12-30 10:30 AM]

Original comment text here...
```

See [Comment Sync](../features/comment-sync) for details.

## Webhook Configuration

Configure webhook receiver for real-time sync.

### Webhook Setup

```yaml
webhook:
  enabled: true
  port: 3000
  secret: "your_webhook_secret"
  
  # Optional: Filter events
  events:
    - "issue.created"
    - "issue.updated"
    - "issue.deleted"
```

### Webhook Properties

**enabled**
- Type: Boolean
- Default: `false`
- Enables webhook receiver

**port**
- Type: Number
- Default: `3000`
- Port for webhook server

**secret**
- Type: String
- Webhook secret for validation

**events**
- Type: Array
- Events to process (optional, defaults to all)

### Running Webhook Server

```bash
node webhook/receiver.js
```

The webhook receiver automatically triggers sync when events are received.

## JQL Customization

Customize the JQL query used to fetch JPD issues.

### Default JQL

```yaml
jpd:
  project_key: "MTT"
  jql_filter: "project = MTT ORDER BY created DESC"
```

### Custom JQL

```yaml
jpd:
  project_key: "MTT"
  jql_filter: |
    project = MTT 
    AND status IN ("Impact", "Ready for Delivery", "Delivery") 
    AND labels = "sync-to-github"
    ORDER BY priority DESC, created DESC
```

### JQL Examples

**Filter by label:**
```yaml
jql_filter: "project = MTT AND labels = 'sync-enabled'"
```

**Filter by date:**
```yaml
jql_filter: "project = MTT AND created >= -30d"
```

**Complex filter:**
```yaml
jql_filter: |
  project = MTT 
  AND status NOT IN ("Parking Lot", "Discovery")
  AND (priority = "High" OR labels = "customer-facing")
  ORDER BY priority DESC
```

## Performance Tuning

### Batch Size

Control how many issues are processed at once:

```yaml
sync:
  batch_size: 50  # Process 50 issues per batch
  batch_delay_ms: 2000  # Wait 2s between batches
```

### Concurrent Requests

Limit concurrent API requests:

```yaml
sync:
  max_concurrent_requests: 5  # Max 5 simultaneous API calls
```

### Caching

Configure caching behavior:

```yaml
cache:
  enabled: true
  ttl_seconds: 300  # Cache for 5 minutes
  max_entries: 1000  # Max cache entries
```

## Environment-Specific Configuration

### Multiple Environments

**config/dev.yaml:**
```yaml
jpd:
  project_key: "DEV"
  jql_filter: "project = DEV AND created >= -7d"

rate_limiting:
  max_retries: 2
  initial_delay_ms: 500
```

**config/prod.yaml:**
```yaml
jpd:
  project_key: "PROD"
  jql_filter: "project = PROD"

rate_limiting:
  max_retries: 5
  initial_delay_ms: 2000

projects:
  enabled: true
  project_number: 1
```

### Loading Environment Config

```bash
CONFIG_PATH=./config/prod.yaml pnpm run dev
```

## Debug Configuration

Enable verbose logging:

```yaml
debug:
  enabled: true
  log_level: "debug"  # error, warn, info, debug, trace
  log_requests: true  # Log all API requests
  log_responses: false  # Log API responses (sensitive!)
```

Or use environment variable:

```bash
DEBUG=1 pnpm run dev
```

## Complete Advanced Example

```yaml
# Custom transform functions
mappings:
  - jpd: "fields"
    github: "body"
    transform_function: "./transforms/build-issue-body.ts"
  
  - jpd: "fields"
    github: "labels"
    transform_function: "./transforms/derive-priority.ts"

# GitHub Projects
projects:
  enabled: true
  project_number: 1
  status_field_name: "Status"
  update_project_items: true

# Rate limiting
rate_limiting:
  max_retries: 5
  initial_delay_ms: 2000
  backoff_multiplier: 2
  cache_ttl_seconds: 600

# Comment sync
comments:
  sync_direction: "bidirectional"
  include_metadata: true
  rate_limit_delay_ms: 1000

# Performance tuning
sync:
  batch_size: 50
  batch_delay_ms: 2000
  max_concurrent_requests: 5

# Caching
cache:
  enabled: true
  ttl_seconds: 300
  max_entries: 1000

# Custom JQL
jpd:
  jql_filter: |
    project = MTT 
    AND status IN ("Impact", "Ready for Delivery")
    AND created >= -90d
    ORDER BY priority DESC

# Debug
debug:
  enabled: false
  log_level: "info"
  log_requests: false
```

## Next Steps

- [Field Mappings](./field-mappings) - Use transforms in mappings
- [Status Workflows](./status-workflows) - Projects integration
- [CLI Reference](../cli/overview) - Command-line tools
- [Testing Guide](../guides/testing) - Test your configuration

:::warning Performance Impact
Advanced features like Projects integration, comment sync, and complex transforms increase API usage. Monitor rate limits and adjust configuration accordingly.
:::

