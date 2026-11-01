import { NextRequest } from "next/server";

const PRODUCTION_URL = "https://montlife-tasks--montlife-8317b.us-central1.hosted.app";

export function getAppBaseUrl(req?: NextRequest): string {
  // If request is from localhost in development, respect localhost
  if (req) {
    const host = req.headers.get("host") || "";
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return `http://${host}`;
    }
  }

  // 1. Explicit env var if valid
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const pubUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    if (!pubUrl.includes("0.0.0.0") && !pubUrl.includes(":8080") && !pubUrl.includes("127.0.0.1")) {
      return pubUrl;
    }
  }

  // 2. Explicit GOOGLE_REDIRECT_URI origin if valid
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

  // 3. Check reverse proxy headers if valid domain
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

    const host = req.headers.get("host");
    if (
      host &&
      !host.includes("0.0.0.0") &&
      !host.includes("127.0.0.1") &&
      !host.includes(":8080")
    ) {
      return `https://${host}`;
    }
  }

  // 4. Default Production Canonical Domain
  return PRODUCTION_URL;
}
