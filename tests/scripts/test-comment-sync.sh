#!/bin/bash
set -e

# Test Comment Synchronization (Bidirectional)
# ============================================
# Tests:
# 1. JPD comment → GitHub
# 2. GitHub comment → JPD
# 3. Duplicate prevention
# 4. Links and formatting

# Source .env first for credentials
source .env

# Then set CONFIG_PATH (override any default from .env)
export CONFIG_PATH="./config/mtt-clean.yaml"

TIMESTAMP=$(date +%s)

# Extract JPD project key from config JQL
if [ -z "$JPD_PROJECT" ]; then
  JPD_PROJECT=$(grep "jql:" "$CONFIG_PATH" | grep -oE "project = [A-Z]+" | awk '{print $3}')
fi

if [ -z "$JPD_PROJECT" ]; then
  echo "❌ JPD_PROJECT not found in config or environment"
  exit 1
fi

echo "  Using JPD project: $JPD_PROJECT"

echo -e "\n\033[0;34m═══════════════════════════════════════════════\033[0m"
echo -e "\033[0;34m  Comment Sync Tests\033[0m"
echo -e "\033[0;34m═══════════════════════════════════════════════\033[0m"
echo -e "  Config: $CONFIG_PATH"
echo -e "  Testing bidirectional comment synchronization\n"

# ============================================
# Cleanup Function
# ============================================
cleanup_test_data() {
  echo -e "\n\033[0;34m═══════════════════════════════════════════════\033[0m"
  echo -e "\033[0;34m  Cleanup Test Data\033[0m"
  echo -e "\033[0;34m═══════════════════════════════════════════════\033[0m\n"
  
  if [ -n "$TEST_JPD_KEY" ]; then
    echo "  Deleting JPD issue $TEST_JPD_KEY..."
    curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
      -X DELETE "${JPD_BASE_URL}/rest/api/3/issue/${TEST_JPD_KEY}" >/dev/null 2>&1 && \
      echo "    ✓ Deleted $TEST_JPD_KEY" || echo "    ⚠️  Could not delete $TEST_JPD_KEY"
  fi
  
  if [ -n "$TEST_GH_NUM" ]; then
    echo "  Closing GitHub issue #$TEST_GH_NUM..."
    curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
      -X PATCH "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${TEST_GH_NUM}" \
      -d '{"state": "closed"}' >/dev/null 2>&1 && \
      echo "    ✓ Closed #$TEST_GH_NUM" || echo "    ⚠️  Could not close #$TEST_GH_NUM"
  fi
  
  echo -e "\033[0;32m✓ Cleanup complete\033[0m\n"
}

trap cleanup_test_data EXIT

# ============================================
# TEST SETUP: Create JPD Issue
# ============================================
echo -e "\033[1;33m▶ TEST SETUP: Creating test JPD issue\033[0m"

JPD_RESPONSE=$(curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
  -H "Content-Type: application/json" \
  -X POST "${JPD_BASE_URL}/rest/api/3/issue" \
  -d "{
    \"fields\": {
      \"project\": {\"key\": \"${JPD_PROJECT}\"},
      \"summary\": \"[COMMENT-TEST] Issue ${TIMESTAMP}\",
      \"description\": {
        \"type\": \"doc\",
        \"version\": 1,
        \"content\": [{
          \"type\": \"paragraph\",
          \"content\": [{\"type\": \"text\", \"text\": \"Test issue for comment sync\"}]
        }]
      },
      \"issuetype\": {\"name\": \"Idea\"},
      \"customfield_14385\": {\"value\": \"Story\"}
    }
  }")

TEST_JPD_KEY=$(echo "$JPD_RESPONSE" | jq -r '.key')

if [ -z "$TEST_JPD_KEY" ] || [ "$TEST_JPD_KEY" = "null" ]; then
  echo "❌ Failed to create JPD issue"
  echo "$JPD_RESPONSE" | jq .
  exit 1
fi

echo -e "  ✓ Created JPD issue: $TEST_JPD_KEY"
echo -e "  🔗 ${JPD_BASE_URL}/browse/${TEST_JPD_KEY}\n"

# Transition issue to "Ready" status so it will sync
echo "  Transitioning to 'Ready' status for sync..."
TRANSITIONS=$(curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
  "${JPD_BASE_URL}/rest/api/3/issue/${TEST_JPD_KEY}/transitions")

READY_TRANSITION_ID=$(echo "$TRANSITIONS" | jq -r '.transitions[] | select(.to.name == "Ready") | .id')

if [ -n "$READY_TRANSITION_ID" ] && [ "$READY_TRANSITION_ID" != "null" ]; then
  curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    -H "Content-Type: application/json" \
    -X POST "${JPD_BASE_URL}/rest/api/3/issue/${TEST_JPD_KEY}/transitions" \
    -d "{\"transition\": {\"id\": \"${READY_TRANSITION_ID}\"}}" >/dev/null 2>&1
  echo -e "  ✓ Transitioned to Ready status\n"
else
  echo -e "  ⚠️  Could not find 'Ready' transition, continuing anyway\n"
fi

# ============================================
# TEST 1: JPD Comment → GitHub
# ============================================
echo -e "\033[1;33m▶ TEST 1: JPD Comment → GitHub\033[0m"

echo "  Adding comment to JPD issue..."
JPD_COMMENT_BODY="This is a test comment from JPD (${TIMESTAMP})"

curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
  -H "Content-Type: application/json" \
  -X POST "${JPD_BASE_URL}/rest/api/3/issue/${TEST_JPD_KEY}/comment" \
  -d "{
    \"body\": {
      \"type\": \"doc\",
      \"version\": 1,
      \"content\": [{
        \"type\": \"paragraph\",
        \"content\": [{\"type\": \"text\", \"text\": \"${JPD_COMMENT_BODY}\"}]
      }]
    }
  }" >/dev/null 2>&1

echo -e "  ✓ Added comment to ${TEST_JPD_KEY}"
echo -e "  🔗 ${JPD_BASE_URL}/browse/${TEST_JPD_KEY}?focusedCommentId=latest\n"

echo "  Running initial JPD → GitHub sync..."
SYNC_OUTPUT=$(CONFIG_PATH="$CONFIG_PATH" pnpm run dev 2>&1)
echo "$SYNC_OUTPUT" | grep -E "(JPD → GitHub|✓ Created|synced)" | head -10

sleep 5

# Find GitHub issue number
echo "  Searching for GitHub issue..."
TEST_GH_NUM=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=all&per_page=100&sort=created&direction=desc" | \
  jq -r --arg key "$TEST_JPD_KEY" '.[] | select(.body | contains($key)) | .number' | head -1)

if [ -z "$TEST_GH_NUM" ] || [ "$TEST_GH_NUM" = "null" ]; then
  echo "❌ GitHub issue not found for $TEST_JPD_KEY"
  echo "  Debug: Checking recent GitHub issues..."
  curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
    "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=all&per_page=5&sort=created&direction=desc" | \
    jq -r '.[] | "\(.number): \(.title)"'
  echo "  Debug: Sync output:"
  echo "$SYNC_OUTPUT" | tail -20
  exit 1
fi

echo -e "  ✓ Found GitHub issue: #${TEST_GH_NUM}"
echo -e "  🔗 https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${TEST_GH_NUM}\n"

echo "  Syncing comments (JPD → GitHub)..."
CONFIG_PATH="$CONFIG_PATH" pnpm run dev 2>&1 | grep -E "(Comment Sync|comments synced)"

sleep 3

echo "  Verifying comment in GitHub..."
GH_COMMENTS=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${TEST_GH_NUM}/comments")

GH_COMMENT_MATCH=$(echo "$GH_COMMENTS" | jq -r --arg body "$JPD_COMMENT_BODY" '.[] | select(.body | contains($body)) | .html_url')

if [ -n "$GH_COMMENT_MATCH" ]; then
  echo -e "\033[0;32m✓ JPD comment synced to GitHub\033[0m"
  echo -e "  🔗 $GH_COMMENT_MATCH\n"
else
  echo -e "❌ JPD comment NOT found in GitHub"
  echo "  Expected: $JPD_COMMENT_BODY"
  echo "  GitHub comments:"
  echo "$GH_COMMENTS" | jq -r '.[].body'
  exit 1
fi

# ============================================
# TEST 2: GitHub Comment → JPD
# ============================================
echo -e "\033[1;33m▶ TEST 2: GitHub Comment → JPD\033[0m"

echo "  Adding comment to GitHub issue..."
GH_COMMENT_BODY="This is a test comment from GitHub (${TIMESTAMP})"

GH_COMMENT_RESPONSE=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Content-Type: application/json" \
  -X POST "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${TEST_GH_NUM}/comments" \
  -d "{\"body\": \"${GH_COMMENT_BODY}\"}")

GH_COMMENT_URL=$(echo "$GH_COMMENT_RESPONSE" | jq -r '.html_url')

echo -e "  ✓ Added comment to #${TEST_GH_NUM}"
echo -e "  🔗 $GH_COMMENT_URL\n"

echo "  Syncing comments (GitHub → JPD)..."
CONFIG_PATH="$CONFIG_PATH" pnpm run dev 2>&1 | grep -E "(Comment Sync|comments synced)"

sleep 3

echo "  Verifying comment in JPD..."
JPD_COMMENTS=$(curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
  "${JPD_BASE_URL}/rest/api/3/issue/${TEST_JPD_KEY}/comment")

JPD_COMMENT_MATCH=$(echo "$JPD_COMMENTS" | jq -r --arg body "$GH_COMMENT_BODY" '.comments[] | select(.body.content[].content[].text | contains($body)) | .self')

if [ -n "$JPD_COMMENT_MATCH" ]; then
  echo -e "\033[0;32m✓ GitHub comment synced to JPD\033[0m"
  echo -e "  🔗 ${JPD_BASE_URL}/browse/${TEST_JPD_KEY}?focusedCommentId=latest\n"
else
  echo -e "❌ GitHub comment NOT found in JPD"
  echo "  Expected: $GH_COMMENT_BODY"
  echo "  JPD comments:"
  echo "$JPD_COMMENTS" | jq -r '.comments[].body.content[].content[].text'
  exit 1
fi

# ============================================
# TEST 3: Idempotency (No Duplicates)
# ============================================
echo -e "\033[1;33m▶ TEST 3: Idempotency (No Duplicate Comments)\033[0m"

echo "  Running sync again (should not create duplicates)..."
CONFIG_PATH="$CONFIG_PATH" pnpm run dev 2>&1 | grep -E "(Comment Sync|comments synced)"

sleep 2

echo "  Verifying no duplicate comments in GitHub..."
GH_COMMENTS_COUNT=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${TEST_GH_NUM}/comments" | \
  jq -r --arg body "$JPD_COMMENT_BODY" '[.[] | select(.body | contains($body))] | length')

if [ "$GH_COMMENTS_COUNT" -eq 1 ]; then
  echo -e "\033[0;32m✓ No duplicate comments in GitHub (count: 1)\033[0m\n"
else
  echo -e "❌ Duplicate comments detected in GitHub (count: $GH_COMMENTS_COUNT)"
  exit 1
fi

echo "  Verifying no duplicate comments in JPD..."
JPD_COMMENTS_COUNT=$(curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
  "${JPD_BASE_URL}/rest/api/3/issue/${TEST_JPD_KEY}/comment" | \
  jq -r --arg body "$GH_COMMENT_BODY" '[.comments[] | select(.body.content[].content[].text | contains($body))] | length')

if [ "$JPD_COMMENTS_COUNT" -eq 1 ]; then
  echo -e "\033[0;32m✓ No duplicate comments in JPD (count: 1)\033[0m\n"
else
  echo -e "❌ Duplicate comments detected in JPD (count: $JPD_COMMENTS_COUNT)"
  exit 1
fi

# ============================================
# Summary
# ============================================
echo -e "\n\033[0;32m═══════════════════════════════════════════════\033[0m"
echo -e "\033[0;32m  ✅ All Comment Sync Tests Passed\033[0m"
echo -e "\033[0;32m═══════════════════════════════════════════════\033[0m\n"

echo "Test Summary:"
echo "  ✓ JPD comment synced to GitHub"
echo "  ✓ GitHub comment synced to JPD"
echo "  ✓ No duplicate comments created"
echo ""
echo "View Test Data:"
echo "  JPD:    ${JPD_BASE_URL}/browse/${TEST_JPD_KEY}"
echo "  GitHub: https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${TEST_GH_NUM}"
echo ""

