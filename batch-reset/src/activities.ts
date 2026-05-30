import { ApplicationFailure, log } from '@temporalio/activity';

// chargeCustomer simulates a flaky payment gateway that fails ~50% of the time.
//
// The draw is fresh on every attempt — including every run produced by a reset
// — so a failed Workflow has roughly a 50% chance of succeeding the next time
// it is reset. That is what makes a *progressive* batch reset interesting:
// after each round, about half the still-failing orders recover, and the rest
// need another round.
const FAILURE_RATE = process.env.FAILURE_RATE ? Number(process.env.FAILURE_RATE) : 0.5;

export async function chargeCustomer(orderId: string): Promise<string> {
  if (Math.random() < FAILURE_RATE) {
    log.error(`Charging order ${orderId} failed (flaky gateway)`);
    throw ApplicationFailure.create({
      message: `payment gateway timed out for order ${orderId}`,
      type: 'PaymentError',
      nonRetryable: true,
    });
  }

  log.info(`Charged order ${orderId}`);
  return `charged:${orderId}`;
}
