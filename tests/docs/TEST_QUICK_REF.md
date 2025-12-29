# Testing Quick Reference

## 🚀 Quick Commands

```bash
# Quick test (10 seconds)
./test-quick.sh

# Full integration test (60 seconds)
./test-sync-integration.sh

# Cleanup old test data
./test-sync-integration.sh --cleanup-only

# Test with debug output
DEBUG=true ./test-quick.sh
```

---

## 📋 Test Checklist

Before committing:
- [ ] Run `./test-quick.sh` → Should pass
- [ ] Review sync output → No errors
- [ ] Check GitHub labels → Match expected
- [ ] Clean up test data → Answer 'y'

---

## 🔧 Common Issues

**"Unbounded JQL queries"**
→ Rate limited. Wait 60 seconds and retry.

**"GitHub issue not found"**
→ Check issue status. Must be in Backlog/Ready/In Progress.

**"Labels don't match"**
→ Check `config/mtt-clean.yaml` mappings.

**"Transition failed"**
→ JPD workflow doesn't allow that transition.

---

## 📊 Test Matrix

| Test | Create | Update | JPD→GH | GH→JPD |
|------|--------|--------|--------|--------|
| Title | ✅ | ✅ | ✅ | ❌ |
| Status | ✅ | ✅ | ✅ | ✅ |
| Priority | ✅ | ✅ | ✅ | ❌ |
| Category | ✅ | ❌ | ✅ | ❌ |

---

## 🧹 Manual Cleanup

```bash
# Find test issues in JPD
curl -u "$JPD_EMAIL:$JPD_API_KEY" \
  "$JPD_BASE_URL/rest/api/3/search?jql=project=MTT AND summary ~ 'TEST'" | \
  jq -r '.issues[].key'

# Delete JPD issue
curl -u "$JPD_EMAIL:$JPD_API_KEY" \
  -X DELETE "$JPD_BASE_URL/rest/api/3/issue/MTT-XX"

# Find test issues in GitHub
gh issue list -R Checkfront/manifest-jpd-sync-test \
  --search "TEST in:title" --state all

# Close GitHub issue
gh issue close XX -R Checkfront/manifest-jpd-sync-test
```

---

## 📖 Full Documentation

- `TESTING_STRATEGY.md` - Comprehensive guide
- `PROGRESSIVE_TESTING.md` - Implementation summary
- `test-sync-integration.sh` - Full test suite code
- `test-quick.sh` - Quick test code

