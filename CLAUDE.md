# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Slack bot implementing the Getting Things Done (GTD) methodology. Users can capture, organize, and review tasks directly within Slack. Each user in the workspace has their own task list.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Next.js 16
- **Web Framework**: Hono (for API route handlers)
- **Architecture**: Serverless via Vercel
- **ORM**: Drizzle ORM
- **Database**: Neon (serverless PostgreSQL)
- **API Integration**: Slack API

## Architecture

**Serverless Design**:
- Next.js 16 API Routes with Hono handlers deployed as Vercel serverless functions
- Hono provides lightweight, fast routing within Next.js API routes
- Stateless request handling for scalability
- Database connections optimized for serverless (connection pooling via Neon)
- Event-driven architecture for Slack interactions
- Edge Runtime support for low-latency responses where applicable

**Interaction Patterns**:
- Slash commands for quick task capture and management
- Home tab UI displaying tasks and projects with interactive buttons
- Reminder system using scheduled functions or queue-based triggers
- Multi-user support with isolated task data per user

## Key Concepts

**GTD Methodology**:
- Tasks can be organized by projects, contexts, and due dates
- Focus on capture, organize, and review workflow
- Support for task prioritization and reminders

**Slack Integration**:
- Commands for task operations
- Home tab interface for visual task management
- Multi-user workspace support with data isolation

## Development Setup

This codebase is in early stages. When implementing:

1. Set up Slack app credentials and bot tokens
2. Configure Neon database with connection pooling
3. Use Drizzle ORM for database schema and migrations
4. Use Hono with Next.js following the catch-all route pattern:
   - Create `app/api/[[...route]]/route.ts` as the main API entry point
   - Use `hono/vercel` adapter with `handle()` function
   - Set base path with `.basePath('/api')`
   - Export HTTP method handlers (GET, POST, etc.)
5. Optimize database connections for serverless cold starts using `@neondatabase/serverless`
6. Implement proper user identification and data isolation for multi-user support
7. Use Vercel environment variables for all configuration (secrets, database URLs, etc.)
8. Use TypeScript throughout the application

## Next.js + Hono + Vercel + Neon Considerations

- Use catch-all route pattern: `app/api/[[...route]]/route.ts` for Hono integration
- Use `hono/vercel` adapter with `handle()` function to export route handlers
- Set Hono base path with `.basePath('/api')` to match Next.js API routing
- Define all routes in Hono (e.g., `/slack/commands`, `/slack/events`)
- Hono's middleware system is ideal for Slack signature verification
- Keep API route handlers lightweight and focused
- Use `@neondatabase/serverless` for database connection pooling
- Neon's serverless driver works over WebSockets, optimized for serverless environments
- Handle cold starts gracefully (Vercel has fast cold starts, Neon has instant connection)
- Implement proper timeout handling for Slack's 3-second response requirement
- Use deferred responses for long-running operations
- Hono with Vercel adapter works seamlessly on Vercel Functions

## Vercel Cron Jobs for Reminders

- Configure cron schedules in `vercel.json` under the `crons` array
- Create a separate API route (e.g., `app/api/cron/reminders/route.ts`) for the cron handler
- **Security**: Always verify the `CRON_SECRET` from Authorization header to prevent DOS attacks:
  ```typescript
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end('Unauthorized');
  }
  ```
- Set `CRON_SECRET` environment variable in Vercel dashboard
- Example cron schedule: `"0 9 * * *"` runs daily at 9 AM UTC
- Cron jobs on Vercel are only available on Pro and Enterprise plans
- For testing locally, manually invoke the cron endpoint with Authorization header
