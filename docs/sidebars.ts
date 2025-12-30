import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/prerequisites',
        'getting-started/quick-start',
        'getting-started/setup-wizard',
        'getting-started/manual-setup',
        'getting-started/first-sync',
      ],
    },
    {
      type: 'category',
      label: 'Configuration',
      items: [
        'configuration/overview',
        'configuration/core-settings',
        'configuration/field-mappings',
        'configuration/status-workflows',
        'configuration/labels',
        'configuration/hierarchy',
        'configuration/advanced',
      ],
    },
    {
      type: 'category',
      label: 'CLI Reference',
      items: [
        'cli/overview',
        'cli/setup-wizard',
        'cli/sync-commands',
        'cli/validation',
        'cli/labels',
        'cli/workflows',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      items: [
        'features/sub-issues',
        'features/comment-sync',
        'features/field-validation',
      ],
    },
    {
      type: 'category',
      label: 'Troubleshooting',
      items: [
        'troubleshooting/common-issues',
        'troubleshooting/field-configuration',
        'troubleshooting/sync-problems',
        'troubleshooting/debugging',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/testing',
        'guides/contributing',
      ],
    },
  ],
};

export default sidebars;
