import { ApplicationFailure } from '@temporalio/activity';

export async function verifyIncome(
  applicantName: string,
  employerName: string,
  annualIncome: number
): Promise<string> {
  if (employerName === 'UNKNOWN_EMPLOYER') {
    throw ApplicationFailure.nonRetryable(
      `Employer "${employerName}" not found in verification database for ${applicantName}`
    );
  }
  if (annualIncome <= 0) {
    throw ApplicationFailure.nonRetryable(
      `Invalid annual income: $${annualIncome} for ${applicantName}`
    );
  }
  return `Income verified: ${applicantName} earns $${annualIncome}/yr at ${employerName}`;
}

export async function runCreditCheck(
  applicantName: string,
  ssn: string
): Promise<string> {
  if (ssn === '000-00-0000' || ssn.length < 11) {
    throw ApplicationFailure.nonRetryable(
      `Invalid SSN "${ssn}" for ${applicantName} — cannot pull credit report`
    );
  }
  return `Credit check passed for ${applicantName}: score 750`;
}

export async function orderAppraisal(
  propertyAddress: string,
  loanAmount: number
): Promise<string> {
  if (propertyAddress === '' || propertyAddress === 'INVALID_ADDRESS') {
    throw ApplicationFailure.nonRetryable(
      `Cannot order appraisal — invalid property address: "${propertyAddress}"`
    );
  }
  return `Appraisal completed for ${propertyAddress}: valued at $${loanAmount * 1.1}`;
}

export async function performTitleSearch(
  propertyId: string,
  propertyAddress: string
): Promise<string> {
  if (propertyId === '' || propertyId === 'MISSING') {
    throw ApplicationFailure.nonRetryable(
      `Title search failed — missing or invalid property ID: "${propertyId}" for ${propertyAddress}`
    );
  }
  return `Title is clear for property ${propertyId} at ${propertyAddress}`;
}

export async function underwrite(
  applicantName: string,
  annualIncome: number,
  loanAmount: number,
  downPayment: number
): Promise<string> {
  const dti = ((loanAmount - downPayment) / annualIncome) * 100;
  if (dti > 400) {
    throw ApplicationFailure.nonRetryable(
      `Underwriting denied for ${applicantName} — debt-to-income ratio ${dti.toFixed(0)}% exceeds 400% limit (loan: $${loanAmount}, income: $${annualIncome})`
    );
  }
  return `Underwriting approved for ${applicantName}: DTI ${dti.toFixed(0)}%`;
}

export async function closeLoan(
  applicationId: string,
  applicantName: string,
  loanAmount: number
): Promise<string> {
  return `Loan ${applicationId} closed for ${applicantName}: $${loanAmount} funded`;
}
