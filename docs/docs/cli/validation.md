# Validation and Testing Tools

Commands for validating configuration, testing connections, and checking system health.

## validate-config

Validates your sync configuration before running.

### Usage

```bash
pnpm run validate-config [config-path]
```

**Examples:**
```bash
# Validate default config
pnpm run validate-config

# Validate specific config
pnpm run validate-config config/prod-config.yaml

# Validate with custom env
CONFIG_PATH=config/custom.yaml pnpm run validate-config
```

### What It Validates

**Configuration File:**
- File exists and is readable
- Valid YAML syntax
- Required sections present
- Field types correct

**Environment Variables:**
- All required variables set
- URLs properly formatted
- Tokens have expected format

**JPD Configuration:**
- Field IDs exist in project
- Field types match actual types
- Required fields are populated
- Status names are valid

**Field Mappings:**
- Paths are correctly formatted
- Template syntax is valid
- Transform functions exist
- GitHub properties are valid

**Label Definitions:**
- Color codes are valid hex
- Names follow GitHub rules
- No duplicates

### Output

#### Successful Validation

```
Configuration Validation
========================

✓ Configuration file found
✓ YAML syntax valid
✓ Required sections present
✓ Environment variables set

JPD Validation
--------------
✓ Connection successful
✓ Project MTT accessible
✓ All 5 configured fields exist
✓ Field types match

Field Mappings
--------------
✓ All 12 mappings validated
✓ Template syntax correct
✓ Transform functions found

Labels
------
✓ All 15 label definitions valid
✓ Color codes correct

✓ Configuration valid!
```

#### Failed Validation

```
Configuration Validation
========================

✓ Configuration file found
✓ YAML syntax valid
✗ Validation errors found

Errors
------
✗ Field customfield_10001 not found in project MTT
  → Run: pnpm run discover-fields MTT

✗ Status "In Progress" not found in JPD workflow
  → Check exact status name in JPD (case-sensitive)

✗ Label color "GGGGGG" is invalid
  → Must be 6-character hex code without #

Please fix these errors and try again.
```

### Command Options

**--quiet**
- Suppress output except errors
- Exit code indicates success/failure
- Useful in scripts

```bash
if pnpm run validate-config --quiet; then
  echo "Config valid"
else
  echo "Config invalid"
fi
```

**--fix**
- Attempt to auto-fix common issues
- Backs up original config
- Shows what was fixed

```bash
pnpm run validate-config --fix
```

## test-connection

Tests API connections to JPD and GitHub.

### Usage

```bash
pnpm run test-connection [options]
```

### What It Tests

**JPD Connection:**
- Base URL is reachable
- Authentication works
- API responds correctly
- Rate limit status
- Can fetch issues

**GitHub Connection:**
- Authentication valid
- Repository accessible
- Permissions sufficient
- Rate limit status
- Can create issues

### Output

```
Connection Test
===============

JPD Connection
--------------
→ Testing https://acme-corp.atlassian.net
✓ Connection successful
✓ Authentication valid
✓ Found 42 issues in project MTT
✓ Rate limit: 95/100 remaining

GitHub Connection
-----------------
→ Testing acme-corp/product-roadmap
✓ Connection successful
✓ Authentication valid
✓ Repository accessible
✓ Write permissions confirmed
✓ Rate limit: 4850/5000 remaining

✓ All connections successful!
```

### Caching

Connection tests are cached for 5 minutes:

```
Connection Test
===============

JPD Connection
--------------
✓ Cached (tested 2 minutes ago)

GitHub Connection
-----------------
✓ Connection successful
✓ Rate limit: 4850/5000 remaining
```

### Command Options

**--force**
- Skip cache, test fresh
- Useful for troubleshooting

```bash
pnpm run test-connection --force
```

**--jpd-only**
- Test only JPD connection

```bash
pnpm run test-connection --jpd-only
```

**--github-only**
- Test only GitHub connection

```bash
pnpm run test-connection --github-only
```

## discover-fields

Discovers and displays JPD custom fields.

### Usage

```bash
pnpm run discover-fields PROJECT_KEY
```

**Example:**
```bash
pnpm run discover-fields MTT
```

### Output

```
Field Discovery: Project MTT
============================

Standard Fields
---------------
summary          | text     | ✓ Set  | Mobile App Redesign
description      | text     | ✓ Set  | Full description...
status           | status   | ✓ Set  | In Progress
priority         | priority | ✓ Set  | High

Custom Fields
-------------
customfield_10001 | select    | ✓ Set  | High
customfield_10002 | array     | ✓ Set  | ["Mobile", "Web"]
customfield_10003 | number    | ✓ Set  | 8
customfield_10004 | text      | ✓ Set  | Additional notes
customfield_10005 | user      | ✗ Empty | 
customfield_10006 | date      | ✓ Set  | 2024-12-31

Configuration Snippet
---------------------
Copy this to your config file:

fields:
  customfield_10001:
    field_id: "customfield_10001"
    field_type: "select"
    required: false
    
  customfield_10002:
    field_id: "customfield_10002"
    field_type: "array"
    required: false
    
  customfield_10003:
    field_id: "customfield_10003"
    field_type: "number"
    required: false
```

### Field Information

**Field ID**
- Internal identifier
- Use in `field_id` configuration
- Format: `customfield_XXXXX`

**Type**
- Detected field type
- Use in `field_type` configuration
- Types: select, multiselect, number, text, user, date, array

**Status**
- Whether field has values
- ✓ Set = field is populated
- ✗ Empty = field has no values

**Sample Value**
- Example from actual issue
- Helps understand field content
- Truncated if too long

### Command Options

**--format json**
- Output as JSON
- Useful for scripting

```bash
pnpm run discover-fields MTT --format json > fields.json
```

**--show-empty**
- Include empty fields
- Default: only shows populated fields

```bash
pnpm run discover-fields MTT --show-empty
```

## health-check

Comprehensive system health check.

### Usage

```bash
pnpm run health-check
```

### What It Checks

**System Status:**
- Node.js version
- Package dependencies
- Configuration files

**API Connections:**
- JPD API status
- GitHub API status
- Rate limits

**Configuration:**
- Config validation
- Environment variables
- Field mappings

**Recent Sync:**
- Last sync timestamp
- Success/failure status
- Issues synced

### Output

```
System Health Check
===================

System
------
✓ Node.js v22.0.0
✓ All dependencies installed
✓ Configuration files present

API Status
----------
✓ JPD API: Operational
  Rate limit: 95/100 (resets in 45m)
  
✓ GitHub API: Operational
  Rate limit: 4850/5000 (resets in 52m)

Configuration
-------------
✓ Config validation passed
✓ All environment variables set
✓ 5/5 required fields accessible

Recent Activity
---------------
Last sync: 2024-12-30 10:30 AM (15 minutes ago)
Status: Success
Issues synced: 25 (3 created, 2 updated)

✓ System healthy!
```

### Health Score

The command reports overall health:

```
System Health Score: 95/100

Recommendations:
→ GitHub rate limit at 30% (consider reducing sync frequency)
→ 2 optional fields inaccessible (non-critical)
```

### Command Options

**--json**
- Output as JSON
- Useful for monitoring systems

```bash
pnpm run health-check --json
```

**--check-all**
- Perform extended checks
- Takes longer but more thorough

```bash
pnpm run health-check --check-all
```

## Using Validation in Scripts

### Pre-Sync Validation

```bash
#!/bin/bash
set -e

echo "Validating configuration..."
pnpm run validate-config

echo "Testing connections..."
pnpm run test-connection

echo "Running sync..."
pnpm run dev
```

### Health Check Before Deployment

```bash
#!/bin/bash

# Check health before deploying
if pnpm run health-check --quiet; then
  echo "✓ System healthy, deploying..."
  ./deploy.sh
else
  echo "✗ Health check failed, aborting deployment"
  exit 1
fi
```

### Continuous Validation

```bash
#!/bin/bash

# Validate configuration in CI/CD
pnpm run validate-config --quiet || exit 1

echo "Configuration valid!"
```

## Troubleshooting with Validation Tools

### "Config validation failed"

```bash
# Get detailed error messages
pnpm run validate-config

# Check specific fields
pnpm run discover-fields YOUR_PROJECT

# Verify field IDs and types match
```

### "Connection failed"

```bash
# Test connections separately
pnpm run test-connection --jpd-only
pnpm run test-connection --github-only

# Check credentials
cat .env

# Verify network access
curl https://your-company.atlassian.net
```

### "Field not found"

```bash
# Discover available fields
pnpm run discover-fields YOUR_PROJECT

# Compare with config
cat config/sync-config.yaml

# Update config with correct field IDs
```

### "Rate limit exceeded"

```bash
# Check rate limit status
pnpm run health-check

# Wait for reset or reduce frequency
```

## Best Practices

### Before Every Sync

```bash
pnpm run validate-config && pnpm run dev
```

### After Config Changes

```bash
pnpm run validate-config
pnpm run test-connection --force
pnpm run dev -- --dry-run
```

### Regular Health Checks

```bash
# Add to cron
0 */6 * * * cd /path/to/connector && pnpm run health-check --json > health.log
```

### In CI/CD Pipelines

```yaml
- name: Validate configuration
  run: pnpm run validate-config
  
- name: Test connections
  run: pnpm run test-connection
  
- name: Check health
  run: pnpm run health-check
```

## Next Steps

- [Sync Commands](./sync-commands) - Run synchronization
- [Label Commands](./labels) - Manage GitHub labels
- [Common Workflows](./workflows) - Typical command sequences
- [Troubleshooting](../troubleshooting/common-issues) - Debug common problems

:::tip Validate Early, Validate Often
Run `validate-config` after any configuration changes and before every sync to catch errors early.
:::

