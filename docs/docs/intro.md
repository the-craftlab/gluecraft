# Getting Started

Welcome to the **JPD-GitHub Connector** documentation! This tool provides bidirectional synchronization between Jira Product Discovery (JPD) and GitHub Issues.

## What is JPD-GitHub Connector?

The JPD-GitHub Connector is a powerful sync engine that:

- ✅ **Bidirectional Sync** - Keep JPD and GitHub in sync automatically
- ✅ **Native Sub-Issues** - Real GitHub parent-child relationships for hierarchy
- ✅ **Comment Sync** - Sync comments between both platforms
- ✅ **Custom Field Mapping** - Flexible field mapping via configuration
- ✅ **Rate Limit Handling** - Intelligent caching and exponential backoff
- ✅ **Transform Functions** - Custom TypeScript transformations
- ✅ **Auto-Label Creation** - Configurable label colors and descriptions

## Quick Links

- [Installation](./installation) - Set up the connector
- [Quick Start](./quick-start) - Get running in 5 minutes
- [CLI Guide](./cli) - Command-line interface reference
- [Configuration](./configuration/sync-config) - Configure sync behavior

## Key Features

### Hierarchy & Sub-Issues

Create real GitHub sub-issues that maintain parent-child relationships from JPD. Epics, Stories, and Tasks are automatically mapped with progress tracking.

### Comment Synchronization

Keep team discussions in sync - comments added in JPD appear in GitHub and vice versa.

### Flexible Configuration

Define custom field mappings, status workflows, label strategies, and more through a declarative YAML configuration.

### Production Ready

Built with enterprise features:
- Comprehensive error handling
- Structured logging
- Health check endpoint
- Docker support
- GitHub Actions integration

## Next Steps

1. [Install the connector](./installation)
2. [Configure your first sync](./configuration/sync-config)
3. [Run your first sync](./quick-start)
4. [Explore advanced features](./features/sub-issues)

## Need Help?

- [GitHub Issues](https://github.com/expedition/jpd-to-github-connector/issues) - Report bugs or request features
- [Contributing Guide](./guides/contributing) - Contribute to the project
