# E-commerce Product Roadmap Example

Configuration for managing an e-commerce product roadmap with customer impact and revenue tracking.

## Use Case

This setup is designed for product managers who need to:
- Track customer impact and revenue potential of features
- Manage features across quarterly planning cycles
- Prioritize using RICE or similar scoring methodologies
- Visualize roadmaps in GitHub Projects
- Collaborate with engineering teams who work in GitHub

## What's Different from Basic Example

- **Custom fields** for impact, revenue, quarter planning
- **GitHub Projects integration** for roadmap views
- **Product-focused workflow** (Idea → Planned → In Development → Shipped)
- **Label-based categorization** (impact levels, quarters, categories)

## Setup

### 1. Discover Your Field IDs

```bash
pnpm run discover-fields ECOM
```

Look for fields like:
- Customer Impact (select field, 1-5 scale)
- Revenue Potential (text field)
- Target Quarter (select field)
- Feature Category (select field)

### 2. Update Config with Your Field IDs

Edit `config/config.yaml` and replace all `customfield_XXXXX` placeholders:

```yaml
# Example:
- jpd: "fields.customfield_10125.value"  # Your actual Customer Impact field ID
  github: "labels"
  mapping:
    "5 - Critical": "impact:critical"
    # ... etc
```

### 3. Create GitHub Project (Optional)

1. Go to your GitHub repo → Projects
2. Create a new Project (beta)
3. Add a "Status" field with values: Backlog, Planned, In Progress, Done
4. Note the project number (from the URL)
5. Update config:

```yaml
projects:
  enabled: true
  project_number: 1  # Your project number
  status_field_name: "Status"
```

### 4. Test and Run

```bash
# Validate configuration
pnpm run validate-config

# Dry run
CONFIG_PATH=examples/ecommerce-roadmap/config/config.yaml pnpm run dev -- --dry-run

# Actual sync
CONFIG_PATH=examples/ecommerce-roadmap/config/config.yaml pnpm run dev
```

## Example Workflow

### Product Manager (in JIRA):
1. Creates feature request: "Add one-click checkout"
2. Sets Customer Impact: "5 - Critical"
3. Sets Revenue Potential: "$100K/year"
4. Sets Target Quarter: "Q1 2025"
5. Sets Category: "Checkout"
6. Moves to "Planned" status

### What Syncs to GitHub:
- ✅ Issue created with title "Add one-click checkout"
- ✅ Labels added: `impact:critical`, `quarter:q1-2025`, `category:checkout`
- ✅ Body includes revenue note: "💰 **Revenue Potential**: $100K/year"
- ✅ GitHub Project status set to "Planned"

### Developer (in GitHub):
1. Sees issue in Project board under "Planned"
2. Moves to "In Progress" when starting work
3. Comments on implementation details

### What Syncs Back to JIRA:
- ✅ Status updates to "In Development"
- ✅ Comments sync to JIRA
- ✅ State visible to product team

## Custom Fields Explained

### Customer Impact (1-5 scale)
Maps to GitHub labels for easy filtering:
- `impact:critical` - Affects majority of customers
- `impact:high` - Significant impact
- `impact:medium` - Moderate impact
- `impact:low` - Minor improvement
- `impact:minimal` - Nice to have

### Revenue Potential
Displayed in issue body, helps prioritize by business value:
- Format: "$50K/year", "$500K one-time", "Unknown"
- Visible to both PM and engineering teams

### Target Quarter
Maps to GitHub labels for roadmap planning:
- `quarter:q1-2025`, `quarter:q2-2025`, etc.
- Filter issues by quarter in GitHub

### Feature Category
Organizes by product area:
- `category:checkout`, `category:payments`, `category:search`, etc.
- Helps teams focus on specific areas

## Customization Ideas

### Add RICE Score Calculation

Create a custom transform function to calculate RICE:

```typescript
// transforms/calculate-rice.ts
export default function(issue: any): string {
  const reach = issue.fields.customfield_REACH || 0;
  const impact = issue.fields.customfield_IMPACT || 0;
  const confidence = issue.fields.customfield_CONFIDENCE || 0;
  const effort = issue.fields.customfield_EFFORT || 1;
  
  const rice = (reach * impact * confidence) / effort;
  return `rice-score:${Math.round(rice)}`;
}
```

Then reference in config:

```yaml
- jpd: "."
  github: "labels"
  transform_function: "./transforms/calculate-rice.ts"
```

### Add Team Assignment

Map JIRA teams to GitHub labels:

```yaml
- jpd: "fields.customfield_TEAM.value"
  github: "labels"
  template: "team:{{value | slugify}}"
```

### Add Epic Linking

For larger features with sub-tasks:

```yaml
hierarchy:
  use_native_hierarchy: true
  epic_statuses: ["Idea", "Planned"]
  story_statuses: ["In Development"]
```

## Tips for Product Teams

1. **Use labels for filtering** - Filter GitHub issues by `impact:critical` or `quarter:q1-2025`
2. **Projects for visualization** - GitHub Projects provides kanban/roadmap views
3. **Sync regularly** - Run sync every 15-30 minutes to keep teams aligned
4. **Comments work bidirectionally** - Discuss in either tool
5. **Close loop with "Shipped"** - Mark features as Shipped to close GitHub issues

## Comparison with Other Examples

| Feature | Basic | E-commerce | [MTT](../mtt/) | [Bug Tracking](../bug-tracking/) |
|---------|-------|-----------|-------|---------------|
| Custom Fields | 0 | 4 | 10+ | 2 |
| GitHub Projects | No | Yes | No | No |
| Scoring | No | RICE-ready | RICE | No |
| Best For | Simple sync | Product roadmaps | Full JPD workflow | Bug triage |

## Troubleshooting

### Field IDs don't work
- Run `pnpm run discover-fields ECOM` to find correct IDs
- Field IDs are project-specific in JIRA

### Labels not appearing
- Check field value matches mapping exactly
- Use `--dry-run` to see what labels would be created

### Projects not updating
- Ensure project number is correct
- Check status field name matches your project
- Verify GitHub token has project write permissions

## Resources

- [RICE Prioritization Framework](https://www.intercom.com/blog/rice-simple-prioritization-for-product-managers/)
- [GitHub Projects Documentation](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
- [Custom Transforms Guide](../../docs/TRANSFORM_PATTERNS.md)

