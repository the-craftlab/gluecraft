# Quick Start

Get up and running with Gluecraft JPD in 5 minutes using the interactive setup wizard.

## Overview

The setup wizard automates the entire configuration process:
1. Validates your credentials
2. Tests API connections
3. Discovers JPD custom fields
4. Generates configuration files
5. Runs a test sync

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/thecraftlab/gluecraft-jpd.git
cd gluecraft-jpd
pnpm install
```

## Run the Setup Wizard

Launch the interactive setup wizard:

```bash
pnpm run setup
```

The wizard will guide you through each step with clear prompts and validation.

:::tip Before You Start
Have your [credentials ready](./prerequisites#credentials-checklist) before running the wizard to save time.
:::

## What the Wizard Does

### Step 1: Check Existing Configuration

The wizard checks if you already have a configuration file. If found, it offers to:
- Use the existing configuration
- Create a new configuration
- Update the existing configuration

### Step 2: Collect Credentials

You'll be prompted for:
- JPD base URL, email, and API token
- GitHub token, owner, and repository name

The wizard validates each credential as you enter it.

### Step 3: Test Connections

Automatic connection testing to both services with:
- Rate limit protection
- Retry with exponential backoff
- Clear error messages if something fails

### Step 4: Discover Fields

The wizard fetches your JPD project and displays all custom fields with:
- Field IDs
- Field types
- Sample values from actual issues

### Step 5: Select Fields to Sync

Choose which JPD fields to sync to GitHub:
- Use arrow keys to navigate
- Press space to select/deselect
- The wizard recommends commonly used fields

### Step 6: Generate Configuration

Creates two files:
- `.env` - Your credentials (never commit this!)
- `config/sync-config.yaml` - Your sync configuration

### Step 7: Test Sync (Optional)

Run an optional dry-run to verify everything works:
- Fetches data from both services
- Shows what would be created/updated
- No actual changes are made

## After Setup

Once the wizard completes successfully:

```bash
# Validate your configuration
pnpm run validate-config

# Run a test sync (no changes made)
pnpm run dev -- --dry-run

# Run an actual sync
pnpm run dev
```

## What You've Created

The setup wizard creates:

**`.env` file:**
```bash
JPD_BASE_URL=https://your-company.atlassian.net
JPD_EMAIL=your-email@company.com
JPD_API_KEY=your_api_token
GITHUB_TOKEN=ghp_your_token
GITHUB_OWNER=your-org
GITHUB_REPO=your-repo
```

**`config/sync-config.yaml` file:**
- JPD project configuration
- GitHub repository settings
- Field mappings for selected fields
- Default status mappings
- Label definitions

## Troubleshooting

### Wizard Fails to Connect to JPD

**Check:**
- Base URL is correct (include `https://`)
- API token hasn't expired
- Email matches your Atlassian account

**Solution:** Run connection test separately:
```bash
pnpm run test-connection
```

### Wizard Can't Find Fields

**Check:**
- Project key is correct
- Project has at least one issue
- You have permission to view custom fields

**Solution:** Try field discovery directly:
```bash
pnpm run discover-fields YOUR_PROJECT_KEY
```

### Wizard Times Out

**Cause:** JPD rate limiting

**Solution:** Wait 60 seconds and try again. The wizard automatically caches successful connection tests.

## Next Steps

- [Understand the Setup Wizard](./setup-wizard) - Detailed explanation of each question
- [Run Your First Sync](./first-sync) - Verify your setup works
- [Configure Field Mappings](../configuration/field-mappings) - Customize your sync

:::tip Advanced Users
Prefer manual configuration? See [Manual Setup](./manual-setup) for step-by-step instructions.
:::

