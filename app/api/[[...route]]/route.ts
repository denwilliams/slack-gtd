import { Hono } from "hono";
import { handle } from "hono/vercel";
import { getTasksDueSoon, getInboxTasksByUser } from "@/lib/services/tasks";
import { handleSlashCommand } from "@/lib/slack/handlers/commands";
import { handleAppHomeOpened } from "@/lib/slack/handlers/home";
import { handleInteraction } from "@/lib/slack/handlers/interactions";
import {
  sendTaskReminderBatch,
  sendInboxReminderBatch,
} from "@/lib/slack/messages";
import {
  createExportUrl,
  getTasksByExportId,
  getExistingExportUrl,
} from "@/lib/services/export";
import { db } from "@/db";
import { sql } from "drizzle-orm";

// Create the main Hono app
const app = new Hono().basePath("/api");

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Database migration endpoint
app.post("/db/migrate", async (c) => {
  // Verify the migration secret to prevent unauthorized access
  const authHeader = c.req.header("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    // Create export_urls table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS export_urls (
        id VARCHAR(64) PRIMARY KEY,
        slack_user_id VARCHAR(255) NOT NULL REFERENCES users(slack_user_id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    return c.json({
      success: true,
      message: "Database migration completed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error running migration:", error);
    return c.json({ error: "Migration failed", details: String(error) }, 500);
  }
});

// Export URL endpoints
// Generate a new export URL for a user (internal use only - called from Slack interactions)
app.post("/export/generate", async (c) => {
  try {
    const body = await c.req.json();
    const { userId } = body;

    if (!userId) {
      return c.json({ error: "userId is required" }, 400);
    }

    // Check if user already has an export URL
    const existingExportId = await getExistingExportUrl(userId);

    if (existingExportId) {
      // Return the existing export URL
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";
      return c.json({
        exportId: existingExportId,
        url: `${baseUrl}/api/export/${existingExportId}`,
      });
    }

    // Generate a new export URL
    const exportId = await createExportUrl(userId);

    // Build the full URL
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const exportUrl = `${baseUrl}/api/export/${exportId}`;

    return c.json({
      exportId,
      url: exportUrl,
    });
  } catch (error) {
    console.error("Error generating export URL:", error);
    return c.json({ error: "Failed to generate export URL" }, 500);
  }
});

// Retrieve GTD items via export URL (public endpoint with obfuscated ID)
app.get("/export/:id", async (c) => {
  try {
    const exportId = c.req.param("id");

    if (!exportId) {
      return c.json({ error: "Export ID is required" }, 400);
    }

    const data = await getTasksByExportId(exportId);

    if (!data) {
      return c.json({ error: "Export URL not found" }, 404);
    }

    return c.json(data);
  } catch (error) {
    console.error("Error retrieving export data:", error);
    return c.json({ error: "Failed to retrieve export data" }, 500);
  }
});

// Master cron endpoint - runs daily at 9 AM UTC and sends all reminders
app.get("/cron/reminders", async (c) => {
  // Verify the cron secret to prevent unauthorized access
  const authHeader = c.req.header("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const now = new Date();

    const results: any = {
      success: true,
      timestamp: now.toISOString(),
    };

    // Send inbox reminders
    const usersWithInbox = await getInboxTasksByUser();
    const inboxResults = await sendInboxReminderBatch(usersWithInbox);
    results.inboxReminders = {
      sent: inboxResults.sent.length,
      failed: inboxResults.failed.length,
      usersWithInbox: usersWithInbox.length,
      totalInboxItems: usersWithInbox.reduce((sum, u) => sum + u.tasks.length, 0),
    };

    // Send due-task reminders
    const dueTasks = await getTasksDueSoon(24);
    const dueTaskResults = await sendTaskReminderBatch(dueTasks);
    results.dueTaskReminders = {
      sent: dueTaskResults.sent.length,
      failed: dueTaskResults.failed.length,
      tasksChecked: dueTasks.length,
    };

    return c.json(results);
  } catch (error) {
    console.error("Error in master cron job:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Individual cron endpoint for due-task reminders (can be called directly for testing)
app.get("/cron/due-task-reminders", async (c) => {
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
    console.error("Error in due-task reminder cron job:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Individual cron endpoint for inbox reminders (can be called directly for testing)
app.get("/cron/inbox-reminders", async (c) => {
  // Verify the cron secret to prevent unauthorized access
  const authHeader = c.req.header("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    // Get all users with items in their inbox
    const usersWithInbox = await getInboxTasksByUser();

    // Send inbox reminders to users (only those who have inbox items)
    const results = await sendInboxReminderBatch(usersWithInbox);

    return c.json({
      success: true,
      remindersSent: results.sent.length,
      remindersFailed: results.failed.length,
      usersWithInbox: usersWithInbox.length,
      totalInboxItems: usersWithInbox.reduce((sum, u) => sum + u.tasks.length, 0),
    });
  } catch (error) {
    console.error("Error in inbox reminder cron job:", error);
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
