import { Client } from '@temporalio/client';
import { nanoid } from 'nanoid';
import { paymentWorkflow } from './workflows';
import { hmacHash } from './crypto';

interface PaymentRequest {
  email: string;
  name: string;
  amount: number;
}

const payments: PaymentRequest[] = [
  { email: 'alice@example.com', name: 'Alice Johnson', amount: 250 },
  { email: 'bob@example.com', name: 'Bob Smith', amount: 750 },
  { email: 'alice@example.com', name: 'Alice Johnson', amount: 1200 },
  { email: 'charlie@example.com', name: 'Charlie Lee', amount: 50 },
  { email: 'bob@example.com', name: 'Bob Smith', amount: 500 },
];

async function run() {
  const client = new Client();

  const handles = await Promise.all(
    payments.map(async ({ email, name, amount }) => {
      const paymentId = `PAY-${nanoid()}`;
      const hashedEmail = hmacHash(email);
      const hashedName = hmacHash(name);

      const handle = await client.workflow.start(paymentWorkflow, {
        taskQueue: 'search-attributes',
        workflowId: `payment-${nanoid()}`,
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
    })
  );

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
