# Common Command Workflows

Typical command sequences for common tasks and scenarios.

## First-Time Setup

Complete setup workflow from scratch.

```bash
# 1. Install dependencies
pnpm install

# 2. Run interactive setup wizard
pnpm run setup

# 3. Validate generated configuration
pnpm run validate-config

# 4. Test connections
pnpm run test-connection

# 5. Preview what will be synced
pnpm run dev -- --dry-run

# 6. Review dry-run output carefully

# 7. Run actual sync
pnpm run dev

# 8. Verify results in GitHub
open https://github.com/OWNER/REPO/issues
```

**Time required:** 15-20 minutes

## Daily Sync Workflow

Regular synchronization routine.

```bash
# Quick validation
pnpm run validate-config

# Preview changes
pnpm run dev -- --dry-run

# If dry-run looks good, sync
pnpm run dev
```

**Time required:** 2-5 minutes

### Automated Daily Sync

```bash
#!/bin/bash
# daily-sync.sh

set -e

echo "Starting daily sync..."

# Validate
if ! pnpm run validate-config --quiet; then
  echo "Configuration invalid"
  exit 1
fi

# Sync
pnpm run dev

echo "Sync complete!"
```

## Adding New Fields

Workflow for adding new custom field mappings.

```bash
# 1. Discover available fields
pnpm run discover-fields YOUR_PROJECT

# 2. Copy field ID from output
# Example: customfield_10006

# 3. Edit configuration
nano config/sync-config.yaml

# Add to fields section:
#   customfield_10006:
#     field_id: "customfield_10006"
#     field_type: "select"
#     required: false

# Add to mappings section:
#   - jpd: "fields.customfield_10006.value"
#     github: "labels"
#     template: "category:{{fields.customfield_10006.value | lowercase}}"

# 4. Validate new configuration
pnpm run validate-config

# 5. Test with dry-run
pnpm run dev -- --dry-run

# 6. If mappings look correct, sync
pnpm run dev
```

**Time required:** 10-15 minutes

## Troubleshooting Sync Issues

Diagnostic workflow when sync isn't working as expected.

```bash
# 1. Check system health
pnpm run health-check

# 2. Validate configuration
pnpm run validate-config

# 3. Test connections
pnpm run test-connection --force

# 4. Discover fields (verify field IDs)
pnpm run discover-fields YOUR_PROJECT

# 5. Run dry-run with debug logging
DEBUG=1 pnpm run dev -- --dry-run

# 6. Review debug output for errors

# 7. Fix issues and test again
pnpm run validate-config && pnpm run dev -- --dry-run
```

**Time required:** 15-30 minutes

### Debug Command Sequence

```bash
#!/bin/bash
# debug-sync.sh

echo "=== System Health ==="
pnpm run health-check

echo -e "\n=== Configuration Validation ==="
pnpm run validate-config

echo -e "\n=== Connection Test ==="
pnpm run test-connection --force

echo -e "\n=== Field Discovery ==="
pnpm run discover-fields $1

echo -e "\n=== Debug Dry-Run ==="
DEBUG=1 pnpm run dev -- --dry-run
```

Usage:
```bash
./debug-sync.sh YOUR_PROJECT
```

## Changing Project or Repository

Workflow for switching to different JPD project or GitHub repo.

```bash
# 1. Discover fields in new project
pnpm run discover-fields NEW_PROJECT

# 2. Create new configuration file
cp config/sync-config.yaml config/new-project-config.yaml

# 3. Edit new configuration
nano config/new-project-config.yaml

# Update:
#   jpd:
#     project_key: "NEW_PROJECT"
#   github:
#     owner: "new-owner"
#     repo: "new-repo"

# 4. Update environment variables
nano .env

# Update:
#   GITHUB_OWNER=new-owner
#   GITHUB_REPO=new-repo

# 5. Validate new configuration
CONFIG_PATH=config/new-project-config.yaml pnpm run validate-config

# 6. Test with dry-run
CONFIG_PATH=config/new-project-config.yaml pnpm run dev -- --dry-run

# 7. Sync to new repository
CONFIG_PATH=config/new-project-config.yaml pnpm run dev
```

**Time required:** 20-30 minutes

## Configuration Updates

Workflow for modifying existing configuration.

```bash
# 1. Back up current configuration
cp config/sync-config.yaml config/sync-config.yaml.backup

# 2. Make changes
nano config/sync-config.yaml

# 3. Validate changes
pnpm run validate-config

# 4. Test impact with dry-run
pnpm run dev -- --dry-run

# 5. Review ALL planned changes carefully
# Configuration changes can affect many issues

# 6. If changes look correct, sync
pnpm run dev

# 7. Verify results
open https://github.com/OWNER/REPO/issues

# 8. If successful, commit changes
git add config/sync-config.yaml
git commit -m "feat: update field mappings"
```

**Time required:** 10-15 minutes

## Label Management

Complete label setup and maintenance workflow.

### Initial Label Setup

```bash
# 1. Review label definitions in config
cat config/sync-config.yaml | grep -A 20 "labels:"

# 2. Preview labels
pnpm run setup-labels --preview

# 3. Create labels
pnpm run setup-labels

# 4. Verify in GitHub
open https://github.com/OWNER/REPO/labels
```

### Updating Labels

```bash
# 1. Edit label definitions
nano config/sync-config.yaml

# 2. Update descriptions
pnpm run setup-labels --update-descriptions

# 3. For color changes, manually update in GitHub
open https://github.com/OWNER/REPO/labels
```

### Cleaning Up Labels

```bash
# 1. Identify deprecated labels
pnpm run clear-labels --dry-run label-name

# 2. Remove specific labels
pnpm run clear-labels deprecated-label-1 deprecated-label-2

# 3. Or start fresh
pnpm run clear-all-labels
pnpm run setup-labels
```

## Testing and Validation

Comprehensive testing workflow before production deployment.

```bash
# 1. Validate configuration
pnpm run validate-config

# 2. Check system health
pnpm run health-check

# 3. Test connections
pnpm run test-connection --force

# 4. Verify field mappings
pnpm run discover-fields YOUR_PROJECT

# 5. Run extensive dry-run
DEBUG=1 pnpm run dev -- --dry-run > dry-run-output.log

# 6. Review dry-run log
less dry-run-output.log

# 7. Test with limited scope
pnpm run dev -- --filter "project = MTT AND created >= -7d" --dry-run

# 8. If all tests pass, proceed
pnpm run dev

# 9. Monitor first real sync
tail -f logs/sync.log
```

**Time required:** 30-45 minutes

## Automated Workflows

### Git-Based Deployment

```bash
#!/bin/bash
# deploy.sh

set -e

echo "Deploying sync configuration..."

# 1. Pull latest changes
git pull origin main

# 2. Install/update dependencies
pnpm install

# 3. Validate
pnpm run validate-config

# 4. Test connections
pnpm run test-connection

# 5. Dry-run
pnpm run dev -- --dry-run

# 6. Confirm deployment
read -p "Deploy to production? (yes/no): " confirm
if [ "$confirm" = "yes" ]; then
  pnpm run dev
  echo "Deployment complete!"
else
  echo "Deployment cancelled"
  exit 1
fi
```

### Scheduled Sync

```bash
#!/bin/bash
# scheduled-sync.sh

# Run every 15 minutes via cron:
# */15 * * * * /path/to/scheduled-sync.sh

cd /path/to/jpd-to-github-connector

# Quick health check
if ! pnpm run health-check --quiet; then
  echo "Health check failed, skipping sync"
  exit 1
fi

# Validate
if ! pnpm run validate-config --quiet; then
  echo "Validation failed, skipping sync"
  exit 1
fi

# Sync
pnpm run dev >> logs/scheduled-sync.log 2>&1
```

### Multi-Environment Sync

```bash
#!/bin/bash
# multi-env-sync.sh

environments=("dev" "staging" "prod")

for env in "${environments[@]}"; do
  echo "Syncing $env environment..."
  
  CONFIG_PATH="config/$env-config.yaml" \
  pnpm run validate-config
  
  if [ $? -eq 0 ]; then
    CONFIG_PATH="config/$env-config.yaml" \
    pnpm run dev
  else
    echo "Validation failed for $env, skipping"
  fi
  
  echo "---"
done
```

## Emergency Procedures

### Rollback After Bad Sync

```bash
# 1. Stop any running syncs
# Press Ctrl+C

# 2. Restore previous configuration
cp config/sync-config.yaml.backup config/sync-config.yaml

# 3. Validate restored config
pnpm run validate-config

# 4. Test with dry-run
pnpm run dev -- --dry-run

# 5. Manually fix issues in GitHub if needed
# - Close incorrectly created issues
# - Remove incorrect labels
# - Update issue content

# 6. Run sync with corrected config
pnpm run dev
```

### Connection Failure Recovery

```bash
# 1. Check network connectivity
ping github.com
ping your-company.atlassian.net

# 2. Verify credentials
cat .env | grep -E "(JPD_|GITHUB_)"

# 3. Test each connection separately
pnpm run test-connection --jpd-only
pnpm run test-connection --github-only

# 4. Check rate limits
pnpm run health-check

# 5. If rate limited, wait and retry
sleep 300  # Wait 5 minutes
pnpm run test-connection --force

# 6. Resume sync
pnpm run dev
```

## Performance Optimization

### Large Project Sync

```bash
# 1. Sync recent issues first
pnpm run dev -- --filter "project = MTT AND created >= -30d"

# 2. Verify results
open https://github.com/OWNER/REPO/issues

# 3. Sync older issues in batches
pnpm run dev -- --filter "project = MTT AND created >= -60d AND created < -30d"
pnpm run dev -- --filter "project = MTT AND created >= -90d AND created < -60d"

# 4. Finally, sync all
pnpm run dev
```

### Parallel Syncs (Multiple Projects)

```bash
#!/bin/bash
# parallel-sync.sh

projects=("MTT" "WEB" "API")

for project in "${projects[@]}"; do
  (
    echo "Syncing $project..."
    CONFIG_PATH="config/$project-config.yaml" pnpm run dev
  ) &
done

# Wait for all to complete
wait

echo "All syncs complete!"
```

## Monitoring and Maintenance

### Weekly Maintenance

```bash
#!/bin/bash
# weekly-maintenance.sh

echo "=== Weekly Maintenance ==="

# 1. System health
echo "Checking system health..."
pnpm run health-check --check-all

# 2. Update dependencies
echo "Updating dependencies..."
pnpm update

# 3. Validate configuration
echo "Validating configuration..."
pnpm run validate-config

# 4. Test connections
echo "Testing connections..."
pnpm run test-connection --force

# 5. Clean up logs
echo "Cleaning old logs..."
find logs/ -name "*.log" -mtime +30 -delete

# 6. Generate report
echo "Generating weekly report..."
pnpm run health-check --json > reports/weekly-$(date +%Y-%m-%d).json

echo "Maintenance complete!"
```

## Next Steps

- [CLI Overview](./overview) - All available commands
- [Sync Commands](./sync-commands) - Detailed sync options
- [Validation Tools](./validation) - Testing and validation
- [Troubleshooting](../troubleshooting/common-issues) - Debug issues

:::tip Create Your Own Workflows
Save frequently used command sequences as shell scripts in a `scripts/` directory for easy reuse.
:::

:::tip Automate Wisely
Start with manual workflows until you understand the sync behavior, then gradually introduce automation.
:::

