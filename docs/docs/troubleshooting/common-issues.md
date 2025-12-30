# Common Issues

Solutions for frequently encountered problems when using Gluecraft JPD.

## Connection Issues

### JPD Connection Failed

**Symptoms:**
```
✗ Failed to connect to JPD
Error: Authentication failed
```

**Common Causes:**
1. Invalid API token
2. Incorrect base URL
3. Wrong email address
4. Network connectivity issues

**Solutions:**

**Check base URL format:**
```bash
# Correct format
JPD_BASE_URL=https://your-company.atlassian.net

# Incorrect formats
JPD_BASE_URL=your-company.atlassian.net  # Missing https://
JPD_BASE_URL=https://your-company.atlassian.net/  # Trailing slash
```

**Verify email matches Atlassian account:**
```bash
# Email must match exactly
JPD_EMAIL=john.doe@company.com
```

**Test API token:**
1. Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Verify token hasn't been revoked
3. Generate new token if needed
4. Update `.env` file

**Test connection:**
```bash
pnpm run test-connection --jpd-only --force
```

**Check network:**
```bash
ping your-company.atlassian.net
curl -I https://your-company.atlassian.net
```

### GitHub Connection Failed

**Symptoms:**
```
✗ Failed to connect to GitHub
Error: Bad credentials
```

**Common Causes:**
1. Invalid GitHub token
2. Token expired
3. Insufficient token scopes
4. Repository doesn't exist
5. No write access

**Solutions:**

**Verify token format:**
```bash
# Classic tokens start with ghp_
GITHUB_TOKEN=ghp_...

# Fine-grained tokens start with github_pat_
GITHUB_TOKEN=github_pat_...
```

**Check token scopes:**
1. Go to [GitHub Token Settings](https://github.com/settings/tokens)
2. Verify token has `repo` scope (required)
3. Add `write:discussion` for Projects support
4. Regenerate if scopes are wrong

**Verify repository exists:**
```bash
# Visit repository URL
open https://github.com/OWNER/REPO

# Check ownership and permissions
```

**Test connection:**
```bash
pnpm run test-connection --github-only --force
```

**Test API access:**
```bash
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/OWNER/REPO
```

### Rate Limit Exceeded

**Symptoms:**
```
Rate limit exceeded, retrying...
→ Attempt 1/3: Waiting 5 seconds
```

**About Rate Limits:**
- **JPD:** Very strict, ~100 requests/hour
- **GitHub:** 5000 requests/hour for authenticated users

**Immediate Solutions:**

**Wait for automatic retry:**
The connector handles retries automatically with exponential backoff.

**Check rate limit status:**
```bash
pnpm run health-check
```

Output shows:
```
API Status
----------
JPD API: Operational
  Rate limit: 5/100 (resets in 45m)

GitHub API: Operational
  Rate limit: 4850/5000 (resets in 52m)
```

**Long-term Solutions:**

**Reduce sync frequency:**
```bash
# Instead of every 15 minutes
*/15 * * * * pnpm run dev

# Run hourly
0 * * * * pnpm run dev
```

**Increase backoff:**
```yaml
rate_limiting:
  max_retries: 5
  initial_delay_ms: 2000
  backoff_multiplier: 3
```

**Use caching:**
```yaml
cache:
  enabled: true
  ttl_seconds: 600  # Cache for 10 minutes
```

## Configuration Issues

### Configuration File Not Found

**Symptoms:**
```
✗ Configuration file not found
Looked at: config/sync-config.yaml
```

**Solutions:**

**Check file exists:**
```bash
ls -la config/sync-config.yaml
```

**Check file path:**
```bash
# Default path
config/sync-config.yaml

# Custom path via environment
CONFIG_PATH=./my-config.yaml

# Custom path via command
pnpm run dev -- --config ./my-config.yaml
```

**Create configuration:**
```bash
# Run setup wizard
pnpm run setup

# Or copy example
cp sync-config.example.yaml config/sync-config.yaml
```

### Invalid YAML Syntax

**Symptoms:**
```
✗ Configuration validation failed
Error: Invalid YAML syntax at line 15
```

**Common YAML Mistakes:**

**Indentation (use spaces, not tabs):**
```yaml
# Correct
fields:
  priority:
    field_id: "customfield_10001"

# Wrong (tabs)
fields:
	priority:
		field_id: "customfield_10001"
```

**Colons need spaces:**
```yaml
# Correct
field_id: "customfield_10001"

# Wrong (no space after colon)
field_id:"customfield_10001"
```

**Quote special characters:**
```yaml
# Correct
description: "Issue: System down"

# Wrong (unquoted colon)
description: Issue: System down
```

**Solutions:**

**Validate YAML:**
```bash
pnpm run validate-config
```

**Use YAML linter:**
```bash
npm install -g yaml-lint
yamllint config/sync-config.yaml
```

**Check with online validator:**
Visit: https://www.yamllint.com/

### Environment Variables Not Set

**Symptoms:**
```
✗ Missing required environment variable: JPD_API_KEY
```

**Solutions:**

**Check `.env` file exists:**
```bash
ls -la .env
```

**Verify `.env` content:**
```bash
cat .env
```

**Required variables:**
```bash
JPD_BASE_URL=https://company.atlassian.net
JPD_EMAIL=user@company.com
JPD_API_KEY=your_token
GITHUB_TOKEN=ghp_token
GITHUB_OWNER=owner
GITHUB_REPO=repo
```

**Check for typos:**
```bash
# Correct
JPD_BASE_URL

# Wrong
JPD_BASE_Url  # Wrong case
JPD_BASEURL   # Missing underscore
JDP_BASE_URL  # Letter swap
```

**Load environment:**
```bash
# Ensure .env is in project root
ls -la .env

# Test loading
source .env && echo $JPD_BASE_URL
```

## Permission Issues

### No Access to JPD Project

**Symptoms:**
```
✗ Project MTT not found
Error: You do not have permission to view this project
```

**Solutions:**

**Verify project key:**
```bash
# Check exact project key in JPD URL
https://company.atlassian.net/jira/polaris/projects/MTT
#                                                    ^^^
# Project key: MTT
```

**Check project access:**
1. Log into JPD with same email from `.env`
2. Navigate to project
3. Verify you can view issues
4. Ask admin for access if needed

**Verify API token permissions:**
- API token inherits your user permissions
- If you can't see project in UI, API won't work
- Cannot be fixed by changing token scopes

### No Write Access to GitHub Repository

**Symptoms:**
```
✗ Failed to create issue
Error: Resource not accessible by integration
```

**Solutions:**

**Check repository access:**
```bash
# Visit repository
open https://github.com/OWNER/REPO

# Verify you're a collaborator
```

**For organization repositories:**
1. Go to https://github.com/orgs/ORG/people
2. Verify you're a member
3. Check team has write access to repository

**Check token permissions:**
1. Token must have `repo` scope
2. For organization repos, may need organization approval
3. Regenerate token with correct permissions

**Test write access:**
```bash
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Issue","body":"Testing"}' \
  https://api.github.com/repos/OWNER/REPO/issues
```

## Dependency Issues

### Package Installation Failures

**Symptoms:**
```
ERR_PNPM_PEER_DEP_ISSUES
```

**Solutions:**

**Use correct Node version:**
```bash
node --version  # Should be 22.x or higher
```

**Install with correct package manager:**
```bash
# Use pnpm, not npm or yarn
pnpm install

# If pnpm not installed
npm install -g pnpm
```

**Clear cache and reinstall:**
```bash
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### Module Not Found

**Symptoms:**
```
Error: Cannot find module '@octokit/rest'
```

**Solutions:**

**Reinstall dependencies:**
```bash
pnpm install
```

**Check node_modules:**
```bash
ls -la node_modules/@octokit
```

**Verify package.json:**
```bash
cat package.json | grep "@octokit/rest"
```

## Getting Further Help

If issues persist after trying these solutions:

### Gather Diagnostic Information

```bash
# System information
node --version
pnpm --version

# Test all components
pnpm run health-check --check-all > health-report.txt

# Validation with details
pnpm run validate-config > validation-report.txt

# Debug dry-run
DEBUG=1 pnpm run dev -- --dry-run > debug-output.txt 2>&1
```

### Check Documentation

- [Field Configuration Issues](./field-configuration)
- [Sync Problems](./sync-problems)
- [Debugging Guide](./debugging)

### Report Issues

When opening a GitHub issue, include:
1. Error messages (full text)
2. Relevant configuration (remove sensitive data)
3. Output from `pnpm run health-check`
4. Steps to reproduce
5. What you've already tried

:::tip Quick Diagnostics
Run `pnpm run health-check` first - it often identifies the problem immediately and suggests solutions.
:::

:::warning Credentials in Logs
Never share logs that contain API tokens, passwords, or other credentials. Always redact sensitive information before sharing.
:::

