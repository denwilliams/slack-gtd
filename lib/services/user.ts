import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function findOrCreateUser(slackUserId: string, slackTeamId: string) {
  // Try to find existing user
  const existingUser = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.slackUserId, slackUserId),
        eq(users.slackTeamId, slackTeamId)
      )
    )
    .limit(1);

  if (existingUser.length > 0) {
    return existingUser[0];
  }

  // Create new user
  const newUser = await db
    .insert(users)
    .values({
      slackUserId,
      slackTeamId,
    })
    .returning();

  return newUser[0];
}
