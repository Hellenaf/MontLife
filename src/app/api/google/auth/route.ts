import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/services/googleService";
import { getAppBaseUrl } from "@/lib/urlUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || searchParams.get("type") || "login";
  const baseUrl = getAppBaseUrl(req);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || clientId === "seu_client_id.apps.googleusercontent.com") {
    return NextResponse.redirect(
      `${baseUrl}/?google_oauth_missing=true&action=${action}`
    );
  }

  // Always force account chooser when linking, or during login so users can pick any account
  const authUrl = getAuthUrl(action, "select_account consent");
  return NextResponse.redirect(authUrl);
}
