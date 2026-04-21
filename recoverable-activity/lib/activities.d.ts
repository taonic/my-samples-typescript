export declare function verifyIncome(applicantName: string, employerName: string, annualIncome: number): Promise<string>;
export declare function runCreditCheck(applicantName: string, ssn: string): Promise<string>;
export declare function orderAppraisal(propertyAddress: string, loanAmount: number): Promise<string>;
export declare function performTitleSearch(propertyId: string, propertyAddress: string): Promise<string>;
export declare function underwrite(applicantName: string, ssn: string, annualIncome: number, loanAmount: number, downPayment: number): Promise<string>;
export declare function closeLoan(applicationId: string, applicantName: string, loanAmount: number): Promise<string>;
export declare function withdrawCreditInquiry(applicationId: string, ssn: string): Promise<string>;
export declare function cancelAppraisal(applicationId: string, propertyAddress: string): Promise<string>;
export declare function releaseTitleHold(applicationId: string, propertyId: string): Promise<string>;
export declare function releaseUnderwritingReservation(applicationId: string, loanAmount: number): Promise<string>;
export declare function reverseLoanClosure(applicationId: string, loanAmount: number): Promise<string>;
export declare function notifyApplicantCancelled(applicationId: string, applicantName: string, reason: string): Promise<string>;
//# sourceMappingURL=activities.d.ts.map