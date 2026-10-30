import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/services/googleService";
import { saveConnectedAccount } from "@/services/taskService";
import { AccountType } from "@/types";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = (searchParams.get("state") as AccountType) || "work";

  if (!code) {
    return NextResponse.redirect(new URL("/?oauth_error=no_code", req.url));
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Retrieve user email
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email || `${state}@google.com`;

    // Save tokens in database
    await saveConnectedAccount({
      id: state,
      email,
      access_token: tokens.access_token || undefined,
      refresh_token: tokens.refresh_token || undefined,
      expiry_date: tokens.expiry_date || undefined,
      default_tasklist_id: "@default",
      last_sync_at: new Date().toISOString(),
      is_connected: true,
    });

    return NextResponse.redirect(new URL(`/?oauth_success=${state}`, req.url));
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/?oauth_error=token_exchange_failed", req.url));
  }
}

