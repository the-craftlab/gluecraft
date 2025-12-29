# Bug Tracking Example

Configuration for managing bugs with severity levels and version tracking.

## Use Case

Perfect for development teams who:
- Need fast bug triage and resolution tracking
- Want severity-based prioritization
- Track bugs across multiple versions
- Allow developers to report bugs directly in GitHub
- Need bidirectional sync for QA and development teams

## Key Features

### 4-Stage Workflow
- **New** → Just reported
- **Triaged** → Assessed and prioritized
- **Fixed** → Developer claims fix is ready
- **Verified** → QA confirms fix works

### Severity Levels
- **Critical** - System down, blocking users
- **High** - Major feature broken
- **Medium** - Feature partially broken
- **Low** - Minor issue, workaround exists

### Version Tracking
Tag bugs with affected versions (e.g., `version:v2.1.0`, `version:v2.2.0-beta`)

## Quick Start

### 1. Find Your Field IDs

```bash
pnpm run discover-fields BUGS
```

Look for fields named:
- "Severity" or "Priority"
- "Affected Version" or "Found in Version"
- "Bug Type" or "Category"

### 2. Update Config

Replace the placeholders in `config/config.yaml`:

```yaml
# Before
- jpd: "fields.customfield_SEVERITY.value"

# After (with your actual field ID)
- jpd: "fields.customfield_10234.value"
```

### 3. Test Configuration

```bash
CONFIG_PATH=examples/bug-tracking/config/config.yaml pnpm run health-check
CONFIG_PATH=examples/bug-tracking/config/config.yaml pnpm run dev -- --dry-run
```

### 4. Run Sync

```bash
CONFIG_PATH=examples/bug-tracking/config/config.yaml pnpm run dev
```

## Example Workflow

### Developer Reports Bug (in GitHub)

1. Creates issue with title: "Login page crashes on Safari"
2. Adds label: `bug`
3. Describes steps to reproduce

### Auto-Syncs to JIRA:
- ✅ Bug created in JIRA
- ✅ Status: "New"
- ✅ Type: "Bug"
- ✅ Link back to GitHub issue in description

### QA Triages (in JIRA)

1. Sets Severity: "Critical"
2. Sets Affected Version: "v2.1.0"
3. Sets Bug Type: "Regression"
4. Moves to "Triaged"

### Syncs Back to GitHub:
- ✅ Labels added: `severity:critical`, `version:v2-1-0`, `type:regression`
- ✅ Issue remains open
- ✅ High visibility for dev team

### Developer Fixes (in GitHub)

1. Commits fix referencing issue number
2. Comments: "Fixed in PR #123"
3. Team discusses in GitHub comments

### Syncs to JIRA:
- ✅ Comments visible in JIRA
- ✅ QA sees fix is ready

### QA Verifies (in JIRA)

1. Tests the fix
2. Moves to "Verified"

### Syncs to GitHub:
- ✅ Issue automatically closed
- ✅ Resolution recorded

## Label System

### Severity Labels (Critical for Prioritization)

```
severity:critical  🔴 Drop everything
severity:high      🟠 Priority for this sprint
severity:medium    🟡 Schedule for next sprint
severity:low       🟢 Backlog
```

### Version Labels (Track Regressions)

```
version:v2-1-0     Version 2.1.0
version:v2-2-0     Version 2.2.0
version:v3-0-0-beta Version 3.0.0 Beta
```

### Type Labels (Categorize Issues)

```
type:regression      Previously working, now broken
type:new-bug         Bug in new feature
type:performance     Speed/resource issue
type:security        Security vulnerability
type:ui-ux           Visual or usability issue
```

## Tips for Bug Teams

### For QA Teams
1. **Triage in JIRA** - Use JIRA's rich fields for classification
2. **Use severity wisely** - Critical should be rare
3. **Tag versions** - Helps identify regression patterns
4. **Verify before closing** - Don't trust "Fixed" status

### For Development Teams
1. **Report in GitHub** - Faster for developers working in code
2. **Use PR linking** - Reference issues in commit messages
3. **Comment liberally** - Technical details help QA
4. **Check labels** - Severity and version inform priority

### For Managers
1. **Filter by severity** - Quick view of critical issues
2. **Track versions** - See quality trends across releases
3. **Monitor "Fixed" status** - Ensure QA verifies fixes
4. **Automate sync** - Run every 10 minutes for fast response

## Customization Ideas

### Add "Steps to Reproduce" Field

```yaml
- jpd: "fields.customfield_STEPS.value"
  github: "body"
  template: "\n\n## Steps to Reproduce\n{{value}}"
```

### Add Environment Info

```yaml
- jpd: "fields.customfield_ENV.value"
  github: "labels"
  template: "env:{{value | slugify}}"
```

Values: `env:production`, `env:staging`, `env:development`

### Add Reporter Tracking

```yaml
- jpd: "fields.reporter.displayName"
  github: "body"
  template: "\n\n**Reported by**: {{value}}"
```

### Integrate with Error Tracking

If you use Sentry/Bugsnag, add links:

```yaml
- jpd: "fields.customfield_SENTRY.value"
  github: "body"
  template: "\n\n🐛 **Error Tracking**: {{value}}"
```

## Comparison with Other Examples

| Feature | Bug Tracking | [Basic](../jira-software-basic/) | [E-commerce](../ecommerce-roadmap/) | [MTT](../mtt/) |
|---------|-------------|-------|-----------|-------|
| Severity Levels | Yes | No | Impact scoring | Priority field |
| Version Tracking | Yes | No | Quarter planning | No |
| Bi-directional Creation | Yes | No | No | Yes |
| Best For | Bug triage | Simple sync | Roadmaps | Full workflow |

## Troubleshooting

### Issue: Severity not mapping

Check your JIRA field values exactly match the mapping:

```bash
# In JIRA UI, check what the actual values are
# They might be "Blocker" not "Critical", etc.
```

Update config to match:

```yaml
mapping:
  "Blocker": "severity:critical"  # Match JIRA's actual value
  "Critical": "severity:high"
```

### Issue: GitHub → JIRA creation not working

1. Verify `github_to_jpd_creation.enabled: true`
2. Check `field_mappings` has correct field IDs
3. Ensure issue has "bug" label
4. Check logs for error messages

### Issue: "Fixed" issues not closing

This is intentional! Bugs should remain open until "Verified" status.

If you want "Fixed" to close issues:

```yaml
statuses:
  "Fixed":
    github_state: closed  # Change from 'open'
```

## Resources

- [Bug Severity Definitions](https://www.atlassian.com/incident-management/kpis/severity-levels)
- [Bug Workflow Best Practices](https://www.atlassian.com/agile/project-management/bugs)
- [GitHub Issue Automation](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work)

