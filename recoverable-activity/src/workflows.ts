import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  condition,
  upsertSearchAttributes,
  log,
} from '@temporalio/workflow';
import { defineSearchAttributeKey } from '@temporalio/common';
import type * as activities from './activities';
import type { FixEntry, LoanApplication, LoanState, LoanStatus, RetryUpdate } from './models';

const LoanStatusKey = defineSearchAttributeKey('LoanStatus', 'KEYWORD');
const FailedActivityKey = defineSearchAttributeKey('FailedActivity', 'KEYWORD');

const {
  verifyIncome,
  runCreditCheck,
  orderAppraisal,
  performTitleSearch,
  underwrite,
  closeLoan,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 seconds',
});

export const retrySignal = defineSignal<[RetryUpdate]>('retry');
export const getStateQuery = defineQuery<LoanState>('getState');

export async function homeLoanWorkflow(application: LoanApplication): Promise<LoanState> {
  const app = { ...application };
  let status: LoanStatus = 'STARTED';
  let failedActivity = '';
  let failureMessage = '';
  let retryRequested = false;
  const completedActivities: string[] = [];
  const fixHistory: FixEntry[] = [];

  const updateStatus = (newStatus: LoanStatus, activity = '', message = '') => {
    status = newStatus;
    failedActivity = activity;
    failureMessage = message;
    upsertSearchAttributes([
      { key: LoanStatusKey, value: newStatus },
      { key: FailedActivityKey, value: activity },
    ]);
  };

  setHandler(getStateQuery, () => ({
    status,
    failedActivity,
    failureMessage,
    completedActivities: [...completedActivities],
    fixHistory: [...fixHistory],
    application: { ...app },
  }));

  setHandler(retrySignal, (update: RetryUpdate) => {
    const key = update.key;
    const oldValue = String((app as any)[key]);
    if (key === 'annualIncome' || key === 'loanAmount' || key === 'downPayment') {
      (app as any)[key] = parseFloat(update.value);
    } else {
      (app as any)[key] = update.value;
    }
    fixHistory.push({
      activity: failedActivity,
      field: key,
      oldValue,
      newValue: update.value,
      error: failureMessage,
    });
    log.info(`Received fix for ${key}: ${oldValue} -> ${update.value}`);
    retryRequested = true;
  });

  const recoverableStep = async <T>(
    activityName: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    while (true) {
      try {
        const result = await fn();
        return result;
      } catch (e: any) {
        const message = e.cause?.message || e.message || String(e);
        log.warn(`Activity ${activityName} failed: ${message}`);
        updateStatus('PENDING_FIX', activityName, message);
        retryRequested = false;
        await condition(() => retryRequested);
        updateStatus('STARTED', '', '');
        log.info(`Retrying activity ${activityName} after fix`);
      }
    }
  };

  updateStatus('STARTED');

  // Step 1: Verify income
  await recoverableStep('verifyIncome', () =>
    verifyIncome(app.applicantName, app.employerName, app.annualIncome)
  );
  completedActivities.push('verifyIncome');
  updateStatus('INCOME_VERIFIED');
  log.info('Income verified');

  // Step 2: Credit check
  await recoverableStep('runCreditCheck', () =>
    runCreditCheck(app.applicantName, app.ssn)
  );
  completedActivities.push('runCreditCheck');
  updateStatus('CREDIT_CHECKED');
  log.info('Credit check passed');

  // Step 3: Order appraisal
  await recoverableStep('orderAppraisal', () =>
    orderAppraisal(app.propertyAddress, app.loanAmount)
  );
  completedActivities.push('orderAppraisal');
  updateStatus('APPRAISAL_ORDERED');
  log.info('Appraisal completed');

  // Step 4: Title search
  await recoverableStep('performTitleSearch', () =>
    performTitleSearch(app.propertyId, app.propertyAddress)
  );
  completedActivities.push('performTitleSearch');
  updateStatus('TITLE_SEARCHED');
  log.info('Title search clear');

  // Step 5: Underwriting
  await recoverableStep('underwrite', () =>
    underwrite(app.applicantName, app.annualIncome, app.loanAmount, app.downPayment)
  );
  completedActivities.push('underwrite');
  updateStatus('UNDERWRITTEN');
  log.info('Underwriting approved');

  // Step 6: Close loan
  await recoverableStep('closeLoan', () =>
    closeLoan(app.applicationId, app.applicantName, app.loanAmount)
  );
  completedActivities.push('closeLoan');
  updateStatus('CLOSED');
  log.info('Loan closed');

  return {
    status,
    failedActivity,
    failureMessage,
    completedActivities: [...completedActivities],
    fixHistory: [...fixHistory],
    application: { ...app },
  };
}
