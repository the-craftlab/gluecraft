import { z } from 'zod';

export const SyncDirectionSchema = z.enum(['jpd-to-github', 'github-to-jpd', 'bidirectional']);

export const FieldTypeSchema = z.enum([
  'string',
  'text',
  'number',
  'select',
  'multiselect',
  'user',
  'date',
  'datetime',
  'url',
  'array'
]);

export const FieldDefinitionSchema = z.object({
  id: z.string(),                    // e.g., "customfield_14377"
  name: z.string(),                  // e.g., "Theme"
  type: FieldTypeSchema,             // Expected field type
  required: z.boolean().default(false), // Is this field required for sync?
  description: z.string().optional(), // Field description
  searcherKey: z.string().optional(), // Jira searcher key for field creation
});

export const LabelDefinitionSchema = z.object({
  name: z.string(),                  // e.g., "epic", "type:bug"
  color: z.string(),                 // e.g., "0052CC" (hex color without #)
  description: z.string().optional(), // e.g., "High-level initiative"
});

export const LabelsConfigSchema = z.object({
  hierarchy: z.array(LabelDefinitionSchema).optional(), // Hierarchy labels (epic, story, task)
  types: z.array(LabelDefinitionSchema).optional(),     // Type labels (type:feature, type:bug, etc.)
  priorities: z.array(LabelDefinitionSchema).optional(), // Priority labels (priority:critical, etc.)
  statuses: z.array(LabelDefinitionSchema).optional(),  // Status labels (blocked, needs-review, etc.)
  custom: z.array(LabelDefinitionSchema).optional(),    // Custom labels
});

export const MappingSchema = z.object({
  jpd: z.union([z.string(), z.array(z.string())]),
  github: z.string(),
  transform: z.string().optional(), // Simple field path transforms
  template: z.string().optional(), // Template string with {{}} syntax
  transform_function: z.string().optional(), // Path to custom function file
  mapping: z.record(z.string()).optional(), // Simple key-value mappings
  condition: z.string().optional(), // Conditional logic
});

export const StatusMappingSchema = z.object({
  github_state: z.enum(['open', 'closed']).optional(),
  github_column: z.string().optional(), // Legacy column name
  github_project_status: z.string().optional(), // GitHub Projects Beta status value
  sync: z.boolean().optional(), // Whether to sync issues in this status (default: true)
});

export const HierarchySchema = z.object({
  enabled: z.boolean().default(true), // Enable/disable hierarchy tracking entirely
  epic_label_template: z.string().optional(),
  story_label_template: z.string().optional(),
  parent_field_in_body: z.boolean().default(true),
  use_github_parent_issue: z.boolean().default(true),
  epic_statuses: z.array(z.string()).optional(), // JPD statuses that represent Epics
  story_statuses: z.array(z.string()).optional(), // JPD statuses that represent Stories
  task_statuses: z.array(z.string()).optional(), // JPD statuses that represent Tasks
});

export const TeamSchema = z.object({
  auto_detect: z.boolean().default(true),
  team_label_template: z.string().optional(),
  epic_ownership: z.boolean().default(true),
});

export const ProjectsSchema = z.object({
  enabled: z.boolean().default(false),
  project_number: z.number().optional(), // GitHub Projects (Beta) number
  status_field_name: z.string().default('Status'), // Name of status field in project
});

export const GithubToJpdCreationSchema = z.object({
  enabled: z.boolean().default(false),
  label_to_category: z.record(z.string()).optional(), // e.g., { "bug": "Bug", "enhancement": "Idea" }
  default_category: z.string().default('Idea'), // Default for unlabeled issues
  default_status: z.string().default('Backlog'), // Initial JPD status for created issues
  default_priority: z.string().optional(), // Optional default priority
  field_mappings: z.object({
    category_field_id: z.string().optional(), // e.g., "customfield_14385"
    priority_field_id: z.string().optional(), // e.g., "customfield_14425"
  }).optional(), // Field IDs for category and priority fields in JPD
});

export const ConfigSchema = z.object({
  sync: z.object({
    direction: SyncDirectionSchema.default('bidirectional'),
    poll_interval: z.string().default('*/15 * * * *'),
    jql: z.string().optional(),
  }),
  mappings: z.array(MappingSchema),
  statuses: z.record(StatusMappingSchema).optional(), // Optional for minimal setups
  hierarchy: HierarchySchema.optional(),
  teams: TeamSchema.optional(),
  projects: ProjectsSchema.optional(), // GitHub Projects (Beta) configuration
  github_to_jpd_creation: GithubToJpdCreationSchema.optional(), // GitHub → JPD issue creation
  fields: z.array(FieldDefinitionSchema).optional(), // JPD field definitions for validation
  labels: LabelsConfigSchema.optional(), // GitHub label definitions for auto-creation
});

export type Config = z.infer<typeof ConfigSchema>;

