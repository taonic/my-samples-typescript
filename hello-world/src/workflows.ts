// @@@SNIPSTART typescript-hello-workflow
import { proxyLocalActivities, sleep } from '@temporalio/workflow';
// Only import the activity types
import type * as activities from './activities';

const { greet } = proxyLocalActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

/** A workflow that simply calls an activity */
export async function example(name: string): Promise<string> {
  await greet(name)
  sleep(10)
  return await greet(name);
}
// @@@SNIPEND
