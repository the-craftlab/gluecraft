import type * as Preset from '@docusaurus/preset-classic'
import type { Config } from '@docusaurus/types'
import { themes as prismThemes } from 'prism-react-renderer'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPackageJsonPath = path.resolve(__dirname, '../package.json')
const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf8'))

// Version resolution priority:
// 1. GLUECRAFT_DOCS_VERSION env var (set by CI/CD pipeline during release builds)
// 2. package.json version (fallback for local development)
const rawDocsVersion = process.env.GLUECRAFT_DOCS_VERSION
const derivedDocsVersion =
  typeof rawDocsVersion === 'string' && rawDocsVersion.trim().length > 0
    ? rawDocsVersion
    : rootPackageJson.version

// Normalize to remove v prefix if present
const GLUECRAFT_VERSION: string = (derivedDocsVersion ?? '0.0.0-dev').replace(/^v/i, '')

const config: Config = {
  title: 'Gluecraft',
  tagline: 'Bidirectional sync between Jira Product Discovery and GitHub Issues',
  favicon: 'img/favicon.ico',
  customFields: {
    gluecraftVersion: GLUECRAFT_VERSION
  },

  future: {
    v4: true
  },

  // Production URL - custom domain
  url: 'https://gluecraft.thecraftlab.dev',
  baseUrl: '/',

  organizationName: 'the-craftlab',
  projectName: 'gluecraft',

  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/img/apple-touch-icon.png'
      }
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/img/favicon-32x32.png'
      }
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/img/favicon-16x16.png'
      }
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'manifest',
        href: '/site.webmanifest'
      }
    }
  ],

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en']
  },

  plugins: [],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/the-craftlab/gluecraft/tree/develop/docs/',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css'
        }
      } satisfies Preset.Options
    ]
  ],

  themeConfig: {
    image: 'img/gluecraft-social-card.png',
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true
    },
    navbar: {
      title: 'Gluecraft',
      logo: {
        alt: 'Gluecraft Logo',
        src: '/img/logo.png'
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation'
        },
        {
          href: 'https://github.com/the-craftlab/gluecraft',
          label: 'GitHub',
          position: 'right'
        },
        {
          href: 'https://www.npmjs.com/package/@thecraftlab/gluecraft',
          label: 'npm',
          position: 'right'
        }
      ]
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/intro'
            },
            {
              label: 'Configuration',
              to: '/docs/configuration/overview'
            },
            {
              label: 'CLI Guide',
              to: '/docs/cli/overview'
            }
          ]
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub Issues',
              href: 'https://github.com/the-craftlab/gluecraft/issues'
            },
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/the-craftlab/gluecraft/discussions'
            }
          ]
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/the-craftlab/gluecraft'
            },
            {
              label: 'npm',
              href: 'https://www.npmjs.com/package/@thecraftlab/gluecraft'
            },
            {
              label: 'The Craft Lab',
              href: 'https://github.com/the-craftlab'
            }
          ]
        }
      ],
      copyright: `
        <div>Copyright © ${new Date().getFullYear()} The Craft Lab. Built with Docusaurus.</div>
        <div id="docs-version-badge" style="margin-top: 0.5rem; font-size: 0.875rem; opacity: 0.8;">
          Latest Release: <span class="version-value">v${GLUECRAFT_VERSION}</span>
        </div>
      `
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'diff', 'json', 'yaml']
    }
  } satisfies Preset.ThemeConfig
}

export default config
