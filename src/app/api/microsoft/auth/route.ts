import { NextRequest, NextResponse } from "next/server";
import { getMicrosoftAuthUrl } from "@/services/microsoftService";
import { getAppBaseUrl } from "@/lib/urlUtils";

export async function GET(req: NextRequest) {
  const baseUrl = getAppBaseUrl(req);
  const authUrl = getMicrosoftAuthUrl(baseUrl);

  if (!authUrl) {
    // If MICROSOFT_CLIENT_ID is not configured in environment, redirect back with notice
    return NextResponse.redirect(
      `${baseUrl}/?microsoft_oauth_missing=true`
    );
  }

  return NextResponse.redirect(authUrl);
}
