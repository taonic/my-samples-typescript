import {
  startChild,
  defineSignal,
  setHandler,
  condition,
  workflowInfo,
  defineQuery,
  getExternalWorkflowHandle
} from '@temporalio/workflow';

interface ChildDecision {
  name: string;
  decision: string;
}

export const broadcastSignal = defineSignal<[string]>('broadcast');
export const decisionSignal = defineSignal<[string]>('decision');
export const parentDecisionSignal = defineSignal<[ChildDecision]>('parentDecision');
export const startNewChild = defineSignal<[string]>('startNewChild');
export const getChildrenQuery = defineQuery<ChildDecision[]>('getChildren');
export const getBroadcastMessagesQuery = defineQuery<Array<{msg: string, timestamp: Date}>>('getBroadcastMessages');

export async function parentWorkflow(...names: string[]): Promise<string> {
  const children = await Promise.all(
    names.map(async (name) => ({
      name,
      decision: '',
      handle: await startChild(childWorkflow, { 
        args: [name],
        workflowId: `${workflowInfo().workflowId}-${name}`
      })
    }))
  );
  
  const decisions: ChildDecision[] = [];
  let lastLength = 0;
  
  setHandler(parentDecisionSignal, (decision: ChildDecision) => {
    decisions.push(decision);
  });
  
  setHandler(startNewChild, async (name: string) => {
    children.push({
      name,
      decision: '',
      handle: await startChild(childWorkflow, { 
        args: [name],
        workflowId: `${workflowInfo().workflowId}-${name}`
      })
    });
  });
  
  setHandler(getChildrenQuery, () =>
    children.map(({ name, decision }) => ({ name, decision }))
  );
  
  while (true) {
    await condition(() => decisions.length > lastLength);

    // Handle multiple decisions received at the same time
    for (let i = lastLength; i < decisions.length; i++) {
      const newDecision = decisions[i];

      // update child with the new decision
      const child = children.find(c => c.name === newDecision.name);
      if (child) {
        child.decision = newDecision.decision;
      }

      // Send signal to all children
      await Promise.all(
        children.map(child => child.handle.signal(broadcastSignal, `${newDecision.name} has made a decision: ${newDecision.decision}`))
      );
    }

    lastLength = decisions.length;
  }
}

export async function childWorkflow(name: string): Promise<{ decision: string }> {
  let newDecision = '';
  const broadcastMessages: Array<{msg: string, timestamp: Date}> = [];
  
  const parentHandle = getExternalWorkflowHandle(workflowInfo().parent!.workflowId);
  
  setHandler(broadcastSignal, (msg: string) => {
    broadcastMessages.push({ msg, timestamp: new Date() });
    console.log(`Child ${name} received: ${msg}`);
  });
  
  setHandler(getBroadcastMessagesQuery, () => broadcastMessages);
  
  setHandler(decisionSignal, (dec: string) => {
    newDecision = dec;
  });
  
  while (true) {
    await condition(() => newDecision !== '');
    if (newDecision !== '') {
      await parentHandle.signal(parentDecisionSignal, { name, decision: newDecision });
    }
    newDecision = ''
  }
}
