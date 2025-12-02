import { Hono } from "hono";
import { handle } from "hono/vercel";
import { handleSlashCommand } from "@/lib/slack/handlers/commands";
import { handleAppHomeOpened } from "@/lib/slack/handlers/home";
import { handleInteraction } from "@/lib/slack/handlers/interactions";
import { getTasksDueSoon } from "@/lib/services/tasks";
import { sendTaskReminderBatch } from "@/lib/slack/messages";

// Create the main Hono app
const app = new Hono().basePath("/api");

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Cron endpoint for sending reminders
app.get("/cron/reminders", async (c) => {
  // Verify the cron secret to prevent unauthorized access
  const authHeader = c.req.header("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
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
    console.error("Error in cron job:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Slack slash command handler
app.post("/slack/commands", async (c) => {
  try {
    const formData = await c.req.formData();
    const payload = {
      team_id: formData.get("team_id") as string,
      user_id: formData.get("user_id") as string,
      command: formData.get("command") as string,
      text: formData.get("text") as string,
      response_url: formData.get("response_url") as string,
    };

    const response = await handleSlashCommand(payload);
    return c.json(response);
  } catch (error) {
    console.error("Error handling slash command:", error);
    return c.json({
      response_type: "ephemeral",
      text: "❌ An error occurred while processing your command.",
    });
  }
});

// Slack events handler
app.post("/slack/events", async (c) => {
  try {
    const body = await c.req.json();

    // Handle URL verification challenge
    if (body.type === "url_verification") {
      return c.json({ challenge: body.challenge });
    }

    // Handle app_home_opened event
    if (body.event?.type === "app_home_opened") {
      const userId = body.event.user;
      const teamId = body.team_id;
      await handleAppHomeOpened(userId, teamId);
      return c.json({ ok: true });
    }

    return c.json({ ok: true });
  } catch (error) {
    console.error("Error handling event:", error);
    return c.json({ ok: false });
  }
});

// Slack interactions handler (buttons, modals, shortcuts)
app.post("/slack/interactions", async (c) => {
  try {
    // Slack sends interactions as form-encoded with a 'payload' field
    const formData = await c.req.formData();
    const payloadString = formData.get("payload") as string;

    if (!payloadString) {
      return c.json({ ok: false, error: "No payload found" });
    }

    const payload = JSON.parse(payloadString);
    const response = await handleInteraction(payload);

    return c.json(response);
  } catch (error) {
    console.error("Error handling interaction:", error);
    return c.json({ ok: false });
  }
});

// Export the handlers
export const GET = handle(app);
export const POST = handle(app);
