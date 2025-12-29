/**
 * TODO: MTT-SPECIFIC TRANSFORM - Move to examples/mtt/transforms/
 * 
 * This transform is hard-coded for the MTT project and should NOT be used as a generic template.
 * 
 * Hard-coded assumptions:
 * - Assumes fields named "Epic", "Service", "NextUp"
 * - Specific label formatting patterns
 * 
 * For generic label combining patterns, see docs/TRANSFORM_PATTERNS.md
 */

// Example custom transformation function
// This function receives the JPD issue data and returns an array of label strings

export default function(data: any): string[] {
  const labels: string[] = [];

  // Add Epic label if present
  if (data.fields.Epic) {
    labels.push(`epic:${data.fields.Epic.value.toLowerCase().replace(/\s+/g, '-')}`);
  }

  // Add Service label
  if (data.fields.Service) {
    labels.push(`service:${data.fields.Service.value.toLowerCase()}`);
  }

  // Add Next Up label
  if (data.fields.NextUp) {
    labels.push('next-up');
  }

  return labels;
}

