#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║           🧪 AUTOMATED QUICK TEST SCRIPT 🧪                 ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

cd /Users/james/Sites/Expedition/jpd-to-github-connector

echo "📝 Step 1: Adding test comment to GitHub issue #9..."
gh issue comment 9 --body "🧪 Automated test at $(date) - Testing comment sync!" 2>&1 | head -3

echo ""
echo "⏳ Step 2: Running sync..."
pnpm run dev 2>&1 | grep -E "(Syncing comments|Syncing GitHub comment|Syncing JPD comment|comment.*to.*issue)" | head -5

echo ""
echo "✅ Step 3: Verifying sync..."
echo ""
echo "GitHub issue #9 now has this many comments:"
gh api "/repos/Checkfront/manifest-jpd-sync-test/issues/9/comments" | jq 'length'

echo ""
echo "JPD MTT-9 now has this many comments:"
source .env
curl -s -u "$JPD_EMAIL:$JPD_API_KEY" \
  "$JPD_BASE_URL/rest/api/3/issue/MTT-9/comment" \
  | jq '.comments | length'

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║  ✅ TEST COMPLETE! Check JPD to see your comment synced!    ║"
echo "║                                                              ║"
echo "║  Open JPD:                                                   ║"
echo "║  open \"https://checkfront.atlassian.net/jira/polaris/projects/MTT/ideas/view/163309\"  ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"

