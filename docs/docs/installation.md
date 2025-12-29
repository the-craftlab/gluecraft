# Getting Started - Idiot-Proof Guide 🚀

This guide will walk you through setting up the JPD to GitHub sync tool **from scratch**. Follow these steps in order, and you'll be syncing in no time!

---

## 📋 Prerequisites

Before you begin, make sure you have:

- ✅ **Node.js 22+** installed (`node --version`)
- ✅ **pnpm** installed (`pnpm --version`) or install with `npm install -g pnpm`
- ✅ **JPD Account** with at least one project
- ✅ **GitHub Account** with access to a repository
- ✅ **10 minutes** of your time

---

## 🎯 Step 1: Get Your Credentials

### JPD Credentials

1. Go to [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **"Create API token"**
3. Give it a label like "JPD GitHub Sync"
4. Copy the token (you'll need it in a moment)
5. Note your:
   - **Base URL**: `https://your-company.atlassian.net`
   - **Email**: The email you use for Atlassian
   - **API Token**: The token you just created

### GitHub Credentials

1. Go to [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Give it a name like "JPD Sync"
4. Select scopes:
   - ✅ `repo` (full control)
   - ✅ `write:discussion` (for projects)
5. Click **"Generate token"**
6. Copy the token immediately (it won't be shown again!)
7. Note your:
   - **Owner**: Your GitHub username or organization
   - **Repo**: The repository name

---

## 🚀 Step 2: Clone and Install

```bash
# Clone the repo (or your fork)
git clone https://github.com/your-org/jpd-to-github-connector.git
cd jpd-to-github-connector

# Install dependencies
pnpm install
```

---

## ⚙️ Step 3: Run Setup Wizard

The easiest way to get started is to run the interactive setup wizard:

```bash
pnpm run setup
```

This will:
1. ✅ Check for existing configuration
2. ✅ Prompt for your credentials (from Step 1)
3. ✅ Test connections to JPD and GitHub
4. ✅ Discover your JPD custom fields
5. ✅ Generate a config file
6. ✅ Save your `.env` file
7. ✅ Run a test sync

**That's it!** The wizard does everything for you.

---

## 🛠️ Alternative: Manual Setup

If you prefer to set things up manually, follow these steps:

### 3a. Create `.env` File

Create a file called `.env` in the project root:

```bash
# JPD Configuration
JPD_BASE_URL=https://your-company.atlassian.net
JPD_EMAIL=your-email@company.com
JPD_API_KEY=your_jpd_api_token_here

# GitHub Configuration
GITHUB_TOKEN=ghp_your_github_token_here
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name

# Optional: Override config path
CONFIG_PATH=./config/sync-config.yaml
```

### 3b. Discover Your JPD Fields

Run the field discovery tool to see what custom fields exist in your JPD project:

```bash
pnpm run discover-fields YOUR_PROJECT_KEY
```

Example:
```bash
pnpm run discover-fields YOUR_PROJECT
```

This will show you a table of all custom fields and their IDs.

### 3c. Create Config File

Copy the example config and customize it:

```bash
cp sync-config.example.yaml config/sync-config.yaml
```

Edit `config/sync-config.yaml` and:
1. Update the `jql` to match your project
2. Add your custom field IDs to the `fields` section
3. Configure your `mappings` for labels and metadata

---

## ✅ Step 4: Validate Your Setup

Before running the sync, validate that everything is configured correctly:

```bash
pnpm run validate-config
```

This will check:
- ✅ Config file exists and is valid YAML
- ✅ All required environment variables are set
- ✅ JPD custom fields exist and have correct types
- ✅ Field mappings are properly configured

If validation fails, it will tell you exactly what's wrong and how to fix it.

---

## 🧪 Step 5: Test Sync (Dry Run)

Run a test sync that **won't make any changes**:

```bash
pnpm run dev -- --dry-run
```

This will:
- Connect to JPD and GitHub
- Fetch issues from JPD
- Show you what would be created/updated
- **NOT** actually create or modify anything

Review the output. If everything looks good, proceed to the next step!

---

## 🚀 Step 6: Run Actual Sync

Ready to sync for real? Run:

```bash
pnpm run dev
```

This will perform the actual sync and create/update issues in GitHub.

---

## 🎉 Success! What's Next?

### Set Up Automation

To run the sync automatically every 15 minutes:

1. Copy `.github/workflows/sync.yml.example` to `.github/workflows/sync.yml`
2. Add your secrets to GitHub:
   - Go to your repo → Settings → Secrets
   - Add: `JPD_API_KEY`, `JPD_EMAIL`, `JPD_BASE_URL`, `GITHUB_TOKEN`
3. Push your code
4. The workflow will run automatically!

### Customize Your Sync

Edit `config/sync-config.yaml` to:
- Add more field mappings
- Configure status workflows
- Set up hierarchy (Epic → Story → Task)
- Customize label generation

See [FIELD_VALIDATION.md](FIELD_VALIDATION.md) for field configuration details.

---

## 🆘 Troubleshooting

### "No issues found in project"

**Problem**: JPD project is empty  
**Solution**: Create at least one issue in JPD, then run setup again

### "Field validation failed"

**Problem**: Required field is missing or has wrong type  
**Solution**: Run `pnpm run discover-fields YOUR_PROJECT` to see available fields, then update your config

### "GitHub connection failed"

**Problem**: Invalid token or insufficient permissions  
**Solution**: 
1. Check your token hasn't expired
2. Make sure you selected `repo` scope when creating the token
3. Verify you have write access to the repository

### "JPD connection failed"

**Problem**: Invalid credentials or network issue  
**Solution**:
1. Verify your JPD_BASE_URL is correct (should be `https://your-company.atlassian.net`)
2. Check your API token hasn't been revoked
3. Ensure your email matches your Atlassian account

### "Rate limit exceeded"

**Problem**: JPD has strict API rate limits  
**Solution**:
1. Wait 60 seconds before trying again
2. Use `pnpm run test-connection` to cache the connection test
3. Use `pnpm run validate-config` (doesn't make API calls)
4. See [Rate Limit Handling](RATE_LIMIT_HANDLING.md) for details

### "Config validation failed"

**Problem**: YAML syntax error or missing required fields  
**Solution**: Run `pnpm run validate-config` to see specific errors

---

## 📚 Additional Resources

- **[Field Validation Guide](FIELD_VALIDATION.md)** - Configure custom field validation
- **[Testing Guide](TESTING_GUIDE.md)** - Comprehensive testing instructions
- **[Comment Sync](COMMENT_SYNC.md)** - Bidirectional comment synchronization
- **[Clean Labels](CLEAN_LABELS.md)** - Human-focused label design

---

## 🤝 Need Help?

If you're stuck:
1. Run `pnpm run validate-config` to diagnose issues
2. Check the error message carefully - it usually tells you exactly what's wrong
3. Review the relevant documentation above
4. Open an issue on GitHub with:
   - The command you ran
   - The error message
   - Your config file (with sensitive data removed)

---

## 🎓 Quick Reference

### Common Commands

```bash
# Setup (first time only)
pnpm run setup

# Test connections (with rate limit protection)
pnpm run test-connection

# Discover JPD fields
pnpm run discover-fields YOUR_PROJECT

# Validate configuration
pnpm run validate-config

# Test sync (no changes)
pnpm run dev -- --dry-run

# Run actual sync
pnpm run dev

# Run tests
pnpm test
```

### File Locations

- `.env` - Your credentials (DON'T commit this!)
- `config/sync-config.yaml` - Your sync configuration
- `.github/workflows/sync.yml` - GitHub Actions workflow

---

**Happy syncing! 🎉**

