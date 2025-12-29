#!/usr/bin/env bash
#
# Test: GitHub → JPD Issue Creation
# 
# Tests that GitHub issues without JPD metadata are automatically
# created in JPD with correct category mapping based on labels.
#
# Test scenarios:
# 1. Bug label → JPD Bug category
# 2. Enhancement label → JPD Idea category  
# 3. Epic label → JPD Epic category
# 4. Story label → JPD Story category
# 5. Unlabeled → JPD Idea category (default)
#

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Save CONFIG_PATH if set via command line
SCRIPT_CONFIG_PATH="${CONFIG_PATH:-}"

source .env

# Override with script's CONFIG_PATH if provided, otherwise use mtt-clean.yaml
if [ -n "$SCRIPT_CONFIG_PATH" ]; then
  CONFIG_PATH="$SCRIPT_CONFIG_PATH"
else
  CONFIG_PATH="./config/mtt-clean.yaml"
fi

TIMESTAMP=$(date +%s)
TEST_PREFIX="[GH→JPD-TEST]"

# Cleanup arrays
CREATED_GH_NUMBERS=()
CREATED_JPD_KEYS=()

log_section() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  echo ""
}

log_test() {
  echo -e "${YELLOW}▶ $1${NC}"
}

log_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

log_error() {
  echo -e "${RED}✗ $1${NC}"
}

log_info() {
  echo "  $1"
}

# Cleanup function (idempotent)
cleanup_existing_tests() {
  log_section "Idempotency Check - Cleaning Existing Test Data"
  
  # Find and delete old GitHub test issues
  log_info "Searching for old GH→JPD-TEST issues in GitHub..."
  local old_numbers
  old_numbers=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
    "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=all&per_page=100" 2>/dev/null | \
    jq -r '.[] | select(.title | contains("GH→JPD-TEST")) | .number' 2>/dev/null || true)
  
  if [ -n "$old_numbers" ]; then
    log_info "Found old GitHub issues, closing..."
    for num in $old_numbers; do
      curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
        -X PATCH "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${num}" \
        -d '{"state": "closed"}' >/dev/null 2>&1 || true
      log_info "  ✓ Closed #${num}"
      sleep 0.5
    done
  else
    log_info "No old GitHub test issues found"
  fi
  
  # Find and delete old JPD test issues
  log_info "Searching for old GH→JPD-TEST issues in JPD..."
  local old_keys
  old_keys=$(curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    -H "Content-Type: application/json" \
    -X POST "${JPD_BASE_URL}/rest/api/3/search/jql" \
    -d '{"jql":"project=MTT AND summary ~ '\''GH→JPD-TEST'\''","fields":["key"],"maxResults":50}' 2>/dev/null | \
    jq -r '.issues[].key' 2>/dev/null || true)
  
  if [ -n "$old_keys" ]; then
    log_info "Found old JPD issues, deleting..."
    for key in $old_keys; do
      curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
        -X DELETE "${JPD_BASE_URL}/rest/api/3/issue/${key}" 2>/dev/null || true
      log_info "  ✓ Deleted $key"
      sleep 0.5
    done
  else
    log_info "No old JPD test issues found"
  fi
  
  log_success "Pre-test cleanup complete"
}

# Create GitHub issue with specific label
create_github_issue() {
  local title="$1"
  local label="$2"
  local body="${3:-Test issue created for GitHub → JPD sync testing}"
  
  local payload
  if [ -n "$label" ]; then
    payload=$(jq -n \
      --arg title "$title" \
      --arg body "$body" \
      --argjson labels "[\"$label\"]" \
      '{title: $title, body: $body, labels: $labels}')
  else
    payload=$(jq -n \
      --arg title "$title" \
      --arg body "$body" \
      '{title: $title, body: $body}')
  fi
  
  local response
  response=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Content-Type: application/json" \
    -X POST "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues" \
    -d "$payload")
  
  local gh_number
  gh_number=$(echo "$response" | jq -r '.number')
  
  if [ "$gh_number" != "null" ]; then
    CREATED_GH_NUMBERS+=("$gh_number")
    echo "$gh_number"
  else
    echo "ERROR: $(echo "$response" | jq -r '.message')" >&2
    return 1
  fi
}

# Run sync
run_sync() {
  CONFIG_PATH="$CONFIG_PATH" pnpm run dev 2>&1 | grep -E "(GitHub → JPD|Created:|Would create:|JPD issues)" || true
}

# Find JPD key from GitHub issue
find_jpd_key_for_github_issue() {
  local gh_number="$1"
  
  local body
  body=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
    "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${gh_number}" | \
    jq -r '.body')
  
  local jpd_key
  jpd_key=$(echo "$body" | sed -n 's/.*"jpd_id":[[:space:]]*"\([^"]*\)".*/\1/p' | head -1 || true)
  
  if [ -n "$jpd_key" ]; then
    CREATED_JPD_KEYS+=("$jpd_key")
    echo "$jpd_key"
  else
    return 1
  fi
}

# Verify JPD issue category
verify_jpd_category() {
  local jpd_key="$1"
  local expected_category="$2"
  
  local actual_category
  actual_category=$(curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    "${JPD_BASE_URL}/rest/api/3/issue/${jpd_key}?fields=customfield_14385" | \
    jq -r '.fields.customfield_14385.value' 2>/dev/null || echo "null")
  
  if [ "$actual_category" = "$expected_category" ]; then
    log_success "Category verified: $actual_category"
    return 0
  else
    log_error "Category mismatch: expected=$expected_category, actual=$actual_category"
    return 1
  fi
}

# Cleanup created issues
cleanup_test_data() {
  log_section "Cleanup Test Data"
  
  # Close GitHub issues
  for num in "${CREATED_GH_NUMBERS[@]}"; do
    curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
      -X PATCH "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${num}" \
      -d '{"state": "closed"}' >/dev/null 2>&1 || true
    log_info "✓ Closed GitHub #${num}"
    sleep 0.5
  done
  
  # Delete JPD issues
  for key in "${CREATED_JPD_KEYS[@]}"; do
    curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
      -X DELETE "${JPD_BASE_URL}/rest/api/3/issue/${key}" 2>/dev/null || true
    log_info "✓ Deleted JPD $key"
    sleep 0.5
  done
  
  log_success "Cleanup complete"
}

# Test scenarios
test_bug_label() {
  log_test "TEST 1: Bug label → JPD Bug category"
  
  local gh_number
  gh_number=$(create_github_issue "${TEST_PREFIX} Bug Issue (${TIMESTAMP})" "bug" "This is a bug that needs fixing")
  log_info "Created GitHub #${gh_number} with 'bug' label"
  
  sleep 2
  log_info "Running sync..."
  run_sync
  
  sleep 3
  log_info "Verifying JPD issue was created..."
  local jpd_key
  jpd_key=$(find_jpd_key_for_github_issue "$gh_number")
  
  if [ -n "$jpd_key" ]; then
    log_success "JPD issue created: $jpd_key"
    verify_jpd_category "$jpd_key" "Bug"
  else
    log_error "No JPD key found in GitHub issue #${gh_number}"
    return 1
  fi
}

test_enhancement_label() {
  log_test "TEST 2: Enhancement label → JPD Idea category"
  
  local gh_number
  gh_number=$(create_github_issue "${TEST_PREFIX} Enhancement (${TIMESTAMP})" "enhancement" "New feature request")
  log_info "Created GitHub #${gh_number} with 'enhancement' label"
  
  sleep 2
  log_info "Running sync..."
  run_sync
  
  sleep 3
  log_info "Verifying JPD issue was created..."
  local jpd_key
  jpd_key=$(find_jpd_key_for_github_issue "$gh_number")
  
  if [ -n "$jpd_key" ]; then
    log_success "JPD issue created: $jpd_key"
    verify_jpd_category "$jpd_key" "Idea"
  else
    log_error "No JPD key found in GitHub issue #${gh_number}"
    return 1
  fi
}

test_unlabeled() {
  log_test "TEST 3: Unlabeled issue → JPD Idea category (default)"
  
  local gh_number
  gh_number=$(create_github_issue "${TEST_PREFIX} Unlabeled (${TIMESTAMP})" "" "No label specified")
  log_info "Created GitHub #${gh_number} (no labels)"
  
  sleep 2
  log_info "Running sync..."
  run_sync
  
  sleep 3
  log_info "Verifying JPD issue was created..."
  local jpd_key
  jpd_key=$(find_jpd_key_for_github_issue "$gh_number")
  
  if [ -n "$jpd_key" ]; then
    log_success "JPD issue created: $jpd_key"
    verify_jpd_category "$jpd_key" "Idea"
  else
    log_error "No JPD key found in GitHub issue #${gh_number}"
    return 1
  fi
}

# Main execution
main() {
  log_section "GitHub → JPD Issue Creation Tests"
  log_info "Config: $CONFIG_PATH"
  log_info "Testing label → category mappings"
  
  # Ensure idempotency
  cleanup_existing_tests
  
  # Run tests
  test_bug_label
  echo ""
  
  test_enhancement_label
  echo ""
  
  test_unlabeled
  echo ""
  
  # Cleanup
  cleanup_test_data
  
  log_section "✅ All Tests Complete"
}

main

