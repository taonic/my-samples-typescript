import { proxyActivities, ActivityFailure, ApplicationFailure, log } from '@temporalio/workflow';
import { createActivities } from './activities';
import * as Workflows from './types/workflow-commands';

import OpenAccount = Workflows.OpenAccount;

const defaultActivity = {
  startToCloseTimeout: '2s',
};

const { addBankAccount, createAccount, addClient, addAddress } =
  proxyActivities<ReturnType<typeof createActivities>>(defaultActivity);

const rollbackActivity = {
  ...defaultActivity,
  summary: "rollback",
};

const { clearAddresses: clearAddressesRollback, removeClient, disconnectBankAccounts } =
  proxyActivities<ReturnType<typeof createActivities>>(rollbackActivity);

interface Compensation {
  message: string;
  fn: () => Promise<void>;
}

// workflow implementations
// parallel executions with fanout
export async function openAccountFanout(params: OpenAccount): Promise<void> {
  const compensations: (() => Promise<void>)[] = [];
  
  try {
    await createAccount({ accountId: params.accountId });
    // Fanout: start activities in parallel
    await Promise.all([
      (async () => {
        await addAddress({ accountId: params.accountId, address: params.address });
        compensations.push(() => clearAddressesRollback({ accountId: params.accountId }));
      })(),
      (async () => {
        await addClient({ accountId: params.accountId, clientEmail: params.clientEmail });
        compensations.push(() => removeClient({ accountId: params.accountId }));
      })(),
      (async () => {
        await addBankAccount({ accountId: params.accountId, details: params.bankDetails, shouldThrow: prettyErrorMessage('add bank account failed') });
        compensations.push(() => disconnectBankAccounts({ accountId: params.accountId }));
      })()
    ]);
  } catch (err) {
    if (err instanceof ActivityFailure && err.cause instanceof ApplicationFailure) {
      log.error(err.cause.message);
    } else {
      log.error(`error while opening account: ${err}`);
    }
    
    // Rollback: execute compensations in reverse order
    for (const compensate of compensations.reverse()) {
      try {
        await compensate();
      } catch (compErr) {
        log.error(`failed to compensate: ${prettyErrorMessage('', compErr)}`, { compErr });
      }
    }
    throw err;
  }
}

async function compensate(compensations: Compensation[] = []) {
  if (compensations.length > 0) {
    log.info('failures encountered during account opening - compensating');
    for (const comp of compensations) {
      try {
        log.error(comp.message);
        await comp.fn();
      } catch (err) {
        log.error(`failed to compensate: ${prettyErrorMessage('', err)}`, { err });
        // swallow errors
      }
    }
  }
}

function prettyErrorMessage(message: string, err?: any) {
  let errMessage = err && err.message ? err.message : '';
  if (err && err instanceof ActivityFailure) {
    errMessage = `${err.cause?.message}`;
  }
  return `${message}: ${errMessage}`;
}
