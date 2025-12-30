# Setup Wizard

The interactive setup wizard guides you through initial configuration with prompts and validation.

## Command

```bash
pnpm run setup
```

## What It Does

The setup wizard automates the entire configuration process:

1. Checks for existing configuration files
2. Prompts for credentials with validation
3. Tests connections to JPD and GitHub APIs
4. Discovers custom fields in your JPD project
5. Lets you select which fields to sync
6. Generates `.env` and `config/sync-config.yaml`
7. Optionally runs a test sync

## Running the Wizard

Start the wizard:

```bash
pnpm run setup
```

The wizard runs interactively with clear prompts and real-time validation.

## Wizard Flow

### Step 1: Check Existing Configuration

The wizard checks if configuration already exists:

```
Found existing configuration at config/sync-config.yaml

What would you like to do?
> Use existing configuration
  Create new configuration
  Update existing configuration
```

**Options:**
- **Use existing** - Skip setup, use current config
- **Create new** - Start fresh (backs up existing)
- **Update existing** - Modify current configuration

### Step 2: Collect JPD Credentials

Prompts for JPD connection details:

```
JPD Configuration
-----------------
JPD Base URL (e.g., https://company.atlassian.net):
> https://acme-corp.atlassian.net

JPD Email:
> john.doe@acme-corp.com

JPD API Token:
> ••••••••••••••••••••
```

**Validation:**
- Base URL format (must include https://)
- Email format
- Token not empty

### Step 3: Collect GitHub Credentials

Prompts for GitHub connection details:

```
GitHub Configuration
--------------------
GitHub Token:
> ••••••••••••••••••••

GitHub Owner (username or organization):
> acme-corp

GitHub Repository:
> product-roadmap
```

**Validation:**
- Token format (must start with `ghp_` or `github_pat_`)
- Owner and repo not empty

### Step 4: Test Connections

Automatically tests API connections:

```
Testing Connections
-------------------
→ Testing JPD connection...
✓ JPD connection successful (found 42 issues)

→ Testing GitHub connection...
✓ GitHub connection successful
```

**What's tested:**
- JPD API authentication
- GitHub API authentication
- Repository access permissions
- Rate limit status

**On failure:**
- Clear error messages
- Suggestions for fixing
- Option to re-enter credentials

### Step 5: Select JPD Project

Prompts for project key:

```
JPD Project
-----------
Project Key (e.g., MTT, PROJ):
> MTT

→ Fetching project details...
✓ Found project: Mobile Task Tracker (MTT)
```

**Validation:**
- Project exists and is accessible
- You have permission to view issues
- Project has at least one issue (for field discovery)

### Step 6: Discover Fields

Automatically discovers custom fields:

```
Discovering Fields
------------------
→ Analyzing JPD custom fields...
✓ Found 12 custom fields

Field ID              | Type      | Sample Value
----------------------|-----------|------------------
customfield_10001     | select    | High
customfield_10002     | array     | ["Mobile", "Web"]
customfield_10003     | number    | 8
customfield_10004     | text      | Additional context
```

### Step 7: Select Fields to Sync

Interactive field selection:

```
Select Fields to Sync
----------------------
Use ↑↓ to navigate, Space to select, Enter to confirm

◉ customfield_10001 (select) - Priority
◯ customfield_10002 (array) - Themes
◉ customfield_10003 (number) - Impact Score
◯ customfield_10004 (text) - Notes
◉ customfield_10005 (user) - Product Owner
```

**Tips:**
- Select fields that add value in GitHub
- Skip internal/deprecated fields
- You can add fields later
- Common selections: priority, status, themes, scores

### Step 8: Generate Configuration

Creates configuration files:

```
Generating Configuration
------------------------
→ Creating .env file...
✓ Created .env

→ Generating sync-config.yaml...
✓ Created config/sync-config.yaml

Configuration generated successfully!
```

**Files created:**
- `.env` - Credentials (git-ignored)
- `config/sync-config.yaml` - Sync configuration

### Step 9: Test Sync (Optional)

Offers to run a test sync:

```
Test Sync
---------
Would you like to run a test sync (dry-run)?
This will show what would be synced without making changes.

> Yes, run test sync
  No, skip for now
```

**If yes:**
- Runs `pnpm run dev -- --dry-run`
- Shows what would be created/updated
- Validates configuration works

## Generated Files

### .env File

```bash
# JPD Configuration
JPD_BASE_URL=https://acme-corp.atlassian.net
JPD_EMAIL=john.doe@acme-corp.com
JPD_API_KEY=your_api_token_here

# GitHub Configuration
GITHUB_TOKEN=ghp_your_github_token_here
GITHUB_OWNER=acme-corp
GITHUB_REPO=product-roadmap

# Optional Configuration
CONFIG_PATH=./config/sync-config.yaml
```

### config/sync-config.yaml

```yaml
jpd:
  project_key: "MTT"

github:
  owner: "acme-corp"
  repo: "product-roadmap"

sync:
  direction: "jpd-to-github"

fields:
  priority:
    field_id: "customfield_10001"
    field_type: "select"
    required: false
    
  impact_score:
    field_id: "customfield_10003"
    field_type: "number"
    required: false

mappings:
  - jpd: "fields.summary"
    github: "title"
    template: "[{{fields.project.key}}-{{fields.id | idonly}}] {{fields.summary}}"
    
  - jpd: "fields.customfield_10001.value"
    github: "labels"
    template: "priority:{{fields.customfield_10001.value | lowercase}}"

statuses:
  "To Do":
    github_state: "open"
  "In Progress":
    github_state: "open"
  "Done":
    github_state: "closed"

labels:
  hierarchy:
    - name: "epic"
      color: "0052CC"
      description: "High-level initiative"
```

## Command Options

The setup wizard supports several options:

### Skip Existing Check

Always create new configuration:

```bash
pnpm run setup --force
```

### Use Custom Config Path

Generate config at custom location:

```bash
CONFIG_PATH=./config/custom.yaml pnpm run setup
```

### Non-Interactive Mode

Provide values via environment:

```bash
JPD_BASE_URL=https://company.atlassian.net \
JPD_EMAIL=user@company.com \
JPD_API_KEY=token \
GITHUB_TOKEN=ghp_token \
pnpm run setup --non-interactive
```

## After Setup

Once the wizard completes:

1. **Review generated files:**
   ```bash
   cat .env
   cat config/sync-config.yaml
   ```

2. **Validate configuration:**
   ```bash
   pnpm run validate-config
   ```

3. **Run dry-run sync:**
   ```bash
   pnpm run dev -- --dry-run
   ```

4. **Run actual sync:**
   ```bash
   pnpm run dev
   ```

## Troubleshooting

### Connection Test Fails

**Error:** "Failed to connect to JPD"

**Solutions:**
- Verify base URL includes `https://`
- Check email matches Atlassian account
- Ensure API token is valid
- Check network connectivity

**Debug:**
```bash
DEBUG=1 pnpm run setup
```

### No Fields Found

**Error:** "No custom fields found in project"

**Causes:**
- Project has no issues
- No custom fields configured in project
- Insufficient permissions

**Solutions:**
- Create at least one issue in JPD
- Check project permissions
- Verify you can see custom fields in JPD UI

### Field Discovery Timeout

**Error:** "Timeout discovering fields"

**Cause:** JPD rate limiting

**Solution:**
- Wait 60 seconds and try again
- JPD has strict rate limits for API calls

### Permission Denied

**Error:** "Permission denied accessing repository"

**Causes:**
- GitHub token lacks `repo` scope
- Not a member of organization
- Repository doesn't exist

**Solutions:**
- Regenerate token with `repo` scope
- Verify repository owner and name
- Check you have write access

## Best Practices

### Before Running Setup

1. Have credentials ready:
   - JPD API token generated
   - GitHub personal access token generated
   - Project key identified

2. Prepare your environment:
   - Clean workspace (no conflicting configs)
   - Network access to both services
   - Write permissions in project directory

### During Setup

1. **Take your time**
   - Read prompts carefully
   - Verify entered values
   - Don't skip connection tests

2. **Field selection**
   - Start with essential fields
   - Can add more fields later
   - Fewer fields = simpler configuration

3. **Test sync**
   - Always run the test sync
   - Review output carefully
   - Verify fields map correctly

### After Setup

1. **Commit configuration (without credentials):**
   ```bash
   git add config/sync-config.yaml
   git commit -m "feat: add JPD sync configuration"
   ```

2. **Document custom settings:**
   - Add comments to config file
   - Note any special field mappings
   - Document workflow decisions

3. **Set up automation:**
   - Configure GitHub Actions
   - Set up scheduled syncs
   - Add monitoring

## Next Steps

- [Sync Commands](./sync-commands) - Run your first sync
- [Validation Tools](./validation) - Validate configuration
- [Manual Setup](../getting-started/manual-setup) - For advanced users
- [Configuration Guide](../configuration/overview) - Understand the config

:::tip Wizard vs Manual
The setup wizard is perfect for getting started quickly. For advanced configurations with custom transforms or complex mappings, use [manual setup](../getting-started/manual-setup) after running the wizard.
:::

