#!/bin/bash

# Fast Integration Test Suite (Tests 1-5 only, ~3 minutes)
# Validates core functionality without long-running tests

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
  echo -e "${RED}Error: .env file not found${NC}"
  exit 1
fi

# Save CONFIG_PATH if provided via environment before sourcing .env
SAVED_CONFIG_PATH="${CONFIG_PATH}"

source .env

# Configuration - use saved value if it was provided, otherwise use default
if [ -n "$SAVED_CONFIG_PATH" ]; then
  CONFIG_PATH="$SAVED_CONFIG_PATH"
else
  CONFIG_PATH="${CONFIG_PATH:-./config/mtt-clean.yaml}"
fi

TEST_ISSUE_PREFIX="[TEST-FAST]"
TIMESTAMP=$(date +%s)

# Rate limit configuration (adjust based on your API limits)
RATE_LIMIT_SHORT="${RATE_LIMIT_SHORT:-1}"    # Quick operations
RATE_LIMIT_MEDIUM="${RATE_LIMIT_MEDIUM:-2}"  # Standard operations
RATE_LIMIT_LONG="${RATE_LIMIT_LONG:-3}"      # After sync operations

# Test state tracking
CREATED_JPD_KEYS=()
CREATED_GITHUB_NUMBERS=()
TEST_PASSED=0
TEST_FAILED=0

# ==========================================
# Helper Functions
# ==========================================

log_section() {
  echo "" >&2
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}" >&2
  echo -e "${BLUE}  $1${NC}" >&2
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}" >&2
  echo "" >&2
}

log_success() {
  echo -e "${GREEN}✓ $1${NC}" >&2
  ((TEST_PASSED++))
}

log_error() {
  echo -e "${RED}✗ $1${NC}" >&2
  ((TEST_FAILED++))
}

log_info() {
  echo -e "  $1" >&2
}

wait_for_rate_limit() {
  local seconds="${1:-$RATE_LIMIT_MEDIUM}"
  echo -e "${YELLOW}⏳ ${seconds}s...${NC}" >&2
  sleep "$seconds"
}

# ==========================================
# JPD API Functions
# ==========================================

jpd_create_issue() {
  local summary="$1"
  local category="$2"
  local priority="$3"
  local status="${4:-Backlog}"
  
  log_info "Creating JPD issue: $summary"
  
  local response
  response=$(curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    -H "Content-Type: application/json" \
    -X POST "${JPD_BASE_URL}/rest/api/3/issue" \
    -d "{
      \"fields\": {
        \"project\": {\"key\": \"MTT\"},
        \"summary\": \"${summary}\",
        \"description\": {
          \"type\": \"doc\",
          \"version\": 1,
          \"content\": [{
            \"type\": \"paragraph\",
            \"content\": [{\"type\": \"text\", \"text\": \"Test description\"}]
          }]
        },
        \"issuetype\": {\"name\": \"Idea\"},
        \"customfield_14385\": {\"value\": \"${category}\"},
        \"customfield_14425\": {\"value\": \"${priority}\"}
      }
    }")
  
  local key
  key=$(echo "$response" | jq -r '.key // empty')
  
  if [ -z "$key" ]; then
    log_error "Failed to create JPD issue"
    return 1
  fi
  
  log_success "Created: $key"
  
  if [ -n "$status" ]; then
    jpd_transition_issue "$key" "$status"
  fi
  
  echo "$key"
}

jpd_transition_issue() {
  local key="$1"
  local status="$2"
  
  local transitions
  transitions=$(curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    "${JPD_BASE_URL}/rest/api/3/issue/${key}/transitions")
  
  local transition_id
  transition_id=$(echo "$transitions" | jq -r ".transitions[] | select(.to.name == \"${status}\") | .id")
  
  if [ -z "$transition_id" ]; then
    return 1
  fi
  
  curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    -H "Content-Type: application/json" \
    -X POST "${JPD_BASE_URL}/rest/api/3/issue/${key}/transitions" \
    -d "{\"transition\": {\"id\": \"${transition_id}\"}}" >/dev/null
  
  log_success "Transitioned: $key → $status"
}

jpd_update_issue() {
  local key="$1"
  local field="$2"
  local value="$3"
  
  log_info "Updating $key: $field = $value"
  
  local payload
  case "$field" in
    summary)
      payload="{\"fields\": {\"summary\": \"${value}\"}}"
      ;;
    priority)
      payload="{\"fields\": {\"customfield_14425\": {\"value\": \"${value}\"}}}"
      ;;
    *)
      log_error "Unknown field: $field"
      return 1
      ;;
  esac
  
  local response
  response=$(curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    -H "Content-Type: application/json" \
    -X PUT "${JPD_BASE_URL}/rest/api/3/issue/${key}" \
    -d "$payload")
  
  if [ -n "$response" ] && echo "$response" | jq -e '.errorMessages' >/dev/null 2>&1; then
    log_error "Failed to update"
    return 1
  fi
  
  log_success "Updated: $key"
}

jpd_link_issues() {
  local child_key="$1"
  local parent_key="$2"
  
  curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    -H "Content-Type: application/json" \
    -X POST "${JPD_BASE_URL}/rest/api/3/issueLink" \
    -d "{
      \"type\": {\"id\": \"10509\"},
      \"inwardIssue\": {\"key\": \"${child_key}\"},
      \"outwardIssue\": {\"key\": \"${parent_key}\"}
    }" >/dev/null
  
  log_success "Linked: $child_key → $parent_key"
}

jpd_delete_issue() {
  local key="$1"
  curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    -X DELETE "${JPD_BASE_URL}/rest/api/3/issue/${key}" >/dev/null
  log_success "Deleted $key"
}

# ==========================================
# GitHub API Functions
# ==========================================

github_get_issue_by_jpd_key() {
  local jpd_key="$1"
  
  local issues
  issues=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
    "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=all&per_page=100")
  
  echo "$issues" | jq -r ".[] | select(.body | contains(\"${jpd_key}\")) | .number" | head -1
}

github_get_issue() {
  local number="$1"
  curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
    "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${number}"
}

github_update_issue() {
  local number="$1"
  local field="$2"
  local value="$3"
  
  local payload
  case "$field" in
    state)
      payload="{\"state\": \"${value}\"}"
      ;;
    *)
      log_error "Unknown field: $field"
      return 1
      ;;
  esac
  
  curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Content-Type: application/json" \
    -X PATCH "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${number}" \
    -d "$payload" >/dev/null
  
  log_success "Updated #$number"
}

github_delete_issue() {
  local number="$1"
  curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Content-Type: application/json" \
    -X PATCH "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${number}" \
    -d '{"state": "closed"}' >/dev/null
  log_success "Closed #$number"
}

# ==========================================
# Sync Runner
# ==========================================

run_sync() {
  local output
  if output=$(CONFIG_PATH="${CONFIG_PATH}" pnpm run dev 2>&1); then
    log_success "Sync completed"
    return 0
  else
    log_error "Sync failed"
    return 1
  fi
}

# ==========================================
# Cleanup
# ==========================================

cleanup_test_data() {
  log_section "Cleanup"
  
  # Delete JPD issues
  local jql="summary ~ \"${TEST_ISSUE_PREFIX}\" ORDER BY created DESC"
  local search_result
  search_result=$(curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    "${JPD_BASE_URL}/rest/api/3/search?jql=$(printf '%s' "$jql" | jq -sRr @uri)&maxResults=50")
  
  local keys
  keys=$(echo "$search_result" | jq -r '.issues[]?.key // empty')
  
  if [ -n "$keys" ]; then
    for key in $keys; do
      jpd_delete_issue "$key"
    done
  fi
  
  # Close GitHub issues
  local gh_issues
  gh_issues=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
    "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=all&per_page=100")
  
  local numbers
  numbers=$(echo "$gh_issues" | jq -r ".[] | select(.title | contains(\"${TEST_ISSUE_PREFIX}\")) | .number")
  
  if [ -n "$numbers" ]; then
    for number in $numbers; do
      github_delete_issue "$number"
    done
  fi
  
  log_success "Cleanup complete"
  return 0
}

# ==========================================
# Tests
# ==========================================

test_1_create() {
  log_section "TEST 1: JPD → GitHub (Create)"
  
  local key
  key=$(jpd_create_issue \
    "${TEST_ISSUE_PREFIX} Story (${TIMESTAMP})" \
    "Story" \
    "High" \
    "Backlog")
  CREATED_JPD_KEYS+=("$key")
  
  wait_for_rate_limit "$RATE_LIMIT_MEDIUM"
  run_sync "live"
  wait_for_rate_limit "$RATE_LIMIT_MEDIUM"
  
  local gh_number
  gh_number=$(github_get_issue_by_jpd_key "$key")
  
  if [ -n "$gh_number" ]; then
    CREATED_GITHUB_NUMBERS+=("$gh_number")
    log_success "GitHub #$gh_number created for $key"
  else
    log_error "GitHub issue not created"
  fi
}

test_2_update() {
  log_section "TEST 2: JPD → GitHub (Update)"
  
  local key="${CREATED_JPD_KEYS[0]}"
  jpd_update_issue "$key" "summary" "${TEST_ISSUE_PREFIX} Story UPDATED (${TIMESTAMP})"
  
  wait_for_rate_limit "$RATE_LIMIT_MEDIUM"
  run_sync "live"
  wait_for_rate_limit "$RATE_LIMIT_MEDIUM"
  
  local gh_number="${CREATED_GITHUB_NUMBERS[0]}"
  local gh_issue
  gh_issue=$(github_get_issue "$gh_number")
  
  if echo "$gh_issue" | jq -r '.title' | grep -q "UPDATED"; then
    log_success "Title updated"
  else
    log_error "Title not updated"
  fi
}

test_3_priority() {
  log_section "TEST 3: JPD → GitHub (Priority Change)"
  
  local key="${CREATED_JPD_KEYS[0]}"
  jpd_update_issue "$key" "priority" "Critical"
  
  wait_for_rate_limit "$RATE_LIMIT_MEDIUM"
  run_sync "live"
  wait_for_rate_limit "$RATE_LIMIT_MEDIUM"
  
  local gh_number="${CREATED_GITHUB_NUMBERS[0]}"
  local labels
  labels=$(github_get_issue "$gh_number" | jq -r '.labels[].name' | tr '\n' ',')
  
  if echo "$labels" | grep -q "critical"; then
    log_success "Priority label updated"
  else
    log_error "Priority label not updated"
  fi
}

test_4_github_to_jpd() {
  log_section "TEST 4: GitHub → JPD (Status)"
  
  local gh_number="${CREATED_GITHUB_NUMBERS[0]}"
  github_update_issue "$gh_number" "state" "closed"
  
  wait_for_rate_limit "$RATE_LIMIT_MEDIUM"
  run_sync "live"
  wait_for_rate_limit "$RATE_LIMIT_MEDIUM"
  
  local key="${CREATED_JPD_KEYS[0]}"
  local status
  status=$(curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    "${JPD_BASE_URL}/rest/api/3/issue/${key}?fields=status" | jq -r '.fields.status.name')
  
  if [ "$status" = "Done" ]; then
    log_success "Status synced: Done"
  else
    log_error "Status not synced (got: $status)"
  fi
}

test_5_hierarchy() {
  log_section "TEST 5: Parent-Child Linking"
  
  local epic_key
  epic_key=$(jpd_create_issue \
    "${TEST_ISSUE_PREFIX} Epic (${TIMESTAMP})" \
    "Epic" \
    "High" \
    "Backlog")
  CREATED_JPD_KEYS+=("$epic_key")
  
  wait_for_rate_limit "$RATE_LIMIT_SHORT"
  
  local story_key
  story_key=$(jpd_create_issue \
    "${TEST_ISSUE_PREFIX} Story Child (${TIMESTAMP})" \
    "Story" \
    "Medium" \
    "Backlog")
  CREATED_JPD_KEYS+=("$story_key")
  
  wait_for_rate_limit "$RATE_LIMIT_MEDIUM"
  run_sync "live"
  wait_for_rate_limit "$RATE_LIMIT_MEDIUM"
  
  local epic_gh_number
  epic_gh_number=$(github_get_issue_by_jpd_key "$epic_key")
  
  local story_gh_number
  story_gh_number=$(github_get_issue_by_jpd_key "$story_key")
  
  if [ -n "$epic_gh_number" ] && [ -n "$story_gh_number" ]; then
    CREATED_GITHUB_NUMBERS+=("$epic_gh_number" "$story_gh_number")
    log_success "Epic #$epic_gh_number and Story #$story_gh_number created"
    
    jpd_link_issues "$story_key" "$epic_key"
    
    wait_for_rate_limit "$RATE_LIMIT_MEDIUM"
    run_sync "live"
    wait_for_rate_limit "$RATE_LIMIT_MEDIUM"
    
    local epic_body
    epic_body=$(github_get_issue "$epic_gh_number" | jq -r '.body')
    
    if echo "$epic_body" | grep -q "## 📋 Subtasks"; then
      log_success "Subtasks section created"
      if echo "$epic_body" | grep -q "#${story_gh_number}"; then
        log_success "Story linked in Epic"
      else
        log_error "Story not in Epic's subtasks"
      fi
    else
      log_error "No Subtasks section"
    fi
  else
    log_error "Issues not created"
  fi
}

# ==========================================
# Main
# ==========================================

log_section "Fast Integration Test Suite"
log_info "Config: $CONFIG_PATH"
log_info "Running tests 1-5 (~3 minutes)"

cleanup_test_data

test_1_create || true
test_2_update || true
test_3_priority || true
test_4_github_to_jpd || true
test_5_hierarchy || true

cleanup_test_data

log_section "Results"
echo -e "${GREEN}✓ Passed: $TEST_PASSED${NC}"
echo -e "${RED}✗ Failed: $TEST_FAILED${NC}"

if [ $TEST_FAILED -gt 0 ]; then
  exit 1
fi

