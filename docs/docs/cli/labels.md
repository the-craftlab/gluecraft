# Label Management Commands

Commands for creating, managing, and removing GitHub labels based on your configuration.

## setup-labels

Creates GitHub labels defined in your configuration.

### Usage

```bash
pnpm run setup-labels [options]
```

### What It Does

1. Reads label definitions from `config/sync-config.yaml`
2. Connects to GitHub repository
3. Creates labels that don't exist
4. Skips labels that already exist
5. Optionally updates label descriptions

### Output

```
GitHub Label Setup
==================
Config: config/sync-config.yaml
Repository: acme-corp/product-roadmap

Found 15 labels to create

Hierarchy Labels
----------------
✓ epic (created)
✓ story (skipped - already exists)
✓ task (created)

Priority Labels
---------------
✓ priority:critical (created)
✓ priority:high (created)
✓ priority:medium (created)
✓ priority:low (created)

Theme Labels
------------
✓ theme:mobile (created)
✓ theme:web (created)
✓ theme:api (created)

Summary
-------
Created: 12 labels
Skipped: 3 labels (already exist)

View labels at:
https://github.com/acme-corp/product-roadmap/labels
```

### Command Options

**--preview**
- Show what labels would be created without creating them
- Safe way to review labels before creation

```bash
pnpm run setup-labels --preview
```

**Preview output:**
```
GitHub Label Setup (Preview)
=============================

Would create 12 labels:

Hierarchy:
  epic - #6554C0 - High-level initiative
  story - #0052CC - Deliverable unit of work
  task - #4C9AFF - Implementation task

Priorities:
  priority:critical - #DE350B - Critical priority
  priority:high - #FF5630 - High priority
  priority:medium - #FFAB00 - Medium priority
  priority:low - #97A0AF - Low priority

No changes made (preview mode)
```

**--update-descriptions**
- Update descriptions for existing labels
- Colors remain unchanged

```bash
pnpm run setup-labels --update-descriptions
```

**--force**
- Recreate all labels (deletes and recreates)
- Updates colors and descriptions
- **Caution:** Affects all issues with these labels

```bash
pnpm run setup-labels --force
```

### Label Configuration

Labels are defined in `config/sync-config.yaml`:

```yaml
labels:
  hierarchy:
    - name: "epic"
      color: "6554C0"  # Hex color (no #)
      description: "High-level initiative"
      
  priorities:
    - name: "priority:high"
      color: "FF5630"
      description: "High priority"
```

See [Label Configuration](../configuration/labels) for details.

### When to Run

**Run setup-labels when:**
- Setting up a new repository
- Adding new label definitions to config
- Wanting to preview label strategy
- Ensuring labels exist before first sync

**Not necessary when:**
- Labels are created automatically during sync
- This command is optional but useful for upfront setup

## clear-labels

Removes specific labels from GitHub repository.

### Usage

```bash
pnpm run clear-labels LABEL_NAME [LABEL_NAME...]
```

### Examples

**Remove single label:**
```bash
pnpm run clear-labels priority:low
```

**Remove multiple labels:**
```bash
pnpm run clear-labels priority:low priority:medium theme:deprecated
```

### Output

```
Removing GitHub Labels
======================
Repository: acme-corp/product-roadmap

Removing labels...
✓ Removed priority:low
✓ Removed priority:medium
✗ Label theme:deprecated not found

Summary
-------
Removed: 2 labels
Not found: 1 label

Warning: These labels have been removed from ALL issues
```

### What It Does

- Removes labels from GitHub repository
- Removes from ALL issues that have them
- Cannot be undone (unless labels are recreated)

### Command Options

**--dry-run**
- Show what would be removed without removing

```bash
pnpm run clear-labels priority:low --dry-run
```

**--confirm**
- Skip confirmation prompt (use in scripts)

```bash
pnpm run clear-labels priority:low --confirm
```

## clear-all-labels

Removes ALL labels defined in your configuration from GitHub.

### Usage

```bash
pnpm run clear-all-labels
```

### What It Does

1. Reads label definitions from config
2. Prompts for confirmation (dangerous operation)
3. Removes ALL configured labels from GitHub
4. Removes from ALL issues

### Output

```
Remove All Configured Labels
=============================
Repository: acme-corp/product-roadmap

This will remove 15 labels:
  epic, story, task
  priority:critical, priority:high, priority:medium, priority:low
  theme:mobile, theme:web, theme:api
  type:feature, type:bug, type:tech-debt
  ...

Warning: This will affect ALL issues in your repository!

Are you sure? (yes/no):
> yes

Removing labels...
✓ Removed epic (was on 5 issues)
✓ Removed story (was on 12 issues)
✓ Removed priority:high (was on 8 issues)
...

Summary
-------
Removed: 15 labels
Issues affected: 25 issues
```

### Safety Prompts

Multiple confirmations required:

```
Are you sure you want to remove ALL configured labels? (yes/no): yes
Type the repository name to confirm (acme-corp/product-roadmap): acme-corp/product-roadmap
This cannot be undone. Proceed? (yes/no): yes
```

### Command Options

**--force**
- Skip all confirmations (dangerous!)
- Use only in automated scripts where you're certain

```bash
pnpm run clear-all-labels --force
```

**--dry-run**
- Show what would be removed without removing

```bash
pnpm run clear-all-labels --dry-run
```

## Label Management Workflows

### Initial Setup

```bash
# 1. Review labels in config
cat config/sync-config.yaml

# 2. Preview what will be created
pnpm run setup-labels --preview

# 3. Create labels
pnpm run setup-labels

# 4. Verify in GitHub
open https://github.com/OWNER/REPO/labels
```

### Updating Label Descriptions

```bash
# 1. Update descriptions in config
nano config/sync-config.yaml

# 2. Update in GitHub
pnpm run setup-labels --update-descriptions
```

### Changing Label Colors

Label colors cannot be updated via CLI. Options:

**Option 1: Manual Update**
1. Go to GitHub → Settings → Labels
2. Edit label colors manually

**Option 2: Recreate Labels**
```bash
# Warning: Removes label from all issues temporarily
pnpm run clear-labels old-label-name
pnpm run setup-labels
```

### Removing Deprecated Labels

```bash
# 1. Remove from config
nano config/sync-config.yaml

# 2. Remove from GitHub
pnpm run clear-labels deprecated-label-1 deprecated-label-2
```

### Clean Slate

```bash
# Remove all configured labels
pnpm run clear-all-labels

# Recreate with new config
pnpm run setup-labels
```

## Label Naming Best Practices

### Use Prefixes for Categories

```
priority:high
priority:medium
priority:low

theme:mobile
theme:web

type:feature
type:bug
```

Benefits:
- Easy filtering in GitHub
- Clear categorization
- Prevents naming conflicts

### Keep Names Short

```
Good: priority:high
Bad: priority-level-high-needs-immediate-attention
```

### Use Kebab-Case

```
Good: tech-debt, user-facing
Bad: TechDebt, user_facing, USER FACING
```

### Consistent Capitalization

```
Good: priority:high, theme:mobile
Bad: Priority:High, THEME:MOBILE
```

## Troubleshooting

### "Label already exists"

When running `setup-labels`:

```
✓ priority:high (skipped - already exists)
```

This is normal - labels aren't duplicated.

**To update existing label:**
```bash
pnpm run setup-labels --update-descriptions
```

### "Permission denied creating label"

**Cause:** GitHub token lacks `repo` scope

**Solution:**
1. Go to GitHub → Settings → Developer settings → Tokens
2. Regenerate token with `repo` scope
3. Update `GITHUB_TOKEN` in `.env`

### "Label name invalid"

**Cause:** Label name has special characters

**Invalid characters:**
- Spaces at start/end
- Special chars except `-` and `_`
- More than 50 characters

**Solution:**
Update label names in config:
```yaml
# Bad
- name: "priority: high"  # Space after colon

# Good
- name: "priority:high"  # No space
```

### "Cannot remove label"

**Cause:** Label doesn't exist in GitHub

**Check:**
```bash
pnpm run clear-labels label-name --dry-run
```

**List existing labels:**
Visit: `https://github.com/OWNER/REPO/labels`

## Automation

### In CI/CD

```yaml
# .github/workflows/setup-labels.yml
name: Setup Labels

on:
  push:
    paths:
      - 'config/sync-config.yaml'

jobs:
  labels:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Setup labels
        run: pnpm run setup-labels --update-descriptions
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Pre-Sync Script

```bash
#!/bin/bash
# Ensure labels exist before syncing

echo "Ensuring labels exist..."
pnpm run setup-labels --preview

echo "Creating missing labels..."
pnpm run setup-labels

echo "Running sync..."
pnpm run dev
```

## Next Steps

- [Label Configuration](../configuration/labels) - Define label strategy
- [Sync Commands](./sync-commands) - Run synchronization
- [Common Workflows](./workflows) - Typical command sequences

:::tip Automatic Label Creation
Labels are automatically created during sync if they don't exist. Using `setup-labels` is optional but useful for reviewing your label strategy before syncing.
:::

:::warning Removing Labels
Removing labels with `clear-labels` or `clear-all-labels` removes them from ALL issues in your repository, not just synced issues. This action cannot be undone.
:::

