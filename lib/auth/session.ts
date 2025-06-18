import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function createSession(username: string): Promise<string> {
  const sessionToken = uuidv4();
  const cookieStore = await cookies();
  
  // Check if user exists, create if not
  let user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user) {
    const newUsers = await db.insert(users).values({
      username,
      sessionToken,
    }).returning();
    user = newUsers[0];
  } else {
    // Update session token
    await db.update(users)
      .set({ sessionToken })
      .where(eq(users.id, user.id));
  }

  // Set cookie
  cookieStore.set('session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return sessionToken;
}

export async function getSession(): Promise<{ user: any } | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  
  if (!sessionToken) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.sessionToken, sessionToken),
  });

  if (!user) {
    return null;
  }

  return { user };
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}