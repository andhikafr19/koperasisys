import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { prisma } from './prisma';

const COOKIE_NAME = 'coop_session';

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  memberId?: string;
  memberNo?: string;
}

/**
 * Hash a plain text password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a plain text password against a bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a simple session cookie with user identity
 */
export async function createSession(user: SessionUser) {
  const cookieStore = await cookies();
  const payload = JSON.stringify(user);
  const encoded = Buffer.from(payload).toString('base64');

  cookieStore.set(COOKIE_NAME, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Clear session cookie on logout
 */
export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Retrieve current logged-in user from session cookie
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
    const user = JSON.parse(decoded) as SessionUser;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, isActive: true, role: true },
    });

    if (!dbUser || !dbUser.isActive) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

/**
 * Ensure user is logged in and possesses appropriate role, redirecting if unauthorized
 */
export async function requireAuth(allowedRoles?: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    redirect('/dashboard');
  }

  return user;
}
