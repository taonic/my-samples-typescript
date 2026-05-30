import * as readline from 'readline';
import { Client, Connection } from '@temporalio/client';
import { temporal } from '@temporalio/proto';
import { nanoid } from 'nanoid';
import { orderWorkflow } from './workflows';
import { ADDRESS, FAILED_ORDERS_QUERY, NAMESPACE, NUM_ORDERS, TASK_QUEUE } from './shared';

const { BatchOperationState } = temporal.api.enums.v1;

// Stop after this many rounds so a permanently-failing Workflow can't loop us
// forever. With a ~50% failure rate, 10 rounds clears 10 orders with room to
// spare.
const MAX_ROUNDS = 10;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Target {
  workflowId: string;
  runId: string;
}

async function run() {
  const connection = await Connection.connect({ address: ADDRESS });
  const client = new Client({ connection, namespace: NAMESPACE });

  // 1. If a previous run left failed orders behind (e.g. it was aborted), pick
  //    up where we left off rather than starting a fresh batch. This makes the
  //    demo safely stoppable and resumable.
  let targets = await findUnresetFailures(client);
  if (targets.length > 0) {
    console.log(`Resuming: found ${targets.length} failed order(s) from a previous run — not starting new Workflows.`);
  } else {
    // Otherwise launch a fresh fleet; roughly half fail on the flaky gateway.
    targets = await startOrders(client);
  }

  // 2. Progressively batch-reset the ones that are still failing.
  if (targets.length === 0) {
    console.log('\nNothing to recover — every order succeeded on the first try. 🎉');
  } else {
    await resetUntilRecovered(client, targets);
  }

  await connection.close();
}

// Find failed order Workflows that still need a reset: a failed run whose
// reset_run_id is still empty is the current tip of its chain. Already-reset
// runs are skipped, so a stopped-and-restarted demo resumes cleanly.
async function findUnresetFailures(client: Client): Promise<Target[]> {
  const targets: Target[] = [];
  for await (const wf of client.workflow.list({ query: FAILED_ORDERS_QUERY })) {
    const desc = await client.workflow.getHandle(wf.workflowId, wf.runId).describe();
    if (!desc.raw.workflowExtendedInfo?.resetRunId) {
      targets.push({ workflowId: wf.workflowId, runId: wf.runId });
    }
  }
  return targets;
}

// Start NUM_ORDERS Workflows, wait for them to settle, and return the ones that
// failed (with their original runId, which is the tip of each reset chain).
async function startOrders(client: Client): Promise<Target[]> {
  console.log(`Starting ${NUM_ORDERS} "${orderWorkflow.name}" Workflows...`);
  const handles = [];
  for (let i = 0; i < NUM_ORDERS; i++) {
    const workflowId = `order-${i}`;
    const handle = await client.workflow.start(orderWorkflow, {
      taskQueue: TASK_QUEUE,
      workflowId,
      args: [workflowId],
    });
    handles.push(handle);
  }

  console.log('Waiting for results...');
  const failed: Target[] = [];
  let succeeded = 0;
  for (const handle of handles) {
    try {
      await handle.result();
      succeeded++;
      console.log(`  ${handle.workflowId} succeeded`);
    } catch (err) {
      failed.push({ workflowId: handle.workflowId, runId: handle.firstExecutionRunId });
      console.log(`  ${handle.workflowId} FAILED: ${(err as Error).message}`);
    }
  }
  console.log(`\n${succeeded} succeeded, ${failed.length} failed.`);
  return failed;
}

// Repeatedly batch-reset the still-failing orders, one round at a time, until
// every order completes (or we hit MAX_ROUNDS). Asks for confirmation before
// each round.
async function resetUntilRecovered(client: Client, initial: Target[]): Promise<void> {
  let targets = initial;
  let round = 1;
  let aborted = false;

  for (; targets.length > 0 && round <= MAX_ROUNDS; round++) {
    console.log(`\n=== Reset round ${round}: ${targets.length} failed Workflow(s) ===`);
    targets.forEach((t) => console.log(`  ${t.workflowId} (runId ${t.runId})`));

    if (!(await confirm(`Reset these ${targets.length} Workflow(s)?`))) {
      aborted = true;
      break;
    }

    // Batch reset exactly these runs, rewinding each to its first Workflow Task
    // so the whole Workflow re-runs (and re-draws the flaky gateway outcome).
    const jobId = `batch-reset-${nanoid()}`;
    await client.workflowService.startBatchOperation({
      namespace: NAMESPACE,
      jobId,
      reason: `Progressive reset of failed orders (round ${round})`,
      executions: targets.map((t) => ({ workflowId: t.workflowId, runId: t.runId })),
      resetOperation: {
        identity: 'batch-reset-sample',
        options: { firstWorkflowTask: {} },
      },
    });
    await waitForBatch(client, jobId);

    // Inspect each reset. The original run's reset_run_id points at the new run
    // — wait for that run to finish, then carry the ones that failed again into
    // the next round.
    const stillFailing: Target[] = [];
    let recovered = 0;
    console.log('Results:');
    for (const t of targets) {
      const resetRunId = await waitForResetRunId(client, t.workflowId, t.runId);
      if (!resetRunId) {
        console.log(`  ❌ ${t.workflowId}: reset_run_id is still empty — reset did not take effect`);
        continue;
      }
      const status = await waitForTerminalStatus(client, t.workflowId, resetRunId);
      if (status === 'COMPLETED') {
        recovered++;
        console.log(`  ✅ ${t.workflowId}: reset_run_id=${resetRunId} → COMPLETED`);
      } else {
        console.log(`  ⚠️  ${t.workflowId}: reset_run_id=${resetRunId} → ${status} (will reset next round)`);
        // The new run is the next tip to reset; it has an empty reset_run_id.
        stillFailing.push({ workflowId: t.workflowId, runId: resetRunId });
      }
    }

    console.log(`Round ${round} summary: ${recovered} recovered, ${stillFailing.length} still failing.`);
    targets = stillFailing;
  }

  if (aborted) {
    console.log(`\nStopped with ${targets.length} order(s) still failing. Re-run \`npm run demo\` to resume.`);
  } else if (targets.length === 0) {
    console.log(`\nAll orders recovered after ${round - 1} reset round(s). 🎉`);
  } else {
    console.log(`\nStopped after ${MAX_ROUNDS} rounds with ${targets.length} order(s) still failing.`);
  }
}

// Prompt the operator for a y/N confirmation before a batch reset.
async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await new Promise<string>((resolve) => rl.question(`${question} (y/N) `, resolve));
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

// Poll DescribeBatchOperation until the job leaves the RUNNING state.
async function waitForBatch(client: Client, jobId: string): Promise<void> {
  for (;;) {
    const desc = await client.workflowService.describeBatchOperation({ namespace: NAMESPACE, jobId });
    switch (desc.state) {
      case BatchOperationState.BATCH_OPERATION_STATE_COMPLETED:
        console.log(
          `Batch reset issued: ${desc.completeOperationCount ?? 0} ok, ${desc.failureOperationCount ?? 0} failed.`
        );
        return;
      case BatchOperationState.BATCH_OPERATION_STATE_FAILED:
        throw new Error(`Batch reset failed: ${desc.reason}`);
      default:
        await sleep(500);
    }
  }
}

// A reset creates the new run asynchronously, so poll the original run's
// extended info until reset_run_id is populated (or we give up).
async function waitForResetRunId(client: Client, workflowId: string, runId: string): Promise<string | undefined> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const desc = await client.workflow.getHandle(workflowId, runId).describe();
    const resetRunId = desc.raw.workflowExtendedInfo?.resetRunId;
    if (resetRunId) {
      return resetRunId;
    }
    await sleep(500);
  }
  return undefined;
}

// Poll the new run until it reaches a terminal state, then return its status.
async function waitForTerminalStatus(client: Client, workflowId: string, runId: string): Promise<string> {
  for (;;) {
    const desc = await client.workflow.getHandle(workflowId, runId).describe();
    if (desc.status.name !== 'RUNNING') {
      return desc.status.name;
    }
    await sleep(250);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
