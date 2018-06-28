'use strict';

const https = require('https');
const fs = require('fs');
const util = require('util');
const EBMessageSeverityClassifier = require('aws_eb_message_severity').default;

const good = 'good';
const warning = 'warning';
const danger = 'danger';

const alarmRegex = /^ALARM:/;
const insufficientDataRegex = /^INSUFFICIENT_DATA:/;

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
  const subject = sns.Subject;
  const severity = decideSeverity(subject);
  const prefix = getPrefixBySeverity(topicArn, severity);

  req.write(util.format('%j', {
    'channel': channel,
    'username': getUsername(),
    'text': decorateBold(subject),
    'icon_emoji': ':sns:',
    'attachments': [
      {
        'color': severity,
        'text': prefix + ' ' + message
      }
    ]
  }));
  req.end();
};

function decideSeverity(message) {
  if (EBMessageSeverityClassifier.isDangerMessage(message) || alarmRegex.test(message)) {
    return danger;
  }

  if (EBMessageSeverityClassifier.isWarningMessage(message) || insufficientDataRegex.test(message)) {
    return warning;
  }

  return good;
}

function decideDestinationChannel(topicArn) {
  const channelSetting = channelConfig[topicArn];
  if (channelSetting === undefined) {
    return process.env.DEFAULT_SLACK_CHANNEL;
  }

  const channel = channelSetting['name'];
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

function getPrefixBySeverity(topicArn, severity) {
  const channelSetting = channelConfig[topicArn];
  if (channelSetting === undefined) {
    return '';
  }

  const prefixSetting = channelSetting['prefix'];
  if (prefixSetting === undefined) {
    return '';
  }

  const prefix = prefixSetting[severity];
  return prefix === undefined ? '' : prefix;
}
