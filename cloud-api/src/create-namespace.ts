import { CloudOperationsClient, CloudOperationsConnection } from '@temporalio/cloud';

async function createNamespace() {
  const apiKey = process.env.TEMPORAL_CLOUD_API_KEY;
  const namespaceName = process.env.NAMESPACE_NAME || 'my-namespace';
  const region = process.env.REGION || 'us-west-2';

  if (!apiKey) {
    console.error('TEMPORAL_CLOUD_API_KEY environment variable required');
    process.exit(1);
  }

  const connection = await CloudOperationsConnection.connect({ apiKey });
  const client = new CloudOperationsClient({ connection, apiVersion: '2025-07-09-00' });

  await client.cloudService.createNamespace({
    spec: {
      name: namespaceName,
      regions: [region],
      retentionDays: 7
    }
  });

  console.log(`Namespace ${namespaceName} created successfully`);
}

createNamespace().catch(console.error);


import { condition } from '@temporalio/workflow';

// Without timeout
let approvalReceived = false;

await condition(() => approvalReceived);

// Or with a timeout (1 hour)
const ok = await condition(() => approvalReceived, '1 hour');
// ok will be true if condition became true, false if it timed out


import { ApplicationFailure } from '@temporalio/activity';

export async function bookFlight(requestID: string, name: string): Promise<void> {
  console.log(`failing to book flight for request '${requestID}' and name '${name}'`);

  throw ApplicationFailure.create({
    message: 'Flight booking did not work',
    type: 'FlightBookingError',
    nonRetryable: true,
  });
}


import { ApplicationFailure } from '@temporalio/activity';
import axios from 'axios';

export async function bookFlight(requestID: string, name: string): Promise<void> {
  try {
    const response = await axios.post('/book-flight', { requestID, name });
    // handle successful response...
  } catch (error: any) {
    if (error.response?.status >= 400 && error.response?.status < 500) {
      throw ApplicationFailure.create({
        message: `Flight booking failed due to client error: HTTP ${error.response.status} - ${error.response.data}`,
        type: 'FlightBookingClientError',
        nonRetryable: true,
      });
    }

    // All other errors (5xx, network issues, etc.) are re-thrown as-is
    // and will be automatically converted to retryable ApplicationFailures
    throw error;
  }
}
