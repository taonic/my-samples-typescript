export declare function verifyIncome(applicantName: string, employerName: string, annualIncome: number): Promise<string>;
export declare function runCreditCheck(applicantName: string, ssn: string): Promise<string>;
export declare function orderAppraisal(propertyAddress: string, loanAmount: number): Promise<string>;
export declare function performTitleSearch(propertyId: string, propertyAddress: string): Promise<string>;
export declare function underwrite(applicantName: string, annualIncome: number, loanAmount: number, downPayment: number): Promise<string>;
export declare function closeLoan(applicationId: string, applicantName: string, loanAmount: number): Promise<string>;
//# sourceMappingURL=activities.d.ts.map