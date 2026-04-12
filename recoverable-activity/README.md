# Recoverable Activity — Home Loan Processing

Demonstrates the **recoverable activity pattern** where failed activities pause the workflow and wait for a human to fix the data via a Temporal Signal before retrying. Inspired by [temporal-training-exercise-typescript/solution7](https://github.com/temporal-sa/temporal-training-exercise-typescript/blob/main/solution7/src/workflow.ts).

## Pattern

The core pattern is a `retryActivity` helper inside the workflow:

```typescript
const retryActivity = async <T>(activityName: string, fn: () => Promise<T>): Promise<T> => {
  while (true) {
    try {
      return await fn();
    } catch (e) {
      updateStatus('PENDING_FIX', activityName, message);
      retryRequested = false;
      await condition(() => retryRequested);   // wait for signal
    }
  }
};
```

When an activity fails:
1. Workflow status is set to `PENDING_FIX` with the failed activity name and error message
2. Search attributes are updated so the workflow is discoverable via visibility queries
3. The workflow **blocks** until a `retry` signal arrives with corrected data
4. The activity is retried with the patched application data

## Home Loan Pipeline

The workflow processes a loan application through 6 sequential activities:

```
Verify Income → Credit Check → Appraisal → Title Search → Underwriting → Close Loan
```

Each activity validates its inputs and throws `ApplicationFailure.nonRetryable()` on bad data, triggering the recovery loop.

## Failure Scenarios

The client starts 9 workflows with different failure scenarios, including multi-issue loans that fail at multiple pipeline stages:

### Single-issue

| Workflow | Applicant | Fails At | Root Cause |
|----------|-----------|----------|------------|
| LOAN-001 | Alice Johnson | *(none)* | Clean run — all steps pass |
| LOAN-002 | Bob Smith | `runCreditCheck` | Invalid SSN `000-00-0000` |
| LOAN-003 | Carol Davis | `orderAppraisal` | Property address is `INVALID_ADDRESS` |
| LOAN-004 | Dan Miller | `performTitleSearch` | Property ID is `MISSING` |
| LOAN-005 | Eve Wilson | `underwrite` | DTI ratio 1089% exceeds 400% limit |
| LOAN-006 | Frank Brown | `verifyIncome` | Employer `UNKNOWN_EMPLOYER` not in database |

### Multi-issue (require multiple rounds of Patch and Retry)

| Workflow | Applicant | Fails At (in sequence) |
|----------|-----------|------------------------|
| LOAN-007 | Grace Lee | `verifyIncome` → `orderAppraisal` → `performTitleSearch` |
| LOAN-008 | Henry Park | `runCreditCheck` → `underwrite` |
| LOAN-009 | Irene Tanaka | `verifyIncome` → `runCreditCheck` → `orderAppraisal` → `underwrite` |

## UI

A Temporal-branded dashboard at `http://localhost:3000` with:

- **Stats bar** — clickable cards for total, pending fix, running, and completed counts; click to filter the table
- **Pipeline visualization** — 6-step progress indicator per workflow (green = done, red = failed, gray = pending)
- **Filter by failed activity** — dropdown search using Temporal visibility/search attributes
- **Filter by loan status** — find all workflows in a specific state
- **Workflow detail modal** — click any workflow (including completed) to see full application data, pipeline status, and error message
- **Patch and Retry** — patch a bad field and retry the failed activity; shows current value, suggested fix, and a spinner while waiting for the workflow to resume
- **Fix history** — table showing all past fixes (old value struck through in red, new value in green) for workflows that required multiple corrections
- **New Application** — button to start a new loan workflow from the UI with a scenario preset dropdown for quick failure injection
- **Temporal UI link** — each workflow modal links directly to the workflow in Temporal UI (`localhost:8233`)
- **Auto-polling** — dashboard refreshes every 3 seconds; modal polls every 1 second after sending a fix

## Prerequisites

- Temporal Server running locally on `localhost:7233`
- Node.js 18+

## Setup

```bash
npm install
```

Register the custom search attributes (one-time):

```bash
temporal operator search-attribute create --name LoanStatus --type Keyword
temporal operator search-attribute create --name FailedActivity --type Keyword
```

## Running

```bash
# Terminal 1: Start the worker
npm start

# Terminal 2: Start 9 loan workflows with different failure scenarios
npm run workflow

# Terminal 3: Start the UI
npm run web
# Open http://localhost:3000
```

## Fixing a Failed Workflow

From the UI:
1. Click a workflow in `PENDING_FIX` state
2. See the error message, current value, and suggested fix
3. Select the field to patch, enter the corrected value
4. Click **Patch and Retry**
5. Watch the spinner and pipeline update in real-time as the workflow resumes

You can also start new workflows directly from the UI using the **+ New Application** button, with a scenario dropdown to inject specific failures.

From the CLI:
```bash
temporal workflow signal \
  --workflow-id LOAN-002 \
  --name retry \
  --input '{"key":"ssn","value":"222-33-4444"}'
```

## Searching for Failed Workflows

The workflow updates `LoanStatus` and `FailedActivity` search attributes, making them queryable:

```bash
# Find all workflows stuck at credit check
temporal workflow list --query "FailedActivity = 'runCreditCheck'"

# Find all workflows pending fix
temporal workflow list --query "LoanStatus = 'PENDING_FIX'"
```

## Project Structure

```
src/
├── models.ts        # LoanApplication, LoanState, FixEntry, RetryUpdate types
├── activities.ts    # 6 loan activities with validation-based failure injection
├── workflows.ts     # homeLoanWorkflow with retryActivity pattern and fix history
├── worker.ts        # Worker on 'recoverable-activity' task queue
├── client.ts        # Starts 9 workflows with different failure scenarios
└── web-service.ts   # Express API: list, search, query, signal, and start workflows
public/
└── index.html       # Temporal-branded Vue.js 3 dashboard
```
