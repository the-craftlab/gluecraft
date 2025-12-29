#!/bin/bash

# Clear All Labels from JPD-Synced Issues
# Sync tracking is done via hidden metadata, so labels can be safely removed

echo "=================================================="
echo "Clear ALL Labels"
echo "=================================================="
echo ""
echo "This will remove ALL labels from JPD-synced issues."
echo ""
echo "Sync tracking is maintained via hidden metadata in"
echo "the issue body, so this is safe and won't break sync."
echo ""
echo "=================================================="
echo ""

# Preview first
echo "Previewing changes..."
echo "------------------------------------------------------"
pnpm clear-all-labels --dry-run
echo ""

read -p "Execute removal? (y/N) " -n 1 -r
echo
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removing all labels..."
    pnpm clear-all-labels
    echo ""
    echo "✓ Complete! All labels removed"
    echo "  Sync tracking maintained via hidden metadata"
else
    echo "Aborted."
    exit 1
fi

echo ""
echo "=================================================="
