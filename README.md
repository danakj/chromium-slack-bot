# Slack Event API handler for Chromium Slack

This is written as a Google Cloud Function.

[code]: index.js

## What's interesting to say here? Idk.

## Deployment

To deploy this you need to:
1. Be a Googler (see [google.com/careers](google.com/careers)).
2. Be a member of the chromium-slack-bot GCE application (see @ajwong in Slack).
3. Have a copy of the config.json in your directory (see [Google-internal drive](http://go/chromium-slack-event-bot-config)).

Log into gcloud with your google.com credentials
```
gcloud auth login
```

Deploy the function with
```
gcloud functions deploy slackEvent --runtime nodejs8 --trigger-http --project chromium-slack-bot-1469d
```

If it asks about unauthenticated invocations, allow them
```
Allow unauthenticated invocations of new function [slackEvent]? (y/N)?
```



