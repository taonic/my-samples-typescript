// @@@SNIPSTART typescript-hello-workflow
import { proxyLocalActivities, sleep } from '@temporalio/workflow';
// Only import the activity types
import type * as activities from './activities';
import { WorkflowInterceptorsFactory, WorkflowClientInterceptor } from '@temporalio/workflow'

const { greet } = proxyLocalActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

export const interceptors: WorkflowInterceptorsFactory = () => ({
  outbound: [new MyWorkflowClientInterceptor()],
});

class MyWorkflowClientInterceptor implements WorkflowClientInterceptor {
  async start(
    input: WorkflowStartInput,
    next: Next<WorkflowClientInterceptor, 'start'>
  ): Promise<string> {
    const headers = {
      ...input.headers,
      myCorrelationId: defaultPayloadConverter.toPayload('abc123'),
    };
    return next({ ...input, headers });
  }
}

export async function example(name: string): Promise<string> {
  //await greet(name) // remove this line before the replay will cause "Fatal error in workflow machines: Missing associated machine for LocalActivity(1)"

  console.log("you have 10s to restart the worker to force a replay")
  await sleep(10_000)

  return await greet(name);
}
// @@@SNIPEND
