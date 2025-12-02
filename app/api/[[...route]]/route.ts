import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { handleSlashCommand } from '@/lib/slack/handlers/commands';

// Create the main Hono app
const app = new Hono().basePath('/api');

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Slack slash command handler
app.post('/slack/commands', async (c) => {
  try {
    const formData = await c.req.formData();
    const payload = {
      team_id: formData.get('team_id') as string,
      user_id: formData.get('user_id') as string,
      command: formData.get('command') as string,
      text: formData.get('text') as string,
      response_url: formData.get('response_url') as string,
    };

    const response = await handleSlashCommand(payload);
    return c.json(response);
  } catch (error) {
    console.error('Error handling slash command:', error);
    return c.json({
      response_type: 'ephemeral',
      text: '❌ An error occurred while processing your command.',
    });
  }
});

// Slack events handler
app.post('/slack/events', async (c) => {
  try {
    const body = await c.req.json();

    // Handle URL verification challenge
    if (body.type === 'url_verification') {
      return c.json({ challenge: body.challenge });
    }

    // TODO: Handle other event types (app_home_opened, etc.)
    return c.json({ ok: true });
  } catch (error) {
    console.error('Error handling event:', error);
    return c.json({ ok: false });
  }
});

// Slack interactions handler (buttons, modals, shortcuts)
app.post('/slack/interactions', async (c) => {
  try {
    // TODO: Implement interactions handler (buttons, modals)
    return c.json({ ok: true });
  } catch (error) {
    console.error('Error handling interaction:', error);
    return c.json({ ok: false });
  }
});

// Export the handlers
export const GET = handle(app);
export const POST = handle(app);
