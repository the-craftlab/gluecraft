# MTT Project Example

This directory contains a **complete, working example** of using the JPD↔GitHub Connector for the MTT (Manifest Transformation Team) project.

**Purpose**: Reference implementation showing how to configure the tool for a real project.

**Status**: Fully functional, production-tested configuration.

---

## ⚠️ Important Note

This is a **PROJECT-SPECIFIC EXAMPLE** that will NOT work for your JPD project without modification.

It contains:
- Hard-coded field IDs (customfield_14385, customfield_14425, etc.)
- MTT-specific workflow statuses (Idea, Discovery, Epic Design, etc.)
- MTT-specific label patterns
- MTT-specific transform logic

**For your project**: Start with `config/sync-config.minimal.yaml` and build your own config.

---

## Contents

### Configuration Files (`/config`)

| File | Description |
|------|-------------|
| `mtt-clean.yaml` | Primary MTT configuration (clean, essential fields) |
| `mtt-test-config-v2.yaml` | Alternative MTT config with additional features |
| `mtt-test-config.yaml` | Original MTT config (legacy) |

### Transform Functions (`/transforms`)

| File | Description |
|------|-------------|
| `derive-priority.ts` | Derives GitHub labels from MTT priority fields |
| `build-issue-body.ts` | Builds rich issue body with RICE scoring |
| `combine-labels.ts` | Combines multiple MTT fields into labels |

### Documentation (`/docs`)

*(To be moved here)*
- MTT-specific quick start guide
- MTT-specific label cleanup guide

---

## What Makes This MTT-Specific?

### Hard-Coded Field IDs

```yaml
# MTT's "Category" field
customfield_14385

# MTT's "Dev Priority" field  
customfield_14425

# MTT's RICE scoring fields
customfield_14376  # Impact
customfield_14379  # Reach
customfield_14386  # Value
customfield_14387  # Effort
customfield_14389  # Confidence
```

**Your project will have different field IDs!**

### MTT-Specific Workflow

```yaml
statuses:
  "Idea": ...
  "Discovery": ...
  "Icebox": ...
  "Epic Design": ...
  "Backlog": ...
  "Ready": ...
  "In Progress": ...
  "In Review": ...
  "Done": ...
```

**Your project will have different status names!**

### MTT-Specific Label Mappings

```yaml
label_to_category:
  bug: "Bug"
  epic: "Epic"
  story: "Story"
```

**Your project may use different labels!**

---

## Using This as a Reference

### Good Use Cases ✅

1. **Understanding the tool**
   - See how mappings work
   - Learn transform function patterns
   - Understand hierarchy configuration

2. **Pattern inspiration**
   - Body builder structure
   - Priority derivation logic
   - Label combination approach

3. **Testing the tool**
   - Verify tool works end-to-end
   - Benchmark performance
   - Test new features

### Bad Use Cases ❌

1. **Copy-paste for your project**
   - Field IDs won't match
   - Status names won't match
   - Will fail validation

2. **Assume these are "defaults"**
   - These are MTT choices, not tool defaults
   - Tool has no opinions about your workflow

3. **Modify for your project**
   - Start with minimal.yaml instead
   - Build your own from scratch
   - Use discovery tools to find your IDs

---

## Running the MTT Example

If you have access to the MTT JPD project and want to test this example:

### 1. Set Environment Variables

```bash
# .env
JPD_BASE_URL=https://checkfront.atlassian.net
JPD_EMAIL=your-email@checkfront.com
JPD_API_KEY=your_jpd_api_key

GITHUB_TOKEN=your_github_token
GITHUB_OWNER=Checkfront
GITHUB_REPO=manifest-jpd-sync-test
```

### 2. Run Sync

```bash
# Dry run first
pnpm run dev -- --config examples/mtt/config/mtt-clean.yaml --dry-run

# Actual sync
pnpm run dev -- --config examples/mtt/config/mtt-clean.yaml
```

### 3. Verify Results

Check GitHub issues at:
https://github.com/Checkfront/manifest-jpd-sync-test/issues

---

## Key Learnings from MTT

### What Worked Well

1. **Status-based hierarchy**
   - Using JPD status to determine Epic vs Story
   - Clean separation without complex logic

2. **RICE scoring in body**
   - Product context visible in GitHub
   - Developers see full picture

3. **Prefixed labels**
   - `category:bug`, `priority:high`, `theme:expand-horizons`
   - Easy filtering, clear organization

4. **Bidirectional sync**
   - PM in JPD, devs in GitHub
   - Both see comments and status

### What Required Iteration

1. **Field discovery**
   - Finding field IDs initially time-consuming
   - Discovery tool made this easier

2. **Label cleanup**
   - First iteration had noisy labels
   - Clean version much better

3. **Status mappings**
   - Took time to map JPD statuses correctly
   - Needed to understand JPD workflow first

---

## Adapting This for Your Project

### Step 1: Discover Your Fields

```bash
pnpm run discover-fields YOUR_PROJECT_KEY
```

### Step 2: Map Your Workflow

1. List your JPD statuses
2. Decide which map to GitHub "open" vs "closed"
3. Define hierarchy (if applicable)

### Step 3: Create Your Config

Start with `config/sync-config.minimal.yaml` and:
1. Replace `YOUR_PROJECT_KEY`
2. Replace field IDs with yours
3. Replace status names with yours
4. Add your label patterns

### Step 4: Write Your Transforms (If Needed)

Only if you need complex logic:
1. Check `docs/TRANSFORM_PATTERNS.md` for patterns
2. Create `transforms/your-transform.ts`
3. Reference in your config

---

## Support

This MTT example is **reference only** and not supported for other projects.

For help with your own project:
- Read [Architecture](../../docs/ARCHITECTURE.md)
- Read [Transform Patterns](../../docs/TRANSFORM_PATTERNS.md)
- Use [Minimal Config](../../config/sync-config.minimal.yaml)
- Ask in GitHub Discussions

---

## Summary

- ✅ **Fully working** MTT configuration
- ✅ **Real-world tested** in production
- ✅ **Good reference** for understanding the tool
- ❌ **NOT a template** for your project
- ❌ **Will NOT work** without modification

**Start fresh with minimal.yaml for your project!**

