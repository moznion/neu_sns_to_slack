'use strict';

const https = require('https');
const fs = require('fs');
const util = require('util');
const EBMessageSeverity = require('aws_eb_message_severity');

const good = 'good';
const warning = 'warning';
const danger = 'danger';

const defaultChannelConfigJSONFilePath = './channel.config.json';
const defaultSlackUsername = 'SNS2Slack';

const channelConfig = JSON.parse(fs.readFileSync(decideChannelConfigJSONFilePath()));

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
    res.on('data', () => {
      callback(null, 'OK');
    });
  });

  req.on('error', (e) => {
    callback('Failed to post slack' + e.message);
  });

  const message = sns.Message;

  req.write(util.format('%j', {
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

function decideSeverity(message) {
  if (EBMessageSeverity.isDangerMessage(message)) {
    return danger;
  }

  if (EBMessageSeverity.isWarningMessage(message)) {
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
