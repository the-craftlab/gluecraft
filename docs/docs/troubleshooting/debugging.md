# Debugging Guide

Advanced debugging techniques and tools for diagnosing complex issues.

## Debug Mode

Enable verbose logging to see detailed operation information.

### Enable Debug Logging

**Via environment variable:**
```bash
DEBUG=1 pnpm run dev -- --dry-run
```

**Via `.env` file:**
```bash
DEBUG=true
```

### Debug Output

Debug mode shows:
- API requests and responses
- Field value extraction
- Template rendering
- Transform function execution
- Hash calculations
- Cache operations

**Example output:**
```
[DEBUG] Fetching JPD issues with JQL: project = MTT
[DEBUG] Found 25 issues
[DEBUG] Processing issue MTT-1
[DEBUG] Extracting field customfield_10001: "High"
[DEBUG] Rendering template: priority:{{value | lowercase}}
[DEBUG] Result: priority:high
[DEBUG] Calculating sync hash...
[DEBUG] Hash: abc123def456
[DEBUG] Comparing with previous: abc123def456
[DEBUG] No changes detected, skipping
```

## Logging Configuration

### Log Levels

Configure verbosity:

```yaml
logging:
  level: "debug"  # error, warn, info, debug, trace
  file: "./logs/sync.log"
  format: "json"  # or "text"
```

**Log levels explained:**
- `error` - Only errors
- `warn` - Errors and warnings
- `info` - Normal operation (default)
- `debug` - Detailed debugging
- `trace` - Everything (very verbose)

### Log to File

```bash
# Redirect output
pnpm run dev > sync.log 2>&1

# Or configure in config
```

```yaml
logging:
  file: "./logs/sync.log"
  rotate: true  # Rotate logs daily
  max_size: "10MB"
```

## Debugging Specific Components

### Field Extraction

See what values are being extracted:

```bash
DEBUG=1 pnpm run dev -- --dry-run | grep "Extracting field"
```

Output shows:
```
[DEBUG] Extracting field customfield_10001
[DEBUG] Value: { value: 'High', id: '10101' }
[DEBUG] Accessing path: fields.customfield_10001.value
[DEBUG] Result: "High"
```

### Template Rendering

See how templates are rendered:

```bash
DEBUG=1 pnpm run dev -- --dry-run | grep "Rendering template"
```

Output shows:
```
[DEBUG] Rendering template: priority:{{fields.customfield_10001.value | lowercase}}
[DEBUG] Variables: { fields: { customfield_10001: { value: 'High' } } }
[DEBUG] After substitution: priority:High
[DEBUG] After filters: priority:high
```

### Transform Functions

See transform function execution:

```bash
DEBUG=1 pnpm run dev -- --dry-run | grep "Transform"
```

Output shows:
```
[DEBUG] Loading transform: ./transforms/derive-priority.ts
[DEBUG] Transform input: { fields: { ... } }
[DEBUG] Transform output: "priority:high"
```

### API Calls

See all API requests:

```bash
DEBUG=1 pnpm run dev | grep "API"
```

Output shows:
```
[DEBUG] API Request: GET /rest/api/3/search
[DEBUG] API Response: 200 OK (125ms)
[DEBUG] API Request: POST /repos/owner/repo/issues
[DEBUG] API Response: 201 Created (340ms)
```

## Debugging Tools

### Health Check

Comprehensive system check:

```bash
pnpm run health-check --check-all
```

Provides:
- System status
- API connectivity
- Rate limits
- Configuration validation
- Recent sync status

### Connection Test

Test specific connections:

```bash
# Test JPD only
pnpm run test-connection --jpd-only --force

# Test GitHub only
pnpm run test-connection --github-only --force

# Test both
pnpm run test-connection --force
```

### Field Discovery

Inspect available fields:

```bash
pnpm run discover-fields YOUR_PROJECT --show-empty
```

Shows:
- All fields (including empty)
- Field types
- Sample values
- Field availability

### Configuration Validation

Detailed validation:

```bash
pnpm run validate-config --verbose
```

Shows:
- Each validation step
- What's being checked
- Detailed error messages

## Debugging Workflows

### Problem: Issues Not Syncing

**Debug steps:**

1. **Check JQL query:**
   ```bash
   DEBUG=1 pnpm run dev -- --dry-run | grep "JQL"
   ```

2. **Verify issue fetched:**
   ```bash
   DEBUG=1 pnpm run dev -- --dry-run | grep "Found.*issues"
   ```

3. **Check filtering:**
   ```bash
   DEBUG=1 pnpm run dev -- --dry-run | grep "Skipping"
   ```

4. **Verify field values:**
   ```bash
   DEBUG=1 pnpm run dev -- --dry-run | grep "MTT-5"
   ```

### Problem: Fields Not Mapping

**Debug steps:**

1. **Check field extraction:**
   ```bash
   DEBUG=1 pnpm run dev -- --dry-run | grep "customfield_10001"
   ```

2. **Check template rendering:**
   ```bash
   DEBUG=1 pnpm run dev -- --dry-run | grep "template"
   ```

3. **Check final value:**
   ```bash
   pnpm run dev -- --dry-run | grep -A 5 "MTT-5"
   ```

### Problem: Rate Limiting

**Debug steps:**

1. **Check rate limit status:**
   ```bash
   pnpm run health-check | grep "Rate limit"
   ```

2. **Monitor API calls:**
   ```bash
   DEBUG=1 pnpm run dev | grep "API Request"
   ```

3. **Count requests:**
   ```bash
   DEBUG=1 pnpm run dev 2>&1 | grep "API Request" | wc -l
   ```

## Advanced Debugging

### Interactive Debugging

For TypeScript debugging:

**Add breakpoints:**
```typescript
// In transform function
export default function(data: Record<string, any>): string {
  debugger;  // Breakpoint here
  return "result";
}
```

**Run with inspector:**
```bash
node --inspect-brk node_modules/.bin/tsx src/index.ts
```

**Connect with Chrome DevTools:**
1. Open chrome://inspect
2. Click "inspect" under Remote Target
3. Debug interactively

### Network Debugging

**Monitor all network traffic:**

```bash
# macOS
sudo tcpdump -i any -A 'host api.github.com or host atlassian.net'

# Linux
sudo tcpdump -i any -A 'host api.github.com or host atlassian.net'
```

**Use proxy:**
```bash
# Set proxy
export HTTP_PROXY=http://localhost:8888
export HTTPS_PROXY=http://localhost:8888

# Run through proxy (e.g., Charles, mitmproxy)
pnpm run dev
```

### Database/State Debugging

**Check sync state:**
```bash
# Sync state stored in GitHub issue bodies as HTML comments
# View in GitHub issue source
```

**Extract sync metadata:**
```bash
# From GitHub API
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/issues/45 \
  | jq '.body' \
  | grep jpd-sync-metadata
```

## Debugging Configuration

### Validate YAML Structure

```bash
# Use yamllint
npm install -g yaml-lint
yamllint config/sync-config.yaml
```

### Test Configuration Sections

Comment out sections to isolate issues:

```yaml
# Test field mappings one at a time
mappings:
  # This mapping works
  - jpd: "fields.summary"
    github: "title"
    
  # Commenting out to test
  # - jpd: "fields.customfield_10001"
  #   github: "labels"
```

### Verify Environment Variables

```bash
# Print all environment variables
env | grep -E "(JPD_|GITHUB_)"

# Test variable loading
node -e "require('dotenv').config(); console.log(process.env.JPD_BASE_URL)"
```

## Performance Profiling

### Time Operations

```bash
time pnpm run dev -- --dry-run
```

### Profile Node.js

```bash
node --prof node_modules/.bin/tsx src/index.ts
```

### Monitor Resource Usage

```bash
# During sync
top -pid $(pgrep -f "tsx src/index.ts")
```

## Log Analysis

### Search Logs

```bash
# Find errors
grep "ERROR" logs/sync.log

# Find specific issue
grep "MTT-5" logs/sync.log

# Count operations
grep "Created issue" logs/sync.log | wc -l
```

### Parse JSON Logs

```bash
# Pretty print
cat logs/sync.log | jq '.'

# Filter by level
cat logs/sync.log | jq 'select(.level == "error")'

# Extract messages
cat logs/sync.log | jq -r '.message'
```

## Common Debug Patterns

### Reproduce with Minimal Config

Create minimal config that reproduces issue:

```yaml
jpd:
  project_key: "MTT"

github:
  owner: "owner"
  repo: "repo"

mappings:
  - jpd: "fields.summary"
    github: "title"

statuses:
  "To Do":
    github_state: "open"
```

### Binary Search for Problem

Comment out half of configuration, test, repeat:

1. Comment out 50% of mappings
2. Test - does issue persist?
3. If yes, problem in active half
4. If no, problem in commented half
5. Repeat until isolated

### Compare Working vs Broken

Run two configs side-by-side:

```bash
# Working config
CONFIG_PATH=config/working.yaml pnpm run dev -- --dry-run

# Broken config
CONFIG_PATH=config/broken.yaml pnpm run dev -- --dry-run

# Compare outputs
diff working-output.txt broken-output.txt
```

## Getting Support

When asking for help, provide:

**System information:**
```bash
node --version
pnpm --version
uname -a
```

**Health report:**
```bash
pnpm run health-check --check-all > health.txt
```

**Debug output:**
```bash
DEBUG=1 pnpm run dev -- --dry-run > debug.txt 2>&1
```

**Configuration (sanitized):**
- Remove all credentials
- Remove internal URLs
- Keep structure intact

## Next Steps

- [Common Issues](./common-issues) - Frequent problems and solutions
- [Field Configuration](./field-configuration) - Field mapping issues
- [Sync Problems](./sync-problems) - Synchronization issues

:::warning Sensitive Information
Debug logs may contain API tokens, issue content, and other sensitive information. Always sanitize logs before sharing.
:::

:::tip Start Simple
When debugging, start with the simplest test case and add complexity gradually until the problem appears.
:::

