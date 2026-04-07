# Future Schedule Actions

Demonstrates creating Temporal Schedules with various calendar specs and querying their future matching times using the raw `listScheduleMatchingTimes` gRPC API.

## Schedules created

1. **Weekday morning task** — Every Mon–Fri at 9:00 AM (no end date), using a range-based `dayOfWeek` calendar spec
2. **Bi-monthly report** — 1st and 15th of every month at noon (ends in 6 months), using a multi-value `dayOfMonth` calendar spec
3. **Per-minute check** — Every minute (no end date), using a range-based `minute` calendar spec

After creating the schedules, the client queries `WorkflowService.listScheduleMatchingTimes` to print matching times over the next 12 months (showing up to 20 per schedule, with a total count), then cleans up by deleting all schedules.

## Running this sample

1. `temporal server start-dev` to start [Temporal Server](https://github.com/temporalio/cli/#installation).
2. `npm install` to install dependencies.
3. `npm start` to create the schedules, query matching times, and clean up.

```
Created schedule: per-minute-check

Querying matching times from 2026-04-07T23:10:20.836Z to 2027-04-07T23:10:20.836Z:

Schedule "weekday-morning-task" — 261 matching times (next 12 months):
  4/9/2026, 2:00:00 AM
  4/10/2026, 2:00:00 AM
  4/11/2026, 2:00:00 AM
  4/14/2026, 2:00:00 AM
  4/15/2026, 2:00:00 AM
  4/16/2026, 2:00:00 AM
  4/17/2026, 2:00:00 AM
  4/18/2026, 2:00:00 AM
  4/21/2026, 2:00:00 AM
  4/22/2026, 2:00:00 AM
  4/23/2026, 2:00:00 AM
  4/24/2026, 2:00:00 AM
  4/25/2026, 2:00:00 AM
  4/28/2026, 2:00:00 AM
  4/29/2026, 2:00:00 AM
  4/30/2026, 2:00:00 AM
  5/1/2026, 2:00:00 AM
  5/2/2026, 2:00:00 AM
  5/5/2026, 2:00:00 AM
  5/6/2026, 2:00:00 AM
  ... and 241 more

Schedule "bimonthly-report" — 12 matching times (next 12 months):
  4/16/2026, 5:00:00 AM
  5/2/2026, 5:00:00 AM
  5/16/2026, 5:00:00 AM
  6/2/2026, 5:00:00 AM
  6/16/2026, 5:00:00 AM
  7/2/2026, 5:00:00 AM
  7/16/2026, 5:00:00 AM
  8/2/2026, 5:00:00 AM
  8/16/2026, 5:00:00 AM
  9/2/2026, 5:00:00 AM
  9/16/2026, 5:00:00 AM
  10/2/2026, 5:00:00 AM

Schedule "per-minute-check" — 1000 matching times (next 12 months):
  4/8/2026, 10:00:00 AM
  4/8/2026, 10:01:00 AM
  4/8/2026, 10:02:00 AM
  4/8/2026, 10:03:00 AM
  4/8/2026, 10:04:00 AM
  4/8/2026, 10:05:00 AM
  4/8/2026, 10:06:00 AM
  4/8/2026, 10:07:00 AM
  4/8/2026, 10:08:00 AM
  4/8/2026, 10:09:00 AM
  4/8/2026, 10:10:00 AM
  4/8/2026, 10:11:00 AM
  4/8/2026, 10:12:00 AM
  4/8/2026, 10:13:00 AM
  4/8/2026, 10:14:00 AM
  4/8/2026, 10:15:00 AM
  4/8/2026, 10:16:00 AM
  4/8/2026, 10:17:00 AM
  4/8/2026, 10:18:00 AM
  4/8/2026, 10:19:00 AM
  ... and 980 more

Schedules deleted.
```
