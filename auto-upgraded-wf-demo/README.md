Start a workflow:
```
temporal workflow start \
  --type AutoUpgrading \
  --task-queue worker-versioning \
  --workflow-id AUTO-UPGRADED-DEMO-123
```

Start worker v1
```
npm run worker1
```

Set current:
```
temporal worker deployment set-current-version \
  --deployment-name="my-auto-upgraded-demo-deployment" \
  --build-id="1.0"
```

Observe Workflow execution

Send signal - do_next_signal with payload "do-activity" to advance workflow. Observe version.

Start worker v2
```
npm run worker2
```

Set current:
```
temporal worker deployment set-current-version \
  --deployment-name="my-auto-upgraded-demo-deployment" \
  --build-id="2.0"
```

Send signal do_next_signal with payload "do-activity" to advance workflow. Observe version.
