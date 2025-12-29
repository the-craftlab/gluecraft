/**
 * TODO: MTT-SPECIFIC TRANSFORM - Move to examples/mtt/transforms/
 * 
 * This transform is hard-coded for the MTT project and should NOT be used as a generic template.
 * 
 * Hard-coded dependencies (10+ field IDs):
 * - customfield_14377 (Theme)
 * - customfield_14385 (Category)
 * - customfield_14378 (Roadmap)
 * - customfield_14388 (Short Description)
 * - customfield_14379 (RICE: Reach)
 * - customfield_14376 (RICE: Impact)
 * - customfield_14389 (RICE: Confidence)
 * - customfield_14387 (RICE: Effort)
 * - customfield_14386 (RICE: Value)
 * 
 * Assumes MTT-specific structure:
 * - RICE scoring methodology
 * - Specific product context fields
 * - Prescriptive body template
 * 
 * For generic body transform patterns, see docs/TRANSFORM_PATTERNS.md
 * 
 * ---
 * 
 * Custom transformation function to build a rich GitHub issue body from JPD data
 * 
 * This function creates a formatted issue body with:
 * - Product context (theme, category, roadmap)
 * - RICE scoring metrics
 * - Description
 * - Links back to JPD
 */

/**
 * Convert Atlassian Document Format (ADF) to plain text
 */
function adfToText(adf: any): string {
  if (!adf || typeof adf !== 'object') {
    return String(adf || '');
  }
  
  // Handle string (already plain text)
  if (typeof adf === 'string') {
    return adf;
  }
  
  // Handle ADF document structure
  if (adf.type === 'doc' && adf.content) {
    return adf.content.map((node: any) => adfNodeToText(node)).join('\n\n');
  }
  
  return adfNodeToText(adf);
}

function adfNodeToText(node: any): string {
  if (!node || typeof node !== 'object') {
    return '';
  }
  
  // Text node
  if (node.type === 'text') {
    return node.text || '';
  }
  
  // Paragraph
  if (node.type === 'paragraph' && node.content) {
    return node.content.map((n: any) => adfNodeToText(n)).join('');
  }
  
  // Heading
  if (node.type === 'heading' && node.content) {
    const level = node.attrs?.level || 1;
    const text = node.content.map((n: any) => adfNodeToText(n)).join('');
    return '#'.repeat(level) + ' ' + text;
  }
  
  // Lists
  if (node.type === 'bulletList' && node.content) {
    return node.content.map((item: any) => '- ' + adfNodeToText(item)).join('\n');
  }
  
  if (node.type === 'orderedList' && node.content) {
    return node.content.map((item: any, i: number) => `${i + 1}. ${adfNodeToText(item)}`).join('\n');
  }
  
  if (node.type === 'listItem' && node.content) {
    return node.content.map((n: any) => adfNodeToText(n)).join('');
  }
  
  // Code block
  if (node.type === 'codeBlock' && node.content) {
    const text = node.content.map((n: any) => adfNodeToText(n)).join('');
    return '```\n' + text + '\n```';
  }
  
  // Recursively process content
  if (node.content && Array.isArray(node.content)) {
    return node.content.map((n: any) => adfNodeToText(n)).join('');
  }
  
  return '';
}

export default function buildIssueBody(data: Record<string, any>): string {
  const fields = data.fields || {};
  const key = data.key;
  const baseUrl = process.env.JPD_BASE_URL;
  
  // Extract JPD custom fields
  const theme = fields.customfield_14377?.[0]?.value || 'No theme';
  const category = fields.customfield_14385?.value || 'Uncategorized';
  const roadmap = fields.customfield_14378?.value || 'Not set';
  const shortDescription = fields.customfield_14388 || '';
  
  // RICE scoring fields
  const reach = fields.customfield_14379 || 0;
  const impact = fields.customfield_14376 || 0;
  const confidence = fields.customfield_14389 || 0;
  const effort = fields.customfield_14387 || 0;
  const value = fields.customfield_14386 || 0;
  
  // Description (convert from ADF to text)
  const descriptionRaw = fields.description;
  const description = descriptionRaw ? adfToText(descriptionRaw) : 'No description provided.';
  
  // Build the body
  let body = '';
  
  // Title (short description) if available
  if (shortDescription) {
    body += `> ${shortDescription}\n\n`;
  }
  
  // Context section
  body += `## Context from Product\n\n`;
  body += `**Theme**: ${theme}  \n`;
  body += `**Category**: ${category}  \n`;
  body += `**Roadmap**: ${roadmap}\n\n`;
  
  // RICE Scoring
  body += `### Scoring (RICE)\n\n`;
  body += `- **Reach**: ${reach}\n`;
  body += `- **Impact**: ${impact}\n`;
  body += `- **Confidence**: ${confidence}%\n`;
  body += `- **Effort**: ${effort} points\n`;
  body += `- **Value**: ${value}\n\n`;
  
  // Description
  body += `## Description\n\n`;
  body += `${description}\n\n`;
  
  // Links
  body += `## Links\n\n`;
  body += `- [View in JPD](${baseUrl}/browse/${key})\n\n`;
  
  return body;
}

