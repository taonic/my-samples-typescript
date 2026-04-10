// For the purposes of this sample, we need all "versions" of the workflow to have the same workflow
// name, so we re-export them in these files to accomplish that.
export { autoUpgradingWorkflowV1 as AutoUpgrading, doNextSignal } from './workflows-base';
