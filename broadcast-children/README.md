# Broadcast Children

This sample demonstrates child workflows with signal broadcasting and dynamic child creation using Temporal workflows. It includes both programmatic and web-based interfaces for interaction.

## Features

- **Parent-Child Workflow Pattern**: Parent workflow manages multiple child workflows
- **Signal Broadcasting**: Parent broadcasts decisions to all children when any child makes a decision
- **Dynamic Child Creation**: Add new children to running workflows via signals
- **Web Interface**: Interactive UI for managing workflows and making decisions
- **Real-time Updates**: Live polling of workflow state and broadcast messages

## Architecture

### Workflows
- **Parent Workflow** (`parentWorkflow`): Orchestrates multiple child workflows and handles broadcasting
- **Child Workflow** (`childWorkflow`): Individual decision-making units that communicate with parent

### Signals
- `decisionSignal`: External decision input to child workflows
- `parentDecisionSignal`: Child sends decision to parent
- `broadcastSignal`: Parent broadcasts messages to all children
- `startNewChild`: Dynamically add new child to parent workflow

### Queries
- `getChildren`: Get current children and their decisions
- `getBroadcastMessages`: Get broadcast message history for a child

## Setup

1. **Start Temporal Server**:
   ```bash
   temporal server start-dev
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Worker**:
   ```bash
   npm run start.watch
   ```

4. **Start the Web Service** (in another terminal):
   ```bash
   npm run web
   ```

5. **Access the Web Interface**:
   Open http://localhost:3000 in your browser

## Usage

### Web Interface

1. **Start a New Workflow**:
   - Enter a workflow ID
   - Provide initial child names (comma-separated)
   - Click "Start Workflow"

2. **Add Children Dynamically**:
   - Enter the parent workflow ID
   - Add new child name
   - Click "Add Child"

3. **Make Decisions**:
   - Click on child names to open decision pages
   - Each child can approve or reject
   - View real-time broadcast messages

### Programmatic Usage

1. **Start a Workflow**:
   ```bash
   npm run workflow
   ```

2. **Add New Children**:
   ```bash
   temporal workflow signal --workflow-id <workflow-id> --name startNewChild --input '"newChildName"'
   ```

3. **Send Decisions**:
   ```bash
   temporal workflow signal --workflow-id <parent-workflow-id>-<child-name> --name decisionSignal --input '"approve"'
   ```

## API Endpoints

- `POST /start-workflow`: Start a new parent workflow
- `POST /add-child`: Add a child to existing workflow
- `POST /decision`: Send decision from child to parent
- `GET /children/:parentWorkflowId`: Get all children and their decisions
- `GET /query`: Query workflow state

## Files

- [`src/workflows.ts`](./src/workflows.ts) - Workflow definitions
- [`src/web-service.ts`](./src/web-service.ts) - Express web server
- [`public/index.html`](./public/index.html) - Main control interface
- [`public/child.html`](./public/child.html) - Individual child decision interface
