# Contributing to Gluecraft JPD

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Style Guide](#style-guide)
- [Adding Examples](#adding-examples)

## Code of Conduct

This project adheres to the Contributor Covenant Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/gluecraft-jpd.git
   cd gluecraft-jpd
   ```
3. **Add the upstream repository**:
   ```bash
   git remote add upstream https://github.com/thecraftlab/gluecraft-jpd.git
   ```

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 10+
- JIRA/JPD account with API access
- GitHub account with personal access token

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# (Never commit .env file!)
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm test:e2e
pnpm test:unit

# Run tests in watch mode
pnpm test -- --watch
```

### Local Development

```bash
# Run in dry-run mode (no changes made)
pnpm run dev -- --dry-run

# Run actual sync
pnpm run dev

# Test health check
pnpm run health-check

# Discover fields
pnpm run discover-fields YOUR_PROJECT_KEY
```

## Making Changes

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch (if used)
- `feature/your-feature` - New features
- `fix/your-fix` - Bug fixes
- `docs/your-docs` - Documentation updates

### Creating a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Commit Messages

Use the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
feat(scope): add new feature
fix(scope): fix bug in component
docs(scope): update documentation
test(scope): add tests
refactor(scope): refactor code
chore(scope): update dependencies
```

Examples:
```
feat(transforms): add RICE score calculation
fix(sync-engine): handle null field values
docs(examples): add e-commerce roadmap example
test(integration): add error handling tests
```

## Testing

### Test Requirements

All pull requests must include tests:

- **Unit tests** for new functions/utilities
- **Integration tests** for API interactions
- **E2E tests** for complete sync workflows
- Tests must be **idempotent** (can run multiple times safely)

### Writing Tests

```typescript
// tests/unit/your-feature.test.ts
import { describe, it, expect } from 'vitest';
import { yourFunction } from '../src/your-feature';

describe('yourFunction', () => {
  it('should handle normal input', () => {
    const result = yourFunction('input');
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    expect(() => yourFunction(null)).toThrow();
  });
});
```

### Running Test Scripts

Use the provided test scripts:

```bash
# Quick validation tests (no API calls)
./tests/scripts/test-generic-setup.sh

# Integration tests (requires .env)
./tests/scripts/test-sync-integration.sh

# Specific example test
CONFIG_PATH=examples/mtt/config/mtt-clean.yaml pnpm test
```

## Submitting Changes

### Before Submitting

1. **Run tests**: `pnpm test`
2. **Check linting**: `pnpm run lint` (if configured)
3. **Build successfully**: `pnpm run build`
4. **Update documentation** if adding features
5. **Add examples** for new transform patterns

### Creating a Pull Request

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create PR** on GitHub with:
   - **Clear title** following conventional commits
   - **Description** of changes made
   - **Motivation** for the change
   - **Testing** performed
   - **Screenshots** if UI/output changes
   - **Breaking changes** if any

3. **Link related issues**: "Fixes #123" or "Relates to #456"

### PR Review Process

- Maintainers will review within 3-5 business days
- Address review feedback by pushing new commits
- Keep discussion focused and professional
- CI must pass before merging

## Style Guide

### TypeScript

- Use **TypeScript** for all new code
- Follow existing code style (use Prettier if configured)
- Use **async/await** over promises
- Prefer **const** over let, avoid var
- Use **meaningful variable names**

```typescript
// Good
const jpdClient = new JpdClient(config);
const syncedIssues = await jpdClient.searchIssues(jql);

// Avoid
const c = new JpdClient(config);
const data = await c.search(jql);
```

### Documentation

- Add **JSDoc comments** for all exported functions
- Include **examples** in documentation
- Keep **README** updated with new features
- Add **inline comments** for complex logic

```typescript
/**
 * Synchronize a JPD issue to GitHub
 * 
 * @param jpdIssue - The JPD issue object
 * @param config - Sync configuration
 * @returns The GitHub issue number, or null if skipped
 * 
 * @example
 * ```typescript
 * const githubNumber = await syncToGitHub(jpdIssue, config);
 * ```
 */
async function syncToGitHub(jpdIssue: any, config: Config): Promise<number | null> {
  // Implementation
}
```

### Configuration Files

- Use **YAML** for config files
- Add **comments** explaining options
- Provide **examples** for each pattern
- Keep **minimal configs** simple

## Adding Examples

Examples are crucial for showing different use cases. To add a new example:

1. **Create directory structure**:
   ```bash
   mkdir -p examples/your-example/config
   ```

2. **Add config file**: `examples/your-example/config/config.yaml`
   - Start from `config/sync-config.minimal.yaml`
   - Add project-specific fields
   - Document all custom field IDs
   - Include setup instructions

3. **Add README**: `examples/your-example/README.md`
   - Describe the use case
   - List features demonstrated
   - Provide setup steps
   - Include customization ideas
   - Add troubleshooting section

4. **Update main README** with link to new example

5. **Test the example** thoroughly

See existing examples for reference:
- `examples/jira-software-basic/` - Minimal setup
- `examples/ecommerce-roadmap/` - Product management
- `examples/bug-tracking/` - Bug workflows
- `examples/mtt/` - Advanced JPD features

## Areas for Contribution

### High Priority

- **Performance improvements** - Optimize API calls, caching
- **Error handling** - Better error messages, recovery strategies
- **Monitoring** - Metrics, logging, observability
- **Documentation** - Tutorials, troubleshooting guides
- **Examples** - More real-world use cases

### Feature Ideas

- **Field type support** - More JPD field types
- **Bi-directional comments** - Rich comment sync
- **Attachment sync** - File attachment support
- **Webhook support** - Real-time sync
- **Multi-project sync** - Handle multiple projects
- **GitHub Discussions** - Sync to discussions
- **Custom field validators** - Runtime validation

### Good First Issues

Look for issues tagged `good-first-issue` or `help-wanted` on GitHub.

## Questions?

- **Documentation**: Check [docs/](docs/) directory
- **Examples**: Browse [examples/](examples/) directory
- **Issues**: Search existing issues on GitHub
- **Discussions**: Start a discussion on GitHub

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🎉

