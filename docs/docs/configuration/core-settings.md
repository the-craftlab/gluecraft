# Core Settings

Core settings define the fundamental configuration for connecting to JPD and GitHub, along with the sync direction.

## JPD Project Configuration

The `jpd` section specifies which JPD project to sync:

```yaml
jpd:
  project_key: "MTT"  # Your JPD project key
```

### project_key

**Type:** String  
**Required:** Yes

The unique identifier for your JPD project.

**How to find it:**
- Look at the URL when viewing your project: `https://company.atlassian.net/jira/polaris/projects/MTT`
- The project key is `MTT`
- Or check issue keys: `MTT-123` → project key is `MTT`

**Format:**
- Usually 2-5 uppercase letters
- No spaces or special characters
- Examples: `MTT`, `PROJ`, `DEV`, `ROADMAP`

## GitHub Repository Configuration

The `github` section specifies the target repository:

```yaml
github:
  owner: "expedition"  # GitHub username or organization
  repo: "my-repo"      # Repository name
```

### owner

**Type:** String  
**Required:** Yes

The GitHub account that owns the repository (username or organization).

**How to find it:**
- From URL: `https://github.com/expedition/my-repo`
- Owner is `expedition`

**Format:**
- Case-sensitive
- Single word, no spaces
- Can be personal username or organization name

### repo

**Type:** String  
**Required:** Yes

The name of the GitHub repository.

**How to find it:**
- From URL: `https://github.com/expedition/my-repo`
- Repo is `my-repo`

**Format:**
- Case-sensitive
- Just the repository name, not the full URL
- Use hyphens for spaces

## Sync Direction

The `sync` section controls how data flows between systems:

```yaml
sync:
  direction: "bidirectional"        # Sync direction
  github_closed_status: "Done"      # Where to move JPD issues when GitHub closes
  enable_comment_sync: true         # Sync comments bidirectionally
```

### direction

**Type:** String  
**Required:** No (defaults to `jpd-to-github`)  
**Options:** `jpd-to-github`, `bidirectional`

Controls the direction of synchronization:

**`jpd-to-github` (default):**
- JPD is the source of truth
- Changes in JPD sync to GitHub
- Changes in GitHub are **not** synced back to JPD
- One-way sync only

**`bidirectional`:**
- Two-way synchronization
- JPD changes sync to GitHub
- GitHub changes sync to JPD
- Status updates work both ways
- Comments sync both ways (if enabled)

**Example:**

```yaml
# One-way: JPD → GitHub
sync:
  direction: "jpd-to-github"
```

```yaml
# Two-way: JPD ↔ GitHub
sync:
  direction: "bidirectional"
  github_closed_status: "Done"
```

### github_closed_status

**Type:** String  
**Required:** Only when `direction` is `bidirectional`

The JPD status to set when a GitHub issue is closed.

**Example:**

```yaml
sync:
  direction: "bidirectional"
  github_closed_status: "Done"  # Move JPD issues here when GitHub closes
```

**Important:**
- Must match a valid status in your JPD workflow
- Case-sensitive
- Only used for bidirectional sync

### enable_comment_sync

**Type:** Boolean  
**Required:** No (defaults to `false`)

Enable bidirectional comment synchronization.

```yaml
sync:
  direction: "bidirectional"
  enable_comment_sync: true  # Sync comments both ways
```

**When enabled:**
- Comments added in JPD appear in GitHub
- Comments added in GitHub appear in JPD
- Author attribution is preserved
- Updates tracked to avoid duplicates

See [Comment Sync](../features/comment-sync) for details.

## Complete Example

A typical core settings configuration:

```yaml
# JPD Project
jpd:
  project_key: "MTT"

# GitHub Repository
github:
  owner: "expedition"
  repo: "manifest-jpd-sync"

# Sync Settings
sync:
  direction: "bidirectional"
  github_closed_status: "Done"
  enable_comment_sync: true
```

## Authentication

Credentials are **not** stored in the config file. They go in `.env`:

```bash
# JPD Credentials
JPD_BASE_URL=https://company.atlassian.net
JPD_EMAIL=user@company.com
JPD_API_KEY=your_api_token

# GitHub Credentials
GITHUB_TOKEN=ghp_your_token
GITHUB_OWNER=expedition
GITHUB_REPO=manifest-jpd-sync
```

:::warning Credentials Security
Never commit `.env` to version control. The file is git-ignored by default. Share credentials securely through password managers or secret management services.
:::

## Validation

Validate your core settings:

```bash
pnpm run validate-config
```

The validator checks:
- Project key format is valid
- Owner and repo are specified
- Sync direction is valid
- Required environment variables are set
- Can connect to both JPD and GitHub

## Common Issues

### "Project key not found"

**Cause:** Incorrect project key or no access

**Check:**
- Project key matches exactly (case-sensitive)
- You have access to the JPD project
- Project exists and is active

**Solution:**
```bash
# List your accessible projects
pnpm run discover-fields YOUR_PROJECT_KEY
```

### "Repository not found"

**Cause:** Incorrect owner/repo or insufficient permissions

**Check:**
- Owner and repo names are correct
- Repository exists and is accessible
- GitHub token has `repo` scope
- You have write access to the repository

**Solution:**
- Verify at `https://github.com/OWNER/REPO`
- Check token permissions

### "Invalid sync direction"

**Cause:** Typo in direction value

**Valid values:**
- `jpd-to-github`
- `bidirectional`

**Invalid:**
- ~~`jpdtogithub`~~
- ~~`bi-directional`~~
- ~~`two-way`~~

## Environment-Specific Configuration

### Multiple Environments

Use different configs for dev/prod:

**config/dev.yaml:**
```yaml
jpd:
  project_key: "DEV"

github:
  owner: "my-org"
  repo: "dev-repo"
```

**config/prod.yaml:**
```yaml
jpd:
  project_key: "PROD"

github:
  owner: "my-org"
  repo: "prod-repo"
```

Load with:
```bash
CONFIG_PATH=./config/prod.yaml pnpm run dev
```

### Multiple Projects

One config per JPD project:

```bash
config/
  project-mobile.yaml
  project-web.yaml
  project-api.yaml
```

Switch between them:
```bash
CONFIG_PATH=./config/project-mobile.yaml pnpm run dev
```

## Next Steps

With core settings configured:

- [Configure Field Mappings](./field-mappings) - Map JPD fields to GitHub
- [Set Up Status Workflows](./status-workflows) - Define status sync
- [Define Labels](./labels) - Create label strategy
- [Enable Hierarchy](./hierarchy) - Set up Epic/Story/Task relationships

:::tip Best Practice
Start with one-way sync (`jpd-to-github`) to verify everything works, then enable bidirectional sync once you're confident in the configuration.
:::

