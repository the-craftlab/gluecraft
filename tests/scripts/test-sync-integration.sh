#!/usr/bin/env bash
#
# Integration Test Suite for JPD ↔ GitHub Sync
# 
# Progressive Enhancement Testing Strategy:
# 1. Test JPD → GitHub sync (create & update)
# 2. Test GitHub → JPD sync (status updates)
# 3. Use API calls to simulate real-world changes
# 4. Verify sync engine detects and applies changes correctly
#
# Usage:
#   ./test-sync-integration.sh [--cleanup-only]
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ ! -f .env ]; then
  echo -e "${RED}❌ .env file not found${NC}"
  exit 1
fi

source .env

# Configuration
CONFIG_PATH="${CONFIG_PATH:-./config/mtt-clean.yaml}"
TEST_ISSUE_PREFIX="[TEST-AUTO]"
TIMESTAMP=$(date +%s)
CLEANUP_ONLY="${1:-false}"

# Test state tracking
CREATED_JPD_KEYS=()
CREATED_GITHUB_NUMBERS=()
TEST_PASSED=0
TEST_FAILED=0

# ==========================================
# Utility Functions
# ==========================================

log_section() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo ""
}

log_test() {
  echo -e "${YELLOW}▶ $1${NC}"
}

log_success() {
  echo -e "${GREEN}✓ $1${NC}"
  ((TEST_PASSED++))
}

log_error() {
  echo -e "${RED}✗ $1${NC}"
  ((TEST_FAILED++))
}

log_info() {
  echo -e "  $1"
}

# Wait for rate limits to reset
wait_for_rate_limit() {
  local seconds="${1:-3}"
  echo -e "${YELLOW}⏳ Waiting ${seconds}s for rate limits...${NC}"
  sleep "$seconds"
}

# ==========================================
# JPD API Functions
# ==========================================

jpd_create_issue() {
  local summary="$1"
  local category="$2"  # Story, Epic, Bug
  local priority="$3"  # Critical, High, Medium, Low
  local status="${4:-Backlog}"  # Default to Backlog (will sync)
  
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
            \"content\": [{\"type\": \"text\", \"text\": \"Test description for ${summary}\"}]
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
    log_info "Response: $response"
    return 1
  fi
  
  CREATED_JPD_KEYS+=("$key")
  log_success "Created JPD issue: $key"
  
  # Transition to desired status if not default
  if [ "$status" != "Backlog" ]; then
    jpd_transition_issue "$key" "$status"
  fi
  
  echo "$key"
}

jpd_update_issue() {
  local key="$1"
  local field="$2"  # summary, priority, category
  local value="$3"
  
  log_info "Updating JPD issue $key: $field = $value"
  
  local payload
  case "$field" in
    summary)
      payload="{\"fields\": {\"summary\": \"${value}\"}}"
      ;;
    priority)
      payload="{\"fields\": {\"customfield_14425\": {\"value\": \"${value}\"}}}"
      ;;
    category)
      payload="{\"fields\": {\"customfield_14385\": {\"value\": \"${value}\"}}}"
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
  
  if echo "$response" | jq -e '.errorMessages' >/dev/null 2>&1; then
    log_error "Failed to update JPD issue"
    log_info "Response: $response"
    return 1
  fi
  
  log_success "Updated $key: $field = $value"
}

jpd_transition_issue() {
  local key="$1"
  local status="$2"
  
  log_info "Transitioning $key to $status"
  
  # Get available transitions
  local transitions
  transitions=$(curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    "${JPD_BASE_URL}/rest/api/3/issue/${key}/transitions")
  
  local transition_id
  transition_id=$(echo "$transitions" | jq -r ".transitions[] | select(.to.name == \"${status}\") | .id")
  
  if [ -z "$transition_id" ]; then
    log_error "Cannot transition to $status (no valid transition found)"
    return 1
  fi
  
  curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    -H "Content-Type: application/json" \
    -X POST "${JPD_BASE_URL}/rest/api/3/issue/${key}/transitions" \
    -d "{\"transition\": {\"id\": \"${transition_id}\"}}" >/dev/null
  
  log_success "Transitioned $key to $status"
}

jpd_get_issue() {
  local key="$1"
  curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    "${JPD_BASE_URL}/rest/api/3/issue/${key}?fields=summary,status,customfield_14385,customfield_14425"
}

jpd_delete_issue() {
  local key="$1"
  log_info "Deleting JPD issue: $key"
  
  curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    -X DELETE "${JPD_BASE_URL}/rest/api/3/issue/${key}" >/dev/null
  
  log_success "Deleted $key"
}

jpd_link_issues() {
  local child_key="$1"
  local parent_key="$2"
  
  log_info "Linking $child_key to parent $parent_key"
  
  curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    -H "Content-Type: application/json" \
    -X POST "${JPD_BASE_URL}/rest/api/3/issueLink" \
    -d "{
      \"type\": {\"name\": \"relates to\"},
      \"inwardIssue\": {\"key\": \"${child_key}\"},
      \"outwardIssue\": {\"key\": \"${parent_key}\"}
    }" >/dev/null
  
  log_success "Linked $child_key to $parent_key"
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
  local field="$2"  # title, state, labels
  local value="$3"
  
  log_info "Updating GitHub issue #$number: $field = $value"
  
  local payload
  case "$field" in
    title)
      payload="{\"title\": \"${value}\"}"
      ;;
    state)
      payload="{\"state\": \"${value}\"}"
      ;;
    *)
      log_error "Unknown field: $field"
      return 1
      ;;
  esac
  
  local response
  response=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Content-Type: application/json" \
    -X PATCH "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${number}" \
    -d "$payload")
  
  if echo "$response" | jq -e '.message' >/dev/null 2>&1; then
    log_error "Failed to update GitHub issue"
    log_info "Response: $response"
    return 1
  fi
  
  log_success "Updated #$number: $field = $value"
}

github_delete_issue() {
  local number="$1"
  log_info "Closing GitHub issue: #$number"
  
  # GitHub doesn't support DELETE, so we close and lock it
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
  local mode="${1:-dry-run}"
  
  log_info "Running sync (mode: $mode)..."
  
  local cmd="CONFIG_PATH=\"${CONFIG_PATH}\" pnpm run dev"
  if [ "$mode" = "dry-run" ]; then
    cmd="$cmd -- --dry-run"
  fi
  
  local output
  if output=$(eval "$cmd" 2>&1); then
    log_success "Sync completed"
    echo "$output" > /tmp/sync-output.txt
    return 0
  else
    log_error "Sync failed"
    log_info "Output: $output"
    echo "$output" > /tmp/sync-output.txt
    return 1
  fi
}

verify_sync_output() {
  local expected="$1"
  local output_file="${2:-/tmp/sync-output.txt}"
  
  if grep -q "$expected" "$output_file"; then
    log_success "Verified: $expected"
    return 0
  else
    log_error "Expected text not found: $expected"
    return 1
  fi
}

# ==========================================
# Test Cases
# ==========================================

test_jpd_to_github_create() {
  log_section "TEST 1: JPD → GitHub (Create)"
  
  # Create issue in JPD
  local key
  key=$(jpd_create_issue \
    "${TEST_ISSUE_PREFIX} Story Title (${TIMESTAMP})" \
    "Story" \
    "High" \
    "Backlog")
  
  wait_for_rate_limit 2
  
  # Run sync
  run_sync "live"
  
  wait_for_rate_limit 3
  
  # Verify GitHub issue was created
  local gh_number
  gh_number=$(github_get_issue_by_jpd_key "$key")
  
  if [ -n "$gh_number" ]; then
    CREATED_GITHUB_NUMBERS+=("$gh_number")
    log_success "GitHub issue #$gh_number created for $key"
    
    # Verify fields
    local gh_issue
    gh_issue=$(github_get_issue "$gh_number")
    
    local title
    title=$(echo "$gh_issue" | jq -r '.title')
    if [[ "$title" == *"Story Title"* ]]; then
      log_success "Title synced correctly: $title"
    else
      log_error "Title mismatch: $title"
    fi
    
    local labels
    labels=$(echo "$gh_issue" | jq -r '.labels[].name' | tr '\n' ',' | sed 's/,$//')
    if [[ "$labels" == *"story"* ]] && [[ "$labels" == *"high"* ]]; then
      log_success "Labels synced correctly: $labels"
    else
      log_error "Labels missing or incorrect: $labels"
    fi
  else
    log_error "GitHub issue not created for $key"
  fi
}

test_jpd_to_github_update() {
  log_section "TEST 2: JPD → GitHub (Update)"
  
  # Use the issue from test 1
  if [ ${#CREATED_JPD_KEYS[@]} -eq 0 ]; then
    log_error "No JPD issues available for update test"
    return 1
  fi
  
  local key="${CREATED_JPD_KEYS[0]}"
  local gh_number="${CREATED_GITHUB_NUMBERS[0]}"
  
  # Update title in JPD
  jpd_update_issue "$key" "summary" "${TEST_ISSUE_PREFIX} Story Title UPDATED (${TIMESTAMP})"
  
  wait_for_rate_limit 2
  
  # Run sync
  run_sync "live"
  
  wait_for_rate_limit 3
  
  # Verify GitHub issue was updated
  local gh_issue
  gh_issue=$(github_get_issue "$gh_number")
  
  local title
  title=$(echo "$gh_issue" | jq -r '.title')
  if [[ "$title" == *"UPDATED"* ]]; then
    log_success "Title update synced correctly: $title"
  else
    log_error "Title not updated in GitHub: $title"
  fi
}

test_jpd_to_github_priority_change() {
  log_section "TEST 3: JPD → GitHub (Priority Change)"
  
  local key="${CREATED_JPD_KEYS[0]}"
  local gh_number="${CREATED_GITHUB_NUMBERS[0]}"
  
  # Change priority from High to Critical
  jpd_update_issue "$key" "priority" "Critical"
  
  wait_for_rate_limit 2
  
  # Run sync
  run_sync "live"
  
  wait_for_rate_limit 3
  
  # Verify label changed in GitHub
  local gh_issue
  gh_issue=$(github_get_issue "$gh_number")
  
  local labels
  labels=$(echo "$gh_issue" | jq -r '.labels[].name' | tr '\n' ',' | sed 's/,$//')
  if [[ "$labels" == *"critical"* ]]; then
    log_success "Priority label updated correctly: $labels"
  else
    log_error "Priority label not updated: $labels"
  fi
}

test_github_to_jpd_status() {
  log_section "TEST 4: GitHub → JPD (Status Change)"
  
  local key="${CREATED_JPD_KEYS[0]}"
  local gh_number="${CREATED_GITHUB_NUMBERS[0]}"
  
  # Close GitHub issue
  github_update_issue "$gh_number" "state" "closed"
  
  wait_for_rate_limit 2
  
  # Run sync
  run_sync "live"
  
  wait_for_rate_limit 3
  
  # Verify JPD status changed to Done
  local jpd_issue
  jpd_issue=$(jpd_get_issue "$key")
  
  local status
  status=$(echo "$jpd_issue" | jq -r '.fields.status.name')
  if [[ "$status" == "Done" ]]; then
    log_success "Status synced correctly: $status"
  else
    log_error "Status not synced (expected Done, got $status)"
  fi
}

test_existing_issue_parent_sync() {
  log_section "TEST 5: Existing Issue Parent Sync"
  
  # Create Epic and Story in JPD (unlinked initially)
  local epic_key
  epic_key=$(jpd_create_issue \
    "${TEST_ISSUE_PREFIX} Epic: Payment Gateway (${TIMESTAMP})" \
    "Epic" \
    "High" \
    "Backlog")
  
  wait_for_rate_limit 2
  
  local story_key
  story_key=$(jpd_create_issue \
    "${TEST_ISSUE_PREFIX} Story: Stripe Integration (${TIMESTAMP})" \
    "Story" \
    "Medium" \
    "Backlog")
  
  wait_for_rate_limit 2
  
  # Sync both (will create as separate issues)
  run_sync "live"
  
  wait_for_rate_limit 3
  
  # Get GitHub numbers
  local epic_gh_number
  epic_gh_number=$(github_get_issue_by_jpd_key "$epic_key")
  
  local story_gh_number
  story_gh_number=$(github_get_issue_by_jpd_key "$story_key")
  
  if [ -n "$epic_gh_number" ] && [ -n "$story_gh_number" ]; then
    CREATED_GITHUB_NUMBERS+=("$epic_gh_number" "$story_gh_number")
    log_success "Epic #$epic_gh_number and Story #$story_gh_number created"
    
    # Now link Story to Epic in JPD (simulating adding parent after creation)
    jpd_link_issues "$story_key" "$epic_key"
    
    wait_for_rate_limit 2
    
    # Run sync again - should add Story to Epic's task list
    run_sync "live"
    
    wait_for_rate_limit 3
    
    # Verify Story was added to Epic's task list
    local epic_issue
    epic_issue=$(github_get_issue "$epic_gh_number")
    local epic_body
    epic_body=$(echo "$epic_issue" | jq -r '.body')
    
    if echo "$epic_body" | grep -q "## 📋 Subtasks"; then
      log_success "Epic contains Subtasks section"
      
      if echo "$epic_body" | grep -q "- \[ \] #${story_gh_number}"; then
        log_success "Story was added to Epic's task list after linking: - [ ] #${story_gh_number}"
      else
        log_error "Story was NOT added to Epic's task list"
      fi
    else
      log_error "Epic does not contain Subtasks section"
    fi
  else
    log_error "Failed to create Epic or Story"
  fi
}

test_checkbox_state_preservation() {
  log_section "TEST 6: Checkbox State Preservation"
  
  # Use issues from previous test if available, or create new ones
  if [ ${#CREATED_GITHUB_NUMBERS[@]} -lt 2 ]; then
    log_error "Need at least 2 issues from previous test"
    return 1
  fi
  
  local epic_gh_number="${CREATED_GITHUB_NUMBERS[-2]}"
  local story_gh_number="${CREATED_GITHUB_NUMBERS[-1]}"
  local epic_key="${CREATED_JPD_KEYS[-2]}"
  
  # Close the Story in GitHub
  log_info "Closing Story #${story_gh_number} to set checkbox"
  github_update_issue "$story_gh_number" "state" "closed"
  
  wait_for_rate_limit 2
  
  # Sync to update checkbox
  run_sync "live"
  
  wait_for_rate_limit 3
  
  # Verify checkbox is checked
  local epic_issue
  epic_issue=$(github_get_issue "$epic_gh_number")
  local epic_body_before
  epic_body_before=$(echo "$epic_issue" | jq -r '.body')
  
  if echo "$epic_body_before" | grep -q "- \[x\] #${story_gh_number}"; then
    log_success "Checkbox marked as complete: - [x] #${story_gh_number}"
  else
    log_error "Checkbox not marked as complete"
    return 1
  fi
  
  # Now update the Epic title in JPD (triggers body regeneration)
  log_info "Updating Epic title to trigger body regeneration"
  jpd_update_issue "$epic_key" "summary" "${TEST_ISSUE_PREFIX} Epic: Payment Gateway UPDATED (${TIMESTAMP})"
  
  wait_for_rate_limit 2
  
  # Sync again
  run_sync "live"
  
  wait_for_rate_limit 3
  
  # Verify checkbox is STILL checked (state preserved)
  epic_issue=$(github_get_issue "$epic_gh_number")
  local epic_body_after
  epic_body_after=$(echo "$epic_issue" | jq -r '.body')
  
  if echo "$epic_body_after" | grep -q "- \[x\] #${story_gh_number}"; then
    log_success "Checkbox state PRESERVED after Epic update: - [x] #${story_gh_number}"
  else
    log_error "Checkbox state was LOST after Epic update (should be [x] but is [ ])"
    log_info "Body before update: $epic_body_before"
    log_info "Body after update: $epic_body_after"
  fi
}

test_sub_issues_hierarchy() {
  log_section "TEST 7: Sub-Issues & Hierarchy (Epic → Story → Task)"
  
  # Create Epic in JPD
  local epic_key
  epic_key=$(jpd_create_issue \
    "${TEST_ISSUE_PREFIX} Epic: Mobile Redesign (${TIMESTAMP})" \
    "Epic" \
    "High" \
    "Backlog")
  
  wait_for_rate_limit 2
  
  # Create Story linked to Epic
  local story_key
  story_key=$(jpd_create_issue \
    "${TEST_ISSUE_PREFIX} Story: Login Updates (${TIMESTAMP})" \
    "Story" \
    "Medium" \
    "Backlog")
  
  wait_for_rate_limit 2
  
  # Link Story to Epic
  jpd_link_issues "$story_key" "$epic_key"
  
  wait_for_rate_limit 2
  
  # Create Task linked to Story
  local task_key
  task_key=$(jpd_create_issue \
    "${TEST_ISSUE_PREFIX} Task: Update UI (${TIMESTAMP})" \
    "Task" \
    "Low" \
    "Backlog")
  
  wait_for_rate_limit 2
  
  # Link Task to Story
  jpd_link_issues "$task_key" "$story_key"
  
  wait_for_rate_limit 2
  
  # Run sync to create GitHub sub-issues
  run_sync "live"
  
  wait_for_rate_limit 3
  
  # Verify Epic created in GitHub
  local epic_gh_number
  epic_gh_number=$(github_get_issue_by_jpd_key "$epic_key")
  
  if [ -n "$epic_gh_number" ]; then
    CREATED_GITHUB_NUMBERS+=("$epic_gh_number")
    log_success "Epic GitHub issue #$epic_gh_number created"
    
    # Verify Story created as sub-issue
    local story_gh_number
    story_gh_number=$(github_get_issue_by_jpd_key "$story_key")
    
    if [ -n "$story_gh_number" ]; then
      CREATED_GITHUB_NUMBERS+=("$story_gh_number")
      log_success "Story GitHub issue #$story_gh_number created"
      
      # Verify Task created as sub-issue of Story
      local task_gh_number
      task_gh_number=$(github_get_issue_by_jpd_key "$task_key")
      
      if [ -n "$task_gh_number" ]; then
        CREATED_GITHUB_NUMBERS+=("$task_gh_number")
        log_success "Task GitHub issue #$task_gh_number created"
        
        # Verify Epic body contains Story in task list
        local epic_issue
        epic_issue=$(github_get_issue "$epic_gh_number")
        local epic_body
        epic_body=$(echo "$epic_issue" | jq -r '.body')
        
        if echo "$epic_body" | grep -q "## 📋 Subtasks"; then
          log_success "Epic contains Subtasks section"
          
          if echo "$epic_body" | grep -q "- \[ \] #${story_gh_number}"; then
            log_success "Epic task list contains Story as sub-issue: - [ ] #${story_gh_number}"
          else
            log_error "Epic task list does not contain Story sub-issue"
          fi
        else
          log_error "Epic does not contain Subtasks section"
        fi
        
        # Verify Story body contains Task in task list
        local story_issue
        story_issue=$(github_get_issue "$story_gh_number")
        local story_body
        story_body=$(echo "$story_issue" | jq -r '.body')
        
        if echo "$story_body" | grep -q "## 📋 Subtasks"; then
          log_success "Story contains Subtasks section"
          
          if echo "$story_body" | grep -q "- \[ \] #${task_gh_number}"; then
            log_success "Story task list contains Task as sub-issue: - [ ] #${task_gh_number}"
          else
            log_error "Story task list does not contain Task sub-issue"
          fi
        else
          log_error "Story does not contain Subtasks section"
        fi
        
        # Verify Story body contains Parent reference
        if echo "$story_body" | grep -q "## 🔗 Parent"; then
          log_success "Story contains Parent section"
          
          if echo "$story_body" | grep -q "#${epic_gh_number}"; then
            log_success "Story references Epic as parent: #${epic_gh_number}"
          else
            log_error "Story does not reference Epic as parent"
          fi
        else
          log_error "Story does not contain Parent section"
        fi
        
        # Test closing Task and verify checkbox updates
        log_info "Closing Task to test checkbox auto-update..."
        github_update_issue "$task_gh_number" "state" "closed"
        
        wait_for_rate_limit 2
        
        # Run sync to update checkbox
        run_sync "live"
        
        wait_for_rate_limit 3
        
        # Verify Story task list shows Task as completed
        story_issue=$(github_get_issue "$story_gh_number")
        story_body=$(echo "$story_issue" | jq -r '.body')
        
        if echo "$story_body" | grep -q "- \[x\] #${task_gh_number}"; then
          log_success "Story task list shows Task as completed: - [x] #${task_gh_number}"
        else
          log_error "Story task list did not update Task to completed"
        fi
      else
        log_error "Task GitHub issue not created"
      fi
    else
      log_error "Story GitHub issue not created"
    fi
  else
    log_error "Epic GitHub issue not created"
  fi
}

# ==========================================
# Cleanup
# ==========================================

cleanup_existing_tests() {
  log_section "Idempotency Check - Cleaning Existing Test Data"
  
  # Find and delete old JPD test issues
  log_info "Searching for old TEST-AUTO issues in JPD..."
  local old_keys
  old_keys=$(curl -s -u "${JPD_EMAIL}:${JPD_API_KEY}" \
    -H "Content-Type: application/json" \
    -X POST "${JPD_BASE_URL}/rest/api/3/search/jql" \
    -d '{"jql":"project=MTT AND summary ~ '\''TEST-AUTO'\''","fields":["key"],"maxResults":50}' 2>/dev/null | \
    jq -r '.issues[].key' 2>/dev/null || true)
  
  if [ -n "$old_keys" ]; then
    log_info "Found old test issues, cleaning up..."
    for key in $old_keys; do
      jpd_delete_issue "$key" || true
      wait_for_rate_limit 1
    done
  else
    log_info "No old JPD test issues found"
  fi
  
  # Find and close old GitHub test issues
  log_info "Searching for old TEST-AUTO issues in GitHub..."
  local old_numbers
  old_numbers=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
    "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=all&per_page=100" 2>/dev/null | \
    jq -r '.[] | select(.title | contains("TEST-AUTO")) | .number' 2>/dev/null || true)
  
  if [ -n "$old_numbers" ]; then
    log_info "Found old GitHub issues, closing..."
    for num in $old_numbers; do
      github_delete_issue "$num" || true
      wait_for_rate_limit 1
    done
  else
    log_info "No old GitHub test issues found"
  fi
  
  log_success "Pre-test cleanup complete"
}

cleanup_test_data() {
  log_section "Cleanup Test Data"
  
  # Delete GitHub issues (close them)
  for number in "${CREATED_GITHUB_NUMBERS[@]}"; do
    github_delete_issue "$number" || true
    wait_for_rate_limit 1
  done
  
  # Delete JPD issues
  for key in "${CREATED_JPD_KEYS[@]}"; do
    jpd_delete_issue "$key" || true
    wait_for_rate_limit 1
  done
  
  log_success "Cleanup complete"
}

# ==========================================
# Main Execution
# ==========================================

main() {
  log_section "JPD ↔ GitHub Sync Integration Tests"
  log_info "Config: $CONFIG_PATH"
  log_info "Mode: Progressive Enhancement (API-driven)"
  
  if [ "$CLEANUP_ONLY" = "--cleanup-only" ]; then
    log_info "Cleanup mode: Will attempt to remove old test issues"
    # Find and clean up any existing test issues
    cleanup_existing_tests
    exit 0
  fi
  
  # Ensure idempotency by cleaning up any existing test data
  cleanup_existing_tests
  
  # Run tests in sequence
  test_jpd_to_github_create
  test_jpd_to_github_update
  test_jpd_to_github_priority_change
  test_github_to_jpd_status
  test_existing_issue_parent_sync
  test_checkbox_state_preservation
  test_sub_issues_hierarchy
  
  # Summary
  log_section "Test Results"
  echo -e "${GREEN}✓ Passed: $TEST_PASSED${NC}"
  echo -e "${RED}✗ Failed: $TEST_FAILED${NC}"
  echo ""
  
  # Cleanup
  read -p "Clean up test data? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    cleanup_test_data
  else
    log_info "Skipping cleanup. Created issues:"
    log_info "  JPD: ${CREATED_JPD_KEYS[*]}"
    log_info "  GitHub: ${CREATED_GITHUB_NUMBERS[*]}"
  fi
  
  # Exit with appropriate code
  if [ "$TEST_FAILED" -gt 0 ]; then
    exit 1
  else
    exit 0
  fi
}

# Run main function
main

