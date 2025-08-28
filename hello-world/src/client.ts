// @@@SNIPSTART typescript-hello-client
import { Connection, Client } from '@temporalio/client';
import { example } from './workflows';
import { nanoid } from 'nanoid';

async function run() {
  // Connect to the default Server location
  const connection = await Connection.connect({
    address: 'localhost:7233',
    channelArgs: {
      "grpc.keepalive_time_ms": 4000,
      "grpc.keepalive_timeout_ms": 4000,
    }
  });

  const client = new Client({
    connection,
  });

  const handle = await client.workflow.start(example, {
    taskQueue: 'hello-world',
    args: ['Temporal'],
    workflowId: 'workflow-' + nanoid(),
  });
  console.log(`Started workflow ${handle.workflowId}`);

  // optional: wait for client result
  console.log(await handle.result()); // Hello, Temporal!
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
// @@@SNIPEND
