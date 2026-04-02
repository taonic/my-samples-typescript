"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@temporalio/client");
const nanoid_1 = require("nanoid");
const workflows_1 = require("./workflows");
const crypto_1 = require("./crypto");
const payments = [
    { email: 'alice@example.com', name: 'Alice Johnson', amount: 250 },
    { email: 'bob@example.com', name: 'Bob Smith', amount: 750 },
    { email: 'alice@example.com', name: 'Alice Johnson', amount: 1200 },
    { email: 'charlie@example.com', name: 'Charlie Lee', amount: 50 },
    { email: 'bob@example.com', name: 'Bob Smith', amount: 500 },
];
async function run() {
    const client = new client_1.Client();
    const handles = await Promise.all(payments.map(async ({ email, name, amount }) => {
        const paymentId = `PAY-${(0, nanoid_1.nanoid)()}`;
        const hashedEmail = (0, crypto_1.hmacHash)(email);
        const hashedName = (0, crypto_1.hmacHash)(name);
        const handle = await client.workflow.start(workflows_1.paymentWorkflow, {
            taskQueue: 'search-attributes',
            workflowId: `payment-${(0, nanoid_1.nanoid)()}`,
            args: [email, name, paymentId, amount],
            searchAttributes: {
                HashedEmail: [hashedEmail],
                HashedName: [hashedName],
                PaymentId: [paymentId],
                PaymentStatus: ['PENDING'],
                PaymentAmount: [amount],
            },
            memo: { email, name, paymentId, amount },
        });
        console.log(`Started ${handle.workflowId} — ${name}, $${amount}`);
        return handle;
    }));
    console.log(`\nWaiting for ${handles.length} workflows to complete...\n`);
    for (const handle of handles) {
        const result = await handle.result();
        console.log(`  ${handle.workflowId}: ${result}`);
    }
}
run().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=client.js.map