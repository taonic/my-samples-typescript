"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStateQuery = exports.retrySignal = void 0;
exports.homeLoanWorkflow = homeLoanWorkflow;
const workflow_1 = require("@temporalio/workflow");
const { verifyIncome, runCreditCheck, orderAppraisal, performTitleSearch, underwrite, closeLoan, } = (0, workflow_1.proxyActivities)({
    startToCloseTimeout: '10 seconds',
    retry: { maximumAttempts: 1 },
});
exports.retrySignal = (0, workflow_1.defineSignal)('retry');
exports.getStateQuery = (0, workflow_1.defineQuery)('getState');
async function homeLoanWorkflow(application) {
    const app = { ...application };
    let status = 'STARTED';
    let failedActivity = '';
    let failureMessage = '';
    let retryRequested = false;
    const completedActivities = [];
    const fixHistory = [];
    const updateStatus = (newStatus, activity = '', message = '') => {
        status = newStatus;
        failedActivity = activity;
        failureMessage = message;
        (0, workflow_1.upsertSearchAttributes)({
            LoanStatus: [newStatus],
            FailedActivity: [activity],
        });
    };
    (0, workflow_1.setHandler)(exports.getStateQuery, () => ({
        status,
        failedActivity,
        failureMessage,
        completedActivities: [...completedActivities],
        fixHistory: [...fixHistory],
        application: { ...app },
    }));
    (0, workflow_1.setHandler)(exports.retrySignal, (update) => {
        const key = update.key;
        const oldValue = String(app[key]);
        if (key === 'annualIncome' || key === 'loanAmount' || key === 'downPayment') {
            app[key] = parseFloat(update.value);
        }
        else {
            app[key] = update.value;
        }
        fixHistory.push({
            activity: failedActivity,
            field: key,
            oldValue,
            newValue: update.value,
            error: failureMessage,
        });
        workflow_1.log.info(`Received fix for ${key}: ${oldValue} -> ${update.value}`);
        retryRequested = true;
    });
    const retryActivity = async (activityName, fn) => {
        while (true) {
            try {
                const result = await fn();
                return result;
            }
            catch (e) {
                const message = e.cause?.message || e.message || String(e);
                workflow_1.log.warn(`Activity ${activityName} failed: ${message}`);
                updateStatus('PENDING_FIX', activityName, message);
                retryRequested = false;
                await (0, workflow_1.condition)(() => retryRequested);
                updateStatus('STARTED', '', '');
                workflow_1.log.info(`Retrying activity ${activityName} after fix`);
            }
        }
    };
    updateStatus('STARTED');
    // Step 1: Verify income
    await retryActivity('verifyIncome', () => verifyIncome(app.applicantName, app.employerName, app.annualIncome));
    completedActivities.push('verifyIncome');
    updateStatus('INCOME_VERIFIED');
    workflow_1.log.info('Income verified');
    // Step 2: Credit check
    await retryActivity('runCreditCheck', () => runCreditCheck(app.applicantName, app.ssn));
    completedActivities.push('runCreditCheck');
    updateStatus('CREDIT_CHECKED');
    workflow_1.log.info('Credit check passed');
    // Step 3: Order appraisal
    await retryActivity('orderAppraisal', () => orderAppraisal(app.propertyAddress, app.loanAmount));
    completedActivities.push('orderAppraisal');
    updateStatus('APPRAISAL_ORDERED');
    workflow_1.log.info('Appraisal completed');
    // Step 4: Title search
    await retryActivity('performTitleSearch', () => performTitleSearch(app.propertyId, app.propertyAddress));
    completedActivities.push('performTitleSearch');
    updateStatus('TITLE_SEARCHED');
    workflow_1.log.info('Title search clear');
    // Step 5: Underwriting
    await retryActivity('underwrite', () => underwrite(app.applicantName, app.annualIncome, app.loanAmount, app.downPayment));
    completedActivities.push('underwrite');
    updateStatus('UNDERWRITTEN');
    workflow_1.log.info('Underwriting approved');
    // Step 6: Close loan
    await retryActivity('closeLoan', () => closeLoan(app.applicationId, app.applicantName, app.loanAmount));
    completedActivities.push('closeLoan');
    updateStatus('CLOSED');
    workflow_1.log.info('Loan closed');
    return {
        status,
        failedActivity,
        failureMessage,
        completedActivities: [...completedActivities],
        fixHistory: [...fixHistory],
        application: { ...app },
    };
}
//# sourceMappingURL=workflows.js.map