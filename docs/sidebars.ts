import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    'installation',
    'quick-start',
    'cli',
    {
      type: 'category',
      label: 'Configuration',
      items: [
        'configuration/sync-config',
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
      label: 'Guides',
      items: [
        'guides/testing',
        'guides/contributing',
      ],
    },
  ],
};

export default sidebars;
