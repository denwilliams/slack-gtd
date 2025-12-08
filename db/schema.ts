import {
  boolean,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  slackUserId: varchar("slack_user_id", { length: 255 }).primaryKey(),
  slackTeamId: varchar("slack_team_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: varchar("id", { length: 8 }).primaryKey(), // short nanoid
  slackUserId: varchar("slack_user_id", { length: 255 })
    .references(() => users.slackUserId)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contexts = pgTable("contexts", {
  id: varchar("id", { length: 8 }).primaryKey(), // short nanoid
  slackUserId: varchar("slack_user_id", { length: 255 })
    .references(() => users.slackUserId)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id", { length: 8 }).primaryKey(), // short nanoid
  slackUserId: varchar("slack_user_id", { length: 255 })
    .references(() => users.slackUserId)
    .notNull(),
  projectId: varchar("project_id", { length: 8 }).references(() => projects.id),
  contextId: varchar("context_id", { length: 8 }).references(() => contexts.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  priority: varchar("priority", { length: 20 }).default("medium"), // high, medium, low
  status: varchar("status", { length: 20 }).default("inbox").notNull(), // inbox, active, completed, someday, waiting, archived
  completedAt: timestamp("completed_at"),
  delegatedTo: varchar("delegated_to", { length: 255 }), // For "waiting for" items
  timeEstimate: varchar("time_estimate", { length: 20 }), // quick, 30min, 1hr, 2hr+
  energyLevel: varchar("energy_level", { length: 20 }), // high, medium, low
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reminderPreferences = pgTable("reminder_preferences", {
  slackUserId: varchar("slack_user_id", { length: 255 })
    .primaryKey()
    .references(() => users.slackUserId),
  enabled: boolean("enabled").default(true).notNull(),
  reminderTime: varchar("reminder_time", { length: 10 }).default("09:00"), // HH:MM format
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
