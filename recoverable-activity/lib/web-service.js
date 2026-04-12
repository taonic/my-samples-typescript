"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@temporalio/client");
const workflows_1 = require("./workflows");
function queryWithTimeout(handle, query, ms = 3000) {
    return Promise.race([
        handle.query(query),
        new Promise((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
}
async function listWorkflows(client, query) {
    const workflows = [];
    const iterator = client.workflow.list({ query });
    for await (const wf of iterator) {
        const entry = {
            workflowId: wf.workflowId,
            runId: wf.runId,
            wfStatus: wf.status.name,
            loanStatus: wf.searchAttributes?.LoanStatus?.[0] ?? '',
            failedActivity: wf.searchAttributes?.FailedActivity?.[0] ?? '',
        };
        try {
            const handle = client.workflow.getHandle(wf.workflowId);
            if (wf.status.name === 'RUNNING') {
                entry.state = await queryWithTimeout(handle, workflows_1.getStateQuery);
            }
            else if (wf.status.name === 'COMPLETED') {
                entry.state = await handle.result();
            }
        }
        catch {
            // workflow may have just completed or result unavailable
        }
        workflows.push(entry);
    }
    return workflows;
}
async function run() {
    const connection = await client_1.Connection.connect({ address: 'localhost:7233' });
    const client = new client_1.Client({ connection });
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(express_1.default.static('public'));
    // List all loan workflows with their current state
    app.get('/api/workflows', async (_req, res) => {
        try {
            const workflows = await listWorkflows(client, `TaskQueue = 'recoverable-activity'`);
            res.json({ workflows });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Search workflows by failed activity using visibility query
    app.get('/api/workflows/search', async (req, res) => {
        try {
            const { failedActivity, status } = req.query;
            const clauses = [`TaskQueue = 'recoverable-activity'`];
            if (failedActivity) {
                clauses.push(`FailedActivity = '${failedActivity}'`);
            }
            if (status) {
                clauses.push(`LoanStatus = '${status}'`);
            }
            const workflows = await listWorkflows(client, clauses.join(' AND '));
            res.json({ workflows });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Get single workflow state
    app.get('/api/workflows/:workflowId', async (req, res) => {
        try {
            const handle = client.workflow.getHandle(req.params.workflowId);
            const state = await handle.query(workflows_1.getStateQuery);
            const desc = await handle.describe();
            res.json({
                workflowId: req.params.workflowId,
                wfStatus: desc.status.name,
                state,
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Send retry signal with data fix
    app.post('/api/workflows/:workflowId/fix', async (req, res) => {
        try {
            const { key, value } = req.body;
            const handle = client.workflow.getHandle(req.params.workflowId);
            await handle.signal(workflows_1.retrySignal, { key, value });
            res.json({ success: true, message: `Fix sent: ${key} = ${value}` });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    app.listen(3000, () => {
        console.log('Recoverable Activity UI running on http://localhost:3000');
    });
}
run().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=web-service.js.map