import type { CancelRequest, LoanApplication, LoanState, RetryUpdate } from './models';
export declare const retrySignal: import("@temporalio/workflow").SignalDefinition<[RetryUpdate], string>;
export declare const cancelSignal: import("@temporalio/workflow").SignalDefinition<[CancelRequest], string>;
export declare const getStateQuery: import("@temporalio/workflow").QueryDefinition<LoanState, [], string>;
export declare function homeLoanWorkflow(application: LoanApplication): Promise<LoanState>;
//# sourceMappingURL=workflows.d.ts.map