# CLI Tools Reference 🛠️

The JPD to GitHub Connector includes several CLI tools to make setup and maintenance foolproof.

---

## 🎯 Setup Wizard (Recommended)

The setup wizard guides you through the entire configuration process interactively.

```bash
pnpm run setup
```

### What It Does

1. ✅ Checks for existing configuration
2. ✅ Prompts for JPD and GitHub credentials
3. ✅ Tests connections to both services
4. ✅ Discovers JPD custom fields automatically
5. ✅ Lets you select which fields to sync
6. ✅ Generates `config/sync-config.yaml`
7. ✅ Creates `.env` file with credentials
8. ✅ Optionally runs a test sync

### When to Use

- **First-time setup** - Gets you from zero to syncing in 5 minutes
- **New project** - Quickly configure sync for a new JPD project
- **Reset configuration** - Start fresh with a clean config

---

## 🔌 Connection Tester

Test JPD and GitHub connections quickly (with automatic rate limit handling).

```bash
pnpm run test-connection

# Force fresh test (skip cache)
pnpm run test-connection --force
```

### What It Does

1. ✅ Checks all required environment variables
2. ✅ Tests JPD API connection with rate limit protection
3. ✅ Tests GitHub API connection  
4. ✅ Caches results for 5 minutes (avoids rate limits)
5. ✅ Automatic retry with exponential backoff

### Features

- **Smart Caching** - Remembers successful tests for 5 minutes
- **Rate Limit Protection** - Automatically retries with backoff
- **Progress Feedback** - Shows retry attempts and wait times
- **Helpful Errors** - Clear messages with fix instructions

### When to Use

- **Quick validation** - Verify credentials without running full sync
- **After updating .env** - Confirm new credentials work
- **Troubleshooting** - Isolate connection issues
- **Before setup** - Pre-check credentials

### Output Example

```
🔌 Connection Test

✔ JPD connection successful (found 42 recent issues)
✔ GitHub connection verified (cached, 120s ago)

✅ All connections successful!

💡 Tip: Connection results are cached for 5 minutes.
   Use --force to skip cache: pnpm run test-connection --force
```

---

## 🔍 Field Discovery

Discover and display all JPD custom fields in a project.

```bash
pnpm run discover-fields PROJECT_KEY
```

### Example

```bash
pnpm run discover-fields YOUR_PROJECT
```

### Output

Shows a formatted table with:
- **Field ID** - The `customfield_XXXXX` identifier
- **Type** - Detected field type (number, select, multiselect, etc.)
- **Status** - Whether the field is populated (✓ Set) or empty
- **Sample Value** - Example value from a real issue

Also generates a ready-to-copy config snippet.

### When to Use

- **Finding field IDs** - When you need to know the ID of a specific field
- **Auditing fields** - See what fields exist and are populated
- **Building config** - Get a head start on your field validation section

---

## 🏷️ Label Setup

Create GitHub labels with custom colors defined in your config.

```bash
# Preview what labels will be created
pnpm run setup-labels --preview

# Create all labels in GitHub
pnpm run setup-labels
```

### What It Does

1. ✅ Reads label definitions from your `config/sync-config.yaml`
2. ✅ Shows all labels grouped by category (hierarchy, types, priorities, etc.)
3. ✅ Creates labels in GitHub with specified colors and descriptions
4. ✅ Skips labels that already exist
5. ✅ Provides a link to view labels in GitHub

### Preview Mode

```bash
pnpm run setup-labels --preview
```

Shows what labels will be created **without actually creating them**. Perfect for:
- Reviewing label names and colors
- Checking for typos
- Planning your label strategy

### Example Output

```
GitHub Label Setup
Config: config/sync-config.yaml

Found 12 labels to create:

Hierarchy:
  █ epic - High-level initiative
  █ story - User story
  █ task - Implementation task

Types:
  █ type:bug - Bug fix
  █ type:feature - New feature
  █ type:tech-debt - Technical debt

Priorities:
  █ priority:critical - Critical priority
  █ priority:high - High priority
  █ priority:normal - Normal priority
  █ priority:low - Low priority

Creating labels...

✅ Successfully created/verified 12 labels

You can view the labels at:
https://github.com/your-org/your-repo/labels
```

### When to Use

- **First-time setup** - Create all labels before first sync
- **Reviewing strategy** - Use `--preview` to plan labels
- **After config changes** - When you add new label definitions
- **Optional** - Labels are auto-created during sync anyway!

### Config Example

```yaml
# config/sync-config.yaml
labels:
  hierarchy:
    - name: "epic"
      color: "0052CC"
      description: "High-level initiative"
  
  types:
    - name: "type:bug"
      color: "DE350B"
      description: "Bug fix"
  
  priorities:
    - name: "priority:critical"
      color: "DE350B"
      description: "Critical priority"
```

**Note:** Labels are created automatically during sync if they don't exist. This command is optional but useful for upfront setup.

---

## ✅ Config Validator

Validates your sync configuration before running.

```bash
pnpm run validate-config [config-path]
```

### Example

```bash
# Validate default config
pnpm run validate-config

# Validate specific config
pnpm run validate-config config/my-custom-config.yaml
```

### What It Checks

1. ✅ Config file exists
2. ✅ YAML syntax is valid
3. ✅ Schema validation passes
4. ✅ All required environment variables are set
5. ✅ JPD custom fields exist (if field validation configured)
6. ✅ Field types match expectations
7. ✅ Field mappings are properly configured

### When to Use

- **Before first sync** - Catch configuration errors early
- **After editing config** - Verify your changes are valid
- **Troubleshooting** - Diagnose sync issues
- **CI/CD pipeline** - Validate config in automated tests

---

## 🚀 Sync Runner

Run the actual sync process.

```bash
# Test sync (no changes made)
pnpm run dev -- --dry-run

# Actual sync (makes real changes)
pnpm run dev
```

### Dry Run Mode

```bash
pnpm run dev -- --dry-run
```

- ✅ Fetches data from JPD and GitHub
- ✅ Shows what would be created/updated
- ❌ Doesn't create or modify anything
- ❌ Doesn't write to APIs

**Always run dry-run first!**

### Actual Sync

```bash
pnpm run dev
```

- ✅ Fetches data from JPD and GitHub
- ✅ Creates new GitHub issues from JPD
- ✅ Updates existing GitHub issues
- ✅ Syncs status changes back to JPD
- ✅ Syncs comments bidirectionally

### When to Use

- **Dry Run**: Before every actual sync, after config changes, when testing
- **Actual Sync**: When you're ready to sync for real, in automated workflows

---

## 🧪 Testing

Run the test suite.

```bash
# Run all tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Capture fixtures from live API
pnpm test:capture-fixtures
```

### When to Use

- **Development** - Ensure your changes don't break existing functionality
- **Contributing** - Validate your pull request
- **Debugging** - Identify what's not working

---

## 📝 Common Workflows

### First-Time Setup

```bash
# 1. Install
pnpm install

# 2. Run wizard
pnpm run setup

# 3. Validate
pnpm run validate-config

# 4. Test
pnpm run dev -- --dry-run

# 5. Go live
pnpm run dev
```

### Adding New Fields

```bash
# 1. Discover fields
pnpm run discover-fields YOUR_PROJECT

# 2. Edit config (add new fields to `fields` and `mappings` sections)
code config/sync-config.yaml

# 3. Validate
pnpm run validate-config

# 4. Test
pnpm run dev -- --dry-run
```

### Troubleshooting Sync Issues

```bash
# 1. Validate config
pnpm run validate-config

# 2. Check field discovery
pnpm run discover-fields YOUR_PROJECT

# 3. Run dry-run with debug
DEBUG=1 pnpm run dev -- --dry-run

# 4. Review logs carefully
```

### Switching Projects

```bash
# 1. Discover new project fields
pnpm run discover-fields YOUR_NEW_PROJECT

# 2. Create new config
cp config/sync-config.yaml config/new-project-config.yaml

# 3. Edit new config
code config/new-project-config.yaml

# 4. Update .env with new project
code .env

# 5. Validate
CONFIG_PATH=config/new-project-config.yaml pnpm run validate-config

# 6. Test
CONFIG_PATH=config/new-project-config.yaml pnpm run dev -- --dry-run
```

---

## 🎨 CLI Output Guide

### Success Indicators

- ✅ Green checkmarks - Operation succeeded
- ✔ Success message - Step completed
- [INFO] - Informational message

### Warning Indicators

- ⚠️ Yellow warnings - Non-fatal issues
- [WARN] - Warning message
- Optional field is null - OK for optional fields

### Error Indicators

- ❌ Red X - Operation failed
- [ERROR] - Error message
- Validation failed - Must be fixed before proceeding

### Progress Indicators

- 🔄 Spinner - Operation in progress
- - Bullet point - Current step
- Step X: - Sequential process

---

## 💡 Pro Tips

1. **Always run `validate-config` before `dev`**
   - Catches errors before they cause sync failures
   - Saves time debugging

2. **Use `discover-fields` liberally**
   - Quick way to find field IDs
   - Shows what data is actually available

3. **Test with `--dry-run` frequently**
   - Safe way to verify config changes
   - See what will happen before it happens

4. **Keep multiple configs**
   - One config per JPD project
   - Easy to switch between projects

5. **Use `DEBUG=1` for detailed logs**
   ```bash
   DEBUG=1 pnpm run dev -- --dry-run
   ```

6. **Chain commands for workflows**
   ```bash
   pnpm run validate-config && pnpm run dev -- --dry-run
   ```

---

## 🆘 Getting Help

If a CLI command fails:

1. **Read the error message carefully** - It usually tells you exactly what's wrong
2. **Run `validate-config`** - Diagnoses most configuration issues
3. **Check environment variables** - Make sure `.env` is properly configured
4. **Review documentation** - Each tool has detailed docs
5. **Enable debug mode** - `DEBUG=1` shows detailed logs

---

## 📚 Related Documentation

- [Getting Started Guide](GETTING_STARTED.md) - Step-by-step setup
- [Field Validation](FIELD_VALIDATION.md) - Configure field validation
- [Testing Guide](TESTING_GUIDE.md) - Comprehensive testing
- [README](README.md) - Main documentation

---

**Happy syncing! 🚀**

