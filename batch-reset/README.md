# Batch Reset

Demonstrates **progressively recovering a fleet of failed Workflows with batch
resets**, confirming each reset via
[`WorkflowExecutionExtendedInfo.reset_run_id`](https://docs.temporal.io/references/failures#reset).

The scenario (all driven by a single `npm run demo` command):

1. `chargeCustomer` calls a **flaky payment gateway that fails ~50% of the
   time**. The demo launches 10 `orderWorkflow`s, so roughly half fail.
2. It then batch-resets the failed Workflows, rewinding each to its first
   Workflow Task so it re-runs. Because the gateway is flaky, about half of
   *those* recover and the rest fail again.
3. So it loops: each round it batch-resets only the orders that are **still
   failing** (asking for confirmation first), prints the per-round result, and
   continues until every order has completed (or it hits `MAX_ROUNDS`).

   `findUnresetFailures()` picks the outstanding work: it lists `Failed`
   `orderWorkflow`s and keeps only those where
   `desc.raw.workflowExtendedInfo?.resetRunId` is **empty**. A reset leaves the
   original run `Failed` but stamps that field with the new run it spawned — so
   an empty `resetRunId` is a failure not yet reset, and a stamped one is
   skipped. That keeps the demo from re-resetting the same run and lets it stop
   and resume safely.

The demo is **stoppable and resumable**: decline a round (or `Ctrl+C`) to stop.
Re-running `npm run demo` while failed orders still exist skips starting new
Workflows and just continues resetting the outstanding failures.

### How a reset is tracked

After a reset, the original run stays `Failed` but its `reset_run_id` is stamped
with the new run it spawned. Each round resets a run, reads its `reset_run_id`
to find the new run, waits for that run to finish, and carries it into the next
round if it failed again. So every `runId` shown in round _N+1_ is the
`reset_run_id` reported in round _N_ — the reset chain made visible.

## Running this sample

1. `temporal server start-dev` to start the [Temporal Server](https://github.com/temporalio/cli/#installation).
1. `npm install` to install dependencies.
1. In one shell, start the Worker:

   ```bash
   npm start
   ```
1. In another shell, run the demo — it launches 10 orders and then
   progressively resets the failures:

   ```bash
   npm run demo
   ```

   Example output:

   ```text
   Starting 10 "orderWorkflow" Workflows...
   Waiting for results...
     ...
   6 succeeded, 4 failed.

   === Reset round 1: 4 failed Workflow(s) ===
     order-0 (runId ...)
     ...
   Reset these 4 Workflow(s)? (y/N) y
   Batch reset issued: 4 ok, 0 failed.
   Results:
     ✅ order-7: reset_run_id=... → COMPLETED
     ⚠️  order-0: reset_run_id=... → FAILED (will reset next round)
     ...
   Round 1 summary: 3 recovered, 1 still failing.
   === Reset round 2: 1 failed Workflow(s) ===
     order-0 (runId ...)        # == order-0's reset_run_id from round 1
   ...
   All orders recovered after 5 reset round(s). 🎉
   ```

> Tune the gateway with the `FAILURE_RATE` env var on the Worker (default `0.5`),
> e.g. `FAILURE_RATE=0.8 npm start` to force more rounds.

## Files

- [src/activities.ts](src/activities.ts) — the flaky `chargeCustomer` Activity.
- [src/workflows.ts](src/workflows.ts) — the `orderWorkflow`.
- [src/worker.ts](src/worker.ts) — Worker; honours `FAILURE_RATE`.
- [src/demo.ts](src/demo.ts) — launches 10 orders, then progressively batch-resets the failures (verified via `reset_run_id`).
