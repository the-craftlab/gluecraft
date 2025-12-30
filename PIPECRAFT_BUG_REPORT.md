# Bug Report: Invalid workflow generation for single-branch workflows

## Summary

PipeCraft generates invalid GitHub Actions workflow syntax when configured with a single-branch workflow (e.g., `initialBranch: main`, `finalBranch: main`, `branchFlow: [main]`).

## Issues Found

### 1. Empty condition in `promote` job (Syntax Error)

**Problem**: The generated `promote` job includes an empty condition `&& ()` which causes invalid YAML syntax.

**Generated code** (invalid):
```yaml
promote:
  needs: [ version, tag ]
  if: ${{
      always() &&
      (github.event_name == 'push' ||
      github.event_name == 'workflow_dispatch') &&
      needs.version.result == 'success' &&
      needs.version.outputs.version != '' &&
      (needs.tag.result == 'success' ||
      needs.tag.result == 'skipped') &&
      ()  # ❌ Empty condition - invalid syntax
    }}
```

**Error message**:
```
Invalid workflow file: .github/workflows/pipeline.yml#L1
(Line: 304, Col: 9): Unexpected symbol: ')'. Located at position 235 within expression: 
always() && (github.event_name == 'push' || github.event_name == 'workflow_dispatch') && 
needs.version.result == 'success' && needs.version.outputs.version != '' && 
(needs.tag.result == 'success' || needs.tag.result == 'skipped') && ()
```

### 2. Validation error for single-branch workflows

**Problem**: The `pipecraft validate` command rejects valid single-branch configurations.

**Configuration**:
```yaml
initialBranch: main
finalBranch: main
branchFlow:
  - main
```

**Validation error**:
```
❌ Configuration validation failed: branchFlow must be an array with at least 2 branches
```

**Expected behavior**: Single-branch workflows should be valid for libraries, GitHub Actions, and other projects that don't need branch promotion.

## Use Case

Single-branch workflows are common for:
- GitHub Actions (like [gluecraft](https://github.com/the-craftlab/gluecraft))
- NPM packages
- Libraries that publish directly from `main`

These projects still benefit from:
- Semantic versioning
- Automatic tagging
- GitHub releases
- But don't need branch promotion (already on main)

## Expected Behavior

1. **For single-branch workflows**: The `promote` job should either:
   - Be skipped automatically (`if: false`)
   - Not be generated at all
   - Have a valid condition that evaluates to false

2. **Validation**: Should accept single-branch configurations as valid

## Workaround

Currently, I manually fixed the workflow by setting:
```yaml
promote:
  if: false  # Skip promotion - single branch workflow (main → main)
```

But this gets overwritten when regenerating workflows.

## Environment

- **PipeCraft version**: Latest (via `npx pipecraft`)
- **Repository**: https://github.com/the-craftlab/gluecraft
- **Configuration**: See `.pipecraftrc` below

## Configuration File

```yaml
# PipeCraft Configuration for Gluecraft
ciProvider: github
mergeStrategy: fast-forward
requireConventionalCommits: true

# Simple single-branch workflow for library/action publishing
initialBranch: main
finalBranch: main

# Single branch flow - no promotion needed for library
branchFlow:
  - main

domains:
  action:
    description: 'GitHub Action and CLI package'
    paths:
      - '**/*'
```

## Suggested Fix

1. **Detect single-branch workflows** during generation
2. **Skip or conditionally disable** the `promote` job when `initialBranch == finalBranch` or `branchFlow.length == 1`
3. **Update validation** to accept single-branch configurations
4. **Preserve manual fixes** to `promote` job when regenerating (if user has set `if: false`)

## Related

This affects the workflow generation logic, likely in the template that creates the `promote` job condition.

