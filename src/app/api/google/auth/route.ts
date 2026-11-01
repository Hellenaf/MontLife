import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/services/googleService";
import { getAppBaseUrl } from "@/lib/urlUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountType = searchParams.get("type") || "ask";
  const baseUrl = getAppBaseUrl(req);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || clientId === "seu_client_id.apps.googleusercontent.com") {
    return NextResponse.redirect(
      `${baseUrl}/?google_oauth_missing=true&account_type=${accountType}`
    );
  }

  const authUrl = getAuthUrl(accountType);
  return NextResponse.redirect(authUrl);
}
