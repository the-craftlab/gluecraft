#!/usr/bin/env bash
#
# Quick Sync Test - Single Field Verification
# 
# Tests the most basic sync operation:
# 1. Create a simple issue in JPD
# 2. Run sync
# 3. Verify it appears in GitHub
#
# Usage: ./test-quick.sh [field-to-test]
#   field-to-test: title (default), priority, category, status
#

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

source .env

FIELD_TO_TEST="${1:-title}"
TEST_PREFIX="[QUICK-TEST]"
TIMESTAMP=$(date +%s)

echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Quick Sync Test: ${FIELD_TO_TEST}${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo ""

# Cleanup function for idempotency
cleanup_existing_tests() {
  echo "Checking for existing test data..."
  
  # Find and delete old JPD test issues
  OLD_ISSUES=$(curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    -H "Content-Type: application/json" \
    -X POST "${JPD_BASE_URL}/rest/api/3/search/jql" \
    -d "{\"jql\":\"project=MTT AND summary ~ 'QUICK-TEST'\",\"fields\":[\"key\"],\"maxResults\":50}" | \
    jq -r '.issues[].key' 2>/dev/null || true)
  
  if [ -n "$OLD_ISSUES" ]; then
    echo "Cleaning up old JPD issues..."
    for KEY in $OLD_ISSUES; do
      curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
        -X DELETE "${JPD_BASE_URL}/rest/api/3/issue/${KEY}" 2>/dev/null || true
      echo "  ✓ Deleted $KEY"
    done
  fi
  
  # Find and close old GitHub test issues
  OLD_GH_ISSUES=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
    "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=all&per_page=100" | \
    jq -r '.[] | select(.title | contains("QUICK-TEST")) | .number' 2>/dev/null || true)
  
  if [ -n "$OLD_GH_ISSUES" ]; then
    echo "Cleaning up old GitHub issues..."
    for NUM in $OLD_GH_ISSUES; do
      curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
        -X PATCH "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${NUM}" \
        -d '{"state": "closed"}' >/dev/null 2>&1 || true
      echo "  ✓ Closed #${NUM}"
    done
  fi
  
  echo "✓ Cleanup complete"
  echo ""
}

# Run cleanup before starting
cleanup_existing_tests

# Step 1: Create JPD issue
echo "Step 1: Creating JPD issue..."
RESPONSE=$(curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
  -H "Content-Type: application/json" \
  -X POST "${JPD_BASE_URL}/rest/api/3/issue" \
  -d "{
    \"fields\": {
      \"project\": {\"key\": \"MTT\"},
      \"summary\": \"${TEST_PREFIX} Test ${FIELD_TO_TEST} (${TIMESTAMP})\",
      \"description\": {
        \"type\": \"doc\",
        \"version\": 1,
        \"content\": [{
          \"type\": \"paragraph\",
          \"content\": [{\"type\": \"text\", \"text\": \"Quick test for ${FIELD_TO_TEST}\"}]
        }]
      },
      \"issuetype\": {\"name\": \"Idea\"},
      \"customfield_14385\": {\"value\": \"Story\"},
      \"customfield_14425\": {\"value\": \"Medium\"}
    }
  }")

JPD_KEY=$(echo "$RESPONSE" | jq -r '.key // empty')

if [ -z "$JPD_KEY" ]; then
  echo -e "${RED}✗ Failed to create JPD issue${NC}"
  echo "$RESPONSE" | jq '.'
  exit 1
fi

echo -e "${GREEN}✓ Created JPD issue: ${JPD_KEY}${NC}"

# Transition to Backlog so it will sync
echo "Step 2: Moving to Backlog status..."
TRANSITIONS=$(curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
  "${JPD_BASE_URL}/rest/api/3/issue/${JPD_KEY}/transitions")

TRANSITION_ID=$(echo "$TRANSITIONS" | jq -r '.transitions[] | select(.to.name == "Backlog") | .id')

if [ -n "$TRANSITION_ID" ]; then
  curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    -H "Content-Type: application/json" \
    -X POST "${JPD_BASE_URL}/rest/api/3/issue/${JPD_KEY}/transitions" \
    -d "{\"transition\": {\"id\": \"${TRANSITION_ID}\"}}" >/dev/null
  echo -e "${GREEN}✓ Moved to Backlog${NC}"
else
  echo -e "${YELLOW}⚠ Could not move to Backlog, will try sync anyway${NC}"
fi

echo ""
echo "Step 3: Running sync..."
sleep 2  # Rate limit pause

CONFIG_PATH="./config/mtt-clean.yaml" pnpm run dev 2>&1 | tee /tmp/quick-test-output.txt

echo ""
echo "Step 4: Verifying GitHub issue..."
sleep 3  # Rate limit pause

# Find GitHub issue
GH_ISSUES=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=all&per_page=100")

GH_NUMBER=$(echo "$GH_ISSUES" | jq -r ".[] | select(.body | contains(\"${JPD_KEY}\")) | .number" | head -1)

if [ -n "$GH_NUMBER" ]; then
  echo -e "${GREEN}✓ Found GitHub issue: #${GH_NUMBER}${NC}"
  
  GH_ISSUE=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
    "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${GH_NUMBER}")
  
  echo ""
  echo "GitHub Issue Details:"
  echo "  Title: $(echo "$GH_ISSUE" | jq -r '.title')"
  echo "  State: $(echo "$GH_ISSUE" | jq -r '.state')"
  echo "  Labels: $(echo "$GH_ISSUE" | jq -r '.labels[].name' | tr '\n' ', ' | sed 's/,$//')"
  
  echo ""
  echo -e "${GREEN}✓ Test PASSED${NC}"
  echo ""
  echo "Cleanup command:"
  echo "  JPD: curl -u \"${JPD_EMAIL}:${JPD_API_KEY}\" -X DELETE \"${JPD_BASE_URL}/rest/api/3/issue/${JPD_KEY}\""
  echo "  GitHub: gh issue close ${GH_NUMBER} -R ${GITHUB_OWNER}/${GITHUB_REPO}"
else
  echo -e "${RED}✗ GitHub issue NOT found${NC}"
  echo ""
  echo "Check sync output:"
  grep -A 5 "$JPD_KEY" /tmp/quick-test-output.txt || echo "No matches found"
  exit 1
fi

