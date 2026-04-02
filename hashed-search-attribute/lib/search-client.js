"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@temporalio/client");
const crypto_1 = require("./crypto");
function printUsage() {
    console.log('Usage:');
    console.log('  npx ts-node src/search-client.ts --email <email>');
    console.log('  npx ts-node src/search-client.ts --name <name>');
    console.log('  npx ts-node src/search-client.ts --payment-id <id>');
    console.log('  npx ts-node src/search-client.ts --status <PENDING|VALIDATING|FRAUD_CHECK|EXECUTING|COMPLETED>');
    console.log('  npx ts-node src/search-client.ts --min-amount <dollars>');
    console.log('  npx ts-node src/search-client.ts --query <raw visibility query>');
    console.log();
    console.log('Examples (complex queries):');
    console.log('  npx ts-node src/search-client.ts --query \'PaymentAmount >= 500 AND PaymentStatus = "COMPLETED"\'');
    console.log('  npx ts-node src/search-client.ts --query \'HashedEmail = "<hash>" AND PaymentAmount >= 1000\'');
    process.exit(1);
}
function parseArgs() {
    const args = process.argv.slice(2);
    if (args.length < 2)
        printUsage();
    const flag = args[0];
    const value = args.slice(1).join(' ');
    if (!['--email', '--name', '--payment-id', '--status', '--min-amount', '--query'].includes(flag)) {
        console.error(`Unknown flag: ${flag}\n`);
        printUsage();
    }
    return { flag, value };
}
function buildQuery(flag, value) {
    switch (flag) {
        case '--email': {
            const hashed = (0, crypto_1.hmacHash)(value);
            console.log(`Searching by email: ${value}`);
            console.log(`  HMAC hash: ${hashed}\n`);
            return `HashedEmail = "${hashed}"`;
        }
        case '--name': {
            const hashed = (0, crypto_1.hmacHash)(value);
            console.log(`Searching by name: ${value}`);
            console.log(`  HMAC hash: ${hashed}\n`);
            return `HashedName = "${hashed}"`;
        }
        case '--payment-id':
            console.log(`Searching by payment ID: ${value}\n`);
            return `PaymentId = "${value}"`;
        case '--status':
            console.log(`Searching by payment status: ${value}\n`);
            return `PaymentStatus = "${value}"`;
        case '--min-amount':
            console.log(`Searching for payments >= $${value}\n`);
            return `PaymentAmount >= ${value}`;
        case '--query':
            console.log(`Running query: ${value}\n`);
            return value;
        default:
            printUsage();
            return '';
    }
}
async function run() {
    const { flag, value } = parseArgs();
    const client = new client_1.Client();
    const query = buildQuery(flag, value);
    const results = client.workflow.list({ query });
    let count = 0;
    for await (const workflow of results) {
        const memo = workflow.memo;
        console.log(`  Workflow ID: ${workflow.workflowId}`);
        console.log(`    Status:     ${workflow.status.name}`);
        if (memo?.email) {
            console.log(`    Email:      ${memo.email}`);
            console.log(`    Name:       ${memo.name}`);
            console.log(`    Payment ID: ${memo.paymentId}`);
            console.log(`    Amount:     $${memo.amount}`);
        }
        console.log();
        count++;
    }
    if (count === 0) {
        console.log('  No workflows found.');
    }
    else {
        console.log(`${count} workflow(s) found.`);
    }
}
run().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=search-client.js.map