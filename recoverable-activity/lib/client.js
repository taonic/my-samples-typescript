"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@temporalio/client");
const workflows_1 = require("./workflows");
const scenarios = [
    {
        name: 'Clean — all activities pass',
        application: {
            applicationId: 'LOAN-001',
            applicantName: 'Alice Johnson',
            ssn: '123-45-6789',
            employerName: 'Acme Corp',
            annualIncome: 120000,
            propertyAddress: '123 Oak St, Springfield',
            propertyId: 'PROP-001',
            loanAmount: 350000,
            downPayment: 70000,
        },
    },
    {
        name: 'Bad SSN — credit check fails',
        application: {
            applicationId: 'LOAN-002',
            applicantName: 'Bob Smith',
            ssn: '000-00-0000',
            employerName: 'TechCo',
            annualIncome: 95000,
            propertyAddress: '456 Elm Ave, Shelbyville',
            propertyId: 'PROP-002',
            loanAmount: 280000,
            downPayment: 56000,
        },
    },
    {
        name: 'Invalid address — appraisal fails',
        application: {
            applicationId: 'LOAN-003',
            applicantName: 'Carol Davis',
            ssn: '987-65-4321',
            employerName: 'HealthPlus',
            annualIncome: 105000,
            propertyAddress: 'INVALID_ADDRESS',
            propertyId: 'PROP-003',
            loanAmount: 320000,
            downPayment: 64000,
        },
    },
    {
        name: 'Missing property ID — title search fails',
        application: {
            applicationId: 'LOAN-004',
            applicantName: 'Dan Miller',
            ssn: '555-12-3456',
            employerName: 'EduStar',
            annualIncome: 88000,
            propertyAddress: '789 Pine Rd, Capital City',
            propertyId: 'MISSING',
            loanAmount: 250000,
            downPayment: 50000,
        },
    },
    {
        name: 'High DTI — underwriting fails',
        application: {
            applicationId: 'LOAN-005',
            applicantName: 'Eve Wilson',
            ssn: '111-22-3333',
            employerName: 'StartupXYZ',
            annualIncome: 45000,
            propertyAddress: '321 Birch Ln, Ogdenville',
            propertyId: 'PROP-005',
            loanAmount: 500000,
            downPayment: 10000,
        },
    },
    {
        name: 'Unknown employer — income verification fails',
        application: {
            applicationId: 'LOAN-006',
            applicantName: 'Frank Brown',
            ssn: '444-55-6666',
            employerName: 'UNKNOWN_EMPLOYER',
            annualIncome: 75000,
            propertyAddress: '654 Maple Dr, North Haverbrook',
            propertyId: 'PROP-006',
            loanAmount: 220000,
            downPayment: 44000,
        },
    },
];
async function run() {
    const connection = await client_1.Connection.connect({ address: 'localhost:7233' });
    const client = new client_1.Client({ connection });
    const batch = Math.floor(Date.now() / 1000).toString(36).slice(-6); // 6-char alphanumeric
    console.log(`Starting ${scenarios.length} loan workflows (batch ${batch})...\n`);
    for (const scenario of scenarios) {
        const workflowId = `${scenario.application.applicationId}-${batch}`;
        const application = { ...scenario.application, applicationId: workflowId };
        const handle = await client.workflow.start(workflows_1.homeLoanWorkflow, {
            taskQueue: 'recoverable-activity',
            workflowId,
            args: [application],
            searchAttributes: {
                LoanStatus: ['STARTED'],
                FailedActivity: [''],
            },
        });
        console.log(`Started: ${handle.workflowId} — ${scenario.name}`);
    }
    console.log('\nAll workflows started. Use the UI (npm run web) to monitor and fix failures.');
}
run().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=client.js.map