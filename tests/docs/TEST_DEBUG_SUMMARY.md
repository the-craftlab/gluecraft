# Test Debug Summary - Dec 29, 2025

## Issues Found & Fixed

### 1. **JPD Status Field Cannot Be Set Directly** ❌ → ✅

**Problem**:
```
❌ Failed to sync #6: JPD API Error 400
{"errors":{"status":"Field 'status' cannot be set. It is not on the appropriate screen, or unknown."}}
```

**Root Cause**:
- Trying to update JPD status using `PUT /issue/{key}` with `fields.status`
- JPD requires using the **Transitions API**, not direct field updates

**Fix**:
1. Added `transitionIssue()` method to `jpd-client.ts`:
```typescript
async transitionIssue(key: string, targetStatus: string): Promise<void> {
  // Get available transitions
  const transitionsResponse = await this.fetch(`/rest/api/3/issue/${key}/transitions`);
  const transitionsData = await transitionsResponse.json();
  
  // Find transition to target status
  const transition = transitionsData.transitions?.find(
    (t: any) => t.to?.name === targetStatus
  );
  
  if (!transition) {
    throw new Error(`No valid transition found to "${targetStatus}"`);
  }
  
  // Execute transition
  await this.fetch(`/rest/api/3/issue/${key}/transitions`, {
    method: 'POST',
    body: JSON.stringify({ transition: { id: transition.id } })
  });
}
```

2. Updated `sync-engine.ts` to use transitions:
```typescript
// Before:
await this.jpd.updateIssue(jpdKey, {
  status: { name: targetJpdStatus }
});

// After:
await this.jpd.transitionIssue(jpdKey, targetJpdStatus);
```

**Result**: ✅ GitHub → JPD status sync now works correctly

---

### 2. **Ambiguous Status Mappings** ⚠️ → ✅

**Problem**:
- Multiple JPD statuses mapped to `github_state: open`
  - "Epic Design" → open
  - "Backlog" → open
  - "Ready" → open
  - "In Progress" → open
  - "In Review" → open
- When reversing the mapping, all resolved to "In Review" (last one wins)
- Tried to transition all open GitHub issues to "In Review"

**Root Cause**:
- Reverse mapping used `Map.set()` which overwrites previous values
- No logic to detect ambiguous mappings

**Fix**:
Updated `syncGithubIssueToJpd()` to track multiple mappings and skip ambiguous ones:

```typescript
// Track multiple mappings
const reverseStatusMap = new Map<string, string[]>();

for (const [jpdStatus, mapping] of Object.entries(this.config.statuses)) {
  if (mapping.github_state) {
    const key = `state:${mapping.github_state}`;
    if (!reverseStatusMap.has(key)) {
      reverseStatusMap.set(key, []);
    }
    reverseStatusMap.get(key)!.push(jpdStatus);
  }
}

// Only sync if unambiguous
const mappings = reverseStatusMap.get(stateKey)!;
if (mappings.length === 1) {
  targetJpdStatus = mappings[0];  // Clear mapping
} else {
  // Ambiguous - skip
  this.logger.debug(`Ambiguous mapping: ${mappings.join(', ')}`);
  return null;
}
```

**Result**: 
✅ Only unambiguous mappings sync (e.g., `closed` → `Done`)  
✅ Ambiguous mappings skipped (no incorrect status changes)

---

## Test Results

### Quick Test (`./test-quick.sh`)

**Before Fix:**
```
❌ Failed to sync #16: JPD API Error 400 (Field 'status' cannot be set)
❌ 14 errors in GitHub → JPD sync
```

**After Fix:**
```
✓ Created JPD issue: MTT-13
✓ Synced to GitHub issue: #16
✓ Closed #16 → MTT-13 transitioned to Done
✓ Test PASSED
```

### Live Sync Test

**JPD → GitHub:**
```
✓ Created: 1 (MTT-13)
✓ Updated: 5
✓ Skipped: 7 (not in sync status)
```

**GitHub → JPD:**
```
✓ Updated: 1 (MTT-13: Backlog → Done)
✓ Ambiguous mappings skipped
```

---

## Files Modified

1. **`src/clients/jpd-client.ts`**
   - Added `transitionIssue()` method
   - ~30 lines added

2. **`src/sync-engine.ts`**
   - Updated `syncGithubIssueToJpd()` to use transitions
   - Added ambiguous mapping detection
   - ~50 lines modified

3. **`config/mtt-clean.yaml`**
   - Added comments explaining GitHub → JPD sync behavior
   - ~5 lines added

---

## Key Learnings

### 1. **JPD API Constraints**
- Status changes MUST use transitions API
- Each issue type has different available transitions
- Transitions are workflow-dependent

### 2. **Bidirectional Sync Complexity**
- Many-to-one mappings (JPD → GitHub) are easy
- One-to-many reverse mappings (GitHub → JPD) are ambiguous
- Only sync when there's a single, clear mapping

### 3. **Testing Strategy Validation**
- API-driven tests caught the issue immediately
- Quick feedback loop (10 seconds) enabled rapid iteration
- Live API calls revealed actual JPD behavior (not mocked)

---

## Current Status

### ✅ Working Features

- **JPD → GitHub sync**
  - Create issues
  - Update titles
  - Generate labels (type, priority)
  - Inject metadata

- **GitHub → JPD sync**
  - Close issue → Done status (unambiguous)
  - Ambiguous mappings skipped (safe)

- **Field mapping**
  - Category → type labels
  - Priority → priority labels
  - Native hierarchy (issuelinks)

### ⏳ Future Improvements

- **GitHub Projects integration** (for unambiguous column mappings)
- **Comment synchronization**
- **Attachment handling**
- **Conflict resolution** (simultaneous updates)

---

## Recommendations

### 1. **Status Mapping Strategy**

For clean bidirectional sync, use:
- **Unambiguous mappings**: `closed` ↔ `Done`
- **GitHub Projects columns**: Each column maps to one JPD status
- **Avoid state-only mappings**: Too many JPD statuses map to `open`

### 2. **Testing Workflow**

```bash
# After any sync engine changes:
./test-quick.sh           # Verify basic sync (10s)
./test-integration.sh     # Full validation (60s)
```

### 3. **Monitoring**

Watch for:
- Transition errors (invalid workflow state)
- Ambiguous mapping logs (indicates config needs review)
- Status mismatches (manual intervention needed)

---

## Next Steps

1. ✅ Run full integration test suite
2. ✅ Verify hierarchy sync (parent-child)
3. ⏳ Add GitHub Projects for unambiguous column mappings
4. ⏳ Test with larger dataset (50+ issues)
5. ⏳ Add CI/CD automation

---

## Success Metrics

**Before Debug:**
- ❌ 14 sync errors
- ❌ Status updates failing
- ❌ Incorrect transitions attempted

**After Debug:**
- ✅ 0 sync errors
- ✅ Status transitions working
- ✅ Ambiguous mappings safely skipped
- ✅ Complete bidirectional flow validated

---

## Test Evidence

See test run output in `/tmp/quick-test-output.txt`:
```bash
cat /tmp/quick-test-output.txt | grep -E "(✓|✗|Results)"
```

**Verification:**
- MTT-13 created in JPD ✓
- #16 created in GitHub ✓
- #16 closed ✓
- MTT-13 transitioned to Done ✓
- Test data cleaned up ✓

