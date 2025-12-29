# Custom Transform Functions

This directory is where **YOU** create your own custom transform functions for complex field mapping logic.

---

## Quick Start

### 1. Create a Transform Function

Create a new `.ts` file in this directory:

```typescript
// transforms/my-transform.ts
export default function(issue: any): string {
  // Your logic here
  const myField = issue.fields.customfield_YOUR_ID;
  return myField?.value || 'default';
}
```

### 2. Reference in Config

```yaml
mappings:
  - jpd: "."
    github: "labels"
    transform_function: "./transforms/my-transform.ts"
```

### 3. Test

```bash
pnpm run dev -- --dry-run
```

---

## Why Use Transform Functions?

### Use transform functions when you need:

- ✅ **Conditional logic** - Different outputs based on field values
- ✅ **Multiple field combination** - Combine data from several fields
- ✅ **Calculations** - Compute values (e.g., RICE scores)
- ✅ **Complex formatting** - String manipulation beyond templates
- ✅ **Type conversions** - Convert between data types

### Use template strings when you can:

```yaml
# Simple cases don't need functions
- jpd: "fields.customfield_XXXXX.value"
  github: "labels"
  template: "priority:{{fields.customfield_XXXXX.value | lowercase}}"
```

---

## Transform Function Contract

### Function Signature

```typescript
export default function(issue: JpdIssue, config?: any): ResultType
```

### Input: `issue`

The complete JPD issue object:

```typescript
interface JpdIssue {
  key: string;              // Issue key (e.g., "PROJ-123")
  fields: {
    summary: string;
    description: any;       // ADF format or string
    status: { name: string };
    [key: string]: any;     // Custom fields (customfield_XXXXX)
  };
}
```

### Output: `ResultType`

Depends on the GitHub destination:

| GitHub Field | Return Type | Example |
|--------------|-------------|---------|
| `title` | `string` | `"Issue Title"` |
| `body` | `string` | `"Issue body with\nmultiple lines"` |
| `labels` | `string` or `string[]` | `"label"` or `["label1", "label2"]` |

### Return `null` to skip

```typescript
export default function(issue: any): string | null {
  if (someCondition) {
    return null;  // Skip this mapping
  }
  return 'value';
}
```

---

## Examples & Patterns

**See comprehensive examples in**: [`../docs/TRANSFORM_PATTERNS.md`](../docs/TRANSFORM_PATTERNS.md)

### Quick Examples

#### Example 1: Simple Field Extraction

```typescript
export default function(issue: any): string {
  const fieldId = 'customfield_12345';
  const field = issue.fields[fieldId];
  
  return field?.value || 'default';
}
```

#### Example 2: Conditional Logic

```typescript
export default function(issue: any): string[] {
  const labels: string[] = [];
  
  const priority = issue.fields.customfield_AAAAA;
  if (priority?.value === 'High') {
    labels.push('urgent');
  }
  
  const team = issue.fields.customfield_BBBBB;
  if (team) {
    labels.push(`team:${team.value}`);
  }
  
  return labels;
}
```

#### Example 3: Multiple Field Combination

```typescript
export default function(issue: any): string {
  const reach = issue.fields.customfield_11111 || 0;
  const impact = issue.fields.customfield_22222 || 0;
  const confidence = issue.fields.customfield_33333 || 0;
  const effort = issue.fields.customfield_44444 || 0;
  
  const score = (reach * impact * confidence) / effort;
  
  return `RICE Score: ${Math.round(score)}`;
}
```

---

## Best Practices

### 1. Use Environment Variables for Field IDs

```typescript
const fieldId = process.env.MY_FIELD_ID || 'customfield_12345';
const field = issue.fields[fieldId];
```

**.env**:
```bash
MY_FIELD_ID=customfield_67890
```

**Why**: Makes transforms reusable across projects

### 2. Handle Null/Undefined Gracefully

```typescript
const field = issue.fields.customfield_XXXXX;
if (!field || !field.value) {
  return 'default';
}
```

**Why**: JPD fields can be empty or missing

### 3. Return Expected Types

```typescript
// For labels: return string or string[]
export default function(issue: any): string[] {
  return ['label1', 'label2'];  // Not a single string!
}
```

**Why**: Type mismatches cause sync errors

### 4. Document Your Transforms

```typescript
/**
 * Derives priority labels from impact and urgency fields
 * 
 * Inputs:
 * - customfield_AAAAA: Impact (1-5)
 * - customfield_BBBBB: Urgency (Low/Medium/High)
 * 
 * Output: priority label (critical/high/normal/low)
 */
export default function(issue: any): string {
  // ...
}
```

**Why**: Future you will thank you

### 5. Create Utilities for Reuse

**`transforms/utils.ts`**:
```typescript
export function getFieldValue(issue: any, fieldId: string): any {
  return issue.fields[fieldId];
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-');
}
```

**Use in transforms**:
```typescript
import { getFieldValue, slugify } from './utils.js';

export default function(issue: any): string {
  const value = getFieldValue(issue, process.env.FIELD_ID);
  return slugify(value);
}
```

---

## Testing Transforms

### Local Testing

Create `test-transform.ts`:

```typescript
import myTransform from './my-transform.js';

const testIssue = {
  key: 'TEST-1',
  fields: {
    customfield_12345: { value: 'Test Value' }
  }
};

const result = myTransform(testIssue);
console.log('Result:', result);
```

Run:
```bash
npx tsx test-transform.ts
```

### Dry-Run Testing

```bash
pnpm run dev -- --dry-run
```

Watch for:
- TypeError (null reference errors)
- Transform output
- Log messages

---

## Common Issues

### Issue: Transform not found

**Error**: `Cannot find module './transforms/my-transform.ts'`

**Fix**: Check file path is relative to project root:
```yaml
transform_function: "./transforms/my-transform.ts"
```

### Issue: Type errors

**Error**: `Expected string[], got string`

**Fix**: Return correct type for destination:
```typescript
// For labels destination
return ['label1', 'label2'];  // Not 'label1, label2'
```

### Issue: Field is undefined

**Error**: `Cannot read property 'value' of undefined`

**Fix**: Check field exists:
```typescript
const field = issue.fields.customfield_XXXXX;
if (!field) return 'default';
return field.value || 'default';
```

---

## Examples Directory

**Full working examples**: [`../examples/mtt/transforms/`](../examples/mtt/transforms/)

These are MTT-specific but show complete implementations:
- `derive-priority.ts` - Priority derivation with fallback logic
- `build-issue-body.ts` - Complex body builder with multiple fields
- `combine-labels.ts` - Multiple field to label conversion

**⚠️ Note**: These use MTT-specific field IDs. Adapt patterns, don't copy-paste!

---

## Summary

### Remember:
1. **This directory is for YOUR transforms** - Not included in git by default
2. **Use patterns from docs** - Don't start from scratch
3. **Make configurable** - Use environment variables
4. **Test thoroughly** - Use dry-run mode
5. **Handle edge cases** - Null, undefined, empty values

### Resources:
- **Comprehensive patterns**: [`../docs/TRANSFORM_PATTERNS.md`](../docs/TRANSFORM_PATTERNS.md)
- **Architecture philosophy**: [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
- **Working examples**: [`../examples/mtt/transforms/`](../examples/mtt/transforms/)

---

**Questions?** See docs or create a GitHub Discussion.

