import { proxyActivities, upsertSearchAttributes } from '@temporalio/workflow';
import type * as activities from './activities';

const { validatePayment, fraudCheck, executePayment } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

export async function paymentWorkflow(email: string, name: string, paymentId: string, amount: number): Promise<string> {
  upsertSearchAttributes({ PaymentStatus: ['VALIDATING'] });
  await validatePayment(email, name, paymentId, amount);

  upsertSearchAttributes({ PaymentStatus: ['FRAUD_CHECK'] });
  await fraudCheck(email, paymentId, amount);

  upsertSearchAttributes({ PaymentStatus: ['EXECUTING'] });
  const result = await executePayment(paymentId, amount);

  upsertSearchAttributes({ PaymentStatus: ['COMPLETED'] });
  return result;
}
