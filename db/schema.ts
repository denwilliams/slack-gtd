import { pgTable, text, timestamp, uuid, varchar, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  slackUserId: varchar('slack_user_id', { length: 255 }).notNull().unique(),
  slackTeamId: varchar('slack_team_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contexts = pgTable('contexts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id),
  contextId: uuid('context_id').references(() => contexts.id),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  dueDate: timestamp('due_date'),
  priority: varchar('priority', { length: 20 }).default('medium'), // high, medium, low
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, completed, archived
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const reminderPreferences = pgTable('reminder_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull().unique(),
  enabled: boolean('enabled').default(true).notNull(),
  reminderTime: varchar('reminder_time', { length: 10 }).default('09:00'), // HH:MM format
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
