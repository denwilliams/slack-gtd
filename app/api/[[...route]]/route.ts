import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { handleSlashCommand } from '@/lib/slack/handlers/commands';
import { getTasksDueSoon } from '@/lib/services/tasks';
import { sendTaskReminderBatch } from '@/lib/slack/messages';
import { ensureSchema } from '@/db/migrate';

// Create the main Hono app
const app = new Hono().basePath('/api');

// Middleware to ensure schema is initialized on first request
app.use('*', async (_c, next) => {
  await ensureSchema();
  await next();
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cron endpoint for sending reminders
app.get('/cron/reminders', async (c) => {
  // Verify the cron secret to prevent unauthorized access
  const authHeader = c.req.header('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Find tasks due in the next 24 hours
    const dueTasks = await getTasksDueSoon(24);

    // Send reminders to users
    const results = await sendTaskReminderBatch(dueTasks);

    return c.json({
      success: true,
      remindersSent: results.sent.length,
      remindersFailed: results.failed.length,
      tasksChecked: dueTasks.length,
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
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
