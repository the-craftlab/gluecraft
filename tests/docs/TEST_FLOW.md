# Test Flow Visualization

## Quick Test Flow (10 seconds)

```mermaid
graph TD
    A[Start: ./test-quick.sh] --> B[Create JPD Issue via API]
    B --> C{Transition to Backlog?}
    C -->|Success| D[Run Sync Engine]
    C -->|Failed| E[Sync Anyway with Warning]
    D --> F[Search GitHub for Issue]
    E --> F
    F --> G{Found?}
    G -->|Yes| H[Extract Issue Details]
    G -->|No| I[❌ Test Failed]
    H --> J[Verify Title]
    J --> K[Verify Labels]
    K --> L[✅ Test Passed]
    L --> M[Display Cleanup Commands]
    I --> M
```

---

## Integration Test Flow (60 seconds)

```mermaid
graph TD
    A[Start: ./test-sync-integration.sh] --> B[Test 1: Create]
    B --> C[Create JPD Issue with Story/High]
    C --> D[Run Sync]
    D --> E[Verify GitHub Issue Created]
    E --> F{Pass?}
    F -->|Yes| G[Test 2: Update]
    F -->|No| Z[❌ Mark Failed]
    
    G --> H[Update JPD Title]
    H --> I[Run Sync]
    I --> J[Verify GitHub Title Updated]
    J --> K{Pass?}
    K -->|Yes| L[Test 3: Priority]
    K -->|No| Z
    
    L --> M[Change JPD Priority High→Critical]
    M --> N[Run Sync]
    N --> O[Verify GitHub Label Changed]
    O --> P{Pass?}
    P -->|Yes| Q[Test 4: Status]
    P -->|No| Z
    
    Q --> R[Close GitHub Issue]
    R --> S[Run Sync]
    S --> T[Verify JPD Status = Done]
    T --> U{Pass?}
    U -->|Yes| V[✅ All Tests Passed]
    U -->|No| Z
    
    V --> W[Prompt for Cleanup]
    Z --> W
    W --> X{Clean up?}
    X -->|Yes| Y[Delete Test Data]
    X -->|No| END[Show Cleanup Commands]
    Y --> END
```

---

## Data Flow: JPD → Sync Engine → GitHub

```
┌──────────────┐
│     JPD      │
│  (Source)    │
└──────┬───────┘
       │
       │ API Call: Create Issue
       │ Fields: {
       │   summary: "Test Story"
       │   customfield_14385: "Story"
       │   customfield_14425: "High"
       │ }
       ▼
┌──────────────────────┐
│   Sync Engine        │
│                      │
│  1. Fetch JPD Issues │
│  2. Filter by Status │
│  3. Transform Fields │
│  4. Generate Labels  │
│  5. Create/Update GH │
└──────┬───────────────┘
       │
       │ API Call: Create Issue
       │ Payload: {
       │   title: "Test Story"
       │   labels: ["story", "high"]
       │   body: "...[metadata]..."
       │ }
       ▼
┌──────────────┐
│   GitHub     │
│  (Target)    │
└──────────────┘
       │
       │ Test Verification
       ▼
┌──────────────────────┐
│ Verify:              │
│  ✓ Issue created     │
│  ✓ Title matches     │
│  ✓ Labels correct    │
│  ✓ Metadata present  │
└──────────────────────┘
```

---

## Data Flow: GitHub → Sync Engine → JPD

```
┌──────────────┐
│   GitHub     │
│  (Source)    │
└──────┬───────┘
       │
       │ API Call: Update Issue
       │ Change: {
       │   state: "closed"
       │ }
       ▼
┌──────────────────────┐
│   Sync Engine        │
│                      │
│  1. Fetch GH Issues  │
│  2. Compare State    │
│  3. Map Status       │
│  4. Update JPD       │
└──────┬───────────────┘
       │
       │ API Call: Transition
       │ Payload: {
       │   transition: {
       │     id: "31" (Done)
       │   }
       │ }
       ▼
┌──────────────┐
│     JPD      │
│  (Target)    │
└──────────────┘
       │
       │ Test Verification
       ▼
┌──────────────────────┐
│ Verify:              │
│  ✓ Status = Done     │
│  ✓ Transition valid  │
└──────────────────────┘
```

---

## Test Cleanup Flow

```mermaid
graph LR
    A[Test Creates Data] --> B[JPD Issues]
    A --> C[GitHub Issues]
    B --> D{Cleanup?}
    C --> D
    D -->|Automatic| E[Delete via API]
    D -->|Manual| F[Show Commands]
    E --> G[Verify Deletion]
    F --> H[User Runs Commands]
    H --> G
    G --> I[Clean State]
```

---

## Progressive Enhancement Layers

```
┌─────────────────────────────────────────────┐
│  Layer 4: Advanced Features                │  ⏳ Future
│  • Webhooks • Comments • Attachments       │
└─────────────────────────────────────────────┘
         ▲
┌─────────────────────────────────────────────┐
│  Layer 3: Hierarchy & Relationships         │  🎯 Next
│  • Parent-child links • Subtasks           │
└─────────────────────────────────────────────┘
         ▲
┌─────────────────────────────────────────────┐
│  Layer 2: Field Transforms & Labels         │  ✅ Current
│  • Priority mapping • Category labels       │
│  • Custom transforms • Status filtering    │
└─────────────────────────────────────────────┘
         ▲
┌─────────────────────────────────────────────┐
│  Layer 1: Core Sync Mechanics               │  ✅ Tested
│  • Create • Update • Status bidirectional  │
└─────────────────────────────────────────────┘
```

---

## Error Handling Flow

```mermaid
graph TD
    A[API Call] --> B{Success?}
    B -->|Yes| C[Parse Response]
    B -->|No| D{Error Type}
    
    D -->|429 Rate Limit| E[Wait + Retry]
    D -->|400 Bad Request| F[Log Error + Fail]
    D -->|401 Auth Failed| G[Check Credentials]
    D -->|404 Not Found| H[Skip + Continue]
    
    E --> I{Retry Count < 3?}
    I -->|Yes| A
    I -->|No| F
    
    C --> J[Proceed]
    F --> K[Test Fails]
    G --> K
    H --> L[Test Warns]
```

---

## CI/CD Integration Flow

```
┌──────────────────┐
│  Git Push        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  GitHub Actions  │
│  Triggered       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Checkout Code   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Install Deps    │
│  (pnpm install)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Setup .env      │
│  (from secrets)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│  Run Tests           │
│  ./test-integration  │
└────────┬─────────────┘
         │
         ▼
┌────────────────────┐
│  Cleanup           │
│  (always run)      │
└────────┬───────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│  Pass  │ │  Fail  │
│  ✅    │ │  ❌    │
└────────┘ └────────┘
```

---

## State Transitions Tested

```
JPD Status Workflow:
┌──────┐    ┌───────────┐    ┌─────────┐
│ Idea │───▶│ Discovery │───▶│ Icebox  │
└──────┘    └───────────┘    └─────────┘
                                   │
                                   │ (Not synced)
                                   ▼
                              ┌──────────┐
                              │ Backlog  │◀─── Sync starts here
                              └────┬─────┘
                                   │
                                   ▼
                              ┌──────────┐
                              │  Ready   │
                              └────┬─────┘
                                   │
                                   ▼
                              ┌──────────────┐
                              │ In Progress  │
                              └────┬─────────┘
                                   │
                                   ▼
                              ┌──────────┐
                              │ In Review│
                              └────┬─────┘
                                   │
                                   ▼
                              ┌──────────┐
                              │   Done   │◀─── GH: closed
                              └──────────┘
```

---

## Label Generation Flow

```
JPD Fields          Transform         GitHub Labels
═══════════         ═════════         ══════════════

Category           Direct Map         Type Label
"Story"       ───▶ lowercase   ───▶  "story"
"Epic"        ───▶ lowercase   ───▶  "epic"
"Bug"         ───▶ lowercase   ───▶  "bug"

Priority           Custom Fn          Priority Label
"Critical"    ───▶ map to      ───▶  "critical"
"High"        ───▶ priority    ───▶  "high"
"Medium"      ───▶ levels      ───▶  "normal"
"Low"         ───▶             ───▶  "low"

Hierarchy          Metadata           Hidden Comment
parent: MTT-1 ───▶ JSON obj    ───▶  <!-- {...} -->
```

---

## Quick Reference: Test Commands

```bash
# Quick validation (10s)
./test-quick.sh

# Full suite (60s)
./test-sync-integration.sh

# With debug output
DEBUG=true ./test-quick.sh

# Cleanup only
./test-sync-integration.sh --cleanup-only

# Check syntax
bash -n test-quick.sh
bash -n test-sync-integration.sh

# View last test output
cat /tmp/quick-test-output.txt
cat /tmp/sync-output.txt
```

---

## Architecture: Test vs Production

```
┌────────────────────────────────────────────────┐
│  Production Sync (Scheduled)                   │
│                                                │
│  GitHub Actions Cron ──▶ Sync Engine          │
│         (15 min)         (all issues)          │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│  Test Sync (On-Demand)                         │
│                                                │
│  Test Script ──▶ Create Data ──▶ Sync Engine  │
│  (manual)        (test issues)   (all issues)  │
│                       │                │       │
│                       └────────────────┴───▶   │
│                       Verify Test Results      │
└────────────────────────────────────────────────┘
```

**Key insight**: Sync engine doesn't know it's being tested. It processes all issues normally. Tests verify their specific test data was handled correctly.

