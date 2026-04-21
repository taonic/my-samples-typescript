"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyIncome = verifyIncome;
exports.runCreditCheck = runCreditCheck;
exports.orderAppraisal = orderAppraisal;
exports.performTitleSearch = performTitleSearch;
exports.underwrite = underwrite;
exports.closeLoan = closeLoan;
exports.withdrawCreditInquiry = withdrawCreditInquiry;
exports.cancelAppraisal = cancelAppraisal;
exports.releaseTitleHold = releaseTitleHold;
exports.releaseUnderwritingReservation = releaseUnderwritingReservation;
exports.reverseLoanClosure = reverseLoanClosure;
exports.notifyApplicantCancelled = notifyApplicantCancelled;
const activity_1 = require("@temporalio/activity");
// ---------- Forward activities ----------
async function verifyIncome(applicantName, employerName, annualIncome) {
    if (employerName === 'UNKNOWN_EMPLOYER') {
        throw activity_1.ApplicationFailure.nonRetryable(`Employer "${employerName}" not found in verification database for ${applicantName}`);
    }
    if (annualIncome <= 0) {
        throw activity_1.ApplicationFailure.nonRetryable(`Invalid annual income: $${annualIncome} for ${applicantName}`);
    }
    return `Income verified: ${applicantName} earns $${annualIncome}/yr at ${employerName}`;
}
async function runCreditCheck(applicantName, ssn) {
    if (ssn === '000-00-0000' || ssn.length < 11) {
        throw activity_1.ApplicationFailure.nonRetryable(`Invalid SSN "${ssn}" for ${applicantName} — cannot pull credit report`);
    }
    return `Credit check passed for ${applicantName}: score 750`;
}
async function orderAppraisal(propertyAddress, loanAmount) {
    if (propertyAddress === '' || propertyAddress === 'INVALID_ADDRESS') {
        throw activity_1.ApplicationFailure.nonRetryable(`Cannot order appraisal — invalid property address: "${propertyAddress}"`);
    }
    return `Appraisal completed for ${propertyAddress}: valued at $${loanAmount * 1.1}`;
}
async function performTitleSearch(propertyId, propertyAddress) {
    if (propertyId === '' || propertyId === 'MISSING') {
        throw activity_1.ApplicationFailure.nonRetryable(`Title search failed — missing or invalid property ID: "${propertyId}" for ${propertyAddress}`);
    }
    return `Title is clear for property ${propertyId} at ${propertyAddress}`;
}
async function underwrite(applicantName, ssn, annualIncome, loanAmount, downPayment) {
    // Compliance block — SSNs starting with 999 simulate OFAC / sanctions hit.
    // Non-retryable with type 'RollbackRequired' tells the workflow to unwind the saga
    // instead of pausing for a human fix. There is no data correction that resolves this.
    if (ssn.startsWith('999')) {
        throw activity_1.ApplicationFailure.nonRetryable(`Compliance block for ${applicantName}: OFAC/sanctions match on SSN ending ${ssn.slice(-4)}. Application must be withdrawn.`, 'RollbackRequired');
    }
    const dti = ((loanAmount - downPayment) / annualIncome) * 100;
    if (dti > 400) {
        throw activity_1.ApplicationFailure.nonRetryable(`Underwriting denied for ${applicantName} — debt-to-income ratio ${dti.toFixed(0)}% exceeds 400% limit (loan: $${loanAmount}, income: $${annualIncome})`);
    }
    return `Underwriting approved for ${applicantName}: DTI ${dti.toFixed(0)}%`;
}
async function closeLoan(applicationId, applicantName, loanAmount) {
    return `Loan ${applicationId} closed for ${applicantName}: $${loanAmount} funded`;
}
// ---------- Compensation activities ----------
// Each compensation must be idempotent — the saga pattern registers them *before*
// the forward activity runs, so they may be invoked even when the forward side effect
// never fully landed. Running one twice must not corrupt state.
async function withdrawCreditInquiry(applicationId, ssn) {
    // Bureau APIs accept withdrawal requests multiple times — repeat calls are no-ops.
    return `Credit inquiry withdrawal filed for ${applicationId} (SSN ...${ssn.slice(-4)})`;
}
async function cancelAppraisal(applicationId, propertyAddress) {
    // Simulated external vendor outage. The operator can patch `propertyAddress`
    // (removing the APPRAISER_OFFLINE marker) via a retry signal to unblock.
    if (propertyAddress.includes('APPRAISER_OFFLINE')) {
        throw activity_1.ApplicationFailure.nonRetryable(`Appraiser vendor unreachable for ${applicationId} at "${propertyAddress}" — retry once vendor is back or supply a new contact address`);
    }
    return `Appraisal cancelled for ${applicationId}: $50 cancellation fee retained, $450 refund issued`;
}
async function releaseTitleHold(applicationId, propertyId) {
    if (propertyId === 'LOCKED_TITLE') {
        throw activity_1.ApplicationFailure.nonRetryable(`Title company rejected release for property ${propertyId} — supply a valid property ID to release the hold`);
    }
    return `Title hold released for ${applicationId} on property ${propertyId}`;
}
async function releaseUnderwritingReservation(applicationId, loanAmount) {
    return `Released $${loanAmount} underwriting capacity for ${applicationId}`;
}
async function reverseLoanClosure(applicationId, loanAmount) {
    return `Clawback initiated for ${applicationId}: $${loanAmount} funds recalled, lien release recorded`;
}
// Post-rollback notification — tells the applicant their application was cancelled.
// Runs through the recoverable wrapper so a transient email outage can be retried.
async function notifyApplicantCancelled(applicationId, applicantName, reason) {
    return `Cancellation notice sent to ${applicantName} for ${applicationId}: "${reason}"`;
}
//# sourceMappingURL=activities.js.map