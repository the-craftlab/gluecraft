# Field Configuration Issues

Troubleshooting problems with JPD custom field mappings and configurations.

## Field Not Found

**Error:** `Field customfield_10001 not found in project`

**Causes:**
- Wrong field ID
- Field doesn't exist
- No permission to access field
- Field is project-specific

**Solutions:**

1. **Discover available fields:**
   ```bash
   pnpm run discover-fields YOUR_PROJECT
   ```

2. **Copy exact field ID from output**

3. **Update configuration:**
   ```yaml
   fields:
     priority:
       field_id: "customfield_10001"  # Use exact ID from discover-fields
       field_type: "select"
   ```

4. **Validate:**
   ```bash
   pnpm run validate-config
   ```

## Field Type Mismatch

**Error:** `Field type mismatch: expected select, got text`

**Causes:**
- `field_type` in config doesn't match actual JPD field type
- Field type changed in JPD

**Solutions:**

1. **Check actual field type:**
   ```bash
   pnpm run discover-fields YOUR_PROJECT
   ```

2. **Update field_type in config:**
   ```yaml
   fields:
     priority:
       field_id: "customfield_10001"
       field_type: "select"  # Match actual type from JPD
   ```

**Common type mappings:**
- Dropdown → `select`
- Multi-select → `array`
- Number → `number`
- Text → `text`
- User picker → `user`
- Date → `date`

## Field Value Not Rendering

**Symptom:** Field value shows as empty or `null` in GitHub

**Common Causes & Solutions:**

### Wrong Field Path

```yaml
# Wrong - missing .value
- jpd: "fields.customfield_10001"
  github: "labels"

# Correct - includes .value for select fields
- jpd: "fields.customfield_10001.value"
  github: "labels"
```

### Array Field Access

```yaml
# Wrong - missing array index
- jpd: "fields.customfield_10002.value"
  github: "labels"

# Correct - access first element
- jpd: "fields.customfield_10002[0].value"
  github: "labels"
```

### Optional Field Empty

```yaml
# Field marked as required but is empty
fields:
  impact:
    field_id: "customfield_10003"
    required: true  # Remove if field can be empty
```

## Template Syntax Errors

### Invalid Variable Reference

**Error:** `Template syntax error at line 5`

```yaml
# Wrong - typo in field name
template: "{{fields.custmfield_10001.value}}"
          #       ^ typo

# Correct
template: "{{fields.customfield_10001.value}}"
```

### Missing Filter

```yaml
# Wrong - filter doesn't exist
template: "{{fields.priority.value | lower}}"
          #                          ^ should be lowercase

# Correct
template: "{{fields.priority.value | lowercase}}"
```

### Unclosed Braces

```yaml
# Wrong - missing closing brace
template: "priority:{{fields.priority.value | lowercase"

# Correct
template: "priority:{{fields.priority.value | lowercase}}"
```

## Transform Function Issues

### Function Not Found

**Error:** `Transform function not found: ./transforms/my-function.ts`

**Solutions:**

1. **Check file exists:**
   ```bash
   ls -la transforms/my-function.ts
   ```

2. **Verify path in config:**
   ```yaml
   mappings:
     - jpd: "fields"
       github: "labels"
       transform_function: "./transforms/my-function.ts"  # Must start with ./
   ```

3. **Check export format:**
   ```typescript
   // Correct - default export
   export default function(data: Record<string, any>): string {
     return "result";
   }
   
   // Wrong - named export
   export function myFunction(data: Record<string, any>): string {
     return "result";
   }
   ```

### Function Runtime Error

**Error:** `Transform function error: Cannot read property 'value' of undefined`

**Solutions:**

1. **Add null checks:**
   ```typescript
   export default function(data: Record<string, any>): string {
     // Wrong - no null check
     const priority = data.fields.customfield_10001.value;
     
     // Correct - with null checks
     const priority = data.fields?.customfield_10001?.value || 'none';
     
     return `priority:${priority}`;
   }
   ```

2. **Debug with logging:**
   ```typescript
   export default function(data: Record<string, any>): string {
     console.log('Transform data:', JSON.stringify(data, null, 2));
     // Your logic here
   }
   ```

## Field Validation Errors

### Required Field Empty

**Error:** `Required field 'priority' is empty for issue MTT-5`

**Solutions:**

**Option 1: Make field optional**
```yaml
fields:
  priority:
    field_id: "customfield_10001"
    field_type: "select"
    required: false  # Change to false
```

**Option 2: Provide default value**
```yaml
mappings:
  - jpd: "fields.customfield_10001.value"
    github: "labels"
    template: "priority:{{fields.customfield_10001.value | default: 'none'}}"
```

**Option 3: Filter out issues without required fields**
```yaml
jpd:
  jql_filter: "project = MTT AND customfield_10001 IS NOT EMPTY"
```

## Debugging Field Issues

### Enable Debug Logging

```bash
DEBUG=1 pnpm run dev -- --dry-run
```

Look for:
- Field values being extracted
- Template rendering
- Transform function calls

### Test Field Mapping

1. **Discover field:**
   ```bash
   pnpm run discover-fields YOUR_PROJECT
   ```

2. **Check sample value matches expectations**

3. **Test in dry-run:**
   ```bash
   pnpm run dev -- --dry-run
   ```

4. **Look for field in output:**
   Search for field ID in dry-run output

### Validate One Field at a Time

Comment out other mappings temporarily:

```yaml
mappings:
  # Test this mapping
  - jpd: "fields.customfield_10001.value"
    github: "labels"
    template: "priority:{{fields.customfield_10001.value | lowercase}}"
    
  # Comment out others temporarily
  # - jpd: "fields.customfield_10002"
  #   github: "labels"
```

## Next Steps

- [Sync Problems](./sync-problems) - Issues not syncing correctly
- [Debugging Guide](./debugging) - Advanced debugging techniques
- [Field Mappings](../configuration/field-mappings) - Configuration reference

:::tip Field Discovery First
Always run `discover-fields` before configuring field mappings to ensure you have correct field IDs and types.
:::

