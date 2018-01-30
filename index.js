const https = require('https');
const url = require('url');
const fs = require('fs');
const util = require('util');

const good = 'good';
const warning = 'warning';
const danger = 'danger';

const defaultChannelConfigJSONFilePath = './channel.config.json';
const defaultSlackUsername = 'SNS2Slack';

const channelConfig = JSON.parse(fs.readFileSync(decideChannelConfigJSONFilePath()));

const dangerMessagesRegexp = messages2regexp([
  ' but with errors',
  ' to RED',
  'During an aborted deployment',
  'Failed to deploy application',
  'Failed to deploy configuration',
  'has a dependent object',
  'is not authorized to perform',
  'Pending to Degraded',
  'Stack deletion failed',
  'Unsuccessful command execution',
  'You do not have permission',
  'Your quota allows for 0 more running instance',
  'Info to Severe',
  'No Data to Severe',
  'Ok to Severe',
  'Ok to Degraded',
  'Degraded to Severe'
]);

const warningMessageRegexp = messages2regexp([
  ' aborted operation.',
  ' to YELLOW',
  'Adding instance ',
  'Degraded to Info',
  'Deleting SNS topic',
  'is currently running under desired capacity',
  'Ok to Info',
  'Ok to Warning',
  'Info to No Data',
  'Ok to No Data',
  'Pending Initialization',
  'Removed instance ',
  'Rollback of environment'
]);

exports.handler = (event, context, callback) => {
  const sns = event.Records[0].Sns;

  const topicArn = sns.TopicArn;
  const channel = decideDestinationChannel(topicArn);
  if (channel === undefined) {
    callback('Sending failed: destination channel is unknown');
  }

  var req = https.request({
    method: 'POST',
    hostname: 'hooks.slack.com',
    port: 443,
    path: process.env.SLACK_WEBHOOK_PATH,
    headers: {
      'Content-Type': 'application/json'
    }
  }, (res) => {
    res.on('data', (chunk) => {
      callback(null, 'OK');
    });
  });

  req.on('error', (e) => {
    callback('Failed to post slack' + e.message)
  });

  const message = sns.Message;

  req.write(util.format("%j", {
    'channel': channel,
    'username': getUsername(),
    'text': decorateBold(sns.Subject),
    'icon_emoji': ':sns:',
    'attachments': [
      {
        'color': decideSeverity(message),
        'text': message
      }
    ]
  }));
  req.end();
};

function messages2regexp(messages) {
  // XXX this function cannot handle the regexp special charactors!
  return new RegExp('(?:' + messages.join('|') + ')');
}

function decideSeverity(message) {
  if (dangerMessagesRegexp.test(message)) {
    return danger;
  }

  if (warningMessageRegexp.test(message)) {
    return warning;
  }

  return good;
}

function decideDestinationChannel(topicArn) {
  const channel = channelConfig[topicArn];
  if (channel === undefined) {
    return process.env.DEFAULT_SLACK_CHANNEL;
  }

  return channel;
}

function getUsername() {
  const username = process.env.SLACK_USER_NAME;
  if (username === undefined) {
    return defaultSlackUsername;
  }

  return username;
}

function decorateBold(text) {
  return '*' + text + '*';
}

function decideChannelConfigJSONFilePath() {
  const channelConfigJSONFilePath = process.env.CHANNEL_CONFIG_JSON_FILE_PATH;
  if (channelConfigJSONFilePath === undefined) {
    return defaultChannelConfigJSONFilePath;
  }

  return channelConfigJSONFilePath;
}
