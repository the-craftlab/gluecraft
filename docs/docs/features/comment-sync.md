# Bidirectional Comment Synchronization

## Overview

The sync tool now supports **bidirectional comment sync** between JPD and GitHub with full author attribution. Since native author sync isn't possible (comments posted via API use the API token's identity), we format comments with clear author references.

---

## Features

✅ **Bidirectional Sync** - JPD ↔ GitHub  
✅ **Author Attribution** - Clear links to original author profiles  
✅ **Deduplication** - Hidden markers prevent infinite loops  
✅ **ADF Support** - Converts Jira's Atlassian Document Format to Markdown  
✅ **Formatting Preservation** - Maintains bold, italic, links, code blocks  
✅ **Automatic Detection** - Only syncs new comments, not already-synced ones  

---

## Comment Format

### JPD → GitHub

```markdown
**[Jane Doe](https://your-domain.atlassian.net/people/USER_ID)** commented in JPD:

This is the original comment text from JPD with **formatting** preserved.

<!-- comment-sync:{"synced_from":"jpd","source_comment_id":"12345","sync_hash":"abc...","synced_at":"2025-12-23T21:00:00.000Z"}-->
```

### GitHub → JPD

```markdown
**[john-dev](https://github.com/john-dev)** commented in GitHub:

This is the original comment text from GitHub with **formatting** preserved.

<!-- comment-sync:{"synced_from":"github","source_comment_id":"67890","sync_hash":"def...","synced_at":"2025-12-23T21:00:00.000Z"}-->
```

---

## How It Works

### 1. Comment Detection

On each sync run, the system:
1. Fetches all comments from both JPD and GitHub
2. Parses them into a standardized format
3. Checks for sync markers to identify already-synced comments
4. Identifies new comments that need syncing

### 2. Author Attribution

Since we can't post comments as the original author, we format them with:
- **Author name** as a link to their profile
- **Source system** indicator (JPD or GitHub)
- **Original comment body** with formatting preserved

### 3. Deduplication

Each synced comment includes a hidden HTML marker with:
- `synced_from`: Source system (jpd/github)
- `source_comment_id`: Original comment ID
- `sync_hash`: MD5 hash of content (for change detection)
- `synced_at`: Timestamp

This prevents:
- Syncing the same comment multiple times
- Creating infinite loops (A→B→A→B...)
- Re-syncing unchanged comments

### 4. Format Conversion

**JPD (ADF) → Markdown**:
- Paragraphs
- Headings (H1-H6)
- Bold, italic, code
- Bullet and ordered lists
- Code blocks with syntax highlighting
- Links

**Markdown → JPD (ADF)**:
- Paragraphs
- Basic text formatting
- Simplified structure (complex Markdown may be flattened)

---

## Configuration

Comment sync is automatically enabled when using **bidirectional** sync mode:

```yaml
sync:
  direction: bidirectional  # Required for comment sync
```

No additional configuration needed!

---

## Usage Examples

### Example 1: PM Comment in JPD

**Scenario**: PM adds a comment in JPD

1. PM opens PROJ-10 in JPD
2. PM adds comment: "We need to prioritize the mobile UI first"
3. Sync runs
4. Comment appears in GitHub issue #5:

```markdown
**[Sarah Johnson](https://your-domain.atlassian.net/people/USER_ID)** commented in JPD:

We need to prioritize the mobile UI first
```

### Example 2: Dev Comment in GitHub

**Scenario**: Developer adds implementation notes in GitHub

1. Dev opens GitHub issue #5
2. Dev adds comment: "I've broken this into 3 subtasks, see #12, #13, #14"
3. Sync runs
4. Comment appears in JPD PROJ-10:

```markdown
**[john-dev](https://github.com/john-dev)** commented in GitHub:

I've broken this into 3 subtasks, see #12, #13, #14
```

### Example 3: Threaded Discussion

**Scenario**: PM and Dev discuss implementation

1. PM in JPD: "Should we use React Native or Flutter?"
2. ✅ Syncs to GitHub
3. Dev in GitHub: "@pm-user I recommend React Native for better integration"
4. ✅ Syncs to JPD
5. PM in JPD: "Agreed, let's proceed with React Native"
6. ✅ Syncs to GitHub

Result: Full conversation visible in both systems!

---

## Testing Comment Sync

### Step 1: Add Comment in JPD

```bash
# Manually add a comment in JPD UI:
# https://your-domain.atlassian.net/jira/polaris/projects/YOUR_PROJECT/ideas/view/ISSUE_ID

# Or via API:
curl -X POST -u "$JPD_EMAIL:$JPD_API_KEY" \
  -H "Content-Type: application/json" \
  "$JPD_BASE_URL/rest/api/3/issue/PROJ-10/comment" \
  -d '{
    "body": {
      "type": "doc",
      "version": 1,
      "content": [{
        "type": "paragraph",
        "content": [{
          "type": "text",
          "text": "Test comment from JPD API"
        }]
      }]
    }
  }'
```

### Step 2: Run Sync

```bash
cd /Users/james/Sites/Expedition/jpd-to-github-connector
pnpm run dev
```

### Step 3: Verify in GitHub

```bash
# Check comments on GitHub issue
gh issue view 5 --comments
```

Or visit: https://github.com/YOUR_ORG/YOUR_REPO/issues/5

### Step 4: Add Comment in GitHub

```bash
# Via GitHub UI or API
gh issue comment 5 --body "Test comment from GitHub CLI"
```

### Step 5: Run Sync Again

```bash
pnpm run dev
```

### Step 6: Verify in JPD

Visit JPD and check PROJ-10 for the new comment.

---

## Sync Behavior

### What Gets Synced

✅ New comments added after last sync  
✅ Original author name and profile link  
✅ Comment formatting (bold, italic, links, code)  
✅ Comment timestamp (in metadata)  

### What Doesn't Get Synced

❌ Comment edits (only initial post)  
❌ Comment deletions  
❌ Comment reactions/likes  
❌ @mentions (preserved as text, not functional)  
❌ Attachments/images (would need separate handling)  

### Limitations

1. **Native Author**: Comments appear as the API user, not original author
2. **One-Way Edits**: If someone edits a comment after sync, edits don't propagate
3. **@Mentions**: Mentions like `@username` are preserved but don't notify across systems
4. **Attachments**: File attachments need manual handling
5. **Threading**: Reply threads are flattened (all comments at top level)

---

## Advanced: Comment Sync Internals

### CommentSyncManager Class

Located in `src/comments/comment-sync-manager.ts`

Key methods:

```typescript
// Format a comment for cross-posting
CommentSyncManager.formatComment(comment, targetSystem)

// Extract sync metadata from comment body
CommentSyncManager.extractSyncMetadata(commentBody)

// Check if comment should be synced
CommentSyncManager.shouldSyncComment(comment, existingSyncedComments)

// Parse JPD comment to standard format
CommentSyncManager.parseJpdComment(jpdComment, jpdBaseUrl)

// Parse GitHub comment to standard format
CommentSyncManager.parseGitHubComment(githubComment)

// Convert ADF to Markdown
CommentSyncManager.convertJiraTextToMarkdown(jiraBody)
```

### Sync Flow

```
┌─────────────────────────────────────────────────┐
│            Comment Sync Process                  │
└─────────────────────────────────────────────────┘

1. Get all synced issue pairs (JPD key ↔ GitHub #)
2. For each pair:
   ├─ Fetch JPD comments
   ├─ Fetch GitHub comments
   ├─ Parse both to standard format
   ├─ Filter out already-synced comments
   ├─ Sync JPD → GitHub (new JPD comments)
   └─ Sync GitHub → JPD (new GitHub comments)
3. Add sync markers to prevent duplicates
4. Log sync status
```

### Data Structures

```typescript
interface Comment {
  id: string;
  author: {
    name: string;
    displayName?: string;
    profileUrl: string;
    avatarUrl?: string;
  };
  body: string;
  created: string;
  updated?: string;
  source: 'jpd' | 'github';
  sourceId: string;
}

interface CommentSyncMetadata {
  synced_from: 'jpd' | 'github';
  source_comment_id: string;
  sync_hash: string;
  synced_at: string;
}
```

---

## Troubleshooting

### Comments Not Syncing

**Check 1**: Bidirectional mode enabled?
```yaml
sync:
  direction: bidirectional  # Not just "jpd-to-github"
```

**Check 2**: Debug logging
```bash
DEBUG=true pnpm run dev
```

Look for: `Syncing JPD comment X to GitHub issue #Y`

### Duplicate Comments

**Cause**: Sync markers may be missing or corrupted

**Solution**: Hidden markers should be present in comment text. Check:
```bash
# In GitHub comment body
<!-- comment-sync:{...}-->
```

### Format Issues

**Problem**: ADF not converting correctly

**Solution**: Update `convertAdfToMarkdown` in `CommentSyncManager` for specific formatting needs

### Permission Errors

**JPD**: Ensure API user has "Add Comments" permission  
**GitHub**: Token needs `repo` scope (includes commenting)

---

## Future Enhancements

Potential improvements:

- [ ] **Comment Edit Sync** - Track and sync comment edits
- [ ] **Comment Deletion Sync** - Delete comments when source is deleted
- [ ] **Attachment Sync** - Upload and link attachments
- [ ] **@Mention Translation** - Convert mentions across systems
- [ ] **Reaction Sync** - Sync emoji reactions/likes
- [ ] **Thread Preservation** - Maintain comment threading
- [ ] **Selective Sync** - Config option to enable/disable comment sync per issue type

---

## Summary

Comment sync provides:
- ✅ **Full visibility** - All discussions visible in both systems
- ✅ **Clear attribution** - Always know who said what
- ✅ **No duplicates** - Smart deduplication prevents loops
- ✅ **Format preservation** - Markdown and ADF handled correctly
- ✅ **Zero configuration** - Works automatically in bidirectional mode

**PM's stay in JPD, devs stay in GitHub, everyone sees all comments!** 🎉

