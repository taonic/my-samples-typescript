// Shared constants used by the worker and the demo.
export const ADDRESS = 'localhost:7233';
export const NAMESPACE = 'default';
export const TASK_QUEUE = 'batch-reset';

// The Workflow Type name is the exported function name (see workflows.ts).
export const WORKFLOW_TYPE = 'orderWorkflow';

// How many order Workflows the demo launches.
export const NUM_ORDERS = 10;

// Visibility query that selects the failed order Workflows.
export const FAILED_ORDERS_QUERY = `WorkflowType = '${WORKFLOW_TYPE}' AND ExecutionStatus = 'Failed'`;
