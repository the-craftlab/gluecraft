# Test Suite Documentation

Comprehensive test suite for the JPD to GitHub connector, including unit tests, integration tests, and E2E tests.

## Test Structure

```
tests/
├── unit/               # Fast, isolated unit tests
├── integration/        # Integration tests with mocked APIs
├── e2e/               # Live E2E tests against real APIs
├── fixtures/          # Captured API responses for mocking
├── scripts/           # Shell-based test automation scripts
│   ├── test-quick.sh                    # Quick 10-second sync test
│   ├── test-sync-integration.sh         # Full integration test suite (4 scenarios)
│   ├── test-github-to-jpd-creation.sh   # GitHub → JPD issue creation tests
│   ├── test-comment-sync.sh             # Bidirectional comment sync tests
│   └── test-now.sh                      # Immediate test runner
└── docs/              # Test documentation
    ├── TESTING_GUIDE.md           # Step-by-step testing guide
    ├── TESTING_STRATEGY.md        # Overall test strategy
    ├── IDEMPOTENT_TESTS.md        # Idempotency documentation
    ├── PROGRESSIVE_TESTING.md     # Progressive enhancement approach
    ├── TEST_FLOW.md               # Visual test flow diagrams
    ├── TEST_QUICK_REF.md          # Quick reference guide
    ├── TEST_SUITE_SUMMARY.md      # Test suite overview
    └── TEST_*.md                  # Test result reports
```

## Running Tests

### Quick Start

```bash
# Run all unit and integration tests (fast, mocked)
pnpm test

# Run E2E tests (requires .env configuration)
pnpm test:e2e

# Run shell-based integration tests (idempotent)
./tests/scripts/test-quick.sh              # 10-second quick test
./tests/scripts/test-sync-integration.sh   # Full test suite (~5 min)

# Capture fixtures from live run
pnpm test:capture-fixtures
```

### Test Types

#### 1. Unit Tests (`tests/unit/`)
- Fast, isolated tests
- No external dependencies
- Run on every commit
- Test individual components

```bash
pnpm test run tests/unit
```

#### 2. Integration Tests (`tests/integration/`)
- Test component interactions
- Use mocked APIs (from fixtures)
- Fast and deterministic
- Run on every commit

```bash
pnpm test run tests/integration
```

#### 3. E2E Tests (`tests/e2e/`)
- Test complete workflows
- Use real JPD and GitHub APIs
- Require credentials
- Run nightly or manually

```bash
pnpm test:e2e
```

#### 4. Shell Integration Tests (`tests/scripts/`)
- API-driven progressive enhancement tests
- Test full bidirectional sync
- **Idempotent** - can run multiple times safely
- Use real JPD and GitHub APIs
- Automatic cleanup before/after

```bash
# Quick 10-second test
./tests/scripts/test-quick.sh

# Full integration test suite (4 scenarios)
./tests/scripts/test-sync-integration.sh

# GitHub → JPD issue creation (labels → categories)
./tests/scripts/test-github-to-jpd-creation.sh

# Bidirectional comment synchronization
./tests/scripts/test-comment-sync.sh

# Cleanup only (force cleanup without testing)
./tests/scripts/test-sync-integration.sh --cleanup-only
```

**Key Features:**
- ✅ **Idempotent** - automatic cleanup of old test data
- ✅ **Timestamp-based uniqueness** - no conflicts
- ✅ **CI/CD ready** - safe for automation
- ✅ **Interrupt-safe** - next run cleans up orphans
- ✅ **Real API testing** - validates actual JPD/GitHub integration
- ✅ **Live links** - provides direct links to created issues/comments

**Test Coverage:**
- `test-quick.sh` - Basic JPD → GitHub sync (10s)
- `test-sync-integration.sh` - Full bidirectional sync (4 scenarios: create, update, status, field changes)
- `test-github-to-jpd-creation.sh` - GitHub → JPD creation with label mapping (bug/enhancement/story/epic)
- `test-comment-sync.sh` - Bidirectional comment sync with idempotency checks

See `tests/docs/IDEMPOTENT_TESTS.md` for details.

## Environment Setup

### For E2E Tests

Create a `.env` file in the project root:

```bash
# JPD Configuration
JPD_API_KEY=your_jpd_api_key
JPD_BASE_URL=https://your-domain.atlassian.net
JPD_EMAIL=your_email@example.com
JPD_PROJECT=MTT

# GitHub Configuration
GITHUB_TOKEN=your_github_token
GITHUB_OWNER=your_github_org
GITHUB_REPO=manifest-jpd-sync-test
```

### Required Permissions

**JPD:**
- Read access to project issues
- API token with project scope

**GitHub:**
- `repo` scope for issue creation/updates
- Write access to test repository

## Test Scenarios

### Field Mapping Tests
- All JPD field types
- Custom fields
- Null/undefined handling
- Special characters
- Unicode support

### Transformation Tests
- Template substitution
- Filter chains (lowercase, slugify, trim, etc.)
- Custom functions
- Multi-field combinations
- Error handling

### Label Generation Tests
- Single field → label
- Multiple fields → multiple labels
- Hierarchy labels (epic, story, task)
- Team assignment labels
- Label limits and edge cases

### Hierarchy Tests
- Parent-child relationships
- Epic → Story → Task
- Orphaned issues
- Circular reference prevention
- Deep hierarchy chains

### Live Sync Tests
- Full JPD → GitHub sync
- Update detection (hash-based)
- Status mapping
- Metadata injection
- Label preservation

### Performance Tests
- Hash calculation speed
- Template parsing performance
- Large dataset handling (100+ issues)
- Memory usage
- Concurrent operations

### Error Handling Tests
- API errors (401, 403, 429, 500)
- Invalid configuration
- Corrupted metadata
- Missing fields
- Network timeouts

## Fixture Management

### Capturing Fixtures

Capture real API responses for use in mocked tests:

```bash
pnpm test:capture-fixtures
```

This creates:
- `tests/fixtures/jpd/issues-mtt-TIMESTAMP.json`
- `tests/fixtures/github/issues-synced-TIMESTAMP.json`
- `tests/fixtures/jpd/edge-cases.json`

### Using Fixtures

Integration tests automatically use fixtures:

```typescript
import jpdFixtures from '../fixtures/jpd/issues-mtt-latest.json';
vi.spyOn(JpdClient.prototype, 'searchIssues').mockResolvedValue(jpdFixtures);
```

### Updating Fixtures

1. Run capture script: `pnpm test:capture-fixtures`
2. Review captured data
3. Commit to repository
4. Integration tests use new fixtures automatically

## CI/CD Integration

### GitHub Actions Workflows

**On every PR/push:**
- Unit tests
- Integration tests (mocked)
- Build check

**Nightly (2 AM UTC):**
- E2E tests against live APIs
- Fixture capture and update

**Manual trigger:**
- Choose test type (unit, e2e, or all)

### Required Secrets

Configure in GitHub repository settings:

```
JPD_API_KEY
JPD_BASE_URL
JPD_EMAIL
JPD_PROJECT
GH_PAT (GitHub Personal Access Token)
GITHUB_OWNER
GITHUB_REPO
```

## Test Data Management

### Test Issues in GitHub

E2E tests automatically tag created issues:
- `test-issue` - All test-created issues
- `test-run:TIMESTAMP` - Specific test run

### Cleanup

Automatic cleanup after each test run:

```typescript
// In test teardown
await teardownTestEnv(env);
```

Manual cleanup:

```typescript
import { cleanupAllTestIssues } from './tests/e2e/setup';
await cleanupAllTestIssues(githubClient, owner, repo);
```

### Test Scenarios in JPD

Create these manually in JPD for comprehensive testing:

1. **Simple Story** - Basic fields only
2. **Full Story** - All fields populated
3. **Epic with Stories** - Parent-child hierarchy
4. **Story with null priority** - Common JPD case
5. **Story with special chars** - `"Test: A/B [Draft]"`
6. **Very long description** - Test limits
7. **Rich text description** - HTML/markdown
8. **Multiple assignees** - User mapping

## Debugging Tests

### Verbose Output

```bash
DEBUG=* pnpm test:e2e
```

### Run Specific Test File

```bash
pnpm test run tests/e2e/field-mapping.test.ts
```

### Run Specific Test Case

```bash
pnpm test run -t "should extract description field"
```

### Dry Run Mode

Test sync logic without making API calls:

```bash
pnpm dev --dry-run
```

## Writing New Tests

### Unit Test Template

```typescript
import { describe, test, expect } from 'vitest';

describe('ComponentName', () => {
  test('should do something specific', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = someFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### E2E Test Template

```typescript
import { describe, test, expect, beforeAll } from 'vitest';
import { setupTestEnv, type TestEnv } from './setup';

let env: TestEnv;

beforeAll(async () => {
  env = await setupTestEnv();
}, 30000);

describe('Feature Name', () => {
  test('should test live feature', async () => {
    // Test against real APIs
    const issues = await getJpdTestIssues(env.jpdClient, env.jpdProject);
    expect(issues.length).toBeGreaterThan(0);
  }, 60000);
});
```

## Best Practices

1. **Naming**: Use descriptive test names that explain what and why
2. **Isolation**: Unit tests should not depend on external state
3. **Speed**: Keep unit tests fast (< 100ms each)
4. **Cleanup**: E2E tests must clean up created resources
5. **Mocking**: Use fixtures for integration tests, not live APIs
6. **Coverage**: Aim for >80% code coverage
7. **Edge Cases**: Test null, undefined, empty, very large values
8. **Error Paths**: Test error handling, not just happy paths

## Troubleshooting

### E2E Tests Failing

1. Check `.env` credentials are correct
2. Verify test repository access
3. Ensure JPD project has issues
4. Check for rate limiting
5. Review test cleanup

### Integration Tests Failing

1. Update fixtures: `pnpm test:capture-fixtures`
2. Check mock configurations
3. Verify fixture file paths

### Performance Issues

1. Run tests individually to isolate slow tests
2. Check for memory leaks
3. Review fixture sizes
4. Consider pagination in large dataset tests

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [JPD API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [GitHub API Documentation](https://docs.github.com/en/rest)

