# Label Cleanup Guide

This guide helps you remove outdated label formats from prior JPD syncs.

## Problem

You have **two generations** of labels from different sync implementations:

### Old (Noise) Labels ❌
- `jpd-synced:MTT-12` - ID embedded in label
- `story`, `now`, `next` - Plain labels without prefixes
- `sample-ideas`, `expand-horizons`, `win-enterprise-customers` - Bare category/theme labels

### New (Clean) Labels ✓
- `jpd-synced` - Clean tracking label (ID in hidden metadata)
- `category:*`, `priority:*`, `theme:*`, `type:*` - Prefixed labels
- `story:MTT-*`, `epic:MTT-*` - Hierarchy labels with IDs

## Quick Cleanup (Automated)

Run the interactive cleanup script:

```bash
./cleanup-old-labels.sh
```

This walks you through each cleanup step with previews.

## Manual Cleanup (Step by Step)

If you prefer manual control:

### Step 1: Remove Old jpd-synced:MTT-* Labels

```bash
# Preview
pnpm clear-labels --regex "^jpd-synced:MTT-" --dry-run --only-synced

# Execute
pnpm clear-labels --regex "^jpd-synced:MTT-" --only-synced
```

**What this does:** Removes `jpd-synced:MTT-12`, keeps `jpd-synced`

---

### Step 2: Remove Bare Priority Labels

```bash
# Preview
pnpm clear-labels --regex "^(now|next|later)$" --dry-run --only-synced

# Execute
pnpm clear-labels --regex "^(now|next|later)$" --only-synced
```

**What this does:** Removes `now`, `next`, `later` but keeps `priority:now`, `priority:next`, etc.

---

### Step 3: Remove Bare Theme Labels

```bash
# Preview
pnpm clear-labels --regex "^(expand-horizons|win-enterprise-customers)$" --dry-run --only-synced

# Execute
pnpm clear-labels --regex "^(expand-horizons|win-enterprise-customers)$" --only-synced
```

**What this does:** Removes bare theme names, keeps `theme:expand-horizons`, etc.

---

### Step 4: Remove Bare Category Labels

```bash
# Preview
pnpm clear-labels --regex "^sample-ideas$" --dry-run --only-synced

# Execute
pnpm clear-labels --regex "^sample-ideas$" --only-synced
```

**What this does:** Removes `sample-ideas`, keeps `category:sample-ideas`

---

### Step 5: Remove Bare "story" Label

```bash
# Preview
pnpm clear-labels --regex "^story$" --dry-run --only-synced

# Execute
pnpm clear-labels --regex "^story$" --only-synced
```

**What this does:** Removes plain `story` label, keeps `story:MTT-12`, `type:story`, etc.

---

## Verify Results

After cleanup, your issues should have consistent labels:

```
✓ jpd-synced
✓ category:sample-ideas
✓ priority:now
✓ theme:expand-horizons
✓ type:story
✓ story:MTT-12
```

## Custom Cleanup

If you have other noise labels, use the clear-labels tool directly:

```bash
# Remove labels by prefix
pnpm clear-labels --pattern "old-prefix:" --dry-run

# Remove labels by exact match
pnpm clear-labels --regex "^exact-label-name$" --dry-run

# Remove multiple patterns with regex
pnpm clear-labels --regex "^(label1|label2|label3)$" --dry-run
```

## Safety Tips

1. **Always use `--dry-run` first** to preview changes
2. Use `--only-synced` to limit scope to JPD-synced issues
3. Test on a single issue before bulk cleanup
4. Keep a backup list of issues before major cleanups

## Troubleshooting

### "No issues found"
- Check that `GITHUB_REPO` is set in `.env`
- Or use `--repo owner/repo` flag

### Labels not being removed
- Check the exact label text (case-sensitive)
- Use `--regex` for exact matches: `^label-name$`
- Verify pattern with `--dry-run` first

### Accidentally removed wrong labels
- Labels can be re-added manually in GitHub
- Or re-run your sync to restore proper labels

