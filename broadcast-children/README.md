# Broadcast Children

This sample demonstrates child workflows with signal broadcasting and dynamic child creation:

- Parent workflow manages multiple child workflows
- Children send decisions to parent via signals
- Parent broadcasts decisions to all children
- Dynamic addition of new children via `startNewChild` signal

[`src/workflows.ts`](./src/workflows.ts)

## Signals

- `decisionSignal`: Send decision from external source to child
- `parentDecisionSignal`: Child sends decision to parent
- `broadcastSignal`: Parent broadcasts messages to all children
- `startNewChild`: Dynamically add new child to parent

## Queries

- `getChildren`: Get current children and their decisions



1. `temporal server start-dev` to start [Temporal Server](https://github.com/temporalio/cli/#installation).
2. `npm install` to install dependencies.
3. `npm run start.watch` to start the Worker.
4. In another shell, `npm run workflow` to run the Workflow.
5. Use `temporal workflow signal --workflow-id <workflow-id> --name startNewChild --input '"newChildName"'` to add new children dynamically.
6. Use `temporal workflow signal --workflow-id <parent-workflow-id>-<child-name> --name decisionSignal --input '"decision"'` to send decisions to children.
