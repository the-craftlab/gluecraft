# Configuration Overview

The JPD to GitHub Connector is configured through a YAML file that controls sync behavior, field mappings, status workflows, and more.

## Configuration File Location

By default, the connector looks for configuration at:

```bash
config/sync-config.yaml
```

You can specify a custom location using an environment variable:

```bash
CONFIG_PATH=./my-custom-config.yaml pnpm run dev
```

## Configuration File Structure

A configuration file has seven main sections:

```yaml
# 1. JPD Project Settings
jpd:
  project_key: "MTT"

# 2. GitHub Repository Settings
github:
  owner: "expedition"
  repo: "my-repo"

# 3. Sync Direction
sync:
  direction: "bidirectional"

# 4. Field Definitions
fields:
  priority:
    field_id: "customfield_10001"
    field_type: "select"

# 5. Field Mappings
mappings:
  - jpd: "fields.priority.value"
    github: "labels"

# 6. Status Workflows
statuses:
  "To Do":
    github_state: "open"

# 7. Label Definitions
labels:
  hierarchy:
    - name: "epic"
      color: "0052CC"
```

## Environment Variables

Credentials are stored in a `.env` file (never commit this):

```bash
# JPD Authentication
JPD_BASE_URL=https://your-company.atlassian.net
JPD_EMAIL=your-email@company.com
JPD_API_KEY=your_api_token

# GitHub Authentication
GITHUB_TOKEN=ghp_your_github_token
GITHUB_OWNER=your-org
GITHUB_REPO=your-repo

# Optional Overrides
CONFIG_PATH=./config/sync-config.yaml
DEBUG=false
```

### Variable Descriptions

**JPD_BASE_URL**
- Your Atlassian instance URL
- Must include `https://`
- Example: `https://acme-corp.atlassian.net`

**JPD_EMAIL**
- Email for your Atlassian account
- Used for Basic Authentication

**JPD_API_KEY**
- API token from Atlassian
- Generate at: [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)

**GITHUB_TOKEN**
- Personal access token from GitHub
- Generate at: [GitHub Tokens](https://github.com/settings/tokens)
- Required scopes: `repo`, optionally `write:discussion`

**GITHUB_OWNER**
- GitHub username or organization name
- Case-sensitive

**GITHUB_REPO**
- Repository name (not full URL)
- Case-sensitive

**CONFIG_PATH** (optional)
- Override default config file location
- Defaults to `./config/sync-config.yaml`

**DEBUG** (optional)
- Enable verbose logging
- Set to `true` or `1`

## Configuration Validation

Always validate your configuration before running a sync:

```bash
pnpm run validate-config
```

Validation checks:
- YAML syntax is correct
- Required fields are present
- Environment variables are set
- JPD field IDs exist
- Field types match expectations
- Status names are valid

## Configuration Examples

### Minimal Configuration

The absolute minimum needed to sync:

```yaml
jpd:
  project_key: "PROJ"

github:
  owner: "my-org"
  repo: "my-repo"

statuses:
  "To Do":
    github_state: "open"
  "Done":
    github_state: "closed"
```

### Recommended Starting Point

A good starting configuration:

```yaml
jpd:
  project_key: "PROJ"

github:
  owner: "my-org"
  repo: "my-repo"

sync:
  direction: "bidirectional"

fields:
  priority:
    field_id: "customfield_10001"
    field_type: "select"
    required: false

mappings:
  - jpd: "fields.summary"
    github: "title"
    template: "[{{fields.project.key}}-{{fields.id | idonly}}] {{fields.summary}}"
    
  - jpd: "fields.priority.value"
    github: "labels"
    template: "priority:{{fields.priority.value | lowercase}}"

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

### Full-Featured Configuration

See `config/mtt-clean.yaml` in the repository for a complete example with:
- Custom field validation
- Transform functions
- Hierarchy configuration
- GitHub Projects integration
- Comment sync settings
- Rate limiting configuration

## Configuration Sections

Each section has its own detailed documentation page:

### [Core Settings](./core-settings)
JPD project, GitHub repository, and sync direction configuration.

### [Field Mappings](./field-mappings)
Map JPD custom fields to GitHub issue properties and labels.

### [Status Workflows](./status-workflows)
Define how statuses sync between JPD and GitHub.

### [Labels](./labels)
Configure automatic label creation with colors and descriptions.

### [Hierarchy](./hierarchy)
Set up Epic > Story > Task relationships using statuses.

### [Advanced Configuration](./advanced)
Transform functions, templates, rate limiting, and GitHub Projects.

## Common Configuration Tasks

### Adding a New Field Mapping

1. Discover the field ID:
   ```bash
   pnpm run discover-fields YOUR_PROJECT
   ```

2. Add to `fields` section:
   ```yaml
   fields:
     my_field:
       field_id: "customfield_10005"
       field_type: "number"
       required: false
   ```

3. Add to `mappings` section:
   ```yaml
   mappings:
     - jpd: "fields.customfield_10005"
       github: "labels"
       template: "impact:{{fields.customfield_10005}}"
   ```

4. Validate:
   ```bash
   pnpm run validate-config
   ```

### Changing Status Mappings

Edit the `statuses` section:

```yaml
statuses:
  "Your JPD Status":
    github_state: "open"  # or "closed"
```

Status names must match exactly (case-sensitive).

### Adding New Labels

Add to the `labels` section:

```yaml
labels:
  your_category:
    - name: "label-name"
      color: "FF5630"  # Hex color (no #)
      description: "Label description"
```

Labels are automatically created in GitHub if they don't exist.

## Multiple Configurations

### Different Projects

Create one config per project:

```bash
config/
  project-a.yaml
  project-b.yaml
```

Use with:

```bash
CONFIG_PATH=./config/project-b.yaml pnpm run dev
```

### Environment-Specific Configs

Separate configs for dev/staging/production:

```bash
config/
  dev.yaml
  staging.yaml
  production.yaml
```

Pair with environment-specific `.env` files:

```bash
.env.development
.env.staging
.env.production
```

## Troubleshooting Configuration

### "Configuration file not found"

**Check:**
- File exists at specified path
- File name is correct (case-sensitive)
- Using correct CONFIG_PATH if overriding

### "Invalid YAML syntax"

**Check:**
- Proper indentation (use spaces, not tabs)
- Colons followed by spaces
- Quoted strings with special characters
- Matching brackets and quotes

### "Field validation failed"

**Check:**
- Field ID matches output from `discover-fields`
- Field type is correct
- Field actually exists in JPD
- You have permission to access the field

### "Status not found"

**Check:**
- Status name matches JPD exactly (case-sensitive)
- No extra spaces before/after status name
- Status exists in your JPD workflow

## Next Steps

Now that you understand the configuration structure:

- [Configure Core Settings](./core-settings) - Set up JPD and GitHub connection
- [Map Fields](./field-mappings) - Define field transformations
- [Set Up Status Workflows](./status-workflows) - Configure status sync
- [Define Labels](./labels) - Create label strategy

:::tip Configuration Best Practices
- Start with minimal config and add complexity gradually
- Always run `validate-config` after changes
- Test with `--dry-run` before actual sync
- Keep multiple configs in version control (without credentials)
- Document custom transform functions
:::

