import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './activities';
import { ADDRESS, NAMESPACE, TASK_QUEUE } from './shared';

async function run() {
  const connection = await NativeConnection.connect({ address: ADDRESS });
  try {
    const worker = await Worker.create({
      connection,
      namespace: NAMESPACE,
      taskQueue: TASK_QUEUE,
      workflowsPath: require.resolve('./workflows'),
      activities,
    });

    const rate = process.env.FAILURE_RATE ? Number(process.env.FAILURE_RATE) : 0.5;
    console.log(`Worker started — chargeCustomer fails ~${Math.round(rate * 100)}% of the time.`);

    await worker.run();
  } finally {
    await connection.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
