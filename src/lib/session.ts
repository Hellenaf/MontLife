import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  picture?: string;
  role?: string;
  createdAt: string;
}

const SESSION_COOKIE_NAME = "montlife_session";

/**
 * Creates a base64-encoded signed session payload
 */
export function serializeSession(session: UserSession): string {
  return Buffer.from(JSON.stringify(session)).toString("base64");
}

/**
 * Parses and verifies the session payload
 */
export function deserializeSession(token?: string | null): UserSession | null {
  if (!token) return null;
  try {
    const json = Buffer.from(token, "base64").toString("utf-8");
    const data = JSON.parse(json) as UserSession;
    if (data && data.userId && data.email) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Retrieves the current user session from an incoming NextRequest or cookie store
 */
export async function getSessionUser(req?: NextRequest): Promise<UserSession | null> {
  if (req) {
    const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (cookie) {
      return deserializeSession(cookie);
    }
  }

  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return deserializeSession(cookie);
  } catch {
    return null;
  }
}

/**
 * Attaches the session cookie to an outgoing NextResponse
 */
export function setSessionCookie(response: NextResponse, session: UserSession): void {
  const token = serializeSession(session);
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

/**
 * Clears the session cookie from an outgoing NextResponse
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE_NAME);
}

/**
 * Fallback identifier for guest/demo sessions
 */
export const DEFAULT_DEMO_USER: UserSession = {
  userId: "guest_workspace",
  email: "demo@montlife.com",
  name: "Visitante Convidado",
  picture: "",
  role: "guest",
  createdAt: new Date().toISOString(),
};

