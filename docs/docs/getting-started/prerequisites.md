# Prerequisites

Before setting up Gluecraft JPD, ensure you have the following requirements in place.

## System Requirements

- **Node.js 22+** - Check your version with `node --version`
- **pnpm** - Package manager (`pnpm --version` to verify)
  - Install with: `npm install -g pnpm`
- **Git** - For version control

## Account Requirements

### JPD (Jira Product Discovery)

- Active Atlassian account with JPD access
- At least one JPD project created
- Permission to create API tokens
- Admin or project lead permissions (for full field access)

### GitHub

- GitHub account (personal or organization)
- Access to a repository where you want to sync issues
- Permission to create personal access tokens
- Write access to the repository

## Credentials Checklist

Before running the setup wizard, gather the following information:

### JPD Credentials

- [ ] **Base URL** - Your Atlassian instance URL (e.g., `https://your-company.atlassian.net`)
- [ ] **Email** - The email associated with your Atlassian account
- [ ] **API Token** - Generate at [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
- [ ] **Project Key** - Your JPD project identifier (e.g., `MTT`, `PROJ`)

### GitHub Credentials

- [ ] **Personal Access Token** - Generate at [GitHub Tokens](https://github.com/settings/tokens)
  - Required scopes: `repo` (full control), `write:discussion`
- [ ] **Owner** - Your GitHub username or organization name
- [ ] **Repository** - The repository name (not the full URL, just the name)

## Time Required

- **Setup Wizard**: 5-10 minutes
- **Manual Setup**: 15-20 minutes
- **First Sync**: 2-5 minutes

## Next Steps

Choose your setup method:
- [Quick Start (Setup Wizard)](./quick-start) - Recommended for most users
- [Manual Setup](./manual-setup) - For advanced users who prefer manual configuration

## Network Requirements

The connector needs to communicate with:
- `*.atlassian.net` - JPD API endpoints
- `api.github.com` - GitHub API
- Ensure your firewall allows outbound HTTPS connections

:::tip Time-Saving Tip
Open the credential generation links in separate tabs now. This way, you'll have your API tokens ready when the setup wizard asks for them.
:::

:::warning API Token Security
Never commit your API tokens to version control. The setup wizard creates a `.env` file that is automatically ignored by Git.
:::

