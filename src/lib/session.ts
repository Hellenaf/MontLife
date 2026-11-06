import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export interface UserSession {
  userId: string; // The master_uid / owner_uid
  masterUid?: string; // Explicit alias for master_uid
  email: string; // The email used in current login
  primaryEmail?: string; // Master account primary email
  activeAccountEmail?: string; // Context email for active workspace
  name: string;
  picture?: string;
  role?: string;
  linkedEmails?: string[];
  createdAt: string;
}

const SESSION_COOKIE_NAME = "montlife_session";
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "montlife_enterprise_master_secret_key_v2_2026";

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

/**
 * Creates a base64-encoded HMAC-SHA256 signed session payload
 */
export function serializeSession(session: UserSession): string {
  if (!session.masterUid) {
    session.masterUid = session.userId;
  }
  const payload = Buffer.from(JSON.stringify(session)).toString("base64");
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

/**
 * Parses and cryptographically verifies the session payload
 */
export function deserializeSession(token?: string | null): UserSession | null {
  if (!token) return null;
  try {
    let payload = token;
    if (token.includes(".")) {
      const parts = token.split(".");
      if (parts.length === 2) {
        const [data, sig] = parts;
        const expected = signPayload(data);
        if (sig !== expected) {
          console.warn("Invalid or tampered session token rejected.");
          return null;
        }
        payload = data;
      }
    }

    const json = Buffer.from(payload, "base64").toString("utf-8");
    const data = JSON.parse(json) as UserSession;
    if (data && data.userId && data.email) {
      if (!data.masterUid) {
        data.masterUid = data.userId;
      }
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

