"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyIncome = verifyIncome;
exports.runCreditCheck = runCreditCheck;
exports.orderAppraisal = orderAppraisal;
exports.performTitleSearch = performTitleSearch;
exports.underwrite = underwrite;
exports.closeLoan = closeLoan;
const activity_1 = require("@temporalio/activity");
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
async function underwrite(applicantName, annualIncome, loanAmount, downPayment) {
    const dti = ((loanAmount - downPayment) / annualIncome) * 100;
    if (dti > 400) {
        throw activity_1.ApplicationFailure.nonRetryable(`Underwriting denied for ${applicantName} — debt-to-income ratio ${dti.toFixed(0)}% exceeds 400% limit (loan: $${loanAmount}, income: $${annualIncome})`);
    }
    return `Underwriting approved for ${applicantName}: DTI ${dti.toFixed(0)}%`;
}
async function closeLoan(applicationId, applicantName, loanAmount) {
    return `Loan ${applicationId} closed for ${applicantName}: $${loanAmount} funded`;
}
//# sourceMappingURL=activities.js.map