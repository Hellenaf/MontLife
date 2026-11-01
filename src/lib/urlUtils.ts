import { NextRequest } from "next/server";

export function getAppBaseUrl(req: NextRequest): string {
  // 1. If GOOGLE_REDIRECT_URI is set, extract its origin (e.g. https://montlife-tasks--montlife-8317b.us-central1.hosted.app)
  if (process.env.GOOGLE_REDIRECT_URI) {
    try {
      const redirectOrigin = new URL(process.env.GOOGLE_REDIRECT_URI).origin;
      if (redirectOrigin && !redirectOrigin.includes("0.0.0.0")) {
        return redirectOrigin;
      }
    } catch {
      // ignore
    }
  }

  // 2. Check x-forwarded-host from reverse proxy
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost && !forwardedHost.includes("0.0.0.0")) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // 3. Check standard host header
  const host = req.headers.get("host");
  if (host && !host.includes("0.0.0.0")) {
    const proto = host.includes("localhost") ? "http" : "https";
    return `${proto}://${host}`;
  }

  // 4. Production fallback
  return "https://montlife-tasks--montlife-8317b.us-central1.hosted.app";
}

