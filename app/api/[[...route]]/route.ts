import { Hono } from "hono";
import { handle } from "hono/vercel";
import { getTasksDueSoon } from "@/lib/services/tasks";
import { handleSlashCommand } from "@/lib/slack/handlers/commands";
import { handleAppHomeOpened } from "@/lib/slack/handlers/home";
import { handleInteraction } from "@/lib/slack/handlers/interactions";
import { sendTaskReminderBatch } from "@/lib/slack/messages";

// Create the main Hono app
const app = new Hono().basePath("/api");

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// =============================================================================
// CRON ENDPOINTS - Task Reminder System
// =============================================================================
// These endpoints handle automated task reminders for tasks due soon.
//
// Schedule: Daily at 9 AM UTC (configured in vercel.json)
// Vercel Hobby Plan: Limited to once-per-day cron jobs
//
// Usage:
// 1. Automatic: Vercel cron calls /api/cron/reminders daily with CRON_SECRET
// 2. Manual: Call /api/trigger/reminders with API_SECRET for manual runs
// =============================================================================

// Automated cron endpoint (called by Vercel cron scheduler)
app.get("/cron/reminders", async (c) => {
  // Security: Verify the CRON_SECRET to prevent unauthorized access
  // This secret is automatically provided by Vercel's cron service
  const authHeader = c.req.header("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    // Find all tasks due in the next 24 hours across all users
    const dueTasks = await getTasksDueSoon(24);

    // Send reminder messages to each user via Slack
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

// Manual trigger endpoint (for external schedulers like GitHub Actions, cron-job.org, etc.)
app.post("/trigger/reminders", async (c) => {
  // Security: Verify the API_SECRET to prevent unauthorized access
  // Set this in your Vercel environment variables
  const authHeader = c.req.header("Authorization");
  if (authHeader !== `Bearer ${process.env.API_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    // Find all tasks due in the next 24 hours across all users
    const dueTasks = await getTasksDueSoon(24);

    // Send reminder messages to each user via Slack
    const results = await sendTaskReminderBatch(dueTasks);

    return c.json({
      success: true,
      remindersSent: results.sent.length,
      remindersFailed: results.failed.length,
      tasksChecked: dueTasks.length,
      triggeredAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in manual trigger:", error);
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
