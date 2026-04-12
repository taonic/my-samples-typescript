export interface LoanApplication {
    applicationId: string;
    applicantName: string;
    ssn: string;
    employerName: string;
    annualIncome: number;
    propertyAddress: string;
    propertyId: string;
    loanAmount: number;
    downPayment: number;
}
export type LoanStatus = 'STARTED' | 'INCOME_VERIFIED' | 'CREDIT_CHECKED' | 'APPRAISAL_ORDERED' | 'TITLE_SEARCHED' | 'UNDERWRITTEN' | 'CLOSED' | 'PENDING_FIX' | 'FAILED';
export type ActivityName = 'verifyIncome' | 'runCreditCheck' | 'orderAppraisal' | 'performTitleSearch' | 'underwrite' | 'closeLoan';
export interface FixEntry {
    activity: string;
    field: string;
    oldValue: string;
    newValue: string;
    error: string;
}
export interface LoanState {
    status: LoanStatus;
    failedActivity: string;
    failureMessage: string;
    completedActivities: string[];
    fixHistory: FixEntry[];
    application: LoanApplication;
}
export interface RetryUpdate {
    key: keyof LoanApplication;
    value: string;
}
//# sourceMappingURL=models.d.ts.map