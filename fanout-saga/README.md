# Fan Out Saga

This sample demonstrates orchestrating microservices using a Saga pattern with parallel execution (fan out).

## Use Case

The `openAccountFanout` Workflow opens a new bank account using parallel execution to improve performance. It coordinates between the Clients, Accounts, Banking, and PostOffice services. In this example, the service clients _are_ Activities being orchestrated.

The workflow uses a **fan out pattern** where multiple activities run in parallel:
- Adding address
- Adding client 
- Adding bank account

When any of the parallel Activities fails, the Workflow will "compensate" by calling rollback Activities for all successful operations. Compensation is executed in reverse order to ensure proper cleanup.

### Running this sample

1. Either use Temporal Cloud with environment variables specified [here](https://docs.temporal.io/security/#encryption-in-transit-with-mtls) or make sure Temporal Server is running locally (see the [quick install guide](https://docs.temporal.io/dev-guide/typescript/foundations#run-a-development-server)).
1. `npm install` to install dependencies.
1. `npm run start.watch` to start the Worker.
1. In another shell, `npm run workflow` to run the Workflow.
1. In the first shell, watch the Worker output for a few seconds:
