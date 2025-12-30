# CLI Tools Overview

The JPD to GitHub Connector provides command-line tools for setup, validation, and synchronization operations.

## Available Commands

The connector includes several CLI commands organized by purpose:

### Setup and Configuration
- `pnpm run setup` - Interactive setup wizard
- `pnpm run validate-config` - Validate configuration file
- `pnpm run test-connection` - Test API connections

### Discovery and Inspection
- `pnpm run discover-fields` - Discover JPD custom fields
- `pnpm run health-check` - Check system health and rate limits

### Sync Operations
- `pnpm run dev` - Run synchronization
- `pnpm run dev -- --dry-run` - Preview sync without changes

### Label Management
- `pnpm run setup-labels` - Create labels from configuration
- `pnpm run clear-labels` - Remove specific labels
- `pnpm run clear-all-labels` - Remove all configured labels

## When to Use CLI vs Setup Wizard

**Use the setup wizard when:**
- First-time setup
- You want guidance through configuration
- You're unsure what values to use
- You want automatic field discovery

**Use individual CLI commands when:**
- Making specific configuration changes
- Automating tasks in scripts
- Troubleshooting specific issues
- Working with multiple configurations

## Command Structure

Most commands follow this pattern:

```bash
pnpm run <command> [arguments] [options]
```

**Examples:**
```bash
# Command with argument
pnpm run discover-fields MTT

# Command with option
pnpm run dev -- --dry-run

# Command with both
pnpm run validate-config config/my-config.yaml
```

## Getting Help

Most commands provide help when run with `--help`:

```bash
pnpm run setup -- --help
pnpm run dev -- --help
```

## Common Options

Several commands support common options:

**--dry-run**
- Preview changes without making them
- Available for: `dev`

**--config PATH**
- Use alternative configuration file
- Available for: most commands

**--force**
- Skip caches and confirmations
- Available for: `test-connection`, `setup-labels`

**--preview**
- Show what would happen without doing it
- Available for: `setup-labels`

## Output and Logging

### Standard Output

Commands provide clear, structured output:

```
✓ Success messages in green
⚠ Warnings in yellow
✗ Errors in red
→ Information messages
```

### Debug Mode

Enable verbose logging:

```bash
DEBUG=1 pnpm run dev
```

Or set in `.env`:

```bash
DEBUG=true
```

### Log Levels

Set the log level for output:

```bash
LOG_LEVEL=debug pnpm run dev
```

Levels: `error`, `warn`, `info`, `debug`, `trace`

## Exit Codes

Commands follow standard Unix exit conventions:

- `0` - Success
- `1` - General error
- `2` - Configuration error
- `3` - Connection error
- `130` - Interrupted by user (Ctrl+C)

## Environment Variables

Commands respect environment variables from `.env`:

```bash
JPD_BASE_URL=https://company.atlassian.net
JPD_EMAIL=user@company.com
JPD_API_KEY=token
GITHUB_TOKEN=ghp_token
GITHUB_OWNER=owner
GITHUB_REPO=repo
CONFIG_PATH=./config/sync-config.yaml
DEBUG=false
```

## Scripting and Automation

CLI commands are designed for automation:

### Check if sync needed

```bash
#!/bin/bash
if pnpm run validate-config --quiet; then
  pnpm run dev
else
  echo "Configuration invalid"
  exit 1
fi
```

### Conditional dry-run

```bash
#!/bin/bash
# Always dry-run in dev, real sync in prod
if [ "$ENV" = "production" ]; then
  pnpm run dev
else
  pnpm run dev -- --dry-run
fi
```

### Error handling

```bash
#!/bin/bash
set -e  # Exit on error

pnpm run validate-config
pnpm run test-connection
pnpm run dev -- --dry-run
pnpm run dev
```

## Performance Considerations

### Caching

Several commands cache results:

**test-connection** - Caches for 5 minutes
```bash
# Use cache
pnpm run test-connection

# Force fresh test
pnpm run test-connection --force
```

**discover-fields** - No caching (always fresh)
```bash
pnpm run discover-fields MTT
```

### Rate Limiting

Commands handle rate limits automatically:
- Exponential backoff on failures
- Configurable retry attempts
- Clear progress indicators

## Next Steps

Learn about specific command categories:

- [Setup Wizard](./setup-wizard) - Interactive configuration setup
- [Sync Commands](./sync-commands) - Running synchronization
- [Validation Tools](./validation) - Configuration and connection validation
- [Label Management](./labels) - GitHub label operations
- [Common Workflows](./workflows) - Typical command sequences

## Quick Reference

### First-Time Setup
```bash
pnpm run setup
```

### Daily Sync
```bash
pnpm run validate-config && pnpm run dev
```

### Troubleshooting
```bash
pnpm run test-connection
pnpm run discover-fields YOUR_PROJECT
DEBUG=1 pnpm run dev -- --dry-run
```

### Label Management
```bash
pnpm run setup-labels --preview
pnpm run setup-labels
```

:::tip Command Chaining
Chain commands with `&&` to run sequentially, stopping on first error:
```bash
pnpm run validate-config && pnpm run dev -- --dry-run && pnpm run dev
```
:::

