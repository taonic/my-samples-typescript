import {
  condition,
  defineSignal,
  log,
  patched,
  proxyActivities,
  setHandler,
  setWorkflowOptions,
} from '@temporalio/workflow';
import type * as activities from './activities';

const { someActivity, someIncompatibleActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 seconds',
});

export const doNextSignal = defineSignal<[string]>('do_next_signal');

setWorkflowOptions({ versioningBehavior: 'AUTO_UPGRADE' }, autoUpgradingWorkflowV1);
export async function autoUpgradingWorkflowV1(): Promise<void> {
  log.info('Changing workflow v1 started.');
  const signals: string[] = [];
  setHandler(doNextSignal, (signal: string) => {
    signals.push(signal);
  });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    await condition(() => signals.length > 0);
    const nextSignal = signals.shift();
    if (!nextSignal) {
      continue;
    }

    if (nextSignal === 'do-activity') {
      log.info('Changing workflow v1 running activity');
      await someActivity('v1');
    } else if (nextSignal === 'conclude') {
      log.info('Concluding workflow v1');
      return;
    }
  }
}

setWorkflowOptions({ versioningBehavior: 'AUTO_UPGRADE' }, autoUpgradingWorkflowV2);
export async function autoUpgradingWorkflowV2(): Promise<void> {
  log.info('Changing workflow v2 started.');
  const signals: string[] = [];
  setHandler(doNextSignal, (signal: string) => {
    signals.push(signal);
  });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    await condition(() => signals.length > 0);
    const nextSignal = signals.shift();
    if (!nextSignal) {
      continue;
    }

    if (nextSignal === 'do-activity') {
      log.info('Changing workflow v1b running activity');
      if (patched('DifferentActivity')) {
        await someIncompatibleActivity({ calledBy: 'v2', moreData: 'hello!' });
      } else {
        await someActivity('v2');
      }
    } else if (nextSignal === 'conclude') {
      log.info('Concluding workflow v2');
      return;
    }
  }
}
