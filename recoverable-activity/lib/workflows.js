"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStateQuery = exports.cancelSignal = exports.retrySignal = void 0;
exports.homeLoanWorkflow = homeLoanWorkflow;
const workflow_1 = require("@temporalio/workflow");
const common_1 = require("@temporalio/common");
const LoanStatusKey = (0, common_1.defineSearchAttributeKey)('LoanStatus', 'KEYWORD');
const FailedActivityKey = (0, common_1.defineSearchAttributeKey)('FailedActivity', 'KEYWORD');
const { verifyIncome, runCreditCheck, orderAppraisal, performTitleSearch, underwrite, closeLoan, withdrawCreditInquiry, cancelAppraisal, releaseTitleHold, releaseUnderwritingReservation, reverseLoanClosure, notifyApplicantCancelled, } = (0, workflow_1.proxyActivities)({
    startToCloseTimeout: '10 seconds',
});
exports.retrySignal = (0, workflow_1.defineSignal)('retry');
exports.cancelSignal = (0, workflow_1.defineSignal)('cancelApplication');
exports.getStateQuery = (0, workflow_1.defineQuery)('getState');
async function homeLoanWorkflow(application) {
    const app = { ...application };
    let status = 'STARTED';
    let failedActivity = '';
    let failureMessage = '';
    let retryRequested = false;
    let cancelRequested = false;
    let cancelReason = '';
    let notificationMessage = '';
    const completedActivities = [];
    const compensatedActivities = [];
    const fixHistory = [];
    const compensationHistory = [];
    // LIFO compensation stack — unshift on registration, iterate head-first to unwind
    const compensations = [];
    const updateStatus = (newStatus, activity = '', message = '') => {
        status = newStatus;
        failedActivity = activity;
        failureMessage = message;
        (0, workflow_1.upsertSearchAttributes)([
            { key: LoanStatusKey, value: newStatus },
            { key: FailedActivityKey, value: activity },
        ]);
    };
    (0, workflow_1.setHandler)(exports.getStateQuery, () => ({
        status,
        failedActivity,
        failureMessage,
        completedActivities: [...completedActivities],
        compensatedActivities: [...compensatedActivities],
        fixHistory: [...fixHistory],
        compensationHistory: [...compensationHistory],
        application: { ...app },
        cancelReason,
        notificationMessage,
    }));
    (0, workflow_1.setHandler)(exports.retrySignal, (update) => {
        if (update.key) {
            const key = update.key;
            const oldValue = String(app[key]);
            if (key === 'annualIncome' || key === 'loanAmount' || key === 'downPayment') {
                app[key] = parseFloat(update.value ?? '0');
            }
            else {
                app[key] = update.value ?? '';
            }
            fixHistory.push({
                activity: failedActivity,
                field: key,
                oldValue,
                newValue: update.value ?? '',
                error: failureMessage,
            });
            workflow_1.log.info(`Fix received ${key}: ${oldValue} -> ${update.value}`);
        }
        else {
            workflow_1.log.info('Retry requested without patch');
        }
        retryRequested = true;
    });
    (0, workflow_1.setHandler)(exports.cancelSignal, (req) => {
        if (status === 'COMPENSATING' || status === 'ROLLED_BACK' || status === 'ROLLBACK_PENDING_FIX') {
            workflow_1.log.warn('Cancel signal ignored — rollback already in progress');
            return;
        }
        if (status === 'CLOSED') {
            workflow_1.log.warn('Cancel signal ignored — loan already closed');
            return;
        }
        cancelRequested = true;
        cancelReason = req.reason || 'No reason provided';
        workflow_1.log.info(`Cancel requested: ${cancelReason}`);
        retryRequested = true;
    });
    // Recoverable wrapper shared by forward and compensation phases.
    // Forward: on failure, pause with PENDING_FIX and await retry signal (or cancel).
    // Compensation: on failure, pause with ROLLBACK_PENDING_FIX and await retry signal.
    const recoverableStep = async (displayName, fn, phase) => {
        const pendingStatus = phase === 'forward' ? 'PENDING_FIX' : 'ROLLBACK_PENDING_FIX';
        const resumeStatus = phase === 'forward' ? 'STARTED' : 'COMPENSATING';
        while (true) {
            try {
                return await fn();
            }
            catch (e) {
                const message = e.cause?.message || e.message || String(e);
                const type = e.cause?.type || e.type;
                // RollbackRequired in forward phase aborts the pipeline to run saga compensations
                if (phase === 'forward' && type === 'RollbackRequired') {
                    cancelRequested = true;
                    cancelReason = message;
                    throw e;
                }
                workflow_1.log.warn(`${phase} ${displayName} failed: ${message}`);
                updateStatus(pendingStatus, displayName, message);
                retryRequested = false;
                await (0, workflow_1.condition)(() => retryRequested);
                if (phase === 'forward' && cancelRequested) {
                    throw new Error(`Cancelled during ${displayName}: ${cancelReason}`);
                }
                updateStatus(resumeStatus, '', '');
                workflow_1.log.info(`Retrying ${phase} ${displayName}`);
            }
        }
    };
    // Run a forward step and register its compensation BEFORE execution (saga best practice).
    // Registering before handles partial side effects if the activity fails mid-flight.
    const runForward = async (activityName, forward, compensation) => {
        if (cancelRequested) {
            throw new Error(`Cancelled before ${activityName}: ${cancelReason}`);
        }
        if (compensation) {
            compensations.unshift({
                forwardActivity: activityName,
                compensationActivity: compensation.name,
                run: compensation.fn,
            });
        }
        return recoverableStep(activityName, forward, 'forward');
    };
    try {
        updateStatus('STARTED');
        await runForward('verifyIncome', () => verifyIncome(app.applicantName, app.employerName, app.annualIncome));
        completedActivities.push('verifyIncome');
        updateStatus('INCOME_VERIFIED');
        await runForward('runCreditCheck', () => runCreditCheck(app.applicantName, app.ssn), // Forward
        { name: 'withdrawCreditInquiry', fn: () => withdrawCreditInquiry(app.applicationId, app.ssn) } // Compensation
        );
        completedActivities.push('runCreditCheck');
        updateStatus('CREDIT_CHECKED');
        await runForward('orderAppraisal', () => orderAppraisal(app.propertyAddress, app.loanAmount), // Forward
        { name: 'cancelAppraisal', fn: () => cancelAppraisal(app.applicationId, app.propertyAddress) } // Compensation
        );
        completedActivities.push('orderAppraisal');
        updateStatus('APPRAISAL_ORDERED');
        await runForward('performTitleSearch', () => performTitleSearch(app.propertyId, app.propertyAddress), // Forward
        { name: 'releaseTitleHold', fn: () => releaseTitleHold(app.applicationId, app.propertyId) } // Compensation
        );
        completedActivities.push('performTitleSearch');
        updateStatus('TITLE_SEARCHED');
        await runForward('underwrite', () => underwrite(app.applicantName, app.ssn, app.annualIncome, app.loanAmount, app.downPayment), // Forward
        {
            name: 'releaseUnderwritingReservation',
            fn: () => releaseUnderwritingReservation(app.applicationId, app.loanAmount),
        } // Compensation
        );
        completedActivities.push('underwrite');
        updateStatus('UNDERWRITTEN');
        await runForward('closeLoan', () => closeLoan(app.applicationId, app.applicantName, app.loanAmount), // Forward
        { name: 'reverseLoanClosure', fn: () => reverseLoanClosure(app.applicationId, app.loanAmount) } // Compensation
        );
        completedActivities.push('closeLoan');
        updateStatus('CLOSED');
    }
    catch (err) {
        // Forward pipeline aborted — unwind the saga in LIFO order
        const trigger = cancelReason || err.message || String(err);
        workflow_1.log.warn(`Forward pipeline aborted: ${trigger} — running saga compensations`);
        updateStatus('COMPENSATING', '', trigger);
        for (const comp of compensations) {
            // Skip compensations whose forward activity never completed — idempotency
            // means calling them would also be safe, but skipping avoids noise in the history
            if (!completedActivities.includes(comp.forwardActivity)) {
                workflow_1.log.info(`Skipping ${comp.compensationActivity}: ${comp.forwardActivity} never completed`);
                continue;
            }
            const result = await recoverableStep(comp.forwardActivity, comp.run, 'compensation');
            compensationHistory.push({
                forwardActivity: comp.forwardActivity,
                compensationActivity: comp.compensationActivity,
                result,
            });
            compensatedActivities.push(comp.forwardActivity);
            updateStatus('COMPENSATING');
        }
        // After side effects are unwound, notify the applicant that the application was cancelled.
        // Run through the recoverable wrapper so a transient email outage pauses rather than crashes.
        notificationMessage = await recoverableStep('notifyApplicantCancelled', () => notifyApplicantCancelled(app.applicationId, app.applicantName, trigger), 'compensation');
        updateStatus('ROLLED_BACK', '', trigger);
    }
    return {
        status,
        failedActivity,
        failureMessage,
        completedActivities: [...completedActivities],
        compensatedActivities: [...compensatedActivities],
        fixHistory: [...fixHistory],
        compensationHistory: [...compensationHistory],
        application: { ...app },
        cancelReason,
        notificationMessage,
    };
}
//# sourceMappingURL=workflows.js.map