"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentWorkflow = paymentWorkflow;
const workflow_1 = require("@temporalio/workflow");
const { validatePayment, fraudCheck, executePayment } = (0, workflow_1.proxyActivities)({
    startToCloseTimeout: '1 minute',
});
async function paymentWorkflow(email, name, paymentId, amount) {
    (0, workflow_1.upsertSearchAttributes)({ PaymentStatus: ['VALIDATING'] });
    await validatePayment(email, name, paymentId, amount);
    (0, workflow_1.upsertSearchAttributes)({ PaymentStatus: ['FRAUD_CHECK'] });
    await fraudCheck(email, paymentId, amount);
    (0, workflow_1.upsertSearchAttributes)({ PaymentStatus: ['EXECUTING'] });
    const result = await executePayment(paymentId, amount);
    (0, workflow_1.upsertSearchAttributes)({ PaymentStatus: ['COMPLETED'] });
    return result;
}
//# sourceMappingURL=workflows.js.map