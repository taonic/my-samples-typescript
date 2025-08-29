import express from 'express';
import { Client } from '@temporalio/client';

const app = express();
app.use(express.json());
app.use(express.static('public'));

const client = new Client();

app.post('/decision', async (req, res) => {
  const { parentWorkflowId, childName, decision } = req.body;
  
  try {
    const childWorkflowId = `${parentWorkflowId}-${childName}`;
    const handle = client.workflow.getHandle(childWorkflowId);
    await handle.signal('decision', decision);
    
    res.json({ success: true, message: `Decision sent to ${childName}` });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/add-child', async (req, res) => {
  const { parentWorkflowId, childName } = req.body;
  
  try {
    const handle = client.workflow.getHandle(parentWorkflowId);
    await handle.signal('startNewChild', childName);
    
    res.json({ success: true, message: `Child ${childName} added` });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/children/:parentWorkflowId', async (req, res) => {
  const { parentWorkflowId } = req.params;
  
  try {
    const handle = client.workflow.getHandle(parentWorkflowId);
    const children = await handle.query('getChildren');
    
    res.json({ success: true, children });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/query', async (req, res) => {
  const { workflowId, queryType } = req.query;
  
  try {
    const handle = client.workflow.getHandle(workflowId as string);
    const result = await handle.query(queryType as string);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/start-workflow', async (req, res) => {
  const { workflowId, childNames } = req.body;
  
  try {
    const handle = await client.workflow.start('parentWorkflow', {
      args: childNames,
      taskQueue: 'broadcast-children',
      workflowId
    });
    
    res.json({ success: true, workflowId: handle.workflowId });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.listen(3000, () => {
  console.log('Web service running on port 3000');
});



