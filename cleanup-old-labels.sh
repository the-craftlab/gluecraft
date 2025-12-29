#!/bin/bash

# Cleanup Old JPD Sync Labels
# This script removes outdated label formats from prior syncs

echo "=================================================="
echo "JPD Sync Label Cleanup"
echo "=================================================="
echo ""
echo "This will remove OLD label formats and keep NEW ones:"
echo ""
echo "REMOVE:"
echo "  ✗ jpd-synced:MTT-* (old ID-embedded format)"
echo "  ✗ Plain labels: story, now, next, later, sample-ideas, etc."
echo ""
echo "KEEP:"
echo "  ✓ jpd-synced (clean format)"
echo "  ✓ category:*, priority:*, theme:*, type:*"
echo "  ✓ story:MTT-*, epic:MTT-* (hierarchy)"
echo ""
echo "=================================================="
echo ""

# Step 1: DRY RUN - Remove old jpd-synced:MTT-* labels
echo "Step 1: Preview removal of old jpd-synced:MTT-* labels"
echo "------------------------------------------------------"
pnpm clear-labels --regex "^jpd-synced:MTT-" --dry-run --only-synced
echo ""

read -p "Continue with Step 1? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo "Executing Step 1..."
pnpm clear-labels --regex "^jpd-synced:MTT-" --only-synced
echo ""

# Step 2: Remove bare priority labels (now, next, later)
echo "Step 2: Preview removal of bare priority labels"
echo "------------------------------------------------------"
echo "This removes: now, next, later (but keeps priority:now, priority:next, etc.)"
echo ""
pnpm clear-labels --regex "^(now|next|later)$" --dry-run --only-synced
echo ""

read -p "Continue with Step 2? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipped Step 2."
else
    echo "Executing Step 2..."
    pnpm clear-labels --regex "^(now|next|later)$" --only-synced
    echo ""
fi

# Step 3: Remove bare theme labels
echo "Step 3: Preview removal of bare theme labels"
echo "------------------------------------------------------"
echo "This removes: expand-horizons, win-enterprise-customers, etc."
echo "(but keeps theme:expand-horizons, theme:win-enterprise-customers, etc.)"
echo ""
pnpm clear-labels --regex "^(expand-horizons|win-enterprise-customers)$" --dry-run --only-synced
echo ""

read -p "Continue with Step 3? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipped Step 3."
else
    echo "Executing Step 3..."
    pnpm clear-labels --regex "^(expand-horizons|win-enterprise-customers)$" --only-synced
    echo ""
fi

# Step 4: Remove bare category labels
echo "Step 4: Preview removal of bare category label"
echo "------------------------------------------------------"
echo "This removes: sample-ideas (but keeps category:sample-ideas)"
echo ""
pnpm clear-labels --pattern "sample-ideas" --dry-run --only-synced
echo ""

read -p "Continue with Step 4? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipped Step 4."
else
    echo "Executing Step 4..."
    pnpm clear-labels --pattern "sample-ideas" --only-synced
    echo ""
fi

# Step 5: Remove bare "story" label (keep story:MTT-*)
echo "Step 5: Preview removal of bare 'story' label"
echo "------------------------------------------------------"
echo "This removes: 'story' (but keeps story:MTT-12, etc.)"
echo ""
pnpm clear-labels --regex "^story$" --dry-run --only-synced
echo ""

read -p "Continue with Step 5? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipped Step 5."
else
    echo "Executing Step 5..."
    pnpm clear-labels --regex "^story$" --only-synced
    echo ""
fi

echo "=================================================="
echo "Cleanup Complete!"
echo "=================================================="
echo ""
echo "Your issues should now have clean, consistent labels."

