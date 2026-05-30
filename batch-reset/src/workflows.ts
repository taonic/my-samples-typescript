import { proxyActivities } from '@temporalio/workflow';
// Only import the activity types.
import type * as activities from './activities';

const { chargeCustomer } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 seconds',
  // The injected failure is non-retryable, so a single attempt is enough to
  // fail the Workflow fast for this demo.
  retry: { maximumAttempts: 1 },
});

export async function orderWorkflow(orderId: string): Promise<string> {
  const receipt = await chargeCustomer(orderId);
  return `order ${orderId} complete (${receipt})`;
}
