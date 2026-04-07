import { Client, Connection } from '@temporalio/client';
import { temporal } from '@temporalio/proto';
import Long from 'long';

type MatchingTimesResponse = temporal.api.workflowservice.v1.ListScheduleMatchingTimesResponse;

function dateToTimestamp(date: Date): { seconds: Long; nanos: number } {
  return { seconds: Long.fromNumber(Math.floor(date.getTime() / 1000)), nanos: 0 };
}

function timestampToDate(ts: { seconds?: Long | null; nanos?: number | null }): Date {
  return new Date(Long.fromValue(ts.seconds ?? 0).toNumber() * 1000 + (ts.nanos ?? 0) / 1e6);
}

const MAX_DISPLAY = 20;

async function run() {
  const connection = await Connection.connect();
  const client = new Client({ connection });

  // Schedule 1: Every weekday at 9:00 AM — no end date
  const weekdaySchedule = await client.schedule.create({
    scheduleId: 'weekday-morning-task',
    spec: {
      calendars: [
        {
          comment: 'Every weekday at 9:00 AM',
          dayOfWeek: { start: 'MONDAY', end: 'FRIDAY' },
          hour: 9,
          minute: 0,
        },
      ],
      timezone: 'US/Pacific',
    },
    action: {
      type: 'startWorkflow',
      workflowType: 'scheduledTask',
      args: ['Daily standup reminder'],
      taskQueue: 'schedule-actions',
    },
  });
  console.log(`Created schedule: ${weekdaySchedule.scheduleId}`);

  // Schedule 2: 1st and 15th of every month at noon — with end date (6 months from now)
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 6);

  const monthlySchedule = await client.schedule.create({
    scheduleId: 'bimonthly-report',
    spec: {
      calendars: [
        {
          comment: '1st and 15th of every month at noon',
          dayOfMonth: [1, 15],
          hour: 12,
          minute: 0,
        },
      ],
      endAt: endDate,
      timezone: 'US/Pacific',
    },
    action: {
      type: 'startWorkflow',
      workflowType: 'scheduledTask',
      args: ['Bi-monthly report generation'],
      taskQueue: 'schedule-actions',
    },
  });
  console.log(`Created schedule: ${monthlySchedule.scheduleId} (ends ${endDate.toISOString()})`);

  // Schedule 3: Every minute — no end date
  const perMinuteSchedule = await client.schedule.create({
    scheduleId: 'per-minute-check',
    spec: {
      calendars: [
        {
          comment: 'Every minute',
          minute: { start: 0, end: 59 },
        },
      ],
    },
    action: {
      type: 'startWorkflow',
      workflowType: 'scheduledTask',
      args: ['Health check ping'],
      taskQueue: 'schedule-actions',
    },
  });
  console.log(`Created schedule: ${perMinuteSchedule.scheduleId}`);

  // Query future matching times using the raw gRPC WorkflowService API
  const now = new Date();
  const queryEnd = new Date();
  queryEnd.setFullYear(queryEnd.getFullYear() + 1);

  console.log(`\nQuerying matching times from ${now.toISOString()} to ${queryEnd.toISOString()}:\n`);

  for (const scheduleId of ['weekday-morning-task', 'bimonthly-report', 'per-minute-check']) {
    const response: MatchingTimesResponse = await connection.workflowService.listScheduleMatchingTimes({
      namespace: 'default',
      scheduleId,
      startTime: dateToTimestamp(now),
      endTime: dateToTimestamp(queryEnd),
    });

    const total = response.startTime.length;
    const shown = response.startTime.slice(0, MAX_DISPLAY);

    console.log(`Schedule "${scheduleId}" — ${total} matching times (next 12 months):`);
    for (const time of shown) {
      console.log(`  ${timestampToDate(time).toLocaleString()}`);
    }
    if (total > MAX_DISPLAY) {
      console.log(`  ... and ${total - MAX_DISPLAY} more`);
    }
    console.log();
  }

  // Clean up
  await weekdaySchedule.delete();
  await monthlySchedule.delete();
  await perMinuteSchedule.delete();
  console.log('Schedules deleted.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
