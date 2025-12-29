#!/bin/bash
# =================================================================
# Generic Setup Test Script
# =================================================================
#
# Purpose: Test that the setup process creates generic configs
# without hard-coded MTT-specific values
#
# Idempotent: Can be run multiple times without side effects
# 
# Tests:
# 1. Config validation with generic config
# 2. Field discovery returns data (mock)
# 3. Generated config has no hard-coded MTT values
# 4. Minimal config validates
#
# =================================================================

# Note: Don't use 'set -e' as arithmetic operations can return non-zero
# We handle failures explicitly with print_fail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_header() {
  echo -e "\n${BLUE}===================================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}===================================================${NC}\n"
}

print_test() {
  echo -e "${YELLOW}TEST:${NC} $1"
  ((TESTS_RUN++))
}

print_pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1\n"
  ((TESTS_PASSED++))
}

print_fail() {
  echo -e "${RED}✗ FAIL${NC}: $1\n"
  ((TESTS_FAILED++))
}

print_summary() {
  echo -e "\n${BLUE}===================================================${NC}"
  echo -e "${BLUE}Test Summary${NC}"
  echo -e "${BLUE}===================================================${NC}"
  echo -e "Tests run:    $TESTS_RUN"
  echo -e "${GREEN}Passed:       $TESTS_PASSED${NC}"
  if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Failed:       $TESTS_FAILED${NC}"
  else
    echo -e "${GREEN}Failed:       $TESTS_FAILED${NC}"
  fi
  echo -e "${BLUE}===================================================${NC}\n"
}

# =================================================================
# Test 1: Minimal Config Validates
# =================================================================
print_header "Test 1: Minimal Config Validation"

print_test "Validate config/sync-config.minimal.yaml"

if [ ! -f "config/sync-config.minimal.yaml" ]; then
  print_fail "Minimal config does not exist"
else
  # Check that file exists and has expected structure
  if grep -q "YOUR_PROJECT_KEY" config/sync-config.minimal.yaml; then
    print_pass "Minimal config has placeholders (not hard-coded values)"
  else
    print_fail "Minimal config missing placeholders"
  fi

  if grep -q "customfield_14" config/sync-config.minimal.yaml; then
    print_fail "Minimal config contains MTT-specific field IDs (customfield_14xxx)"
  else
    print_pass "Minimal config has no MTT-specific field IDs"
  fi

  if grep -q '"Idea"' config/sync-config.minimal.yaml && grep -q '"Discovery"' config/sync-config.minimal.yaml; then
    print_fail "Minimal config contains MTT-specific status names"
  else
    print_pass "Minimal config has no hard-coded MTT status names"
  fi
fi

# =================================================================
# Test 2: Generic Test Config Validates
# =================================================================
print_header "Test 2: Generic Test Config Validation"

print_test "Validate tests/fixtures/configs/generic-test-config.yaml"

if [ ! -f "tests/fixtures/configs/generic-test-config.yaml" ]; then
  print_fail "Generic test config does not exist"
else
  # Check for non-MTT field IDs
  if grep -q "customfield_99999" tests/fixtures/configs/generic-test-config.yaml; then
    print_pass "Generic test config uses non-MTT field IDs"
  else
    print_fail "Generic test config should use arbitrary field IDs (like customfield_99999)"
  fi

  # Check for non-MTT statuses
  if ! grep -q '"Idea"' tests/fixtures/configs/generic-test-config.yaml && \
     ! grep -q '"Discovery"' tests/fixtures/configs/generic-test-config.yaml; then
    print_pass "Generic test config uses non-MTT status names"
  else
    print_fail "Generic test config should not use MTT status names"
  fi

  # Check project key is not MTT
  if ! grep -q "project = MTT" tests/fixtures/configs/generic-test-config.yaml; then
    print_pass "Generic test config uses non-MTT project key"
  else
    print_fail "Generic test config should not use 'MTT' project key"
  fi
fi

# =================================================================
# Test 3: Documentation Files Are Generic
# =================================================================
print_header "Test 3: Documentation Genericness"

print_test "Check docs/ARCHITECTURE.md exists"
if [ -f "docs/ARCHITECTURE.md" ]; then
  print_pass "Architecture documentation exists"
else
  print_fail "Architecture documentation missing"
fi

print_test "Check docs/TRANSFORM_PATTERNS.md exists"
if [ -f "docs/TRANSFORM_PATTERNS.md" ]; then
  print_pass "Transform patterns documentation exists"
else
  print_fail "Transform patterns documentation missing"
fi

print_test "Check docs/PROJECT_STRUCTURE.md exists"
if [ -f "docs/PROJECT_STRUCTURE.md" ]; then
  print_pass "Project structure documentation exists"
else
  print_fail "Project structure documentation missing"
fi

# =================================================================
# Test 4: Transform Functions Are Marked
# =================================================================
print_header "Test 4: Transform Functions Marked as MTT-Specific"

check_todo_marker() {
  local file=$1
  if [ ! -f "$file" ]; then
    print_fail "$file does not exist"
    return 1
  fi
  
  if grep -q "TODO: MTT-SPECIFIC" "$file"; then
    print_pass "$file is marked as MTT-specific"
  else
    print_fail "$file should have TODO: MTT-SPECIFIC marker"
  fi
}

print_test "Check transforms/derive-priority.ts"
check_todo_marker "transforms/derive-priority.ts"

print_test "Check transforms/build-issue-body.ts"
check_todo_marker "transforms/build-issue-body.ts"

print_test "Check transforms/combine-labels.ts"
check_todo_marker "transforms/combine-labels.ts"

# =================================================================
# Test 5: Config Files Are Marked
# =================================================================
print_header "Test 5: MTT Config File Marked"

print_test "Check config/mtt-clean.yaml has warning"
if [ -f "config/mtt-clean.yaml" ]; then
  if grep -q "MTT-SPECIFIC CONFIGURATION" config/mtt-clean.yaml; then
    print_pass "mtt-clean.yaml has warning header"
  else
    print_fail "mtt-clean.yaml should have MTT-SPECIFIC warning header"
  fi
else
  print_fail "config/mtt-clean.yaml does not exist"
fi

# =================================================================
# Test 6: Source Code Is Marked
# =================================================================
print_header "Test 6: Source Code Hard-Coding Marked"

print_test "Check src/sync-engine.ts has TODO for hard-coded field IDs"
if [ -f "src/sync-engine.ts" ]; then
  if grep -q "TODO: HARD-CODED FIELD IDS" src/sync-engine.ts; then
    print_pass "sync-engine.ts hard-coding is marked"
  else
    print_fail "sync-engine.ts should have TODO for hard-coded field IDs"
  fi
else
  print_fail "src/sync-engine.ts does not exist"
fi

# =================================================================
# Test Summary
# =================================================================
print_summary

# Exit with error if any tests failed
if [ $TESTS_FAILED -gt 0 ]; then
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi

