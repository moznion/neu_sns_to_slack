neu_sns_to_slack
==

An AWS lambda function to relay the message to Slack from AWS SNS.

Features
--

- Relays the message to Slack from SNS topic.
- It can change the destination of Slack according to SNS Topic ARN.
- Categorize the severity of the message according to message contents and colorize it.
  - using regexp :p

Mechanism
--

```
[SNS Topic] ---> [Lambda] ---> [Slack]
```

Getting started
--

### 1. Setup environment variables

|name|description|mandatory|
|----|-----------|--------|
|SLACK_WEBHOOK_PATH|Path of Slack webhook (e.g. `/services/XXX/XXX/XXX`)|:white_check_mark:|
|DEFAULT_SLACK_CHANNEL|A channel name that is used when destination channel is missing (default: null)||
|SLACK_USER_NAME|A Slack user name that is displayed as sender (default: `SNS2Slack`)||
|CHANNEL_CONFIG_JSON_FILE_PATH|File path to channel configuration json (default: `channel.config.json`)||

### 2. Setup `channel.config.json`

This configuration file contains the pairs of `SNS Topic ARN` and `Slack destination channel`.

Configuration file path is configurable: please set `CHANNEL_CONFIG_JSON_FILE_PATH` environment variable.

Example:

```
{
  "arn:aws:sns:ap-northeast-1:000000000000:XXXXX": "#your_channel",
  ...
}
```

#### Note

This configuration file must be located on the same directory of `index.js`.

### 3. Deploy files

- index.js
- channel.config.json

### 4. Add the SNS trigger into Lambda trigger

Add the SNS Topic into Lambda function's trigger.

See also
--

This code references following code:

- https://gist.github.com/terranware/962da63ca547f55667f6#file-snstoslack-js

Author
--

moznion (<moznion@gmail.com>)

License
--

MIT
