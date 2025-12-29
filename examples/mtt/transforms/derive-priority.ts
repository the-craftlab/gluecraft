/**
 * TODO: MTT-SPECIFIC TRANSFORM - Move to examples/mtt/transforms/
 * 
 * This transform is hard-coded for the MTT project and should NOT be used as a generic template.
 * 
 * Hard-coded dependencies:
 * - customfield_14425 (Dev Priority field - MTT-specific)
 * - Assumes priority values: Critical, High, Medium, Low
 * - Assumes MoSCoW values: Must have, Should have, Could have, Won't have
 * 
 * For a generic priority transform, see docs/TRANSFORM_PATTERNS.md
 * 
 * ---
 * 
 * Derive GitHub execution priority from JPD fields
 * 
 * Priority hierarchy:
 * 1. Use explicit "Dev Priority" field if set
 * 2. Derive from MoSCoW field if available
 * 3. Fall back to "normal"
 */

interface JpdIssue {
  key: string;
  fields: {
    [key: string]: any;
    customfield_14425?: { value: string };  // Priority Lvl (Dev Priority)
    customfield_YYYYY?: { value: string };  // MoSCoW (create if needed)
  };
}

/**
 * Map MoSCoW values to GitHub execution priority
 */
const moscowToPriority: Record<string, string> = {
  'Must have': 'high',
  'Must': 'high',
  'Should have': 'normal',
  'Should': 'normal',
  'Could have': 'low',
  'Could': 'low',
  "Won't have": 'low',
  "Won't": 'low'
};

/**
 * Map JPD priority values to GitHub labels
 */
const jpdPriorityMap: Record<string, string> = {
  'Critical': 'critical',
  'High': 'high',
  'Medium': 'normal',
  'Low': 'low'
};

export default function derivePriority(issue: JpdIssue): string {
  // 1. Check explicit Dev Priority field (customfield_14425)
  const devPriorityField = issue.fields.customfield_14425;
  
  if (devPriorityField && devPriorityField.value) {
    // Map JPD value (Critical/High/Medium/Low) to GitHub label (critical/high/normal/low)
    const mapped = jpdPriorityMap[devPriorityField.value];
    if (mapped) {
      return mapped;
    }
    
    // Fallback: try direct lowercase if not in map
    const normalized = devPriorityField.value.toLowerCase().trim();
    if (['critical', 'high', 'normal', 'low'].includes(normalized)) {
      return normalized;
    }
  }

  // 2. Try to derive from MoSCoW field (customfield_YYYYY - if you create it)
  const moscowField = issue.fields.customfield_YYYYY;
  if (moscowField && moscowField.value && moscowToPriority[moscowField.value]) {
    return moscowToPriority[moscowField.value];
  }

  // 3. Fall back to normal (most stories are standard priority)
  return 'normal';
}

