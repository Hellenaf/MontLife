import { NextRequest } from "next/server";

export function getAppBaseUrl(req?: NextRequest): string {
  // 1. If explicit environment variable is set
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const pubUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    if (!pubUrl.includes("0.0.0.0") && !pubUrl.includes(":8080")) {
      return pubUrl;
    }
  }

  // 2. If GOOGLE_REDIRECT_URI is set, extract its origin (e.g. https://montlife-tasks--montlife-8317b.us-central1.hosted.app)
  if (process.env.GOOGLE_REDIRECT_URI) {
    try {
      const redirectOrigin = new URL(process.env.GOOGLE_REDIRECT_URI).origin;
      if (
        redirectOrigin &&
        !redirectOrigin.includes("0.0.0.0") &&
        !redirectOrigin.includes("127.0.0.1") &&
        !redirectOrigin.includes(":8080")
      ) {
        return redirectOrigin;
      }
    } catch {
      // ignore
    }
  }

  // 3. Check x-forwarded-host from reverse proxy
  if (req) {
    const forwardedHost = req.headers.get("x-forwarded-host");
    const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
    if (
      forwardedHost &&
      !forwardedHost.includes("0.0.0.0") &&
      !forwardedHost.includes("127.0.0.1") &&
      !forwardedHost.includes(":8080")
    ) {
      return `${forwardedProto}://${forwardedHost}`;
    }

    // 4. Check standard host header
    const host = req.headers.get("host");
    if (
      host &&
      !host.includes("0.0.0.0") &&
      !host.includes("127.0.0.1") &&
      !host.includes(":8080")
    ) {
      const proto = host.includes("localhost") ? "http" : "https";
      return `${proto}://${host}`;
    }
  }

  // 5. Production fallback
  return "https://montlife-tasks--montlife-8317b.us-central1.hosted.app";
}
