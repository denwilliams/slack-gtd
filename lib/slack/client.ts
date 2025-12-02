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

// For backwards compatibility
export const slackClient = new Proxy({} as WebClient, {
  get(_target, prop) {
    return (getSlackClient() as any)[prop];
  }
});
