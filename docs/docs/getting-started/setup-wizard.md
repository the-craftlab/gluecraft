# Setup Wizard Explained

This guide provides detailed explanations for each question the setup wizard asks, helping you understand what information is needed and why.

## Question 1: JPD Base URL

**Prompt:** "Enter your JPD base URL (e.g., https://your-company.atlassian.net)"

### What It Is

Your Atlassian instance URL where JPD is hosted. This is the domain you visit to access Jira Product Discovery.

### How to Find It

1. Log into Jira Product Discovery
2. Look at your browser's address bar
3. Copy everything before `/jira/` or `/wiki/`

**Examples:**
- `https://acme-corp.atlassian.net`
- `https://mycompany.atlassian.net`

### Common Mistakes

- Including the full path: ~~`https://acme.atlassian.net/jira/polaris/projects/PROJ`~~
- Missing `https://`: ~~`acme.atlassian.net`~~
- Using `http://` instead of `https://`

### Why We Need It

The connector needs to know which Atlassian instance to connect to for API calls.

## Question 2: JPD Email

**Prompt:** "Enter your JPD email address"

### What It Is

The email address associated with your Atlassian account.

### Requirements

- Must be the exact email you use to log into Atlassian
- Must have access to the JPD project you want to sync
- Used for Basic Authentication with the API

### Why We Need It

Atlassian's API requires email + API token for authentication. The email identifies which user account is making the requests.

## Question 3: JPD API Token

**Prompt:** "Enter your JPD API token"

### What It Is

A secure token that acts as a password for API access.

### How to Generate

1. Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a descriptive name: "JPD GitHub Sync"
4. Copy the token immediately (it won't be shown again)

### Security

- Treat this like a password
- Never commit it to version control
- Revoke and regenerate if compromised
- The wizard stores it in `.env` (automatically git-ignored)

### Token Permissions

The token inherits your user permissions in Atlassian. Ensure you have:
- Read access to JPD issues
- Access to custom fields
- Permission to view project details

### Why We Need It

Required for authenticating API requests to JPD.

## Question 4: JPD Project Key

**Prompt:** "Enter your JPD project key (e.g., MTT, PROJ)"

### What It Is

A short identifier for your JPD project, typically 2-5 uppercase letters.

### How to Find It

**Method 1: In the URL**
When viewing your project: `https://company.atlassian.net/jira/polaris/projects/MTT`
The project key is `MTT`.

**Method 2: In the Project Settings**
1. Open your JPD project
2. Click project settings
3. Look for "Project Key" field

**Method 3: In Issue Keys**
Issue keys are formatted as `PROJECT-123`. The project key is the part before the hyphen.

### Format

- Usually 2-5 characters
- All uppercase letters
- No spaces or special characters
- Examples: `MTT`, `PROJ`, `DEV`, `ROADMAP`

### Why We Need It

Used in JQL queries to fetch issues from the specific project.

## Question 5: GitHub Personal Access Token

**Prompt:** "Enter your GitHub personal access token"

### What It Is

A secure token that grants API access to your GitHub account.

### How to Generate

1. Go to [GitHub Token Settings](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name: "JPD Sync"
4. Set expiration (recommend 90 days or no expiration)
5. Select scopes:
   - `repo` - Full control of private repositories
   - `write:discussion` - For GitHub Projects integration
6. Click "Generate token"
7. Copy immediately (won't be shown again)

### Required Scopes Explained

**`repo` (required)**
- Create and update issues
- Read issue details
- Manage labels
- Read repository information

**`write:discussion` (optional)**
- Update GitHub Projects boards
- Only needed if using Projects integration

### Security

- Store securely in `.env` file
- Never commit to version control
- Use environment-specific tokens (dev vs production)
- Rotate regularly for security

### Why We Need It

Required for creating and updating GitHub issues via the API.

## Question 6: GitHub Owner

**Prompt:** "Enter the GitHub repository owner (organization or username)"

### What It Is

The account that owns the GitHub repository - either a personal username or organization name.

### How to Find It

From the repository URL: `https://github.com/expedition/my-repo`
- Owner: `expedition`
- Repo: `my-repo`

### Format

- Single word, no spaces
- Case-sensitive (use exact casing from GitHub)
- Can be your username or an organization

**Examples:**
- Personal: `johndoe`
- Organization: `acme-corp`

### Why We Need It

Part of the repository identifier for GitHub API calls.

## Question 7: GitHub Repository Name

**Prompt:** "Enter the GitHub repository name"

### What It Is

The name of the specific repository where issues will be synced.

### Format

- Just the repository name, not the full URL
- Case-sensitive
- Use hyphens for spaces

**Correct:** `jpd-sync-test`  
**Incorrect:** ~~`https://github.com/owner/jpd-sync-test`~~

### Permissions Required

Your GitHub token must have write access to this repository:
- If it's your personal repo: You automatically have access
- If it's an organization repo: You need member access with write permissions

### Why We Need It

Identifies which repository to create/update issues in.

## Question 8: Field Selection

**Prompt:** "Select fields to sync (use space to select, enter to confirm)"

### What This Does

The wizard displays all custom fields discovered in your JPD project. You choose which ones to sync to GitHub.

### Field Information Shown

- **Field ID** - The internal identifier (e.g., `customfield_10001`)
- **Field Name** - Human-readable name
- **Type** - Field type (select, multiselect, number, text, etc.)
- **Sample Value** - Example from an actual issue

### Selection Strategy

**Recommended fields to sync:**
- Priority / Severity
- Status
- Team / Squad assignments
- Customer impact scores
- RICE scoring components
- Theme / Epic labels

**Fields to skip:**
- Internal IDs that have no meaning in GitHub
- Jira-specific metadata
- Deprecated or unused fields

### What Happens to Selected Fields

Each selected field is added to your `sync-config.yaml`:
- Field validation rules
- Mapping configuration
- Transform settings (auto-detected based on type)

### Why We Ask

Syncing unnecessary fields clutters GitHub issues. Selecting only relevant fields keeps your sync clean and performant.

## Question 9: Run Test Sync

**Prompt:** "Would you like to run a test sync now? (dry-run mode)"

### What This Does

Executes a dry-run sync that:
- Fetches issues from JPD
- Shows what would be created in GitHub
- Does not make any actual changes
- Validates your configuration

### Recommendation

**Yes** - Always recommended to verify setup before making changes

**No** - Skip if you want to review/customize the configuration first

### What to Look For

During the dry-run:
- Issue count matches expectations
- Field mappings look correct
- Labels are generated properly
- No errors or warnings

## After the Wizard

### Files Created

**`.env`**
```bash
JPD_BASE_URL=https://...
JPD_EMAIL=...
JPD_API_KEY=...
GITHUB_TOKEN=...
GITHUB_OWNER=...
GITHUB_REPO=...
```

**`config/sync-config.yaml`**
- Complete sync configuration
- Field mappings
- Status mappings
- Label definitions

### What You Can Do

- Review generated configuration
- Customize field mappings
- Adjust status workflows
- Add custom transform functions
- Run actual sync

## Common Issues

### "Connection to JPD failed"

**Check your answers to:**
- Question 1 (Base URL) - Must include `https://`
- Question 2 (Email) - Must match Atlassian account exactly
- Question 3 (API Token) - Must be valid and not expired

### "No fields found in project"

**Check your answer to:**
- Question 4 (Project Key) - Must be correct and you must have access
- Ensure the project has at least one issue

### "GitHub authentication failed"

**Check your answers to:**
- Question 5 (Token) - Must have `repo` scope
- Question 6 (Owner) - Must match exactly (case-sensitive)
- Question 7 (Repo) - Must exist and you must have write access

## Next Steps

- [Run Your First Sync](./first-sync) - Execute a real sync
- [Manual Setup](./manual-setup) - For those who prefer manual configuration
- [Configuration Overview](../configuration/overview) - Understand the config file structure

