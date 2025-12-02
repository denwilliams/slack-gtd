import { WebClient } from '@slack/web-api';

let _slackClient: WebClient | null = null;

export function getSlackClient() {
  if (!_slackClient) {
    if (!process.env.SLACK_BOT_TOKEN) {
      throw new Error('SLACK_BOT_TOKEN environment variable is not set');
    }
    _slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
  }
  return _slackClient;
}
